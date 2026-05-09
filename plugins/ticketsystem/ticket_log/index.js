'use strict';

const { EmbedBuilder } = require('discord.js');
const ticketHelpers = require('../ticketHelpers');

module.exports = {
  meta: {
    name: 'Ticket Logger',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Log all ticket system events to a designated channel.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_log: {
      label: 'Ticket Logger',
      icon: 'LOG',
      color: '#95A5A6',
      description: 'Configure logging for ticket system events (creation, closing, modifications).',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        logChannel: {
          type: 'string',
          default: '',
          required: true,
          description: 'Channel ID for ticket logs'
        },
        logCreation: {
          type: 'boolean',
          default: true,
          required: false,
          description: 'Log ticket creation events'
        },
        logClosing: {
          type: 'boolean',
          default: true,
          required: false,
          description: 'Log ticket closing events'
        },
        logActions: {
          type: 'boolean',
          default: true,
          required: false,
          description: 'Log ticket modifications (add/remove/rename/priority)'
        },
      },

      async execute(ctx) {
        // Logger setup - this would be called during bot initialization
        // In a real implementation, this would register event listeners
        return true;
      },

      generateCode(node) {
        const logChannelId = node.data?.logChannel || '';
        const logCreation = node.data?.logCreation !== false;
        const logClosing = node.data?.logClosing !== false;
        const logActions = node.data?.logActions !== false;

        return `
const { EmbedBuilder } = require('discord.js');

// Setup ticket logging
const LOG_CHANNEL = '${logChannelId}';

async function logTicketEvent(client, eventType, data) {
  const logChannel = await client.channels.fetch(LOG_CHANNEL).catch(() => null);
  if (!logChannel) return;

  let embed;

  switch(eventType) {
    case 'TICKET_CREATED':
      embed = new EmbedBuilder()
        .setColor('#43B581')
        .setTitle('🎫 Ticket Created')
        .addFields(
          { name: 'User', value: data.user.tag, inline: true },
          { name: 'Channel', value: \`<#\${data.channelId}>\`, inline: true },
          { name: 'Category', value: data.category, inline: true }
        )
        .setTimestamp();
      break;

    case 'TICKET_CLOSED':
      embed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('🎫 Ticket Closed')
        .addFields(
          { name: 'Ticket ID', value: data.ticketId, inline: true },
          { name: 'Channel', value: \`<#\${data.channelId}>\`, inline: true },
          { name: 'Closed By', value: data.closedBy, inline: true },
          { name: 'Reason', value: data.reason || 'No reason', inline: false }
        )
        .setTimestamp();
      break;

    case 'TICKET_PRIORITY':
      embed = new EmbedBuilder()
        .setColor('#F39C12')
        .setTitle('📊 Priority Changed')
        .addFields(
          { name: 'Channel', value: \`<#\${data.channelId}>\`, inline: true },
          { name: 'Priority', value: data.priority.toUpperCase(), inline: true }
        )
        .setTimestamp();
      break;

    case 'USER_ADDED':
      embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('👤 User Added')
        .addFields(
          { name: 'Channel', value: \`<#\${data.channelId}>\`, inline: true },
          { name: 'Added User', value: data.addedUser.tag, inline: true },
          { name: 'Added By', value: data.addedBy, inline: true }
        )
        .setTimestamp();
      break;

    case 'USER_REMOVED':
      embed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('👤 User Removed')
        .addFields(
          { name: 'Channel', value: \`<#\${data.channelId}>\`, inline: true },
          { name: 'Removed User', value: data.removedUser.tag, inline: true },
          { name: 'Removed By', value: data.removedBy, inline: true }
        )
        .setTimestamp();
      break;

    case 'TICKET_LOCKED':
      embed = new EmbedBuilder()
        .setColor('#34495E')
        .setTitle('🔒 Ticket Locked')
        .addFields({ name: 'Channel', value: \`<#\${data.channelId}>\` })
        .setTimestamp();
      break;

    case 'TICKET_UNLOCKED':
      embed = new EmbedBuilder()
        .setColor('#27AE60')
        .setTitle('🔓 Ticket Unlocked')
        .addFields({ name: 'Channel', value: \`<#\${data.channelId}>\` })
        .setTimestamp();
      break;
  }

  if (embed) {
    await logChannel.send({ embeds: [embed] }).catch(() => {});
  }
}

// Usage in your ticket handlers
// await logTicketEvent(client, 'TICKET_CREATED', { user, channelId, category });
// await logTicketEvent(client, 'TICKET_CLOSED', { ticketId, channelId, closedBy, reason });
// await logTicketEvent(client, 'TICKET_PRIORITY', { channelId, priority });`;
      },
    },
  },
};
