'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'servericon').trim() || 'servericon';
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
  const parsed = parseInt(String(hex || '#3B82F6').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0x3B82F6 : parsed;
}

function iconUrlFor(guild) {
  return guild?.iconURL?.({ size: 4096, extension: 'png', forceStatic: false }) || null;
}

function varsFor(message, iconUrl) {
  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || message.author?.username || 'Unknown',
    id: message.author?.id || '',
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    server: message.guild?.name || 'Server',
    serverId: message.guild?.id || '',
    iconUrl,
    channel: message.channel?.name || '',
  };
}

function createButtons(data, iconUrl) {
  const buttons = [];
  if (data.showDownloadButton !== false) {
    buttons.push(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(data.downloadButtonLabel || 'Download')
        .setURL(iconUrl)
    );
  }
  if (data.showOpenButton !== false) {
    buttons.push(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(data.openButtonLabel || 'Open Icon')
        .setURL(iconUrl)
    );
  }
  return buttons.length ? [new ActionRowBuilder().addComponents(buttons)] : [];
}

module.exports = {
  meta: {
    name: 'Server Icon',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Shows the server icon with download links.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    util_servericon: {
      label: 'Server Icon',
      icon: 'SI',
      color: '#3B82F6',
      description: 'Prefix command that shows the server icon with download/open link buttons.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'servericon', required: true },
        aliases: { type: 'string', default: 'serverav,serveravatar,sicon', required: false },
        titleTemplate: { type: 'string', default: "{server}'s Server Icon", required: false },
        descriptionTemplate: { type: 'string', default: 'Requested by {mention}\nServer ID: `{serverId}`', required: false },
        plainTextTemplate: { type: 'string', default: "{server}'s server icon: {iconUrl}", required: false },
        noIconMessage: { type: 'string', default: 'This server does not have an icon.', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;

        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command, prefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
        ];
        if (!matchCommand(message.content, commands)) return false;

        const iconUrl = iconUrlFor(message.guild);
        const vars = varsFor(message, iconUrl || '');
        if (!iconUrl) {
          await message.channel.send(applyTemplate(data.noIconMessage || 'This server does not have an icon.', vars));
          return true;
        }

        const title = applyTemplate(data.titleTemplate || "{server}'s Server Icon", vars);
        const description = applyTemplate(data.descriptionTemplate || 'Requested by {mention}', vars);

        if (data.embedEnabled === false) {
          await message.channel.send({
            content: applyTemplate(data.plainTextTemplate || "{server}'s server icon: {iconUrl}", vars),
            components: createButtons(data, iconUrl),
          });
          return true;
        }

        const embed = new EmbedBuilder()
          .setColor(hexToInt(data.embedColor || '#3B82F6'))
          .setTitle(title)
          .setDescription(description)
          .setImage(iconUrl);

        if (data.logoName || data.logoUrl) {
          embed.setAuthor({ name: applyTemplate(data.logoName || 'Server Icon', vars), iconURL: data.logoUrl || undefined });
        }
        if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, vars) });

        await message.channel.send({
          embeds: [embed],
          components: createButtons(data, iconUrl),
        });
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = String(node.data?.command || 'servericon').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `
// Server Icon command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _rest = message.content.slice("${cmd}".length);
  if (!_rest || /^\\s/.test(_rest)) {
    const _url = message.guild.iconURL({ size: 4096, extension: "png", forceStatic: false });
    message.channel.send(_url || "This server does not have an icon.");
  }
}`;
      },
    },
  },
};
