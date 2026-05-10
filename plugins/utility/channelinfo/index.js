'use strict';

const { ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'channelinfo').trim() || 'channelinfo';
  const effectivePrefix = String(prefix || '!');
  return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function splitAliases(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchCommand(content, commands) {
  const text = String(content || '').trim();
  for (const command of commands) {
    const cmd = String(command || '').trim();
    if (!cmd) continue;
    if (!text.toLowerCase().startsWith(cmd.toLowerCase())) continue;
    const rest = text.slice(cmd.length);
    if (!rest || /^\s/.test(rest)) return { args: rest.trim() };
  }
  return null;
}

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function hexToInt(hex) {
  const parsed = parseInt(String(hex || '#22C55E').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0x22C55E : parsed;
}

function channelTypeName(type) {
  const names = {
    [ChannelType.GuildText]: 'Text',
    [ChannelType.GuildVoice]: 'Voice',
    [ChannelType.GuildCategory]: 'Category',
    [ChannelType.GuildAnnouncement]: 'Announcement',
    [ChannelType.GuildStageVoice]: 'Stage Voice',
    [ChannelType.GuildForum]: 'Forum',
    [ChannelType.GuildMedia]: 'Media',
  };
  return names[type] || `Type ${type}`;
}

function formatSlowmode(seconds) {
  const n = Number(seconds || 0);
  if (!n) return 'Off';
  if (n < 60) return `${n}s`;
  if (n < 3600) return `${Math.round(n / 60)}m`;
  return `${Math.round(n / 3600)}h`;
}

function boolText(value) {
  return value ? 'Yes' : 'No';
}

function createdText(channel) {
  const timestamp = channel.createdTimestamp || (channel.createdAt ? channel.createdAt.getTime() : null);
  if (!timestamp) return 'Unknown';
  const seconds = Math.floor(timestamp / 1000);
  return `<t:${seconds}:D> (<t:${seconds}:R>)`;
}

function resolveChannel(message, args) {
  const mentioned = message.mentions?.channels?.first?.() || message.mentions?.channels?.values?.().next?.().value;
  if (mentioned) return mentioned;
  const id = String(args || '').match(/\d{15,25}/)?.[0];
  if (id) return message.guild.channels.cache.get(id) || message.channel;
  return message.channel;
}

function permissionSummary(channel, guild) {
  const everyone = guild.roles?.everyone || guild.roles?.cache?.get(guild.id);
  const perms = everyone && channel.permissionsFor ? channel.permissionsFor(everyone) : null;
  const canView = perms ? perms.has(PermissionFlagsBits.ViewChannel) : true;
  const canSend = perms ? perms.has(PermissionFlagsBits.SendMessages) : true;
  const canManage = perms ? perms.has(PermissionFlagsBits.ManageChannels) : false;
  return {
    canView,
    canSend,
    canManage,
    permissionsSummary: [
      `View Channel: ${boolText(canView)}`,
      `Send Messages: ${boolText(canSend)}`,
      `Manage Channel: ${boolText(canManage)}`,
    ].join('\n'),
  };
}

function varsFor(message, channel) {
  const guild = message.guild;
  const perms = permissionSummary(channel, guild);
  const parent = channel.parent?.name || (channel.parentId ? `ID ${channel.parentId}` : 'None');
  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || message.author?.username || 'Unknown',
    id: message.author?.id || '',
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    server: guild.name || 'Server',
    serverId: guild.id || '',
    channelName: channel.name || 'unknown',
    channelMention: channel.id ? `<#${channel.id}>` : `#${channel.name || 'unknown'}`,
    channelId: channel.id || '',
    channelType: channelTypeName(channel.type),
    category: parent,
    topic: channel.topic || 'None',
    nsfw: boolText(channel.nsfw),
    slowmode: formatSlowmode(channel.rateLimitPerUser),
    position: String(channel.rawPosition ?? channel.position ?? 'Unknown'),
    createdAt: createdText(channel),
    permissionsSummary: perms.permissionsSummary,
    canView: boolText(perms.canView),
    canSend: boolText(perms.canSend),
    canManage: boolText(perms.canManage),
  };
}

module.exports = {
  meta: {
    name: 'Channel Info',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Shows detailed information about a channel including permissions, settings, and other details.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    util_channelinfo: {
      label: 'Channel Info',
      icon: 'CI',
      color: '#22C55E',
      description: 'Prefix command that shows channel settings, permissions, IDs, type, category, topic, and creation date.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'channelinfo', required: true },
        aliases: { type: 'string', default: 'ci', required: false },
        titleTemplate: { type: 'string', default: 'Channel Info: #{channelName}', required: false },
        descriptionTemplate: { type: 'string', default: '**Mention:** {channelMention}\n**ID:** `{channelId}`\n**Type:** {channelType}\n**Category:** {category}\n**Topic:** {topic}\n**NSFW:** {nsfw}\n**Slowmode:** {slowmode}\n**Position:** {position}\n**Created:** {createdAt}\n\n**Permissions**\n{permissionsSummary}', required: false },
        plainTextTemplate: { type: 'string', default: '#{channelName} ({channelType}) - ID: {channelId} - {permissionsSummary}', required: false },
        notFoundMessage: { type: 'string', default: 'I could not find that channel.', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;

        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command, prefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
        ];
        const matched = matchCommand(message.content, commands);
        if (!matched) return false;

        const channel = resolveChannel(message, matched.args);
        if (!channel) {
          await message.channel.send(data.notFoundMessage || 'I could not find that channel.');
          return true;
        }

        const vars = varsFor(message, channel);
        const title = applyTemplate(data.titleTemplate || 'Channel Info: #{channelName}', vars);
        const description = applyTemplate(data.descriptionTemplate || '**Mention:** {channelMention}\n**ID:** `{channelId}`\n**Type:** {channelType}', vars);

        if (data.embedEnabled === false) {
          const text = applyTemplate(data.plainTextTemplate || '#{channelName} ({channelType}) - ID: {channelId} - {permissionsSummary}', vars);
          await message.channel.send(text);
          return true;
        }

        const embed = new EmbedBuilder()
          .setColor(hexToInt(data.embedColor || '#22C55E'))
          .setTitle(title)
          .setDescription(description);

        if (data.logoName || data.logoUrl) {
          embed.setAuthor({ name: applyTemplate(data.logoName || 'Channel Info', vars), iconURL: data.logoUrl || undefined });
        }
        if (data.imageUrl) embed.setImage(data.imageUrl);
        if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, vars) });

        await message.channel.send({ embeds: [embed] });
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = String(node.data?.command || 'channelinfo').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `
// Channel Info command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _rest = message.content.slice("${cmd}".length);
  if (!_rest || /^\\s/.test(_rest)) {
    const _channel = message.mentions.channels.first() || message.channel;
    message.channel.send(\`#\${_channel.name} (\${_channel.id})\`);
  }
}`;
      },
    },
  },
};
