'use strict';

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ticketHelpers = require('../ticketHelpers');

module.exports = {
  meta: {
    name: 'Unlock Ticket',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Unlock a ticket channel allowing users to send messages again.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_unlock: {
      label: 'Unlock Ticket',
      icon: 'UNLOCK',
      color: '#27AE60',
      description: 'Unlock the ticket channel (restore send messages permission).',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Success', type: 'flow' }, { id: 'err', label: 'Error', type: 'flow' }],

      configSchema: {
        command: {
          type: 'string',
          default: 'unlock',
          required: true,
        },
      },

      async execute(ctx) {
        const { node, message } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const cmd = (node.data?.command || 'unlock').toLowerCase();
        if (!message.content.toLowerCase().startsWith(cmd)) return false;

        try {
          const ticket = ticketHelpers.getTicketByChannel(message.channelId);
          if (!ticket) {
            await message.reply('This is not a ticket channel.').catch(() => {});
            return false;
          }

          if (!ticket.locked) {
            await message.reply('This ticket is not locked.').catch(() => {});
            return false;
          }

          // Unlock the channel
          const ticketOwner = await message.guild.members.fetch(ticket.ownerId).catch(() => null);
          if (ticketOwner) {
            await message.channel.permissionOverwrites.create(ticketOwner, {
              SendMessages: true,
            }).catch(() => {});
          }

          // Update database
          const tickets = ticketHelpers.loadTickets();
          const ticketData = tickets.find((t) => t.channelId === message.channelId);
          if (ticketData) {
            ticketData.locked = false;
            ticketHelpers.saveTickets(tickets);
          }

          const embed = new EmbedBuilder()
            .setColor('#27AE60')
            .setTitle('🔓 Ticket Unlocked')
            .setDescription('This ticket is now unlocked. Users can send messages again.')
            .setTimestamp();

          await message.reply({ embeds: [embed] }).catch(() => {});
          return true;
        } catch (err) {
          console.error('Error in ticket_unlock:', err);
          return false;
        }
      },

      generateCode(node) {
        return `
async function unlockTicket(channel, ticketOwner) {
  const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

  // Allow send messages
  await channel.permissionOverwrites.create(ticketOwner, {
    SendMessages: true
  }).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor('#27AE60')
    .setTitle('🔓 Ticket Unlocked')
    .setDescription('This ticket is now unlocked.');

  await channel.send({ embeds: [embed] });
}`;
      },
    },
  },
};
