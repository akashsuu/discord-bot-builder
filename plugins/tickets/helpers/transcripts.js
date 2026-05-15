'use strict';

/**
 * helpers/transcripts.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a styled HTML transcript for a ticket channel.
 * Saves to transcripts/<ticketId>.html relative to the tickets plugin root.
 *
 * Fetches up to 500 messages, renders usernames, avatars, embeds,
 * attachments, replies, and timestamps.
 */

const fs   = require('fs');
const path = require('path');

const TRANSCRIPT_DIR = path.join(__dirname, '..', 'transcripts');

// ── Ensure transcript directory exists ────────────────────────────────────────
function ensureDir() {
  if (!fs.existsSync(TRANSCRIPT_DIR)) fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
}

// ── Escape HTML safely ────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Format Discord timestamp ──────────────────────────────────────────────────
function formatDate(date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ── Render a single embed ─────────────────────────────────────────────────────
function renderEmbed(embed) {
  const color   = embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#5865F2';
  const title   = embed.title   ? `<div class="embed-title">${escapeHtml(embed.title)}</div>` : '';
  const desc    = embed.description ? `<div class="embed-desc">${escapeHtml(embed.description)}</div>` : '';
  const footer  = embed.footer?.text ? `<div class="embed-footer">${escapeHtml(embed.footer.text)}</div>` : '';
  const image   = embed.image?.url  ? `<img class="embed-image" src="${embed.image.url}" alt="embed image">` : '';
  const thumb   = embed.thumbnail?.url ? `<img class="embed-thumb" src="${embed.thumbnail.url}" alt="thumbnail">` : '';
  const fields  = (embed.fields || []).map(f =>
    `<div class="embed-field ${f.inline ? 'inline' : ''}">
      <div class="embed-field-name">${escapeHtml(f.name)}</div>
      <div class="embed-field-value">${escapeHtml(f.value)}</div>
    </div>`
  ).join('');

  return `
    <div class="embed" style="border-left-color: ${color}">
      ${thumb}
      ${title}
      ${desc}
      <div class="embed-fields">${fields}</div>
      ${image}
      ${footer}
    </div>`;
}

// ── Render attachment ─────────────────────────────────────────────────────────
function renderAttachment(att) {
  const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(att.name || att.url || '');
  if (isImage) {
    return `<img class="attachment-img" src="${att.url}" alt="${escapeHtml(att.name || 'attachment')}">`;
  }
  return `<a class="attachment-link" href="${att.url}" target="_blank">📎 ${escapeHtml(att.name || 'attachment')}</a>`;
}

// ── Render a single message ───────────────────────────────────────────────────
function renderMessage(msg) {
  const author = msg.author || {
    tag: msg.senderName || 'Unknown User',
    username: msg.senderName || 'Unknown User',
    bot: !!msg.isStaff,
    displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png',
  };
  const avatar    = author.displayAvatarURL?.({ size: 32, format: 'png' }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
  const name      = escapeHtml(author.tag || author.username || msg.senderName || 'Unknown User');
  const time      = formatDate(msg.createdAt || msg.timestamp || Date.now());
  const content   = msg.content ? `<div class="msg-content">${escapeHtml(msg.content)}</div>` : '';
  const embeds    = (msg.embeds || []).map(renderEmbed).join('');
  const rawAttachments = msg.attachments?.values ? [...msg.attachments.values()] : (msg.attachments || []);
  const attachments = rawAttachments.map(renderAttachment).join('');
  const isBot     = author.bot ? ' bot-tag' : '';

  let replyHtml = '';
  if (msg.reference?.messageId) {
    replyHtml = `<div class="reply-indicator">↩ replying to a message</div>`;
  }

  return `
    <div class="message${isBot ? ' bot-message' : ''}">
      <img class="avatar" src="${avatar}" alt="${name}" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
      <div class="msg-body">
        ${replyHtml}
        <div class="msg-header">
          <span class="author-name${isBot}">${name}</span>
          ${author.bot ? '<span class="bot-badge">BOT</span>' : ''}
          <span class="msg-time">${time}</span>
        </div>
        ${content}
        ${embeds}
        ${attachments}
      </div>
    </div>`;
}

// ── Build the complete HTML document ──────────────────────────────────────────
function buildHTML(ticket, messages, guildName) {
  const rows = messages.map(renderMessage).join('\n');
  const openedAt = formatDate(ticket.createdAt);
  const closedAt = ticket.closedAt ? formatDate(ticket.closedAt) : 'N/A';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transcript — ${escapeHtml(ticket.ticketId)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0e0e13; color: #dcddde; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; }
    .header { background: linear-gradient(135deg, #1a0533, #2a0a5e); padding: 24px 32px; border-bottom: 2px solid #5865F2; }
    .header h1 { color: #fff; font-size: 22px; margin-bottom: 6px; }
    .meta { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 8px; }
    .meta-item { background: rgba(88,101,242,0.15); border: 1px solid #5865F2; border-radius: 8px; padding: 6px 12px; font-size: 12px; }
    .meta-item span { color: #a0a5f5; font-weight: 600; }
    .messages { padding: 16px 24px; max-width: 900px; margin: 0 auto; }
    .message { display: flex; gap: 12px; padding: 8px 12px; border-radius: 8px; margin-bottom: 4px; transition: background 0.1s; }
    .message:hover { background: rgba(255,255,255,0.03); }
    .bot-message { background: rgba(88,101,242,0.05); }
    .avatar { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }
    .msg-body { flex: 1; min-width: 0; }
    .msg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .author-name { font-weight: 700; color: #fff; font-size: 14px; }
    .author-name.bot-tag { color: #5865F2; }
    .bot-badge { background: #5865F2; color: #fff; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; text-transform: uppercase; }
    .msg-time { color: #72767d; font-size: 11px; }
    .msg-content { color: #dcddde; line-height: 1.5; word-break: break-word; }
    .reply-indicator { color: #72767d; font-size: 12px; margin-bottom: 4px; padding-left: 4px; border-left: 2px solid #4f545c; }
    .embed { border-left: 4px solid #5865F2; background: #1e1f22; border-radius: 0 6px 6px 0; padding: 10px 12px; margin-top: 6px; position: relative; max-width: 520px; }
    .embed-thumb { position: absolute; top: 10px; right: 10px; width: 56px; height: 56px; border-radius: 6px; object-fit: cover; }
    .embed-title { font-weight: 700; color: #fff; margin-bottom: 4px; }
    .embed-desc { color: #b9bbbe; font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
    .embed-fields { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .embed-field { min-width: 120px; flex: 0 0 auto; }
    .embed-field.inline { flex: 1 1 30%; }
    .embed-field-name { font-weight: 700; font-size: 12px; color: #fff; margin-bottom: 2px; }
    .embed-field-value { font-size: 13px; color: #b9bbbe; }
    .embed-image { max-width: 100%; border-radius: 6px; margin-top: 8px; }
    .embed-footer { color: #72767d; font-size: 11px; margin-top: 8px; border-top: 1px solid #2f3136; padding-top: 6px; }
    .attachment-img { max-width: 400px; max-height: 300px; border-radius: 6px; margin-top: 6px; display: block; }
    .attachment-link { color: #00aff4; text-decoration: none; display: inline-block; margin-top: 4px; }
    .attachment-link:hover { text-decoration: underline; }
    .footer { text-align: center; padding: 24px; color: #4f545c; font-size: 12px; border-top: 1px solid #2f3136; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎫 Ticket Transcript — ${escapeHtml(ticket.ticketId)}</h1>
    <div class="meta">
      <div class="meta-item"><span>Server:</span> ${escapeHtml(guildName)}</div>
      <div class="meta-item"><span>Category:</span> ${escapeHtml(ticket.category)}</div>
      <div class="meta-item"><span>Priority:</span> ${escapeHtml(ticket.priority)}</div>
      <div class="meta-item"><span>Opened:</span> ${openedAt}</div>
      <div class="meta-item"><span>Closed:</span> ${closedAt}</div>
      <div class="meta-item"><span>Messages:</span> ${messages.length}</div>
    </div>
  </div>
  <div class="messages">
    ${rows || '<p style="color:#72767d;text-align:center;padding:32px">No messages found.</p>'}
  </div>
  <div class="footer">Generated by Kiodium Ticket System • ${new Date().toUTCString()}</div>
</body>
</html>`;
}

// ── Public: generate and save transcript ──────────────────────────────────────
/**
 * @param {import('discord.js').TextChannel} channel
 * @param {object} ticket  — ticket record from helpers/tickets.js
 * @param {string} guildName
 * @returns {Promise<string>} absolute path to the saved HTML file
 */
async function generateTranscript(channel, ticket, guildName) {
  ensureDir();

  // Fetch messages (oldest first, up to 500)
  let messages = [];
  try {
    let lastId = null;
    let fetched;
    do {
      const opts = { limit: 100 };
      if (lastId) opts.before = lastId;
      fetched = await channel.messages.fetch(opts);
      messages.push(...fetched.values());
      lastId = fetched.last()?.id || null;
    } while (fetched.size === 100 && messages.length < 500);
    messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  } catch {
    messages = [];
  }

  if (messages.length === 0 && Array.isArray(ticket.messages) && ticket.messages.length > 0) {
    messages = [...ticket.messages].sort((a, b) =>
      new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
    );
  }

  const html     = buildHTML(ticket, messages, guildName);
  const filename = `${String(ticket.ticketId || 'ticket').replace(/[^a-z0-9_-]/gi, '_')}.html`;
  const filePath = path.join(TRANSCRIPT_DIR, filename);

  fs.writeFileSync(filePath, html, 'utf-8');
  return filePath;
}

module.exports = { generateTranscript, TRANSCRIPT_DIR };
