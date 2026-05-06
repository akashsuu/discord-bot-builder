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
    name: 'Channel Mute',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Mutes a channel by disabling Send Messages for @everyone.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    moderation_channelmute: {
      label: 'Channel Mute',
      icon: 'CM',
      color: '#7C2D12',
      description: 'Prefix command that mutes current or mentioned channel by blocking @everyone from sending messages.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'channelmute', required: true },
        reason: { type: 'string', default: 'No reason provided', required: false },
        output: {
          type: 'string',
          default: 'Channel {channelMention} has been muted by {mention}.\nReason: {reason}',
          required: false
        },
      },

      async execute(ctx) {
        const { node, message, prefix } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const rawCmd = (node.data?.command || 'channelmute').trim();
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
          await message.reply('That channel type cannot be muted.').catch(() => {});
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
          await message.reply('That channel type is not supported for mute.').catch(() => {});
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
            { SendMessages: false, AddReactions: false },
            { reason: `Channel mute by ${message.author.tag}: ${reasonText}` }
          );
        } catch (err) {
          await message.reply(`Failed to mute channel: ${err.message}`).catch(() => {});
          return false;
        }

        const vars = buildVars(message, targetChannel, reasonText, cmd);
        const outputTpl = node.data?.output || 'Channel {channelMention} has been muted by {mention}.\nReason: {reason}';
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
        const rawCmd = (node.data?.command || 'channelmute').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data?.reason || 'No reason provided').replace(/"/g, '\\"');
        const output = (node.data?.output || 'Channel {channelMention} has been muted by {mention}.\\nReason: {reason}')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
// Channel Mute
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  if (!message.guild.members.me?.permissions.has("ManageChannels")) {
    message.reply("I need Manage Channels permission.").catch(() => {});
  } else if (!message.member?.permissions.has("ManageChannels")) {
    message.reply("You need Manage Channels permission.").catch(() => {});
  } else {
    const _cm_after = message.content.slice("${cmd}".length).trim();
    const _cm_mentioned = message.mentions.channels?.first();
    const _cm_first = (_cm_after.split(/\\s+/)[0] || "").replace(/[<#>]/g, "");
    const _cm_byId = /^\\d{17,20}$/.test(_cm_first) ? message.guild.channels.cache.get(_cm_first) : null;
    const _cm_channel = _cm_mentioned || _cm_byId || message.channel;
    const _cm_reason = _cm_after.replace(/<#\\d{17,20}>/g, "").replace(/^\\d{17,20}/, "").replace(/\\s+/g, " ").trim() || "${reason}";
    _cm_channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: false, AddReactions: false },
      { reason: \`Channel mute by \${message.author.tag}: \${_cm_reason}\` }
    ).then(() => {
      const _cm_vars = {
        mention: \`<@\${message.author?.id}>\`,
        reason: _cm_reason,
        channelMention: \`<#\${_cm_channel.id}>\`
      };
      const _cm_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _cm_vars[k] ?? m);
      message.channel.send(_cm_apply(\`${output}\`)).catch(() => {});
    }).catch((e) => message.reply(\`Failed to mute channel: \${e.message}\`).catch(() => {}));
  }
}
`;
      },
    },
  },
};
