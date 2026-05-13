'use strict';

const { ChannelType, PermissionFlagsBits } = require('discord.js');

const SUPPORTED_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice,
]);

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'nuke').trim() || 'nuke';
  const effectivePrefix = String(prefix || '!');
  return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function matchCommand(content, command) {
  const text = String(content || '').trim();
  const cmd = String(command || '').trim();
  if (!text.toLowerCase().startsWith(cmd.toLowerCase())) return null;
  const rest = text.slice(cmd.length);
  if (rest && !/^\s/.test(rest)) return null;
  return { args: rest.trim() };
}

function varsFor(message, channel, data, extra = {}) {
  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || message.author?.username || 'Unknown',
    id: message.author?.id || '',
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    server: message.guild?.name || 'Server',
    serverId: message.guild?.id || '',
    channel: channel?.name || 'unknown',
    channelId: channel?.id || '',
    channelMention: channel?.id ? `<#${channel.id}>` : '#unknown',
    command: commandWithPrefix(data.command || 'nuke', extra.prefix || '!'),
    confirmationKeyword: data.confirmationKeyword || 'confirm',
    reason: data.reason || 'Channel nuked by {user}',
    error: '',
    ...extra,
  };
}

async function sendText(message, data, text) {
  try {
    if (data.embedEnabled && message.channel) {
      const embed = {
        title: data.embedTitle || 'Channel Nuked',
        description: text,
        color: parseInt(String(data.embedColor || '#DC2626').replace('#', ''), 16) || 0xDC2626,
        footer: data.embedFooter ? { text: data.embedFooter } : undefined,
      };
      await message.channel.send({ embeds: [embed] });
    } else {
      await message.channel.send(text);
    }
  } catch {
    await message.reply(text).catch(() => {});
  }
}

module.exports = {
  meta: {
    name: 'Nuke Channel',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Delete a channel and recreate the same channel again.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    moderation_nuke: {
      label: 'Nuke Channel',
      icon: 'NUK',
      color: '#DC2626',
      description: 'Prefix command that clones the current channel, deletes the old one, and posts a new-channel message.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'nuke', required: true },
        confirmationRequired: { type: 'boolean', default: true, required: false },
        confirmationKeyword: { type: 'string', default: 'confirm', required: false },
        reason: { type: 'string', default: 'Channel nuked by {user}', required: false },
        successMessage: { type: 'string', default: 'Channel nuked by {mention}. This is the new {channelMention}.', required: false },
        confirmMessage: { type: 'string', default: 'This will delete the whole channel and recreate it. Run `{command} {confirmationKeyword}` to confirm.', required: false },
        permissionMessage: { type: 'string', default: 'You and I both need Manage Channels permission to nuke this channel.', required: false },
        unsupportedMessage: { type: 'string', default: 'This channel type cannot be nuked.', required: false },
        errorMessage: { type: 'string', default: 'Failed to nuke channel: {error}', required: false },
      },

      async execute(ctx) {
        const { node, message, prefix } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const data = node.data || {};
        const command = commandWithPrefix(data.command || 'nuke', prefix || '!');
        const matched = matchCommand(message.content, command);
        if (!matched) return false;

        const channel = message.channel;
        const vars = varsFor(message, channel, data, { prefix: prefix || '!' });

        const botCanManage = message.guild.members.me?.permissions?.has?.(PermissionFlagsBits.ManageChannels);
        const userCanManage = message.member?.permissions?.has?.(PermissionFlagsBits.ManageChannels);
        if (!botCanManage || !userCanManage) {
          await sendText(message, data, applyTemplate(data.permissionMessage || 'You and I both need Manage Channels permission to nuke this channel.', vars));
          return true;
        }

        if (!channel || !SUPPORTED_TYPES.has(channel.type) || typeof channel.clone !== 'function' || typeof channel.delete !== 'function') {
          await sendText(message, data, applyTemplate(data.unsupportedMessage || 'This channel type cannot be nuked.', vars));
          return true;
        }

        const keyword = String(data.confirmationKeyword || 'confirm').trim().toLowerCase();
        if (data.confirmationRequired !== false && matched.args.toLowerCase() !== keyword) {
          await sendText(message, data, applyTemplate(data.confirmMessage || 'This will delete the whole channel and recreate it. Run `{command} {confirmationKeyword}` to confirm.', vars));
          return true;
        }

        let newChannel;
        try {
          const reason = applyTemplate(data.reason || 'Channel nuked by {user}', vars);
          newChannel = await channel.clone({ name: channel.name, reason });
          if (typeof newChannel.setPosition === 'function' && Number.isFinite(channel.rawPosition ?? channel.position)) {
            await newChannel.setPosition(channel.rawPosition ?? channel.position).catch(() => {});
          }
          await channel.delete(reason);
        } catch (err) {
          const text = applyTemplate(data.errorMessage || 'Failed to nuke channel: {error}', { ...vars, error: err.message });
          await message.author?.send?.(text).catch(() => {});
          await message.reply(text).catch(() => {});
          return true;
        }

        const newVars = varsFor(message, newChannel, data, { prefix: prefix || '!' });
        const text = applyTemplate(data.successMessage || 'Channel nuked by {mention}. This is the new {channelMention}.', newVars);
        try {
          if (data.embedEnabled) {
            await newChannel.send({
              embeds: [{
                title: applyTemplate(data.embedTitle || 'Channel Nuked', newVars),
                description: text,
                color: parseInt(String(data.embedColor || '#DC2626').replace('#', ''), 16) || 0xDC2626,
                footer: data.embedFooter ? { text: applyTemplate(data.embedFooter, newVars) } : undefined,
              }],
            });
          } else {
            await newChannel.send(text);
          }
        } catch {
          // The nuke itself succeeded; ignore message failures.
        }
        return true;
      },

      generateCode(node, prefix = '!') {
        const rawCmd = String(node.data?.command || 'nuke').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `
// Nuke Channel
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _rest = message.content.slice("${cmd}".length).trim().toLowerCase();
  if (_rest !== "confirm") return message.channel.send("Run ${cmd} confirm to delete and recreate this channel.");
  const _old = message.channel;
  const _new = await _old.clone({ name: _old.name, reason: "Channel nuked" });
  await _new.setPosition(_old.rawPosition ?? _old.position).catch(() => {});
  await _old.delete("Channel nuked");
  await _new.send("Channel nuked.");
}`;
      },
    },
  },
};
