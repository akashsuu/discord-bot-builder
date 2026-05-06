'use strict';

const { PermissionFlagsBits } = require('discord.js');

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function buildVars(message, target, reason) {
  return {
    mention: `<@${message.author?.id || '0'}>`,
    user: message.author?.username || 'Unknown',
    target: target.user?.tag || target.user?.username || 'Unknown',
    targetMention: `<@${target.user?.id || '0'}>`,
    reason,
    server: message.guild?.name || 'Unknown'
  };
}

module.exports = {
  meta: {
    name: 'Soft Ban',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Bans and immediately unbans a mentioned user.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    moderation_softban: {
      label: 'Soft Ban',
      icon: 'SB',
      color: '#9A3412',
      description: 'Prefix command to softban user. Usage: softban @user [reason]',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'softban', required: true },
        reason: { type: 'string', default: 'No reason provided', required: false },
        deleteDays: { type: 'number', default: 1, min: 0, max: 7, required: false },
        output: {
          type: 'string',
          default: '{targetMention} has been softbanned by {mention}.\nReason: {reason}',
          required: false
        },
      },

      async execute(ctx) {
        const { node, message, prefix } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const rawCmd = (node.data?.command || 'softban').trim();
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

        const target = message.mentions.members?.first() || null;
        if (!target) {
          await message.reply(`Usage: \`${cmd} @user [reason]\``).catch(() => {});
          return false;
        }
        if (target.id === message.author.id) {
          await message.reply('You cannot softban yourself.').catch(() => {});
          return false;
        }
        if (target.id === message.client.user.id) {
          await message.reply('I cannot softban myself.').catch(() => {});
          return false;
        }
        if (!target.bannable) {
          await message.reply('I cannot softban that user (role may be higher than mine).').catch(() => {});
          return false;
        }

        const deleteDays = Math.min(Math.max(Number(node.data?.deleteDays ?? 1), 0), 7);
        const afterCmd = message.content.slice(cmd.length).trim();
        const reason = afterCmd.replace(/<@!?\d+>/g, '').replace(/\s+/g, ' ').trim()
          || node.data?.reason
          || 'No reason provided';

        try {
          await target.ban({ reason, deleteMessageSeconds: deleteDays * 86400 });
          await message.guild.members.unban(target.user.id, `Softban cleanup by ${message.author.tag}`);
        } catch (err) {
          await message.reply(`Failed to softban: ${err.message}`).catch(() => {});
          return false;
        }

        const text = applyTemplate(
          node.data?.output || '{targetMention} has been softbanned by {mention}.\nReason: {reason}',
          buildVars(message, target, reason)
        );

        try {
          if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, text);
          else await message.channel.send(text);
        } catch {
          await message.channel.send(text).catch(() => {});
        }

        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'softban').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data?.reason || 'No reason provided').replace(/"/g, '\\"');
        const deleteDays = Math.min(Math.max(Number(node.data?.deleteDays ?? 1), 0), 7);
        const output = (node.data?.output || '{targetMention} has been softbanned by {mention}.\\nReason: {reason}')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// Soft Ban
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _sb_target = message.mentions.members?.first();
  if (!_sb_target) {
    message.reply(\`Usage: \\\`${cmd} @user [reason]\\\`\`).catch(() => {});
  } else {
    const _sb_reason = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g, "").replace(/\\s+/g, " ").trim() || "${reason}";
    _sb_target.ban({ reason: _sb_reason, deleteMessageSeconds: ${deleteDays * 86400} })
      .then(() => message.guild.members.unban(_sb_target.user.id, \`Softban cleanup by \${message.author.tag}\`))
      .then(() => {
        const _sb_vars = { mention: \`<@\${message.author?.id}>\`, targetMention: \`<@\${_sb_target.user?.id}>\`, reason: _sb_reason };
        const _sb_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _sb_vars[k] ?? m);
        message.channel.send(_sb_apply(\`${output}\`)).catch(() => {});
      })
      .catch((e) => message.reply(\`Failed to softban: \${e.message}\`).catch(() => {}));
  }
}
`;
      },
    },
  },
};
