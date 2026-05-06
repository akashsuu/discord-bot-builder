'use strict';

const { PermissionFlagsBits } = require('discord.js');

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function parseDuration(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return null;

  const match = raw.match(/^(\d+)\s*(s|m|h|d)?$/i);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = (match[2] || 'm').toLowerCase();

  const mult = unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
  const ms = value * mult;

  if (ms < 5000 || ms > 2419200000) return null;
  return ms;
}

function humanDuration(ms) {
  if (ms % 86400000 === 0) return `${ms / 86400000}d`;
  if (ms % 3600000 === 0) return `${ms / 3600000}h`;
  if (ms % 60000 === 0) return `${ms / 60000}m`;
  if (ms % 1000 === 0) return `${ms / 1000}s`;
  return `${ms}ms`;
}

function buildVars(message, target, reason, durationLabel) {
  return {
    mention: `<@${message.author?.id || '0'}>`,
    user: message.author?.username || 'Unknown',
    target: target.user?.tag || target.user?.username || 'Unknown',
    targetMention: `<@${target.user?.id || '0'}>`,
    reason,
    duration: durationLabel,
    server: message.guild?.name || 'Unknown'
  };
}

module.exports = {
  meta: {
    name: 'Mute User',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Timeout mutes a mentioned user.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    moderation_mute: {
      label: 'Mute User',
      icon: 'MUTE',
      color: '#6B21A8',
      description: 'Prefix command to timeout a mentioned user. Usage: mute @user [duration] [reason]',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'mute', required: true },
        duration: {
          type: 'string',
          default: '10m',
          required: false,
          description: 'Default timeout duration, examples: 30s, 10m, 2h, 1d'
        },
        reason: { type: 'string', default: 'No reason provided', required: false },
        output: {
          type: 'string',
          default: '{targetMention} has been muted by {mention} for {duration}.\nReason: {reason}',
          required: false
        },
      },

      async execute(ctx) {
        const { node, message, prefix } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const rawCmd = (node.data?.command || 'mute').trim();
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
          await message.reply(`Usage: \`${cmd} @user [duration] [reason]\``).catch(() => {});
          return false;
        }

        if (target.id === message.author.id) {
          await message.reply('You cannot mute yourself.').catch(() => {});
          return false;
        }
        if (target.id === message.client.user.id) {
          await message.reply('I cannot mute myself.').catch(() => {});
          return false;
        }
        if (!target.moderatable) {
          await message.reply('I cannot mute that user (role may be higher than mine).').catch(() => {});
          return false;
        }

        const afterCmd = message.content.slice(cmd.length).trim();
        const withoutMention = afterCmd.replace(/<@!?\d+>/, '').trim();
        const parts = withoutMention ? withoutMention.split(/\s+/) : [];

        let durationRaw = node.data?.duration || '10m';
        let reasonStartIndex = 0;
        if (parts[0] && parseDuration(parts[0])) {
          durationRaw = parts[0];
          reasonStartIndex = 1;
        }

        const durationMs = parseDuration(durationRaw);
        if (!durationMs) {
          await message.reply('Invalid duration. Use formats like 30s, 10m, 2h, 1d.').catch(() => {});
          return false;
        }

        const reason = parts.slice(reasonStartIndex).join(' ').trim()
          || node.data?.reason
          || 'No reason provided';

        try {
          await target.timeout(durationMs, reason);
        } catch (err) {
          await message.reply(`Failed to mute: ${err.message}`).catch(() => {});
          return false;
        }

        const vars = buildVars(message, target, reason, humanDuration(durationMs));
        const outputTpl = node.data?.output || '{targetMention} has been muted by {mention} for {duration}.\nReason: {reason}';
        const text = applyTemplate(outputTpl, vars);

        try {
          if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, text);
          else await message.channel.send(text);
        } catch {
          await message.channel.send(text).catch(() => {});
        }

        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'mute').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const defaultDuration = (node.data?.duration || '10m').replace(/"/g, '\\"');
        const reason = (node.data?.reason || 'No reason provided').replace(/"/g, '\\"');
        const output = (node.data?.output || '{targetMention} has been muted by {mention} for {duration}.\\nReason: {reason}')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// Mute User
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _mu_target = message.mentions.members?.first();
  if (!_mu_target) {
    message.reply(\`Usage: \\\`${cmd} @user [duration] [reason]\\\`\`).catch(() => {});
  } else {
    const _mu_parse = (raw) => {
      const m = String(raw || "").trim().toLowerCase().match(/^(\\d+)\\s*(s|m|h|d)?$/i);
      if (!m) return null;
      const v = Number(m[1]);
      const u = (m[2] || "m").toLowerCase();
      const mul = u === "s" ? 1000 : u === "m" ? 60000 : u === "h" ? 3600000 : 86400000;
      const ms = v * mul;
      if (ms < 5000 || ms > 2419200000) return null;
      return ms;
    };
    const _mu_after = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/, "").trim();
    const _mu_parts = _mu_after ? _mu_after.split(/\\s+/) : [];
    let _mu_dRaw = "${defaultDuration}";
    let _mu_reasonIdx = 0;
    if (_mu_parts[0] && _mu_parse(_mu_parts[0])) { _mu_dRaw = _mu_parts[0]; _mu_reasonIdx = 1; }
    const _mu_ms = _mu_parse(_mu_dRaw);
    const _mu_reason = _mu_parts.slice(_mu_reasonIdx).join(" ").trim() || "${reason}";
    if (!_mu_ms) {
      message.reply("Invalid duration. Use formats like 30s, 10m, 2h, 1d.").catch(() => {});
    } else {
      _mu_target.timeout(_mu_ms, _mu_reason).then(() => {
        const _mu_h = _mu_ms % 86400000 === 0 ? String(_mu_ms / 86400000) + "d"
          : _mu_ms % 3600000 === 0 ? String(_mu_ms / 3600000) + "h"
          : _mu_ms % 60000 === 0 ? String(_mu_ms / 60000) + "m"
          : String(_mu_ms / 1000) + "s";
        const _mu_vars = {
          mention: \`<@\${message.author?.id}>\`,
          targetMention: \`<@\${_mu_target.user?.id}>\`,
          reason: _mu_reason,
          duration: _mu_h
        };
        const _mu_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _mu_vars[k] ?? m);
        message.channel.send(_mu_apply(\`${output}\`)).catch(() => {});
      }).catch((e) => message.reply(\`Failed to mute: \${e.message}\`).catch(() => {}));
    }
  }
}
`;
      },
    },
  },
};
