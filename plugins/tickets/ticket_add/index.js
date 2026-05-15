'use strict';

/**
 * ticket_add/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Command: !add @user
 * Adds a mentioned user to the current ticket channel.
 */

const path = require('path');

const ticketHelper = require(path.join(__dirname, '..', 'helpers', 'tickets.js'));
const permHelper = require(path.join(__dirname, '..', 'helpers', 'permissions.js'));
const logHelper = require(path.join(__dirname, '..', 'helpers', 'logger.js'));

module.exports = {
 meta: {
 name: 'Ticket Add User',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Adds a user to the current ticket channel.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 ticket_add: {
 label: 'Ticket Add User',
 icon: '➕',
 color: '#1E8449',
 description: 'Adds a mentioned user to the ticket channel.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'add' },
 supportRoles: { type: 'string', default: '' },
 logChannel: { type: 'string', default: '' },
 },

 async execute(node, message, ctx) {
 if (!message || !message.guild || message.author?.bot) return false;

 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const rawCommand = (data.command || 'add').trim();
 const command = (prefix && !rawCommand.startsWith(prefix)) ? `${prefix}${rawCommand}` : rawCommand;
 if (!message.content.trim().toLowerCase().startsWith(command.toLowerCase())) return false;

 const ticket = ticketHelper.getTicket(message.channel);
 if (!ticket) {
 await message.reply('❌ This is not a tracked ticket.').catch(() => {});
 return false;
 }

 const isStaff = permHelper.isSupportStaff(message.member, data);
 if (!isStaff) {
 await message.reply('❌ Only support staff can add users.').catch(() => {});
 return false;
 }

 const target = message.mentions.members?.first();
 if (!target) {
 await message.reply(`Usage: \`${command} @user\``).catch(() => {});
 return false;
 }

 const ok = await permHelper.addUserToChannel(message.channel, target.id);
 if (!ok) {
 await message.reply('❌ Failed to add user — missing permissions.').catch(() => {});
 return false;
 }

 await message.channel.send(`✅ <@${target.id}> has been added to the ticket.`).catch(() => {});

 if (message.client) {
 await logHelper.sendLog(message.client, data.logChannel, 'added', {
 '➕ Added User': `<@${target.id}>`,
 '👤 By': `<@${message.author.id}>`,
 }, ticket);
 }

 return true;
 },

 generateCode(node) {
 return `
// ── Ticket Add User ────────────────────────────────────────────────────────────
if (message.content.startsWith(prefix + 'add')) {
 const target = message.mentions.members?.first();
 if (!target) return message.reply('Usage: ' + prefix + 'add @user');
 await message.channel.permissionOverwrites.edit(target.id, {
 ViewChannel: true, SendMessages: true, ReadMessageHistory: true
 });
 message.channel.send('<@' + target.id + '> has been added to the ticket.');
}
`;
 },
 },
 },
};
