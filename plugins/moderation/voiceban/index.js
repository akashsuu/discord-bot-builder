'use strict';

const { PermissionFlagsBits } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'voiceban').trim() || 'voiceban';
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

function varsFor(message, target, voiceChannel, reason, command, extra = {}) {
  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || 'Unknown#0000',
    id: message.author?.id || '0',
    mention: `<@${message.author?.id || '0'}>`,
    target: target?.user?.tag || target?.user?.username || 'Unknown',
    targetName: target?.user?.username || 'Unknown',
    targetId: target?.user?.id || '0',
    targetMention: `<@${target?.user?.id || '0'}>`,
    voiceChannel: voiceChannel?.name || target?.voice?.channel?.name || 'Unknown',
    voiceChannelId: voiceChannel?.id || target?.voice?.channel?.id || '0',
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
    name: 'Voice Ban',
    version: '1.0.0',
    author: 'Kiodium',
    description: 'Ban a user from their current voice channel.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    moderation_voiceban: {
      label: 'Voice Ban',
      icon: 'VCB',
      color: '#8B5CF6',
      description: 'Prefix command to block a user from joining their current voice channel.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'voiceban', required: true },
        aliases: { type: 'string', default: 'vcban,vban' },
        embedEnabled: { type: 'boolean', default: true },
        embedColor: { type: 'string', default: '#8B5CF6' },
        reason: { type: 'string', default: 'No reason provided' },
        disconnectAfterBan: { type: 'boolean', default: true },
        successMessage: { type: 'string', default: '{targetMention} was banned from **{voiceChannel}** by {mention}.\nReason: {reason}' },
        usageMessage: { type: 'string', default: 'Usage: `{command} @user [reason]`' },
        permissionMessage: { type: 'string', default: 'You need Manage Channels permission to voice ban users.' },
        botPermissionMessage: { type: 'string', default: 'I need Manage Channels permission to voice ban users.' },
        movePermissionMessage: { type: 'string', default: 'I need Move Members permission to disconnect the user after banning them.' },
        notInVoiceMessage: { type: 'string', default: '{targetMention} is not connected to a voice channel.' },
        selfMessage: { type: 'string', default: 'You cannot voice ban yourself.' },
        errorMessage: { type: 'string', default: 'Failed to voice ban: {error}' },
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

        const baseVars = varsFor(message, null, null, data.reason || 'No reason provided', matched.cmd);

        if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply(applyTemplate(data.botPermissionMessage || 'I need Manage Channels permission to voice ban users.', baseVars)).catch(() => {});
          return true;
        }
        if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply(applyTemplate(data.permissionMessage || 'You need Manage Channels permission to voice ban users.', baseVars)).catch(() => {});
          return true;
        }

        const target = await resolveMember(message, matched.rawArgs);
        if (!target) {
          await message.reply(applyTemplate(data.usageMessage || 'Usage: `{command} @user [reason]`', baseVars)).catch(() => {});
          return true;
        }
        if (target.id === message.author.id) {
          await message.reply(applyTemplate(data.selfMessage || 'You cannot voice ban yourself.', varsFor(message, target, null, data.reason || 'No reason provided', matched.cmd))).catch(() => {});
          return true;
        }
        const voiceChannel = target.voice?.channel;
        if (!voiceChannel) {
          await message.reply(applyTemplate(data.notInVoiceMessage || '{targetMention} is not connected to a voice channel.', varsFor(message, target, null, data.reason || 'No reason provided', matched.cmd))).catch(() => {});
          return true;
        }

        const reasonText = matched.rawArgs
          .replace(/<@!?\d+>/g, '')
          .replace(/^\d{15,22}\s*/, '')
          .trim() || data.reason || 'No reason provided';
        const vars = varsFor(message, target, voiceChannel, reasonText, matched.cmd);

        try {
          await voiceChannel.permissionOverwrites.edit(target.id, { Connect: false }, { reason: reasonText });
          if (data.disconnectAfterBan !== false && target.voice?.channelId === voiceChannel.id) {
            if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.MoveMembers)) {
              await message.reply(applyTemplate(data.movePermissionMessage || 'I need Move Members permission to disconnect the user after banning them.', vars)).catch(() => {});
            } else {
              await target.voice.disconnect(reasonText).catch(() => {});
            }
          }
        } catch (err) {
          await message.reply(applyTemplate(data.errorMessage || 'Failed to voice ban: {error}', { ...vars, error: err.message })).catch(() => {});
          return true;
        }

        const text = applyTemplate(data.successMessage || '{targetMention} was banned from **{voiceChannel}** by {mention}.\nReason: {reason}', vars);
        try {
          if (ctx?.sendEmbed) await ctx.sendEmbed(message, data, text);
          else await message.channel.send(text);
        } catch {
          await message.channel.send(text).catch(() => {});
        }
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = String(node.data?.command || 'voiceban').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `// Voice Ban command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  message.channel.send("Voice Ban runs through the Kiodium plugin runtime and denies the target Connect permission in their voice channel.");
}`;
      },
    },
  },
};
