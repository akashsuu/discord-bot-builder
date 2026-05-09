'use strict';

const fs = require('fs');
const path = require('path');
const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const TICKETS_FILE = path.join(__dirname, '../../data/tickets.json');

// ─── Ensure data directory ────────────────────────────────────────────────
function ensureDataDir() {
  const dir = path.dirname(TICKETS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ─── Load tickets from JSON ─────────────────────────────────────────────────
function loadTickets() {
  try {
    ensureDataDir();
    if (!fs.existsSync(TICKETS_FILE)) {
      fs.writeFileSync(TICKETS_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(TICKETS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error loading tickets:', err);
    return [];
  }
}

// ─── Save tickets to JSON ──────────────────────────────────────────────────
function saveTickets(tickets) {
  try {
    ensureDataDir();
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
  } catch (err) {
    console.error('Error saving tickets:', err);
  }
}

// ─── Create a ticket record ─────────────────────────────────────────────────
function createTicketRecord(guildId, channelId, ownerId, category = 'support') {
  return {
    id: generateTicketId(),
    guildId,
    channelId,
    ownerId,
    category,
    priority: 'medium',
    locked: false,
    createdAt: new Date().toISOString(),
    closedAt: null,
    claimedBy: null,
    staffMembers: [],
    closedBy: null,
    closeReason: null,
    transcriptUrl: null,
    messages: [],
  };
}

// ─── Generate unique ticket ID ──────────────────────────────────────────────
function generateTicketId() {
  return `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ─── Get ticket by channel ID ──────────────────────────────────────────────
function getTicketByChannel(channelId) {
  const tickets = loadTickets();
  return tickets.find((t) => t.channelId === channelId) || null;
}

// ─── Get all tickets for guild ──────────────────────────────────────────────
function getGuildTickets(guildId) {
  const tickets = loadTickets();
  return tickets.filter((t) => t.guildId === guildId && !t.closedAt);
}

// ─── Get tickets for user ──────────────────────────────────────────────────
function getUserTickets(guildId, userId) {
  const tickets = loadTickets();
  return tickets.filter((t) => t.guildId === guildId && t.ownerId === userId && !t.closedAt);
}

// ─── Check if user has open ticket ──────────────────────────────────────────
function hasOpenTicket(guildId, userId) {
  const userTickets = getUserTickets(guildId, userId);
  return userTickets.length > 0;
}

// ─── Get next ticket number ─────────────────────────────────────────────────
function getNextTicketNumber(guildId) {
  const tickets = loadTickets();
  const guildTickets = tickets.filter((t) => t.guildId === guildId);
  return guildTickets.length + 1;
}

// ─── Close a ticket ────────────────────────────────────────────────────────
function closeTicket(channelId, reason = 'No reason', closedBy = null) {
  const tickets = loadTickets();
  const ticket = tickets.find((t) => t.channelId === channelId);
  
  if (ticket) {
    ticket.closedAt = new Date().toISOString();
    ticket.closeReason = reason;
    ticket.closedBy = closedBy;
    saveTickets(tickets);
    return ticket;
  }
  return null;
}

// ─── Update ticket priority ────────────────────────────────────────────────
function setPriority(channelId, priority) {
  const tickets = loadTickets();
  const ticket = tickets.find((t) => t.channelId === channelId);
  
  if (ticket) {
    ticket.priority = priority;
    saveTickets(tickets);
    return ticket;
  }
  return null;
}

// ─── Add staff to ticket ───────────────────────────────────────────────────
function addStaffMember(channelId, userId) {
  const tickets = loadTickets();
  const ticket = tickets.find((t) => t.channelId === channelId);
  
  if (ticket && !ticket.staffMembers.includes(userId)) {
    ticket.staffMembers.push(userId);
    if (!ticket.claimedBy) ticket.claimedBy = userId;
    saveTickets(tickets);
    return ticket;
  }
  return null;
}

// ─── Remove staff from ticket ──────────────────────────────────────────────
function removeStaffMember(channelId, userId) {
  const tickets = loadTickets();
  const ticket = tickets.find((t) => t.channelId === channelId);
  
  if (ticket) {
    ticket.staffMembers = ticket.staffMembers.filter((id) => id !== userId);
    if (ticket.claimedBy === userId && ticket.staffMembers.length > 0) {
      ticket.claimedBy = ticket.staffMembers[0];
    } else if (ticket.staffMembers.length === 0) {
      ticket.claimedBy = null;
    }
    saveTickets(tickets);
    return ticket;
  }
  return null;
}

// ─── Generate transcript HTML ──────────────────────────────────────────────
async function generateTranscript(channel, ticketData) {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = messages.reverse();

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ticket Transcript - ${ticketData.id}</title>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background: #1e1e1e;
      color: #fff;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #2d2d2d;
      border-radius: 8px;
      padding: 20px;
    }
    .header {
      border-bottom: 2px solid #7289da;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      color: #7289da;
      font-size: 28px;
    }
    .info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 10px;
      font-size: 14px;
      color: #b0b0b0;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
    }
    .messages {
      margin-top: 20px;
    }
    .message {
      margin: 12px 0;
      padding: 10px;
      background: #1e1e1e;
      border-radius: 4px;
      border-left: 3px solid #7289da;
    }
    .message.bot {
      border-left-color: #43b581;
    }
    .message-author {
      font-weight: 600;
      color: #7289da;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .message-time {
      font-size: 12px;
      color: #888;
      margin-left: 8px;
    }
    .message-content {
      color: #e0e0e0;
      word-wrap: break-word;
    }
    .embed {
      background: #1e1e1e;
      border-left: 4px solid #7289da;
      padding: 10px;
      margin: 8px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #444;
      text-align: center;
      color: #888;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Ticket Transcript</h1>
      <div class="info">
        <div class="info-item"><strong>Ticket ID:</strong> <span>${ticketData.id}</span></div>
        <div class="info-item"><strong>Channel:</strong> <span>#${channel.name}</span></div>
        <div class="info-item"><strong>Owner:</strong> <span>${ticketData.ownerId}</span></div>
        <div class="info-item"><strong>Priority:</strong> <span>${(ticketData.priority || 'medium').toUpperCase()}</span></div>
        <div class="info-item"><strong>Created:</strong> <span>${new Date(ticketData.createdAt).toLocaleString()}</span></div>
        <div class="info-item"><strong>Closed:</strong> <span>${ticketData.closedAt ? new Date(ticketData.closedAt).toLocaleString() : 'Open'}</span></div>
      </div>
    </div>
    <div class="messages">
`;

    for (const msg of sortedMessages.values()) {
      const timestamp = new Date(msg.createdTimestamp).toLocaleTimeString();
      const isBot = msg.author?.bot ? 'bot' : '';
      
      html += `<div class="message ${isBot}">
        <div class="message-author">${msg.author?.username || 'Unknown'} <span class="message-time">${timestamp}</span></div>
        <div class="message-content">${escapeHtml(msg.content || '(no text)')}</div>`;

      if (msg.embeds && msg.embeds.length > 0) {
        for (const embed of msg.embeds) {
          html += `<div class="embed">
            ${embed.title ? `<strong>${escapeHtml(embed.title)}</strong><br>` : ''}
            ${embed.description ? `${escapeHtml(embed.description)}<br>` : ''}
          </div>`;
        }
      }

      if (msg.attachments && msg.attachments.size > 0) {
        html += '<div style="margin-top: 8px; font-size: 12px;">';
        for (const att of msg.attachments.values()) {
          html += `[📎 <a href="${att.url}" target="_blank">${escapeHtml(att.name)}</a>] `;
        }
        html += '</div>';
      }

      html += '</div>';
    }

    html += `
    </div>
    <div class="footer">
      <p>Transcript generated on ${new Date().toLocaleString()}</p>
      <p>This is a record of the ticket conversation.</p>
    </div>
  </div>
</body>
</html>`;

    return html;
  } catch (err) {
    console.error('Error generating transcript:', err);
    return null;
  }
}

// ─── Save transcript to file ───────────────────────────────────────────────
function saveTranscript(ticketId, html) {
  try {
    const dir = path.join(__dirname, '../../data/transcripts');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${ticketId}.html`);
    fs.writeFileSync(filePath, html);
    return filePath;
  } catch (err) {
    console.error('Error saving transcript:', err);
    return null;
  }
}

// ─── Escape HTML for transcripts ──────────────────────────────────────────
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text || '').replace(/[&<>"']/g, (m) => map[m]);
}

// ─── Create ticket channel ────────────────────────────────────────────────
async function createTicketChannel(guild, user, category, categoryId, options = {}) {
  try {
    const ticketNum = getNextTicketNumber(guild.id);
    const channelName = options.naming ? 
      options.naming.replace('{username}', user.username).replace('{number}', ticketNum) :
      `ticket-${user.username}`;

    const ticketCategory = categoryId ? 
      guild.channels.cache.get(categoryId) : 
      null;

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: ticketCategory,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
      ],
    });

    const ticket = createTicketRecord(guild.id, channel.id, user.id, category);
    const tickets = loadTickets();
    tickets.push(ticket);
    saveTickets(tickets);

    return { channel, ticket };
  } catch (err) {
    console.error('Error creating ticket channel:', err);
    return null;
  }
}

// ─── Get priority color ────────────────────────────────────────────────────
function getPriorityColor(priority) {
  const colors = {
    low: '#3498db',
    medium: '#f39c12',
    high: '#e74c3c',
    urgent: '#c0392b',
  };
  return colors[priority] || '#7289da';
}

// ─── Get priority emoji ────────────────────────────────────────────────────
function getPriorityEmoji(priority) {
  const emojis = {
    low: '🔵',
    medium: '🟡',
    high: '🔴',
    urgent: '🚨',
  };
  return emojis[priority] || '🔵';
}

// ─── Build ticket embed ────────────────────────────────────────────────────
function buildTicketEmbed(ticket, user) {
  const embed = new EmbedBuilder()
    .setColor(getPriorityColor(ticket.priority))
    .setTitle(`${getPriorityEmoji(ticket.priority)} Ticket - ${ticket.id}`)
    .setDescription(`Ticket for ${user.tag || 'Unknown'}`)
    .addFields(
      { name: 'Owner', value: `<@${ticket.ownerId}>`, inline: true },
      { name: 'Category', value: ticket.category, inline: true },
      { name: 'Priority', value: ticket.priority.toUpperCase(), inline: true },
      { name: 'Status', value: ticket.locked ? '🔒 Locked' : '🔓 Open', inline: true },
      { name: 'Created', value: new Date(ticket.createdAt).toLocaleString(), inline: true },
      { name: 'Claimed By', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Unclaimed', inline: true }
    )
    .setFooter({ text: `Ticket ID: ${ticket.id}` })
    .setTimestamp();

  return embed;
}

module.exports = {
  loadTickets,
  saveTickets,
  createTicketRecord,
  generateTicketId,
  getTicketByChannel,
  getGuildTickets,
  getUserTickets,
  hasOpenTicket,
  getNextTicketNumber,
  closeTicket,
  setPriority,
  addStaffMember,
  removeStaffMember,
  generateTranscript,
  saveTranscript,
  createTicketChannel,
  getPriorityColor,
  getPriorityEmoji,
  buildTicketEmbed,
  escapeHtml,
};
