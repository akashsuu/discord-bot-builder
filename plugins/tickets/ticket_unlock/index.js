'use strict';

/**
 * ticket_unlock/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Command: !unlock
 * Unlocks the ticket — restores SendMessages for the ticket owner.
 */

const path = require('path');

const ticketHelper = require(path.join(__dirname, '..', 'helpers', 'tickets.js'));
const permHelper = require(path.join(__dirname, '..', 'helpers', 'permissions.js'));
const logHelper = require(path.join(__dirname, '..', 'helpers', 'logger.js'));

function applyTemplate(str, vars) {
 return String(str || '').replace(/\{(\w+)\}/g, (m, k) =>
 Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m
 );
}

module.exports = {
 meta: {
 name: 'Ticket Unlock',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Unlocks a ticket restoring the owner\'s ability to send messages.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 ticket_unlock: {
 label: 'Ticket Unlock',
 icon: '🔓',
 color: '#148F77',
 description: 'Unlocks ticket — owner can send messages again.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'unlock' },
 unlockMessage:{ type: 'string', default: '🔓 **Ticket Unlocked** — The ticket owner can send messages again.' },
 supportRoles: { type: 'string', default: '' },
 logChannel: { type: 'string', default: '' },
 },

 async execute(node, message, ctx) {
 if (!message || !message.guild || message.author?.bot) return false;

 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const rawCommand = (data.command || 'unlock').trim();
 const command = (prefix && !rawCommand.startsWith(prefix)) ? `${prefix}${rawCommand}` : rawCommand;
 if (!message.content.trim().toLowerCase().startsWith(command.toLowerCase())) return false;

 const ticket = ticketHelper.getTicket(message.channel);
 if (!ticket) {
 await message.reply('❌ Not a tracked ticket.').catch(() => {});
 return false;
 }

 const isStaff = permHelper.isSupportStaff(message.member, data);
 if (!isStaff) {
 await message.reply('❌ Only support staff can unlock tickets.').catch(() => {});
 return false;
 }

 if (!ticket.locked) {
 await message.reply('❌ This ticket is not locked.').catch(() => {});
 return false;
 }

 const ok = await permHelper.unlockChannel(message.channel, ticket.ownerId);
 if (!ok) {
 await message.reply('❌ Failed to unlock channel.').catch(() => {});
 return false;
 }

 ticketHelper.updateTicket(message.channel.id, { locked: false });
 if (data.unlockMessage) {
 await message.channel.send(applyTemplate(data.unlockMessage, {
 user: message.author.username,
 mention: `<@${message.author.id}>`,
 ticketId: ticket.ticketId,
 channel: message.channel.name,
 })).catch(() => {});
 } else {
 await message.channel.send('🔓 **Ticket Unlocked** — The ticket owner can send messages again.').catch(() => {});

 }

 if (message.client) {
 await logHelper.sendLog(message.client, data.logChannel, 'unlocked', {
 '🔓 Unlocked By': `<@${message.author.id}>`,
 }, ticket);
 }

 return true;
 },

 generateCode(node) {
 return `
// ── Ticket Unlock ─────────────────────────────────────────────────────────────
if (message.content.startsWith(prefix + 'unlock')) {
 const ticket = ticketStore[message.channel.id];
 if (!ticket) return message.reply('Not a ticket.');
 await message.channel.permissionOverwrites.edit(ticket.ownerId, { SendMessages: true });
 ticket.locked = false;
 saveTickets(ticketStore);
 message.channel.send('🔓 Ticket unlocked.');
}
`;
 },
 },
 },
};
