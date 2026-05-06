'use strict';

const { PermissionFlagsBits } = require('discord.js');

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function uniqueMembers(members) {
  const seen = new Set();
  const out = [];
  for (const member of members) {
    if (!member?.id || seen.has(member.id)) continue;
    seen.add(member.id);
    out.push(member);
  }
  return out;
}

function buildVars(message, reason, banned, failed, failedTags) {
  return {
    mention: `<@${message.author?.id || '0'}>`,
    user: message.author?.username || 'Unknown',
    reason,
    bannedCount: String(banned.length),
    failedCount: String(failed.length),
    targets: banned.map((m) => m.user?.tag || m.user?.username || m.id).join(', ') || 'None',
    failedTargets: failedTags.join(', ') || 'None'
  };
}

module.exports = {
  meta: {
    name: 'Mass Ban',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Bans multiple mentioned users from one command.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    moderation_massban: {
      label: 'Mass Ban',
      icon: 'MB',
      color: '#991B1B',
      description: 'Prefix command that bans all mentioned users. Usage: massban @user @user [reason]',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'massban', required: true },
        reason: { type: 'string', default: 'No reason provided', required: false },
        deleteDays: { type: 'number', default: 0, min: 0, max: 7, required: false },
        output: {
          type: 'string',
          default: 'Mass ban by {mention}. Banned: {bannedCount}, Failed: {failedCount}. Reason: {reason}\nTargets: {targets}',
          required: false
        },
      },

      async execute(ctx) {
        const { node, message, prefix } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const rawCmd = (node.data?.command || 'massban').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
          await message.reply('I need Ban Members permission.').catch(() => {});
          return false;
        }
        if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers)) {
          await message.reply('You need Ban Members permission.').catch(() => {});
          return false;
        }

        const mentions = uniqueMembers([...message.mentions.members.values()]);
        if (!mentions.length) {
          await message.reply(`Usage: \`${cmd} @user @user [reason]\``).catch(() => {});
          return false;
        }

        const deleteDays = Math.min(Math.max(Number(node.data?.deleteDays ?? 0), 0), 7);
        const afterCmd = message.content.slice(cmd.length).trim();
        const reason = afterCmd.replace(/<@!?\d+>/g, '').replace(/\s+/g, ' ').trim()
          || node.data?.reason
          || 'No reason provided';

        const banned = [];
        const failed = [];
        const failedTags = [];

        for (const target of mentions) {
          const tag = target.user?.tag || target.user?.username || target.id;

          if (target.id === message.author.id || target.id === message.client.user.id || !target.bannable) {
            failed.push(target);
            failedTags.push(tag);
            continue;
          }

          try {
            await target.ban({ reason, deleteMessageSeconds: deleteDays * 86400 });
            banned.push(target);
          } catch {
            failed.push(target);
            failedTags.push(tag);
          }
        }

        const vars = buildVars(message, reason, banned, failed, failedTags);
        const outputTpl = node.data?.output || 'Mass ban by {mention}. Banned: {bannedCount}, Failed: {failedCount}. Reason: {reason}\nTargets: {targets}';
        const text = applyTemplate(outputTpl, vars);

        try {
          if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, text);
          else await message.channel.send(text);
        } catch {
          await message.channel.send(text).catch(() => {});
        }

        return banned.length > 0;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'massban').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data?.reason || 'No reason provided').replace(/"/g, '\\"');
        const deleteDays = Math.min(Math.max(Number(node.data?.deleteDays ?? 0), 0), 7);
        const output = (node.data?.output || 'Mass ban by {mention}. Banned: {bannedCount}, Failed: {failedCount}. Reason: {reason}\\nTargets: {targets}')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// Mass Ban
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.guild.members.me?.permissions.has("BanMembers")) {
    message.reply("I need Ban Members permission.").catch(() => {});
  } else if (!message.member?.permissions.has("BanMembers")) {
    message.reply("You need Ban Members permission.").catch(() => {});
  } else {
    const _mb_targets = [...message.mentions.members.values()];
    if (!_mb_targets.length) {
      message.reply(\`Usage: \\\`${cmd} @user @user [reason]\\\`\`).catch(() => {});
    } else {
      const _mb_reason = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g, "").replace(/\\s+/g, " ").trim() || "${reason}";
      const _mb_banned = [];
      const _mb_failed = [];
      for (const _mb_t of _mb_targets) {
        if (_mb_t.id === message.author.id || _mb_t.id === message.client.user.id || !_mb_t.bannable) {
          _mb_failed.push(_mb_t);
          continue;
        }
        try {
          await _mb_t.ban({ reason: _mb_reason, deleteMessageSeconds: ${deleteDays * 86400} });
          _mb_banned.push(_mb_t);
        } catch {
          _mb_failed.push(_mb_t);
        }
      }
      const _mb_vars = {
        mention: \`<@\${message.author?.id}>\`,
        reason: _mb_reason,
        bannedCount: String(_mb_banned.length),
        failedCount: String(_mb_failed.length),
        targets: _mb_banned.map((m) => m.user?.tag || m.user?.username || m.id).join(", ") || "None"
      };
      const _mb_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _mb_vars[k] ?? m);
      message.channel.send(_mb_apply(\`${output}\`)).catch(() => {});
    }
  }
}
`;
      },
    },
  },
};
