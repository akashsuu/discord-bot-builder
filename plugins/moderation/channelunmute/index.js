'use strict';

const { PermissionFlagsBits, ChannelType } = require('discord.js');

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function buildVars(message, channel, reason, cmd) {
  const now = new Date();
  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || 'Unknown#0000',
    id: message.author?.id || '0',
    mention: `<@${message.author?.id || '0'}>`,
    command: cmd,
    reason,
    channel: channel?.name || 'unknown',
    channelId: channel?.id || '0',
    channelMention: channel ? `<#${channel.id}>` : '#unknown',
    server: message.guild?.name || 'Unknown',
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 8),
  };
}

function resolveTargetChannel(message, contentAfterCommand) {
  const mentioned = message.mentions.channels?.first();
  if (mentioned) return mentioned;

  const raw = (contentAfterCommand || '').trim().split(/\s+/)[0] || '';
  const id = raw.replace(/[<#>]/g, '');
  if (/^\d{17,20}$/.test(id)) {
    return message.guild.channels.cache.get(id) || null;
  }

  return message.channel;
}

module.exports = {
  meta: {
    name: 'Channel Unmute',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Unmutes a channel by enabling Send Messages for @everyone.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    moderation_channelunmute: {
      label: 'Channel Unmute',
      icon: 'CU',
      color: '#14532D',
      description: 'Prefix command that unmutes current or mentioned channel by restoring @everyone send/reaction access.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'channelunmute', required: true },
        reason: { type: 'string', default: 'No reason provided', required: false },
        output: {
          type: 'string',
          default: 'Channel {channelMention} has been unmuted by {mention}.\nReason: {reason}',
          required: false
        },
      },

      async execute(ctx) {
        const { node, message, prefix } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const rawCmd = (node.data?.command || 'channelunmute').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply('I need Manage Channels permission.').catch(() => {});
          return false;
        }

        if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
          await message.reply('You need Manage Channels permission.').catch(() => {});
          return false;
        }

        const afterCmd = message.content.slice(cmd.length).trim();
        const targetChannel = resolveTargetChannel(message, afterCmd);
        if (!targetChannel) {
          await message.reply(`Usage: \`${cmd} [#channel] [reason]\``).catch(() => {});
          return false;
        }

        if (!('permissionOverwrites' in targetChannel)) {
          await message.reply('That channel type cannot be unmuted.').catch(() => {});
          return false;
        }

        const allowChannelTypes = new Set([
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
          ChannelType.GuildForum,
          ChannelType.GuildVoice,
          ChannelType.GuildStageVoice,
          ChannelType.GuildMedia
        ]);
        if (!allowChannelTypes.has(targetChannel.type)) {
          await message.reply('That channel type is not supported for unmute.').catch(() => {});
          return false;
        }

        const reasonText = afterCmd
          .replace(/<#\d{17,20}>/g, '')
          .replace(/^\d{17,20}/, '')
          .replace(/\s+/g, ' ')
          .trim() || node.data?.reason || 'No reason provided';

        try {
          await targetChannel.permissionOverwrites.edit(
            message.guild.roles.everyone,
            { SendMessages: null, AddReactions: null },
            { reason: `Channel unmute by ${message.author.tag}: ${reasonText}` }
          );
        } catch (err) {
          await message.reply(`Failed to unmute channel: ${err.message}`).catch(() => {});
          return false;
        }

        const vars = buildVars(message, targetChannel, reasonText, cmd);
        const outputTpl = node.data?.output || 'Channel {channelMention} has been unmuted by {mention}.\nReason: {reason}';
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
        const rawCmd = (node.data?.command || 'channelunmute').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data?.reason || 'No reason provided').replace(/"/g, '\\"');
        const output = (node.data?.output || 'Channel {channelMention} has been unmuted by {mention}.\\nReason: {reason}')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// Channel Unmute
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.guild.members.me?.permissions.has("ManageChannels")) {
    message.reply("I need Manage Channels permission.").catch(() => {});
  } else if (!message.member?.permissions.has("ManageChannels")) {
    message.reply("You need Manage Channels permission.").catch(() => {});
  } else {
    const _cu_after = message.content.slice("${cmd}".length).trim();
    const _cu_mentioned = message.mentions.channels?.first();
    const _cu_first = (_cu_after.split(/\\s+/)[0] || "").replace(/[<#>]/g, "");
    const _cu_byId = /^\\d{17,20}$/.test(_cu_first) ? message.guild.channels.cache.get(_cu_first) : null;
    const _cu_channel = _cu_mentioned || _cu_byId || message.channel;
    const _cu_reason = _cu_after.replace(/<#\\d{17,20}>/g, "").replace(/^\\d{17,20}/, "").replace(/\\s+/g, " ").trim() || "${reason}";
    _cu_channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: null, AddReactions: null },
      { reason: \`Channel unmute by \${message.author.tag}: \${_cu_reason}\` }
    ).then(() => {
      const _cu_vars = {
        mention: \`<@\${message.author?.id}>\`,
        reason: _cu_reason,
        channelMention: \`<#\${_cu_channel.id}>\`
      };
      const _cu_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _cu_vars[k] ?? m);
      message.channel.send(_cu_apply(\`${output}\`)).catch(() => {});
    }).catch((e) => message.reply(\`Failed to unmute channel: \${e.message}\`).catch(() => {}));
  }
}
`;
      },
    },
  },
};
