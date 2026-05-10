'use strict';

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'steal').trim() || 'steal';
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
  const parsed = parseInt(String(hex || '#F59E0B').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0xF59E0B : parsed;
}

function findEmoji(content) {
  const match = String(content || '').match(/<a?:([a-zA-Z0-9_]{2,32}):(\d{15,25})>/);
  if (!match) return null;
  const animated = match[0].startsWith('<a:');
  return {
    name: match[1],
    id: match[2],
    animated,
    url: `https://cdn.discordapp.com/emojis/${match[2]}.${animated ? 'gif' : 'png'}?quality=lossless`,
  };
}

function sanitizeName(name, fallback) {
  const clean = String(name || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 32);
  return clean || fallback || 'stolen';
}

async function getReferencedMessage(message) {
  if (!message.reference?.messageId || !message.channel?.messages?.fetch) return null;
  try { return await message.channel.messages.fetch(message.reference.messageId); }
  catch { return null; }
}

function stickerUrl(sticker) {
  return sticker?.url || `https://media.discordapp.net/stickers/${sticker?.id}.png`;
}

function hasManagePermission(message) {
  const member = message.guild?.members?.me || message.guild?.members?.cache?.get(message.client?.user?.id);
  if (!member?.permissions?.has) return true;
  return member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)
    || member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers);
}

function baseVars(message, extra = {}) {
  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || message.author?.username || 'Unknown',
    id: message.author?.id || '',
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    server: message.guild?.name || 'Server',
    serverId: message.guild?.id || '',
    channel: message.channel?.name || '',
    ...extra,
  };
}

async function sendResult(message, data, vars) {
  const result = vars.result || applyTemplate(data.successMessage || 'Added {type} **{name}** to {server}.', vars);
  const fullVars = { ...vars, result };
  if (data.embedEnabled === false) {
    await message.channel.send(applyTemplate(data.plainTextTemplate || '{result}', fullVars));
    return;
  }
  const embed = new EmbedBuilder()
    .setColor(hexToInt(data.embedColor || '#F59E0B'))
    .setTitle(applyTemplate(data.titleTemplate || 'Stolen {type}', fullVars))
    .setDescription(applyTemplate(data.descriptionTemplate || '{result}', fullVars));
  if (vars.url) embed.setImage(vars.url);
  if (data.logoName || data.logoUrl) {
    embed.setAuthor({ name: applyTemplate(data.logoName || 'Steal', fullVars), iconURL: data.logoUrl || undefined });
  }
  if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, fullVars) });
  await message.channel.send({ embeds: [embed] });
}

module.exports = {
  meta: {
    name: 'Steal',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Steal emojis and stickers from messages.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    util_steal: {
      label: 'Steal',
      icon: 'STL',
      color: '#F59E0B',
      description: 'Prefix command that adds a custom emoji from text/reply, or a sticker from a replied message.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'steal', required: true },
        aliases: { type: 'string', default: '', required: false },
        successMessage: { type: 'string', default: 'Added {type} **{name}** to {server}.', required: false },
        notFoundMessage: { type: 'string', default: 'Reply to a message with an emoji/sticker or include a custom emoji in the command.', required: false },
        permissionMessage: { type: 'string', default: 'I need Manage Emojis and Stickers permission to do that.', required: false },
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

        if (!hasManagePermission(message)) {
          await message.channel.send(applyTemplate(data.permissionMessage || 'I need Manage Emojis and Stickers permission to do that.', baseVars(message)));
          return true;
        }

        const referenced = await getReferencedMessage(message);
        const searchText = `${matched.args || ''} ${referenced?.content || ''}`;
        const nameArg = String(matched.args || '').split(/\s+/).find((part) => !/^<a?:/.test(part));
        const emoji = findEmoji(searchText);

        try {
          if (emoji) {
            const name = sanitizeName(nameArg || emoji.name, data.defaultName || 'stolen');
            const created = await message.guild.emojis.create({ attachment: emoji.url, name });
            const vars = baseVars(message, {
              type: 'emoji',
              name: created.name || name,
              url: created.url || emoji.url,
              emoji: created.toString?.() || `<:${name}:${created.id}>`,
            });
            vars.result = applyTemplate(data.successMessage || 'Added {type} **{name}** to {server}.', vars);
            await sendResult(message, data, vars);
            return true;
          }

          const sticker = referenced?.stickers?.first?.() || referenced?.stickers?.values?.().next?.().value;
          if (sticker) {
            const name = sanitizeName(nameArg || sticker.name, data.defaultName || 'stolen');
            const created = await message.guild.stickers.create({
              file: stickerUrl(sticker),
              name,
              tags: 'stolen',
              description: `Stolen by ${message.author.username}`,
            });
            const vars = baseVars(message, {
              type: 'sticker',
              name: created.name || name,
              url: stickerUrl(created) || stickerUrl(sticker),
              emoji: '',
            });
            vars.result = applyTemplate(data.successMessage || 'Added {type} **{name}** to {server}.', vars);
            await sendResult(message, data, vars);
            return true;
          }

          await message.channel.send(applyTemplate(data.notFoundMessage || 'Reply to a message with an emoji/sticker or include a custom emoji in the command.', baseVars(message)));
          return true;
        } catch (err) {
          const vars = baseVars(message, {
            type: emoji ? 'emoji' : 'sticker',
            name: nameArg || data.defaultName || 'stolen',
            error: err?.message || 'Unknown error',
            url: emoji?.url || '',
          });
          vars.result = applyTemplate(data.errorMessage || 'I could not steal that {type}. {error}', vars);
          await sendResult(message, { ...data, embedEnabled: false }, vars);
          return true;
        }
      },

      generateCode(node, prefix = '') {
        const rawCmd = String(node.data?.command || 'steal').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `
// Steal command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _rest = message.content.slice("${cmd}".length);
  if (!_rest || /^\\s/.test(_rest)) {
    message.channel.send("Reply to a message with a custom emoji/sticker or include an emoji in the command.");
  }
}`;
      },
    },
  },
};
