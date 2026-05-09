'use strict';

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ticketHelpers = require('../ticketHelpers');

module.exports = {
  meta: {
    name: 'Add User to Ticket',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Add a user to the current ticket channel.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_add: {
      label: 'Add User to Ticket',
      icon: 'PLUS',
      color: '#9B59B6',
      description: 'Add a mentioned user to the ticket channel permissions.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Success', type: 'flow' }, { id: 'err', label: 'Error', type: 'flow' }],

      configSchema: {
        command: {
          type: 'string',
          default: 'add',
          required: true,
        },
      },

      async execute(ctx) {
        const { node, message } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const cmd = (node.data?.command || 'add').toLowerCase();
        if (!message.content.toLowerCase().startsWith(cmd)) return false;

        try {
          const ticket = ticketHelpers.getTicketByChannel(message.channelId);
          if (!ticket) {
            await message.reply('This is not a ticket channel.').catch(() => {});
            return false;
          }

          const target = message.mentions.members?.first();
          if (!target) {
            await message.reply(`Usage: \`${cmd} @user\``).catch(() => {});
            return false;
          }

          // Add permissions
          await message.channel.permissionOverwrites.create(target, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
          }).catch(() => {});

          // Add to staff list
          ticketHelpers.addStaffMember(message.channelId, target.id);

          const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('✅ User Added')
            .setDescription(`${target.user.tag} has been added to this ticket.`)
            .setTimestamp();

          await message.reply({ embeds: [embed] }).catch(() => {});
          return true;
        } catch (err) {
          console.error('Error in ticket_add:', err);
          return false;
        }
      },

      generateCode(node) {
        return `
async function addUserToTicket(channel, targetUser) {
  const { EmbedBuilder } = require('discord.js');

  await channel.permissionOverwrites.create(targetUser, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
  });

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle('✅ User Added')
    .setDescription(\`\${targetUser.tag} added to ticket\`);

  await channel.send({ embeds: [embed] });
}`;
      },
    },
  },
};
