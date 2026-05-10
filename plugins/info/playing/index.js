'use strict';

const { ActivityType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const ACTIVITY_TYPES = {
  Playing: ActivityType.Playing,
  Streaming: ActivityType.Streaming,
  Listening: ActivityType.Listening,
  Watching: ActivityType.Watching,
  Competing: ActivityType.Competing,
};

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'playing').trim() || 'playing';
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

function canManageGuild(message) {
  const perms = message.member?.permissions;
  if (!perms?.has) return true;
  return perms.has(PermissionFlagsBits.ManageGuild);
}

function varsFor(message, data, activityName) {
  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || message.author?.username || 'Unknown',
    id: message.author?.id || '',
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    server: message.guild?.name || 'Server',
    serverId: message.guild?.id || '',
    channel: message.channel?.name || '',
    command: data.command || 'playing',
    activityName,
    activityType: data.activityType || 'Playing',
    producerName: data.producerName || 'Producer',
    status: data.status || 'online',
    imageUrl: data.imageUrl || '',
    animatedAvatarUrl: data.animatedAvatarUrl || '',
    animatedBannerUrl: data.animatedBannerUrl || '',
  };
}

async function sendResponse(message, data, vars) {
  if (data.embedEnabled === false) {
    await message.channel.send(applyTemplate(data.plainTextTemplate || 'Bot activity set to {activityType} {activityName} by {producerName}.', vars));
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(hexToInt(data.embedColor || '#22C55E'))
    .setTitle(applyTemplate(data.titleTemplate || 'Bot Activity Updated', vars))
    .setDescription(applyTemplate(data.descriptionTemplate || '**Type:** {activityType}\n**Name:** {activityName}\n**Producer:** {producerName}\n**Status:** {status}', vars));

  if (data.logoName || data.logoUrl) {
    embed.setAuthor({ name: applyTemplate(data.logoName || 'Activity', vars), iconURL: data.logoUrl || undefined });
  }
  if (data.imageUrl) embed.setThumbnail(applyTemplate(data.imageUrl, vars));
  if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, vars) });

  await message.channel.send({ embeds: [embed] });
}

module.exports = {
  meta: {
    name: 'Bot Activity',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Set the bot profile activity text.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    info_playing: {
      label: 'Bot Activity',
      icon: 'PLY',
      color: '#22C55E',
      description: 'Prefix command that changes the bot presence activity name, type, and status.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'playing', required: true },
        aliases: { type: 'string', default: 'setplaying,activity,status', required: false },
        activityName: { type: 'string', default: 'ROBLOX', required: false },
        activityType: { type: 'string', default: 'Playing', required: false },
        producerName: { type: 'string', default: 'Producer', required: false },
        status: { type: 'string', default: 'online', required: false },
        imageUrl: { type: 'string', default: '', required: false },
        animatedAvatarUrl: { type: 'string', default: '', required: false },
        animatedBannerUrl: { type: 'string', default: '', required: false },
        useAnimatedAvatar: { type: 'boolean', default: false, required: false },
        useAnimatedBanner: { type: 'boolean', default: false, required: false },
        requireManageGuild: { type: 'boolean', default: true, required: false },
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

        if (data.requireManageGuild !== false && !canManageGuild(message)) {
          await message.channel.send(applyTemplate(data.permissionMessage || 'You need Manage Server permission to change my activity.', varsFor(message, data, data.activityName || 'ROBLOX')));
          return true;
        }

        const requested = matched.args || data.activityName || 'ROBLOX';
        if (/^(off|clear|reset)$/i.test(requested)) {
          message.client?.user?.setPresence?.({ activities: [], status: data.status || 'online' });
          await message.channel.send(applyTemplate(data.clearedMessage || 'Bot activity cleared.', varsFor(message, data, '')));
          return true;
        }

        const activityName = requested.slice(0, 128);
        const activityType = ACTIVITY_TYPES[data.activityType] ?? ActivityType.Playing;
        const presence = {
          activities: [{ name: activityName, type: activityType }],
          status: data.status || 'online',
        };
        if (data.activityType === 'Streaming') presence.activities[0].url = 'https://twitch.tv/discord';
        message.client?.user?.setPresence?.(presence);

        await sendResponse(message, data, varsFor(message, data, activityName));
        return true;
      },

      generateCode(node, prefix = '!') {
        const rawCmd = String(node.data?.command || 'playing').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        const activityName = String(node.data?.activityName || 'ROBLOX').replace(/"/g, '\\"');
        const status = String(node.data?.status || 'online').replace(/"/g, '\\"');
        return `
// Playing activity command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _rest = message.content.slice("${cmd}".length).trim();
  const _activity = _rest || "${activityName}";
  client.user.setPresence({ activities: [{ name: _activity, type: 0 }], status: "${status}" });
  message.channel.send("Bot activity set to Playing " + _activity + ".");
}`;
      },
    },
  },
};
