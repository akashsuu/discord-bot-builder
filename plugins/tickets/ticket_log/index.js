'use strict';

/**
 * ticket_log/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone ticket event logger node.
 * When dropped into a graph AFTER a ticket action, it reads the channel's
 * ticket record and sends a log embed to the configured log channel.
 *
 * Typically used in conjunction with other ticket nodes.
 */

const path = require('path');

const ticketHelper = require(path.join(__dirname, '..', 'helpers', 'tickets.js'));
const logHelper    = require(path.join(__dirname, '..', 'helpers', 'logger.js'));

module.exports = {
  meta: {
    name:          'Ticket Log',
    version:       '1.0.0',
    author:        'Akashsuu',
    description:   'Sends a ticket event log embed to a configured channel.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_log: {
      label:       'Ticket Log',
      icon:        '📋',
      color:       '#117A65',
      description: 'Sends a structured log embed for the current ticket channel.',
      inputs:  [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [],

      configSchema: {
        logChannel: { type: 'string', default: '' },
        eventType:  { type: 'string', default: 'created' },
      },

      async execute(node, message, ctx) {
        if (!message?.guild) return false;

        const data   = node.data || {};
        const ticket = ticketHelper.getTicket(message.channel);
        if (!ticket) return false;

        if (!data.logChannel) return false;

        await logHelper.sendLog(
          message.client,
          data.logChannel,
          data.eventType || 'created',
          {
            '📌 Channel': `<#${message.channel.id}>`,
            '👤 Actor':   message.author ? `<@${message.author.id}>` : 'System',
          },
          ticket
        );

        return false; // terminal node — no outputs
      },

      generateCode(node) {
        const logChan = node.data?.logChannel || 'YOUR_LOG_CHANNEL_ID';
        const evt     = node.data?.eventType  || 'created';
        return `
// ── Ticket Log ────────────────────────────────────────────────────────────────
const _logChan = await client.channels.fetch('${logChan}').catch(() => null);
if (_logChan) {
  const { EmbedBuilder } = require('discord.js');
  await _logChan.send({ embeds: [
    new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('📋 Ticket Event: ${evt}')
      .setTimestamp()
  ]});
}
`;
      },
    },
  },
};
