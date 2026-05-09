'use strict';

const { EmbedBuilder } = require('discord.js');
const ticketHelpers = require('../ticketHelpers');

module.exports = {
  meta: {
    name: 'Remove User from Ticket',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Remove a user from the current ticket channel.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_remove: {
      label: 'Remove User from Ticket',
      icon: 'MINUS',
      color: '#E74C3C',
      description: 'Remove a mentioned user from the ticket channel.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Success', type: 'flow' }, { id: 'err', label: 'Error', type: 'flow' }],

      configSchema: {
        command: {
          type: 'string',
          default: 'remove',
          required: true,
        },
      },

      async execute(ctx) {
        const { node, message } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const cmd = (node.data?.command || 'remove').toLowerCase();
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

          // Remove permissions
          await message.channel.permissionOverwrites.delete(target).catch(() => {});

          // Remove from staff list
          ticketHelpers.removeStaffMember(message.channelId, target.id);

          const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('✅ User Removed')
            .setDescription(`${target.user.tag} has been removed from this ticket.`)
            .setTimestamp();

          await message.reply({ embeds: [embed] }).catch(() => {});
          return true;
        } catch (err) {
          console.error('Error in ticket_remove:', err);
          return false;
        }
      },

      generateCode(node) {
        return `
async function removeUserFromTicket(channel, targetUser) {
  const { EmbedBuilder } = require('discord.js');

  await channel.permissionOverwrites.delete(targetUser).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor('#E74C3C')
    .setTitle('✅ User Removed')
    .setDescription(\`\${targetUser.tag} removed from ticket\`);

  await channel.send({ embeds: [embed] });
}`;
      },
    },
  },
};
