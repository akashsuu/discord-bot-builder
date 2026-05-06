'use strict';

const { PermissionFlagsBits, ChannelType } = require('discord.js');

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function buildVars(message, channel, reason) {
  return {
    mention: `<@${message.author?.id || '0'}>`,
    reason,
    channelMention: channel ? `<#${channel.id}>` : '#unknown'
  };
}

function resolveTargetChannel(message, contentAfterCommand) {
  const mentioned = message.mentions.channels?.first();
  if (mentioned) return mentioned;
  const raw = (contentAfterCommand || '').trim().split(/\s+/)[0] || '';
  const id = raw.replace(/[<#>]/g, '');
  if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
  return message.channel;
}

module.exports = {
  meta: {
    name: 'Channel Unlock',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Unlocks a channel by restoring Send Messages for @everyone.',
    engineVersion: '>=1.0.0'
  },

  nodes: {
    moderation_unlock: {
      label: 'Channel Unlock',
      icon: 'UNL',
      color: '#166534',
      description: 'Prefix command that unlocks current or mentioned channel.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],
      configSchema: {
        command: { type: 'string', default: 'unlock', required: true },
        reason: { type: 'string', default: 'No reason provided', required: false },
        output: { type: 'string', default: 'Channel {channelMention} has been unlocked by {mention}.\nReason: {reason}', required: false }
      },

      async execute(ctx) {
        const { node, message, prefix } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;
        const rawCmd = (node.data?.command || 'unlock').trim();
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
        if (!targetChannel || !('permissionOverwrites' in targetChannel)) {
          await message.reply(`Usage: \`${cmd} [#channel] [reason]\``).catch(() => {});
          return false;
        }

        const allowChannelTypes = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildVoice, ChannelType.GuildStageVoice, ChannelType.GuildMedia]);
        if (!allowChannelTypes.has(targetChannel.type)) {
          await message.reply('That channel type is not supported for unlock.').catch(() => {});
          return false;
        }

        const reasonText = afterCmd.replace(/<#\d{17,20}>/g, '').replace(/^\d{17,20}/, '').replace(/\s+/g, ' ').trim()
          || node.data?.reason || 'No reason provided';

        try {
          await targetChannel.permissionOverwrites.edit(
            message.guild.roles.everyone,
            { SendMessages: null, AddReactions: null },
            { reason: `Channel unlock by ${message.author.tag}: ${reasonText}` }
          );
        } catch (err) {
          await message.reply(`Failed to unlock channel: ${err.message}`).catch(() => {});
          return false;
        }

        const text = applyTemplate(
          node.data?.output || 'Channel {channelMention} has been unlocked by {mention}.\nReason: {reason}',
          buildVars(message, targetChannel, reasonText)
        );
        if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, text).catch(async () => message.channel.send(text).catch(() => {}));
        else await message.channel.send(text).catch(() => {});
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'unlock').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const reason = (node.data?.reason || 'No reason provided').replace(/"/g, '\\"');
        const output = (node.data?.output || 'Channel {channelMention} has been unlocked by {mention}.\\nReason: {reason}')
          .replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
// Channel Unlock
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _ul_after = message.content.slice("${cmd}".length).trim();
  const _ul_mentioned = message.mentions.channels?.first();
  const _ul_first = (_ul_after.split(/\\s+/)[0] || "").replace(/[<#>]/g, "");
  const _ul_byId = /^\\d{17,20}$/.test(_ul_first) ? message.guild.channels.cache.get(_ul_first) : null;
  const _ul_channel = _ul_mentioned || _ul_byId || message.channel;
  const _ul_reason = _ul_after.replace(/<#\\d{17,20}>/g, "").replace(/^\\d{17,20}/, "").replace(/\\s+/g, " ").trim() || "${reason}";
  _ul_channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null, AddReactions: null }, { reason: \`Channel unlock by \${message.author.tag}: \${_ul_reason}\` })
    .then(() => {
      const _ul_vars = { mention: \`<@\${message.author?.id}>\`, reason: _ul_reason, channelMention: \`<#\${_ul_channel.id}>\` };
      const _ul_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _ul_vars[k] ?? m);
      message.channel.send(_ul_apply(\`${output}\`)).catch(() => {});
    }).catch((e) => message.reply(\`Failed to unlock channel: \${e.message}\`).catch(() => {}));
}
`;
      }
    }
  }
};
