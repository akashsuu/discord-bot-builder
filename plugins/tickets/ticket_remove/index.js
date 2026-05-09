'use strict';

/**
 * ticket_remove/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Command: !remove @user
 * Removes a mentioned user from the current ticket channel.
 */

const path = require('path');

const ticketHelper = require(path.join(__dirname, '..', 'helpers', 'tickets.js'));
const permHelper   = require(path.join(__dirname, '..', 'helpers', 'permissions.js'));
const logHelper    = require(path.join(__dirname, '..', 'helpers', 'logger.js'));

module.exports = {
  meta: {
    name:          'Ticket Remove User',
    version:       '1.0.0',
    author:        'Akashsuu',
    description:   'Removes a user from the current ticket channel.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_remove: {
      label:       'Ticket Remove User',
      icon:        '➖',
      color:       '#7B241C',
      description: 'Removes a mentioned user from the ticket channel.',
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command:      { type: 'string', default: 'remove' },
        supportRoles: { type: 'string', default: '' },
        logChannel:   { type: 'string', default: '' },
      },

      async execute(node, message, ctx) {
        if (!message || !message.guild || message.author?.bot) return false;

        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const rawCommand = (data.command || 'remove').trim();
        const command = (prefix && !rawCommand.startsWith(prefix)) ? `${prefix}${rawCommand}` : rawCommand;
        if (!message.content.trim().toLowerCase().startsWith(command.toLowerCase())) return false;

        const ticket = ticketHelper.getTicket(message.channel);
        if (!ticket) {
          await message.reply('❌ This is not a tracked ticket.').catch(() => {});
          return false;
        }

        const isStaff = permHelper.isSupportStaff(message.member, data);
        if (!isStaff) {
          await message.reply('❌ Only support staff can remove users.').catch(() => {});
          return false;
        }

        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply(`Usage: \`${command} @user\``).catch(() => {});
          return false;
        }

        // Cannot remove the ticket owner
        if (target.id === ticket.ownerId) {
          await message.reply('❌ Cannot remove the ticket owner.').catch(() => {});
          return false;
        }

        const ok = await permHelper.removeUserFromChannel(message.channel, target.id);
        if (!ok) {
          await message.reply('❌ Failed to remove user — missing permissions.').catch(() => {});
          return false;
        }

        await message.channel.send(`✅ <@${target.id}> has been removed from the ticket.`).catch(() => {});

        if (message.client) {
          await logHelper.sendLog(message.client, data.logChannel, 'removed', {
            '➖ Removed User': `<@${target.id}>`,
            '👤 By':            `<@${message.author.id}>`,
          }, ticket);
        }

        return true;
      },

      generateCode(node) {
        return `
// ── Ticket Remove User ─────────────────────────────────────────────────────────
if (message.content.startsWith(prefix + 'remove')) {
  const target = message.mentions.members?.first();
  if (!target) return message.reply('Usage: ' + prefix + 'remove @user');
  await message.channel.permissionOverwrites.delete(target.id);
  message.channel.send('<@' + target.id + '> has been removed from the ticket.');
}
`;
      },
    },
  },
};
