'use strict';

const { PermissionFlagsBits } = require('discord.js');

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function buildVars(message, target, reason, command) {
  const now = new Date();

  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || 'Unknown#0000',
    id: message.author?.id || '0',
    mention: `<@${message.author?.id || '0'}>`,
    target: target.user?.tag || target.user?.username || 'Unknown',
    targetName: target.user?.username || 'Unknown',
    targetId: target.user?.id || '0',
    targetMention: `<@${target.user?.id || '0'}>`,
    reason,
    command,
    server: message.guild?.name || 'Unknown',
    channel: message.channel?.name || 'Unknown',
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 8),
  };
}

module.exports = {
  meta: {
    name: 'Ban',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Bans a mentioned member from the server.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    moderation_ban: {
      label: 'Ban',
      icon: 'BAN',
      color: '#C0392B',
      description: 'Bans a mentioned user with reason and optional message history deletion.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'ban', required: true },
        reason: { type: 'string', default: 'No reason provided', required: false },
        deleteDays: {
          type: 'number',
          default: 0,
          min: 0,
          max: 7,
          required: false,
          description: 'Delete message history from the banned user (0-7 days).'
        },
        output: {
          type: 'string',
          default: '**{target}** has been banned by **{user}**.\nReason: {reason}',
          required: false
        },
      },

      async execute(ctx) {
        const { node, message, prefix } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const rawCmd = (node.data?.command || 'ban').trim();
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

        const target = ctx?.flow?.targetMember || message.mentions.members?.first() || null;
        if (!target) {
          await message.reply(`Usage: \`${cmd} @user [reason]\``).catch(() => {});
          return false;
        }

        if (target.id === message.author.id) {
          await message.reply('You cannot ban yourself.').catch(() => {});
          return false;
        }

        if (target.id === message.client.user.id) {
          await message.reply('I cannot ban myself.').catch(() => {});
          return false;
        }

        if (!target.bannable) {
          await message.reply('I cannot ban that user (role may be higher than mine).').catch(() => {});
          return false;
        }

        const deleteDays = Math.min(Math.max(Number(node.data?.deleteDays ?? 0), 0), 7);

        const afterCmd = message.content.slice(cmd.length).trim();
        const reason = afterCmd.replace(/<@!?\d+>/g, '').replace(/\s+/g, ' ').trim()
          || ctx?.flow?.reason
          || node.data?.reason
          || 'No reason provided';

        try {
          await target.ban({ reason, deleteMessageSeconds: deleteDays * 86400 });
        } catch (err) {
          await message.reply(`Failed to ban: ${err.message}`).catch(() => {});
          return false;
        }

        const vars = buildVars(message, target, reason, cmd);
        const outputTpl = node.data?.output || '**{target}** has been banned by **{user}**.\nReason: {reason}';
        const text = applyTemplate(outputTpl, vars);

        try {
          if (ctx?.sendEmbed) {
            await ctx.sendEmbed(message, node.data, text);
          } else {
            await message.channel.send(text);
          }
        } catch {
          await message.channel.send(text).catch(() => {});
        }

        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'ban').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data?.reason || 'No reason provided').replace(/"/g, '\\"');
        const output = (node.data?.output || '**{target}** has been banned by **{user}**.\nReason: {reason}')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');
        const deleteDays = Math.min(Math.max(Number(node.data?.deleteDays ?? 0), 0), 7);

        return `
// Ban
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.guild.members.me?.permissions.has("BanMembers")) {
    message.reply("I need Ban Members permission.").catch(() => {});
  } else if (!message.member?.permissions.has("BanMembers")) {
    message.reply("You need Ban Members permission.").catch(() => {});
  } else {
    const _bn_t = message.mentions.members?.first();
    if (!_bn_t) {
      message.reply(\`Usage: \\\`${cmd} @user [reason]\\\`\`).catch(() => {});
    } else if (!_bn_t.bannable) {
      message.reply("I cannot ban that user.").catch(() => {});
    } else {
      const _bn_r = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g, "").replace(/\\s+/g, " ").trim() || "${reason}";
      _bn_t.ban({ reason: _bn_r, deleteMessageSeconds: ${deleteDays * 86400} })
        .then(() => {
          const _bn_vars = {
            user: message.author?.username,
            target: _bn_t.user?.tag || _bn_t.user?.username,
            reason: _bn_r
          };
          const _bn_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _bn_vars[k] ?? m);
          message.channel.send(_bn_apply(\`${output}\`)).catch(() => {});
        })
        .catch((e) => message.reply(\`Failed to ban: \${e.message}\`).catch(() => {}));
    }
  }
}
`;
      },
    },
  },
};
