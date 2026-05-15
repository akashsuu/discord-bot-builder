'use strict';

/**
 * helpers/logger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends structured embed logs to a configured log channel.
 * All ticket events route through here.
 */

const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// ── Event type → color + emoji map ───────────────────────────────────────────
const LOG_CONFIG = {
 created: { color: 0x57F287, emoji: '🎫' }, // green
 closed: { color: 0xED4245, emoji: '🔒' }, // red
 claimed: { color: 0x5865F2, emoji: '✋' }, // blurple
 unclaimed: { color: 0xFEE75C, emoji: '📤' }, // yellow
 renamed: { color: 0xEB459E, emoji: '✏️' }, // pink
 locked: { color: 0xFF8C00, emoji: '🔐' }, // orange
 unlocked: { color: 0x00CED1, emoji: '🔓' }, // teal
 added: { color: 0x57F287, emoji: '➕' }, // green
 removed: { color: 0xED4245, emoji: '➖' }, // red
 priority: { color: 0xFFA500, emoji: '⚡' }, // orange
 transcript:{ color: 0x9B59B6, emoji: '📄' }, // purple
};

function ensureDir() {
 if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadSettings() {
 ensureDir();
 try {
 if (!fs.existsSync(SETTINGS_FILE)) return {};
 return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
 } catch {
 return {};
 }
}

function saveSettings(settings) {
 ensureDir();
 fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

function cleanChannelId(value) {
 return String(value || '').trim().replace(/^<#?(\d+)>$/, '$1');
}

function setLogChannel(guildId, channelId) {
 if (!guildId || !channelId) return false;
 const settings = loadSettings();
 settings[guildId] = {
 ...(settings[guildId] || {}),
 logChannel: cleanChannelId(channelId),
 updatedAt: new Date().toISOString(),
 };
 saveSettings(settings);
 return true;
}

function getLogChannel(guildId) {
 if (!guildId) return '';
 return cleanChannelId(loadSettings()[guildId]?.logChannel || '');
}

async function resolveLogChannel(client, logChannelId, guildId) {
 const directId = cleanChannelId(logChannelId);
 const savedId = directId || getLogChannel(guildId);
 if (!savedId || !client) return null;

 const fetched = await client.channels.fetch(savedId).catch(() => null);
 if (fetched?.isTextBased()) return fetched;

 const guild = guildId ? await client.guilds.fetch(guildId).catch(() => null) : null;
 if (!guild) return null;

 const name = String(logChannelId || '').trim().replace(/^#/, '').toLowerCase();
 if (!name) return null;
 const channels = await guild.channels.fetch().catch(() => null);
 return channels?.find((channel) =>
 channel?.isTextBased?.() && channel.name?.toLowerCase() === name
 ) || null;
}

/**
 * Send a log embed to the configured log channel.
 *
 * @param {import('discord.js').Client} client
 * @param {string} logChannelId
 * @param {string} eventType — key from LOG_CONFIG
 * @param {object} fields — { label: value }
 * @param {object} ticket — ticket record
 */
async function sendLog(client, logChannelId, eventType, fields, ticket) {
 try {
 const chan = await resolveLogChannel(client, logChannelId, ticket?.guildId);
 if (!chan?.isTextBased()) return false;

 const cfg = LOG_CONFIG[eventType] || { color: 0x5865F2, emoji: '📋' };

 const embed = new EmbedBuilder()
 .setColor(cfg.color)
 .setTitle(`${cfg.emoji} Ticket ${capitalize(eventType)}`)
 .setTimestamp()
 .setFooter({ text: `Ticket ID: ${ticket?.ticketId || 'Unknown'}` });

 // Standard ticket info fields
 const stdFields = [
 { name: '🎫 Ticket', value: ticket?.ticketId || 'N/A', inline: true },
 { name: '📂 Category', value: ticket?.category || 'N/A', inline: true },
 { name: '⚡ Priority', value: ticket?.priority || 'N/A', inline: true },
 ];

 // Caller-supplied fields
 const extraFields = Object.entries(fields || {}).map(([name, value]) => ({
 name, value: String(value || 'N/A'), inline: true,
 }));

 embed.addFields([...stdFields, ...extraFields]);

 await chan.send({ embeds: [embed] });
 return true;
 } catch (err) {
 console.error('[TicketLog] Failed to send log:', err.message);
 return false;
 }
}

function capitalize(str) {
 return String(str || '').charAt(0).toUpperCase() + String(str || '').slice(1);
}

module.exports = {
 sendLog,
 setLogChannel,
 getLogChannel,
 resolveLogChannel,
 cleanChannelId,
};
