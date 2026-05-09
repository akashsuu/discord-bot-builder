'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const ticketHelpers = require('../ticketHelpers');

module.exports = {
  meta: {
    name: 'Ticket Panel',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Create an interactive ticket panel with category buttons.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_panel: {
      label: 'Ticket Panel',
      icon: 'TICKETS',
      color: '#7289DA',
      description: 'Post an interactive panel for users to create tickets by category.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: {
          type: 'string',
          default: 'ticketpanel',
          required: true,
          description: 'Command to trigger panel creation'
        },
        embedTitle: {
          type: 'string',
          default: 'Support Tickets',
          required: true,
        },
        embedDescription: {
          type: 'string',
          default: 'Click a button below to create a ticket.',
          required: true,
        },
        embedColor: {
          type: 'string',
          default: '#7289DA',
          required: false,
        },
        embedThumbnail: {
          type: 'string',
          default: '',
          required: false,
        },
        embedFooter: {
          type: 'string',
          default: 'Ticket System',
          required: false,
        },
        categories: {
          type: 'string',
          default: 'support,billing,report,partnership,other',
          required: false,
          description: 'Comma-separated categories'
        },
        buttonLabels: {
          type: 'string',
          default: 'Create Support Ticket,Billing Issue,Report User,Partnership,Other',
          required: false,
          description: 'Comma-separated button labels'
        },
      },

      async execute(ctx) {
        const { node, message } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const rawCmd = (node.data?.command || 'ticketpanel').trim();
        const cmd = message.content.toLowerCase().startsWith(rawCmd.toLowerCase()) ? rawCmd : null;
        if (!cmd) return false;

        try {
          const embed = new EmbedBuilder()
            .setTitle(node.data?.embedTitle || 'Support Tickets')
            .setDescription(node.data?.embedDescription || 'Click a button below to create a ticket.')
            .setColor(node.data?.embedColor || '#7289DA');

          if (node.data?.embedThumbnail) {
            embed.setThumbnail(node.data.embedThumbnail);
          }

          if (node.data?.embedFooter) {
            embed.setFooter({ text: node.data.embedFooter });
          }

          const categories = (node.data?.categories || 'support,billing,report,partnership,other')
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean);

          const buttonLabels = (node.data?.buttonLabels || 'Create Support Ticket,Billing Issue,Report User,Partnership,Other')
            .split(',')
            .map((l) => l.trim())
            .filter(Boolean);

          const buttons = categories.map((category, idx) => {
            const label = buttonLabels[idx] || category;
            return new ButtonBuilder()
              .setCustomId(`ticket:create:${category}`)
              .setLabel(label)
              .setStyle(ButtonStyle.Primary);
          });

          const row = new ActionRowBuilder().addComponents(buttons);
          await message.channel.send({ embeds: [embed], components: [row] });
          await message.delete().catch(() => {});
          return true;
        } catch (err) {
          console.error('Error in ticket_panel:', err);
          return false;
        }
      },

      generateCode(node) {
        const embedTitle = node.data?.embedTitle || 'Support Tickets';
        const embedDesc = node.data?.embedDescription || 'Click a button below to create a ticket.';
        const embedColor = node.data?.embedColor || '#7289DA';
        const categories = (node.data?.categories || 'support,billing,report,partnership,other')
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean);

        const buttonLabels = (node.data?.buttonLabels || 'Create Support Ticket,Billing Issue,Report User,Partnership,Other')
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean);

        const buttonCode = categories
          .map((cat, idx) => `new ButtonBuilder().setCustomId(\`ticket:create:\${cat}\`).setLabel('${buttonLabels[idx] || cat}').setStyle(ButtonStyle.Primary)`)
          .join(',');

        return `
if (message.content.toLowerCase().startsWith('ticketpanel')) {
  const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
  const embed = new EmbedBuilder()
    .setTitle('${embedTitle}')
    .setDescription('${embedDesc}')
    .setColor('${embedColor}');

  const buttons = [
    ${buttonCode}
  ];

  const row = new ActionRowBuilder().addComponents(buttons);
  message.channel.send({ embeds: [embed], components: [row] }).catch(console.error);
  message.delete().catch(() => {});
}`;
      },
    },
  },
};
