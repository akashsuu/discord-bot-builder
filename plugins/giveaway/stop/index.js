'use strict';

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'giveaway-stop').trim() || 'giveaway-stop';
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

function hexToInt(hex) {
  const parsed = parseInt(String(hex || '#DC2626').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0xDC2626 : parsed;
}

function formatTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

module.exports = {
  meta: {
    name: 'Giveaway Stop',
    version: '1.0.0',
    author: 'Kiodium',
    description: 'Stop active giveaways across all channels in the current server.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    giveaway_stop: {
      label: 'Giveaway Stop',
      icon: 'GSTP',
      color: '#DC2626',
      description: 'Admin command to stop every active giveaway in the server.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'giveaway-stop', required: true },
        aliases: { type: 'string', default: 'gstop,endgiveaway,stopgiveaway' },
        embedEnabled: { type: 'boolean', default: true },
        embedColor: { type: 'string', default: '#DC2626' },
        titleTemplate: { type: 'string', default: 'Giveaways Stopped' },
        descriptionTemplate: { type: 'string', default: 'Stopped **{count}** active giveaway(s) across all channels.' },
        plainTextTemplate: { type: 'string', default: 'Stopped {count} active giveaway(s) across all channels.' },
        noneMessage: { type: 'string', default: 'No active giveaways found in this server.' },
        permissionMessage: { type: 'string', default: 'You need Manage Server permission to stop giveaways.' },
        errorMessage: { type: 'string', default: 'Could not stop giveaways: {error}' },
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

        if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
          await message.reply(data.permissionMessage || 'You need Manage Server permission to stop giveaways.').catch(() => {});
          return true;
        }

        try {
          const active = globalThis.__kiodiumActiveGiveaways || new Map();
          const stopOne = globalThis.__kiodiumEndGiveaway;
          const ids = [...active.entries()]
            .filter(([, record]) => record?.guildId === message.guild.id || record?.message?.guild?.id === message.guild.id)
            .map(([id]) => id);

          if (!ids.length) {
            await message.reply(data.noneMessage || 'No active giveaways found in this server.').catch(() => {});
            return true;
          }

          for (const id of ids) {
            if (typeof stopOne === 'function') await stopOne(id);
            else active.delete(id);
          }

          const vars = { count: ids.length, server: message.guild.name, channel: message.channel.name };
          if (data.embedEnabled === false) {
            await message.channel.send(formatTemplate(data.plainTextTemplate || 'Stopped {count} active giveaway(s) across all channels.', vars));
          } else {
            const embed = new EmbedBuilder()
              .setColor(hexToInt(data.embedColor))
              .setTitle(formatTemplate(data.titleTemplate || 'Giveaways Stopped', vars).slice(0, 256))
              .setDescription(formatTemplate(data.descriptionTemplate || 'Stopped **{count}** active giveaway(s) across all channels.', vars).slice(0, 4096))
              .setTimestamp();
            await message.channel.send({ embeds: [embed] });
          }
        } catch (err) {
          await message.reply(formatTemplate(data.errorMessage || 'Could not stop giveaways: {error}', { error: err.message })).catch(() => {});
        }

        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = String(node.data?.command || 'giveaway-stop').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `// Giveaway Stop command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  message.channel.send("Giveaway Stop runs through the Kiodium plugin runtime and stops active giveaways across all channels.");
}`;
      },
    },
  },
};
