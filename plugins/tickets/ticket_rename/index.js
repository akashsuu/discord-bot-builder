'use strict';

/**
 * ticket_rename/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Command: !rename <new-name>
 * Renames the ticket channel.
 */

const path = require('path');

const ticketHelper = require(path.join(__dirname, '..', 'helpers', 'tickets.js'));
const permHelper   = require(path.join(__dirname, '..', 'helpers', 'permissions.js'));
const logHelper    = require(path.join(__dirname, '..', 'helpers', 'logger.js'));

module.exports = {
  meta: {
    name:          'Ticket Rename',
    version:       '1.0.0',
    author:        'Akashsuu',
    description:   'Renames the ticket channel to a custom name.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_rename: {
      label:       'Ticket Rename',
      icon:        '✏️',
      color:       '#6C3483',
      description: 'Renames the ticket channel.',
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command:      { type: 'string', default: 'rename' },
        supportRoles: { type: 'string', default: '' },
        logChannel:   { type: 'string', default: '' },
      },

      async execute(node, message, ctx) {
        if (!message || !message.guild || message.author?.bot) return false;

        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const rawCommand = (data.command || 'rename').trim();
        const trigger = (prefix && !rawCommand.startsWith(prefix)) ? `${prefix}${rawCommand}` : rawCommand;
        if (!message.content.trim().toLowerCase().startsWith(trigger.toLowerCase())) return false;

        const ticket = ticketHelper.getTicket(message.channel);
        if (!ticket) {
          await message.reply('❌ Not a tracked ticket.').catch(() => {});
          return false;
        }

        const isStaff = permHelper.isSupportStaff(message.member, data);
        if (!isStaff) {
          await message.reply('❌ Only support staff can rename tickets.').catch(() => {});
          return false;
        }

        const newName = message.content.slice(trigger.length).trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/--+/g, '-')
          .slice(0, 100);

        if (!newName) {
          await message.reply(`Usage: \`${trigger} <new-name>\``).catch(() => {});
          return false;
        }

        const oldName = message.channel.name;
        try {
          await message.channel.setName(newName, `Renamed by ${message.author.tag}`);
        } catch (err) {
          await message.reply(`❌ Failed to rename: ${err.message}`).catch(() => {});
          return false;
        }

        await message.channel.send(`✏️ Ticket renamed: \`${oldName}\` → \`${newName}\``).catch(() => {});

        if (message.client) {
          await logHelper.sendLog(message.client, data.logChannel, 'renamed', {
            '✏️ Renamed By': `<@${message.author.id}>`,
            '📌 Old Name':   oldName,
            '📌 New Name':   newName,
          }, ticket);
        }

        return true;
      },

      generateCode(node) {
        return `
// ── Ticket Rename ─────────────────────────────────────────────────────────────
if (message.content.startsWith(prefix + 'rename')) {
  const newName = message.content.slice((prefix + 'rename').length).trim()
    .toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);
  if (!newName) return message.reply('Usage: rename <new-name>');
  await message.channel.setName(newName);
  message.channel.send('✏️ Ticket renamed to ' + newName);
}
`;
      },
    },
  },
};
