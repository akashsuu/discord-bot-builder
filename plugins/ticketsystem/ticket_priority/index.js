'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ticketHelpers = require('../ticketHelpers');

module.exports = {
  meta: {
    name: 'Set Ticket Priority',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Set the priority level of a ticket (low/medium/high/urgent).',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_priority: {
      label: 'Set Ticket Priority',
      icon: 'ALERT',
      color: '#F39C12',
      description: 'Set ticket priority level and update channel indicator.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Success', type: 'flow' }, { id: 'err', label: 'Error', type: 'flow' }],

      configSchema: {
        command: {
          type: 'string',
          default: 'priority',
          required: true,
        },
        priority: {
          type: 'string',
          default: 'medium',
          required: false,
          description: 'Default priority: low, medium, high, urgent'
        },
      },

      async execute(ctx) {
        const { node, message } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const cmd = (node.data?.command || 'priority').toLowerCase();
        if (!message.content.toLowerCase().startsWith(cmd)) return false;

        try {
          const ticket = ticketHelpers.getTicketByChannel(message.channelId);
          if (!ticket) {
            await message.reply('This is not a ticket channel.').catch(() => {});
            return false;
          }

          const args = message.content.split(' ').slice(1);
          const priority = (args[0] || node.data?.priority || 'medium').toLowerCase();

          const validPriorities = ['low', 'medium', 'high', 'urgent'];
          if (!validPriorities.includes(priority)) {
            await message.reply(`Invalid priority. Use: ${validPriorities.join(', ')}`).catch(() => {});
            return false;
          }

          // Update priority
          ticketHelpers.setPriority(message.channelId, priority);

          // Update channel name with priority indicator
          const emoji = ticketHelpers.getPriorityEmoji(priority);
          const newName = `${emoji}-${message.channel.name.split('-').slice(1).join('-')}`.slice(0, 100);
          await message.channel.setName(newName).catch(() => {});

          const color = ticketHelpers.getPriorityColor(priority);
          const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${emoji} Priority Updated`)
            .setDescription(`Ticket priority set to **${priority.toUpperCase()}**`)
            .setTimestamp();

          await message.reply({ embeds: [embed] }).catch(() => {});
          return true;
        } catch (err) {
          console.error('Error in ticket_priority:', err);
          return false;
        }
      },

      generateCode(node) {
        return `
async function setTicketPriority(channel, priority = 'medium') {
  const { EmbedBuilder } = require('discord.js');

  const priorities = {
    low: { emoji: '🔵', color: '#3498db' },
    medium: { emoji: '🟡', color: '#f39c12' },
    high: { emoji: '🔴', color: '#e74c3c' },
    urgent: { emoji: '🚨', color: '#c0392b' }
  };

  const p = priorities[priority] || priorities.medium;
  const newName = \`\${p.emoji}-\${channel.name.split('-').slice(1).join('-')}\`.slice(0, 100);

  await channel.setName(newName).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(p.color)
    .setTitle(\`\${p.emoji} Priority: \${priority.toUpperCase()}\`)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}`;
      },
    },
  },
};
