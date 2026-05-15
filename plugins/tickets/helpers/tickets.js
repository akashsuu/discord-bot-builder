'use strict';

/**
 * helpers/tickets.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised ticket storage layer.
 * All mutations go through here so file I/O is never scattered across plugins.
 *
 * Storage format (data/tickets.json):
 * {
 * "<channelId>": {
 * ticketId : "ticket-0001",
 * channelId : "<channelId>",
 * guildId : "<guildId>",
 * ownerId : "<userId>",
 * category : "support",
 * createdAt : "<ISO string>",
 * claimedBy : null | "<staffId>",
 * priority : "normal" | "low" | "medium" | "high",
 * locked : false,
 * closed : false,
 * closedAt : null | "<ISO string>",
 * transcriptPath: null | "<path>"
 * }
 * }
 */

const fs = require('fs');
const path = require('path');

// Resolve data/tickets.json relative to this helpers/ folder
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'tickets.json');

// ── Ensure data directory exists ──────────────────────────────────────────────
function ensureDir() {
 if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Load all tickets ──────────────────────────────────────────────────────────
function loadTickets() {
 ensureDir();
 try {
 if (!fs.existsSync(DATA_FILE)) return {};
 return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
 } catch {
 return {};
 }
}

// ── Save all tickets ──────────────────────────────────────────────────────────
function saveTickets(tickets) {
 ensureDir();
 try {
 fs.writeFileSync(DATA_FILE, JSON.stringify(tickets, null, 2), 'utf-8');
 } catch (err) {
 console.error('[TicketHelper] Failed to save tickets.json:', err.message);
 }
}

// ── Get next ticket number (zero-padded 4-digit) ──────────────────────────────
function getNextTicketNumber(tickets) {
 const nums = Object.values(tickets)
 .map(t => parseInt((t.ticketId || '').replace(/\D/g, ''), 10))
 .filter(n => !isNaN(n));
 const max = nums.length > 0 ? Math.max(...nums) : 0;
 return String(max + 1).padStart(4, '0');
}

// ── Create a new ticket record ────────────────────────────────────────────────
function createTicket(channelId, { guildId, ownerId, category, ticketId, priority = 'normal' }) {
 const tickets = loadTickets();
 const record = {
 ticketId: ticketId || `ticket-${getNextTicketNumber(tickets)}`,
 channelId,
 guildId,
 ownerId,
 category: category || 'general',
 createdAt: new Date().toISOString(),
 claimedBy: null,
 priority,
 locked: false,
 closed: false,
 closedAt: null,
 transcriptPath: null,
 messages: [],
 replyMode: 'normal',
 };
 tickets[channelId] = record;
 saveTickets(tickets);
 return record;
}

// ── Get a single ticket by channel ID ────────────────────────────────────────
function recoverTicketFromChannel(channel) {
 if (!channel?.id || !channel.guild?.id || !channel.topic) return null;

 const ticketId = channel.topic.match(/(?:^|\|)\s*ID:\s*([^|]+)/i)?.[1]?.trim();
 const category = channel.topic.match(/Category:\s*([^|]+)/i)?.[1]?.trim() || 'general';
 const ownerId = channel.topic.match(/OwnerID:\s*(\d+)/i)?.[1]?.trim();
 if (!ticketId || !ownerId) return null;

 const tickets = loadTickets();
 const record = {
 ticketId,
 channelId: channel.id,
 guildId: channel.guild.id,
 ownerId,
 category,
 createdAt: channel.createdAt?.toISOString?.() || new Date().toISOString(),
 claimedBy: null,
 priority: channel.topic.match(/Priority:\s*([^|]+)/i)?.[1]?.trim() || 'normal',
 locked: false,
 closed: false,
 closedAt: null,
 transcriptPath: null,
 messages: [],
 replyMode: 'normal',
 };
 tickets[channel.id] = record;
 saveTickets(tickets);
 return record;
}

function getTicket(channelId) {
 if (channelId && typeof channelId === 'object') {
 const tickets = loadTickets();
 return tickets[channelId.id] - recoverTicketFromChannel(channelId);
 }
 const tickets = loadTickets();
 return tickets[channelId] - null;
}

// ── Get a ticket by owner ID in a guild (for duplicate check) ─────────────────
function getTicketByOwner(guildId, ownerId, category = null) {
 const tickets = loadTickets();
 return Object.values(tickets).find(
 t => t.guildId === guildId &&
 t.ownerId === ownerId &&
 !t.closed &&
 (category === null || t.category === category)
 ) - null;
}

function addTicketMessage(channelId, message) {
 const tickets = loadTickets();
 if (!tickets[channelId]) return false;
 if (!Array.isArray(tickets[channelId].messages)) tickets[channelId].messages = [];
 tickets[channelId].messages.push({
 senderId: message.senderId || '',
 senderName: message.senderName || 'Unknown',
 content: message.content || '',
 timestamp: message.timestamp || new Date().toISOString(),
 isStaff: !!message.isStaff,
 });
 saveTickets(tickets);
 return true;
}

// ── Update ticket fields ──────────────────────────────────────────────────────
function updateTicket(channelId, updates) {
 const tickets = loadTickets();
 if (!tickets[channelId]) return false;
 Object.assign(tickets[channelId], updates);
 saveTickets(tickets);
 return true;
}

// ── Close a ticket ────────────────────────────────────────────────────────────
function closeTicket(channelId, transcriptPath = null) {
 return updateTicket(channelId, {
 closed: true,
 closedAt: new Date().toISOString(),
 transcriptPath: transcriptPath || null,
 });
}

// ── Remove a ticket entirely ──────────────────────────────────────────────────
function removeTicket(channelId) {
 const tickets = loadTickets();
 if (!tickets[channelId]) return false;
 delete tickets[channelId];
 saveTickets(tickets);
 return true;
}

// ── List all open tickets for a guild ────────────────────────────────────────
function listOpenTickets(guildId) {
 const tickets = loadTickets();
 return Object.values(tickets).filter(t => t.guildId === guildId && !t.closed);
}

module.exports = {
 loadTickets,
 saveTickets,
 createTicket,
 recoverTicketFromChannel,
 getTicket,
 getTicketByOwner,
 updateTicket,
 addTicketMessage,
 closeTicket,
 removeTicket,
 listOpenTickets,
 getNextTicketNumber,
};
