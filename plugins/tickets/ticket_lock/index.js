'use strict';

/**
 * ticket_lock/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Command: !lock
 * Locks the ticket — removes SendMessages from the ticket owner.
 */

const path = require('path');

const ticketHelper = require(path.join(__dirname, '..', 'helpers', 'tickets.js'));
const permHelper   = require(path.join(__dirname, '..', 'helpers', 'permissions.js'));
const logHelper    = require(path.join(__dirname, '..', 'helpers', 'logger.js'));

function applyTemplate(str, vars) {
  return String(str || '').replace(/\{(\w+)\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m
  );
}

module.exports = {
  meta: {
    name:          'Ticket Lock',
    version:       '1.0.0',
    author:        'Akashsuu',
    description:   'Locks a ticket preventing the owner from sending messages.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_lock: {
      label:       'Ticket Lock',
      icon:        '🔐',
      color:       '#7D6608',
      description: 'Locks ticket — owner cannot send messages.',
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command:      { type: 'string', default: 'lock' },
        lockMessage:  { type: 'string', default: '🔐 **Ticket Locked** — The ticket owner can no longer send messages.' },
        supportRoles: { type: 'string', default: '' },
        logChannel:   { type: 'string', default: '' },
      },

      async execute(node, message, ctx) {
        if (!message || !message.guild || message.author?.bot) return false;

        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const rawCommand = (data.command || 'lock').trim();
        const command = (prefix && !rawCommand.startsWith(prefix)) ? `${prefix}${rawCommand}` : rawCommand;
        if (!message.content.trim().toLowerCase().startsWith(command.toLowerCase())) return false;

        const ticket = ticketHelper.getTicket(message.channel);
        if (!ticket) {
          await message.reply('❌ Not a tracked ticket.').catch(() => {});
          return false;
        }

        const isStaff = permHelper.isSupportStaff(message.member, data);
        if (!isStaff) {
          await message.reply('❌ Only support staff can lock tickets.').catch(() => {});
          return false;
        }

        if (ticket.locked) {
          await message.reply('❌ This ticket is already locked.').catch(() => {});
          return false;
        }

        const ok = await permHelper.lockChannel(message.channel, ticket.ownerId);
        if (!ok) {
          await message.reply('❌ Failed to lock channel.').catch(() => {});
          return false;
        }

        ticketHelper.updateTicket(message.channel.id, { locked: true });
        if (data.lockMessage) {
          await message.channel.send(applyTemplate(data.lockMessage, {
            user: message.author.username,
            mention: `<@${message.author.id}>`,
            ticketId: ticket.ticketId,
            channel: message.channel.name,
          })).catch(() => {});
        } else {
        await message.channel.send('🔐 **Ticket Locked** — The ticket owner can no longer send messages.').catch(() => {});

        }

        if (message.client) {
          await logHelper.sendLog(message.client, data.logChannel, 'locked', {
            '🔐 Locked By': `<@${message.author.id}>`,
          }, ticket);
        }

        return true;
      },

      generateCode(node) {
        return `
// ── Ticket Lock ───────────────────────────────────────────────────────────────
if (message.content.startsWith(prefix + 'lock')) {
  const ticket = ticketStore[message.channel.id];
  if (!ticket) return message.reply('Not a ticket.');
  await message.channel.permissionOverwrites.edit(ticket.ownerId, { SendMessages: false });
  ticket.locked = true;
  saveTickets(ticketStore);
  message.channel.send('🔐 Ticket locked.');
}
`;
      },
    },
  },
};
