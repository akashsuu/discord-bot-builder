'use strict';

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ticketHelpers = require('../ticketHelpers');

module.exports = {
  meta: {
    name: 'Lock Ticket',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Lock a ticket channel preventing users from sending messages.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_lock: {
      label: 'Lock Ticket',
      icon: 'LOCK',
      color: '#34495E',
      description: 'Lock the ticket channel (users can view but not send messages).',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Success', type: 'flow' }, { id: 'err', label: 'Error', type: 'flow' }],

      configSchema: {
        command: {
          type: 'string',
          default: 'lock',
          required: true,
        },
      },

      async execute(ctx) {
        const { node, message } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const cmd = (node.data?.command || 'lock').toLowerCase();
        if (!message.content.toLowerCase().startsWith(cmd)) return false;

        try {
          const ticket = ticketHelpers.getTicketByChannel(message.channelId);
          if (!ticket) {
            await message.reply('This is not a ticket channel.').catch(() => {});
            return false;
          }

          if (ticket.locked) {
            await message.reply('This ticket is already locked.').catch(() => {});
            return false;
          }

          // Lock the channel
          const ticketOwner = await message.guild.members.fetch(ticket.ownerId).catch(() => null);
          if (ticketOwner) {
            await message.channel.permissionOverwrites.create(ticketOwner, {
              SendMessages: false,
            }).catch(() => {});
          }

          // Update database
          const tickets = ticketHelpers.loadTickets();
          const ticketData = tickets.find((t) => t.channelId === message.channelId);
          if (ticketData) {
            ticketData.locked = true;
            ticketHelpers.saveTickets(tickets);
          }

          const embed = new EmbedBuilder()
            .setColor('#34495E')
            .setTitle('🔒 Ticket Locked')
            .setDescription('This ticket is now locked. No one can send messages.')
            .setTimestamp();

          await message.reply({ embeds: [embed] }).catch(() => {});
          return true;
        } catch (err) {
          console.error('Error in ticket_lock:', err);
          return false;
        }
      },

      generateCode(node) {
        return `
async function lockTicket(channel, ticketOwner) {
  const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

  // Deny send messages for all users
  const overwrites = channel.permissionOverwrites.cache.map(ow => ({
    id: ow.id,
    allow: ow.allow,
    deny: ow.deny.add(PermissionFlagsBits.SendMessages)
  }));

  for (const ow of overwrites) {
    await channel.permissionOverwrites.create(ow.id, {
      SendMessages: false
    }).catch(() => {});
  }

  const embed = new EmbedBuilder()
    .setColor('#34495E')
    .setTitle('🔒 Ticket Locked')
    .setDescription('This ticket is now locked.');

  await channel.send({ embeds: [embed] });
}`;
      },
    },
  },
};
