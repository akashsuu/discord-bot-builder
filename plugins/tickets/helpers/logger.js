'use strict';

/**
 * helpers/logger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends structured embed logs to a configured log channel.
 * All ticket events route through here.
 */

const { EmbedBuilder } = require('discord.js');

// ── Event type → color + emoji map ───────────────────────────────────────────
const LOG_CONFIG = {
  created:   { color: 0x57F287, emoji: '🎫' },  // green
  closed:    { color: 0xED4245, emoji: '🔒' },  // red
  claimed:   { color: 0x5865F2, emoji: '✋' },  // blurple
  unclaimed: { color: 0xFEE75C, emoji: '📤' },  // yellow
  renamed:   { color: 0xEB459E, emoji: '✏️' },  // pink
  locked:    { color: 0xFF8C00, emoji: '🔐' },  // orange
  unlocked:  { color: 0x00CED1, emoji: '🔓' },  // teal
  added:     { color: 0x57F287, emoji: '➕' },  // green
  removed:   { color: 0xED4245, emoji: '➖' },  // red
  priority:  { color: 0xFFA500, emoji: '⚡' },  // orange
  transcript:{ color: 0x9B59B6, emoji: '📄' },  // purple
};

/**
 * Send a log embed to the configured log channel.
 *
 * @param {import('discord.js').Client} client
 * @param {string}                       logChannelId
 * @param {string}                       eventType    — key from LOG_CONFIG
 * @param {object}                       fields       — { label: value }
 * @param {object}                       ticket       — ticket record
 */
async function sendLog(client, logChannelId, eventType, fields, ticket) {
  if (!logChannelId) return;

  try {
    const chan = await client.channels.fetch(logChannelId).catch(() => null);
    if (!chan?.isTextBased()) return;

    const cfg = LOG_CONFIG[eventType] || { color: 0x5865F2, emoji: '📋' };

    const embed = new EmbedBuilder()
      .setColor(cfg.color)
      .setTitle(`${cfg.emoji} Ticket ${capitalize(eventType)}`)
      .setTimestamp()
      .setFooter({ text: `Ticket ID: ${ticket?.ticketId || 'Unknown'}` });

    // Standard ticket info fields
    const stdFields = [
      { name: '🎫 Ticket',   value: ticket?.ticketId  || 'N/A', inline: true },
      { name: '📂 Category', value: ticket?.category  || 'N/A', inline: true },
      { name: '⚡ Priority', value: ticket?.priority  || 'N/A', inline: true },
    ];

    // Caller-supplied fields
    const extraFields = Object.entries(fields || {}).map(([name, value]) => ({
      name, value: String(value || 'N/A'), inline: true,
    }));

    embed.addFields([...stdFields, ...extraFields]);

    await chan.send({ embeds: [embed] });
  } catch (err) {
    console.error('[TicketLog] Failed to send log:', err.message);
  }
}

function capitalize(str) {
  return String(str || '').charAt(0).toUpperCase() + String(str || '').slice(1);
}

module.exports = { sendLog };
