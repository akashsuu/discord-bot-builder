'use strict';

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'prefix').trim() || 'prefix';
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
    if (!rest || /^\s/.test(rest)) return { args: rest.trim(), command: cmd };
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
  const parsed = parseInt(String(hex || '#14B8A6').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0x14B8A6 : parsed;
}

function canManageGuild(message) {
  const perms = message.member?.permissions;
  if (!perms?.has) return true;
  return perms.has(PermissionFlagsBits.ManageGuild);
}

function validPrefix(value) {
  const clean = String(value || '').trim();
  return clean.length >= 1 && clean.length <= 5 && !/\s/.test(clean);
}

function varsFor(message, data, oldPrefix, newPrefix) {
  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || message.author?.username || 'Unknown',
    id: message.author?.id || '',
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    server: message.guild?.name || 'Server',
    serverId: message.guild?.id || '',
    channel: message.channel?.name || '',
    command: data.command || 'prefix',
    oldPrefix,
    newPrefix,
    prefix: newPrefix || oldPrefix,
  };
}

module.exports = {
  meta: {
    name: 'Prefix',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Change the bot prefix for the current server.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    util_prefix: {
      label: 'Prefix',
      icon: 'PX',
      color: '#14B8A6',
      description: 'Prefix command that shows or changes the active bot prefix for this server.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'prefix', required: true },
        aliases: { type: 'string', default: 'setprefix', required: false },
        requireManageGuild: { type: 'boolean', default: true, required: false },
        titleTemplate: { type: 'string', default: 'Prefix Updated', required: false },
        descriptionTemplate: { type: 'string', default: 'Prefix changed from `{oldPrefix}` to `{newPrefix}`.', required: false },
        plainTextTemplate: { type: 'string', default: 'Prefix changed from {oldPrefix} to {newPrefix}.', required: false },
        currentMessage: { type: 'string', default: 'Current prefix is `{oldPrefix}`. Use `{oldPrefix}{command} <new prefix>` to change it.', required: false },
        permissionMessage: { type: 'string', default: 'You need Manage Server permission to change the prefix.', required: false },
        invalidMessage: { type: 'string', default: 'Please provide a prefix from 1 to 5 characters without spaces.', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;

        const data = node.data || {};
        const oldPrefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command, oldPrefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, oldPrefix)),
        ];
        const matched = matchCommand(message.content, commands);
        if (!matched) return false;

        const requestedPrefix = matched.args.split(/\s+/)[0] || '';
        const vars = varsFor(message, data, oldPrefix, requestedPrefix || oldPrefix);

        if (!requestedPrefix) {
          await message.channel.send(applyTemplate(data.currentMessage || 'Current prefix is `{oldPrefix}`. Use `{oldPrefix}{command} <new prefix>` to change it.', vars));
          return true;
        }

        if (data.requireManageGuild !== false && !canManageGuild(message)) {
          await message.channel.send(applyTemplate(data.permissionMessage || 'You need Manage Server permission to change the prefix.', vars));
          return true;
        }

        if (!validPrefix(requestedPrefix)) {
          await message.channel.send(applyTemplate(data.invalidMessage || 'Please provide a prefix from 1 to 5 characters without spaces.', vars));
          return true;
        }

        const newPrefix = ctx?.setPrefix
          ? ctx.setPrefix(requestedPrefix, message.guild.id)
          : requestedPrefix;
        const updatedVars = varsFor(message, data, oldPrefix, newPrefix);
        const description = applyTemplate(data.descriptionTemplate || 'Prefix changed from `{oldPrefix}` to `{newPrefix}`.', updatedVars);

        if (data.embedEnabled === false) {
          await message.channel.send(applyTemplate(data.plainTextTemplate || 'Prefix changed from {oldPrefix} to {newPrefix}.', updatedVars));
          return true;
        }

        const embed = new EmbedBuilder()
          .setColor(hexToInt(data.embedColor || '#14B8A6'))
          .setTitle(applyTemplate(data.titleTemplate || 'Prefix Updated', updatedVars))
          .setDescription(description);

        if (data.logoName || data.logoUrl) {
          embed.setAuthor({ name: applyTemplate(data.logoName || 'Prefix', updatedVars), iconURL: data.logoUrl || undefined });
        }
        if (data.imageUrl) embed.setImage(applyTemplate(data.imageUrl, updatedVars));
        if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, updatedVars) });

        await message.channel.send({ embeds: [embed] });
        return true;
      },

      generateCode(node, prefix = '!') {
        const rawCmd = String(node.data?.command || 'prefix').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `
// Prefix command
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _rest = message.content.slice("${cmd}".length).trim();
  if (!_rest) {
    message.channel.send("Current prefix is ${prefix || '!'}.");
  } else {
    message.channel.send("Prefix changed to " + _rest + ". Restart/export runtime support may need a dynamic prefix variable.");
  }
}`;
      },
    },
  },
};
