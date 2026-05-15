'use strict';

const { PermissionFlagsBits } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'voicekick').trim() || 'voicekick';
  const effectivePrefix = String(prefix || '!');
  return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function splitAliases(value) {
  return String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
}

function matchCommand(content, commands) {
  const text = String(content || '').trim();
  for (const command of commands) {
    const cmd = String(command || '').trim();
    if (!cmd) continue;
    if (!text.toLowerCase().startsWith(cmd.toLowerCase())) continue;
    const rest = text.slice(cmd.length);
    if (!rest || /^\s/.test(rest)) return { cmd, rawArgs: rest.trim() };
  }
  return null;
}

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

async function resolveMember(message, rawArgs) {
  const mentioned = message.mentions.members?.first();
  if (mentioned) return mentioned;
  const first = String(rawArgs || '').split(/\s+/).find(Boolean);
  const id = first?.replace(/[<@!>]/g, '');
  if (!id || !/^\d{15,22}$/.test(id)) return null;
  return message.guild.members.fetch(id).catch(() => null);
}

function varsFor(message, target, reason, command, extra = {}) {
  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || 'Unknown#0000',
    id: message.author?.id || '0',
    mention: `<@${message.author?.id || '0'}>`,
    target: target?.user?.tag || target?.user?.username || 'Unknown',
    targetName: target?.user?.username || 'Unknown',
    targetId: target?.user?.id || '0',
    targetMention: `<@${target?.user?.id || '0'}>`,
    voiceChannel: target?.voice?.channel?.name || 'Unknown',
    voiceChannelId: target?.voice?.channel?.id || '0',
    reason,
    command,
    server: message.guild?.name || 'Unknown',
    channel: message.channel?.name || 'Unknown',
    error: '',
    ...extra,
  };
}

module.exports = {
  meta: {
    name: 'Voice Kick',
    version: '1.0.0',
    author: 'Kiodium',
    description: 'Kick a user from their current voice channel.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    moderation_voicekick: {
      label: 'Voice Kick',
      icon: 'VCK',
      color: '#0EA5E9',
      description: 'Prefix command to disconnect a user from voice.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'voicekick', required: true },
        aliases: { type: 'string', default: 'vckick,vkick,disconnect' },
        embedEnabled: { type: 'boolean', default: true },
        embedColor: { type: 'string', default: '#0EA5E9' },
        reason: { type: 'string', default: 'No reason provided' },
        successMessage: { type: 'string', default: '{targetMention} was kicked from voice by {mention}.\nReason: {reason}' },
        usageMessage: { type: 'string', default: 'Usage: `{command} @user [reason]`' },
        permissionMessage: { type: 'string', default: 'You need Move Members permission to voice kick users.' },
        botPermissionMessage: { type: 'string', default: 'I need Move Members permission to voice kick users.' },
        notInVoiceMessage: { type: 'string', default: '{targetMention} is not connected to a voice channel.' },
        selfMessage: { type: 'string', default: 'You cannot voice kick yourself.' },
        errorMessage: { type: 'string', default: 'Failed to voice kick: {error}' },
      },

      async execute(node, message, ctx) {
        if (!message || !message.guild || message.author?.bot) return false;
        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command, prefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
        ];
        const matched = matchCommand(message.content, commands);
        if (!matched) return false;

        const baseVars = varsFor(message, null, data.reason || 'No reason provided', matched.cmd);

        if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.MoveMembers)) {
          await message.reply(applyTemplate(data.botPermissionMessage || 'I need Move Members permission to voice kick users.', baseVars)).catch(() => {});
          return true;
        }
        if (!message.member?.permissions.has(PermissionFlagsBits.MoveMembers)) {
          await message.reply(applyTemplate(data.permissionMessage || 'You need Move Members permission to voice kick users.', baseVars)).catch(() => {});
          return true;
        }

        const target = await resolveMember(message, matched.rawArgs);
        if (!target) {
          await message.reply(applyTemplate(data.usageMessage || 'Usage: `{command} @user [reason]`', baseVars)).catch(() => {});
          return true;
        }
        if (target.id === message.author.id) {
          await message.reply(applyTemplate(data.selfMessage || 'You cannot voice kick yourself.', varsFor(message, target, data.reason || 'No reason provided', matched.cmd))).catch(() => {});
          return true;
        }
        if (!target.voice?.channel) {
          await message.reply(applyTemplate(data.notInVoiceMessage || '{targetMention} is not connected to a voice channel.', varsFor(message, target, data.reason || 'No reason provided', matched.cmd))).catch(() => {});
          return true;
        }

        const reasonText = matched.rawArgs
          .replace(/<@!?\d+>/g, '')
          .replace(/^\d{15,22}\s*/, '')
          .trim() || data.reason || 'No reason provided';
        const vars = varsFor(message, target, reasonText, matched.cmd);

        try {
          await target.voice.disconnect(reasonText);
        } catch (err) {
          await message.reply(applyTemplate(data.errorMessage || 'Failed to voice kick: {error}', { ...vars, error: err.message })).catch(() => {});
          return true;
        }

        const text = applyTemplate(data.successMessage || '{targetMention} was kicked from voice by {mention}.\nReason: {reason}', vars);
        try {
          if (ctx?.sendEmbed) await ctx.sendEmbed(message, data, text);
          else await message.channel.send(text);
        } catch {
          await message.channel.send(text).catch(() => {});
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = String(node.data?.command || 'voicekick').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `// Voice Kick command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  message.channel.send("Voice Kick runs through the Kiodium plugin runtime and disconnects a target from voice.");
}`;
      },
    },
  },
};
