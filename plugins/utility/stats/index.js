'use strict';

const { EmbedBuilder, version: discordVersion } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'stats').trim() || 'stats';
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
    if (!rest || /^\s/.test(rest)) return true;
  }
  return false;
}

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function hexToInt(hex) {
  const parsed = parseInt(String(hex || '#8B5CF6').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0x8B5CF6 : parsed;
}

function fmt(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function formatBytes(bytes) {
  const mb = Number(bytes || 0) / 1024 / 1024;
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}

function formatUptime(ms) {
  const total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function varsFor(message) {
  const client = message.client || {};
  const guilds = client.guilds?.cache;
  const users = client.users?.cache;
  const channels = client.channels?.cache;
  const memory = process.memoryUsage();
  const botUser = client.user || {};
  const ping = Math.round(client.ws?.ping ?? 0);

  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || message.author?.username || 'Unknown',
    id: message.author?.id || '',
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    botName: botUser.username || 'YourBot',
    botTag: botUser.tag || botUser.username || 'YourBot',
    botId: botUser.id || '',
    server: message.guild?.name || 'Server',
    serverId: message.guild?.id || '',
    serverCount: fmt(guilds?.size ?? 0),
    userCount: fmt(users?.size ?? 0),
    channelCount: fmt(channels?.size ?? 0),
    ping: String(ping),
    uptime: formatUptime(client.uptime),
    memoryUsed: formatBytes(memory.heapUsed),
    memoryTotal: formatBytes(memory.heapTotal),
    nodeVersion: process.version,
    discordVersion,
    platform: process.platform,
    channel: message.channel?.name || '',
  };
}

module.exports = {
  meta: {
    name: 'Stats',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Shows detailed bot statistics.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    util_stats: {
      label: 'Stats',
      icon: 'ST',
      color: '#8B5CF6',
      description: 'Prefix command that shows bot statistics such as servers, users, ping, uptime, memory, and versions.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'stats', required: true },
        aliases: { type: 'string', default: 'botinfo,bi,statistics', required: false },
        titleTemplate: { type: 'string', default: '{botName} Statistics', required: false },
        descriptionTemplate: { type: 'string', default: '**Servers:** {serverCount}\n**Users:** {userCount}\n**Channels:** {channelCount}\n**Ping:** {ping}ms\n**Uptime:** {uptime}', required: false },
        plainTextTemplate: { type: 'string', default: '{botName}: {serverCount} servers, {userCount} users, {ping}ms ping, uptime {uptime}.', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot) return false;

        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command, prefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
        ];
        if (!matchCommand(message.content, commands)) return false;

        const vars = varsFor(message);
        const title = applyTemplate(data.titleTemplate || '{botName} Statistics', vars);
        const description = applyTemplate(data.descriptionTemplate || '**Servers:** {serverCount}\n**Users:** {userCount}\n**Ping:** {ping}ms', vars);

        if (data.embedEnabled === false) {
          await message.channel.send(applyTemplate(data.plainTextTemplate || '{botName}: {serverCount} servers, {userCount} users.', vars));
          return true;
        }

        const embed = new EmbedBuilder()
          .setColor(hexToInt(data.embedColor || '#8B5CF6'))
          .setTitle(title)
          .setDescription(description);

        if (data.logoName || data.logoUrl) {
          embed.setAuthor({ name: applyTemplate(data.logoName || vars.botName, vars), iconURL: data.logoUrl || undefined });
        }
        if (data.imageUrl) embed.setImage(data.imageUrl);
        if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, vars) });

        await message.channel.send({ embeds: [embed] });
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = String(node.data?.command || 'stats').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `
// Stats command
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _rest = message.content.slice("${cmd}".length);
  if (!_rest || /^\\s/.test(_rest)) {
    message.channel.send(\`\${client.user.username}: \${client.guilds.cache.size} servers, \${client.ws.ping}ms ping.\`);
  }
}`;
      },
    },
  },
};
