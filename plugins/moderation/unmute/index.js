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
    name: 'Unmute User',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Removes timeout from a mentioned user.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    moderation_unmute: {
      label: 'Unmute User',
      icon: 'UNM',
      color: '#15803D',
      description: 'Prefix command to remove timeout from user. Usage: unmute @user [reason]',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'unmute', required: true },
        reason: { type: 'string', default: 'No reason provided', required: false },
        output: {
          type: 'string',
          default: '{targetMention} has been unmuted by {mention}.\nReason: {reason}',
          required: false
        },
      },

      async execute(ctx) {
        const { node, message, prefix } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const rawCmd = (node.data?.command || 'unmute').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          await message.reply('I need Moderate Members permission.').catch(() => {});
          return false;
        }
        if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          await message.reply('You need Moderate Members permission.').catch(() => {});
          return false;
        }

        const target = message.mentions.members?.first() || null;
        if (!target) {
          await message.reply(`Usage: \`${cmd} @user [reason]\``).catch(() => {});
          return false;
        }
        if (!target.moderatable) {
          await message.reply('I cannot unmute that user (role may be higher than mine).').catch(() => {});
          return false;
        }

        const afterCmd = message.content.slice(cmd.length).trim();
        const reason = afterCmd.replace(/<@!?\d+>/g, '').replace(/\s+/g, ' ').trim()
          || node.data?.reason
          || 'No reason provided';

        try {
          await target.timeout(null, `Unmute by ${message.author.tag}: ${reason}`);
        } catch (err) {
          await message.reply(`Failed to unmute: ${err.message}`).catch(() => {});
          return false;
        }

        const text = applyTemplate(
          node.data?.output || '{targetMention} has been unmuted by {mention}.\nReason: {reason}',
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
        const rawCmd = (node.data?.command || 'unmute').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data?.reason || 'No reason provided').replace(/"/g, '\\"');
        const output = (node.data?.output || '{targetMention} has been unmuted by {mention}.\\nReason: {reason}')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// Unmute User
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _um_target = message.mentions.members?.first();
  if (!_um_target) {
    message.reply(\`Usage: \\\`${cmd} @user [reason]\\\`\`).catch(() => {});
  } else {
    const _um_reason = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g, "").replace(/\\s+/g, " ").trim() || "${reason}";
    _um_target.timeout(null, \`Unmute by \${message.author.tag}: \${_um_reason}\`).then(() => {
      const _um_vars = { mention: \`<@\${message.author?.id}>\`, targetMention: \`<@\${_um_target.user?.id}>\`, reason: _um_reason };
      const _um_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _um_vars[k] ?? m);
      message.channel.send(_um_apply(\`${output}\`)).catch(() => {});
    }).catch((e) => message.reply(\`Failed to unmute: \${e.message}\`).catch(() => {}));
  }
}
`;
      },
    },
  },
};
