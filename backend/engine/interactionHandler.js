'use strict';

const { randomBytes }                          = require('crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');

const { applyTemplate }  = require('./templateEngine');
const logger             = require('./logger').child('Interactions');

// ══════════════════════════════════════════════════════════════════════════════
//  Per-session state store
//
//  WHY sessionId (not messageId):
//    We generate the sessionId BEFORE sending the message so we can encode it
//    into component customIds in the first send — no double-API-call needed.
//
//  Keys expire automatically after SESSION_TTL_MS to prevent memory leaks.
// ══════════════════════════════════════════════════════════════════════════════
const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes
const sessions       = new Map();       // sessionId → SessionEntry

function generateSessionId() {
  return randomBytes(8).toString('hex'); // 16 hex chars, safe in customId
}

/**
 * @typedef {Object} SessionEntry
 * @property {object}   nodeData      — node.data at time of creation
 * @property {object[]} pages         — resolved page array
 * @property {number}   currentPage   — mutable page index
 * @property {string}   userId        — author who triggered the command
 * @property {object}   baseVars      — variable snapshot from buildVars()
 * @property {number}   expiresAt     — unix ms timestamp
 */

function registerSession(sessionId, entry) {
  clearTimeout(entry._timer);
  entry.expiresAt = Date.now() + SESSION_TTL_MS;
  entry._timer = setTimeout(() => sessions.delete(sessionId), SESSION_TTL_MS);
  sessions.set(sessionId, entry);
}

function getSession(sessionId)    { return sessions.get(sessionId) ?? null; }
function deleteSession(sessionId) {
  const s = sessions.get(sessionId);
  if (s) clearTimeout(s._timer);
  sessions.delete(sessionId);
}

// ── Custom ID encoding / decoding ─────────────────────────────────────────────
// Format:  "pbm:{nodeId}:{action}:{sessionId}"
// Max len: 4 + nodeId(≤32) + action(≤16) + sessionId(16) + 3 colons = ≤71 chars
//          Discord's limit is 100 chars — safe.
const PREFIX = 'pbm';

function encodeId(nodeId, action, sessionId) {
  return `${PREFIX}:${nodeId}:${action}:${sessionId}`;
}

function decodeId(customId) {
  if (!customId || !customId.startsWith(PREFIX + ':')) return null;
  const parts = customId.split(':');
  if (parts.length < 4) return null;
  // nodeId may contain colons (unlikely but safe: rejoin everything between 2nd and last)
  const sessionId = parts[parts.length - 1];
  const action    = parts[parts.length - 2];
  const nodeId    = parts.slice(1, parts.length - 2).join(':');
  return { nodeId, action, sessionId };
}

// ── Embed builder ─────────────────────────────────────────────────────────────
function buildEmbed(nodeData, page, vars) {
  const color = parseInt(String(nodeData.embedColor || '#5865F2').replace('#', ''), 16);
  const embed = { color: isNaN(color) ? 0x5865F2 : color };

  const title = applyTemplate(page.title || nodeData.embedTitle || '', vars);
  if (title) embed.title = title;

  const desc = applyTemplate(page.content || '', vars);
  if (desc)  embed.description = desc;

  if (nodeData.embedFooter) {
    embed.footer = { text: applyTemplate(nodeData.embedFooter, vars) };
  }
  if (page.imageUrl    || nodeData.imageUrl)  embed.image     = { url: page.imageUrl    || nodeData.imageUrl };
  if (page.thumbnail   || nodeData.logoUrl)   embed.thumbnail = { url: page.thumbnail   || nodeData.logoUrl  };
  if (nodeData.embedTimestamp)                embed.timestamp = new Date().toISOString();

  return embed;
}

// ── Component builder ─────────────────────────────────────────────────────────
function buildComponents(nodeData, currentPage, totalPages, sessionId) {
  const rows   = [];
  const nodeId = nodeData._nodeId || 'node';

  // ── Dropdown row ────────────────────────────────────────────────────────
  const dd = nodeData.dropdown;
  if (dd?.enabled) {
    const rawOptions = dd.usePages
      ? (nodeData.pages || []).map((p, i) => ({
          label:       String(p.title       || `Page ${i + 1}`).slice(0, 100),
          value:       String(i),
          description: p.description ? String(p.description).slice(0, 100) : undefined,
          default:     i === currentPage,
        }))
      : (dd.options || []).map((o, i) => ({
          label:       String(o.label || `Option ${i + 1}`).slice(0, 100),
          value:       String(o.value ?? i),
          description: o.description ? String(o.description).slice(0, 100) : undefined,
          default:     String(o.value ?? i) === String(currentPage),
        }));

    if (rawOptions.length > 0) {
      const menu = new StringSelectMenuBuilder()
        .setCustomId(encodeId(nodeId, 'select', sessionId))
        .setPlaceholder(String(dd.placeholder || 'Select a page').slice(0, 150))
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(rawOptions.slice(0, 25)); // Discord max = 25 options
      rows.push(new ActionRowBuilder().addComponents(menu));
    }
  }

  // ── Button row(s) ────────────────────────────────────────────────────────
  const btnCfg = nodeData.buttons;
  if (btnCfg?.enabled) {
    const list = btnCfg.navigation
      ? [
          { id: 'prev',  label: '⬅ Prev',   style: ButtonStyle.Secondary, disabled: currentPage <= 0 },
          { id: 'next',  label: 'Next ➡',   style: ButtonStyle.Primary,   disabled: currentPage >= totalPages - 1 },
          { id: 'close', label: '❌ Close',  style: ButtonStyle.Danger,    disabled: false },
        ]
      : (btnCfg.list || []);

    const built = list.map((btn) => {
      const b = new ButtonBuilder()
        .setCustomId(encodeId(nodeId, String(btn.id), sessionId))
        .setLabel(String(btn.label || btn.id).slice(0, 80))
        .setStyle(btn.style ?? ButtonStyle.Secondary);
      if (btn.disabled) b.setDisabled(true);
      if (btn.emoji)    b.setEmoji(String(btn.emoji));
      return b;
    });

    // Up to 5 buttons per ActionRow, max 5 rows total
    for (let i = 0; i < Math.min(built.length, 25); i += 5) {
      rows.push(new ActionRowBuilder().addComponents(built.slice(i, i + 5)));
    }
  }

  return rows;
}

// ── Rebuild payload for a page update ────────────────────────────────────────
function buildUpdatePayload(session, newPage) {
  const { nodeData, pages } = session;
  const page  = pages[newPage] || pages[0];
  const vars  = {
    ...session.baseVars,
    page:            String(newPage),
    selected:        session.selected || '',
    button:          session.lastButton || '',
    'flow.page':     String(newPage),
    'flow.selected': session.selected || '',
    'flow.button':   session.lastButton || '',
    flow: {
      ...(session.baseVars.flow || {}),
      page:     String(newPage),
      selected: session.selected || '',
      button:   session.lastButton || '',
    },
  };

  const payload = {
    components: buildComponents(nodeData, newPage, pages.length, session.sessionId),
  };

  if (nodeData.embedEnabled !== false) {
    payload.embeds = [buildEmbed(nodeData, page, vars)];
  } else {
    payload.content = applyTemplate(page.content || '', vars) || ' ';
    payload.embeds  = [];
  }

  return payload;
}

// ── Global interaction handler ────────────────────────────────────────────────
async function handleInteraction(interaction) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  const decoded = decodeId(interaction.customId);
  if (!decoded) return;

  const session = getSession(decoded.sessionId);
  if (!session) {
    await interaction.reply({ content: '⌛ This menu has expired.', ephemeral: true }).catch(() => {});
    return;
  }

  const { pages } = session;
  const total     = pages.length;
  let newPage     = session.currentPage;

  // ── Handle action ─────────────────────────────────────────────────────────
  if (interaction.isStringSelectMenu()) {
    const raw = interaction.values[0];
    session.selected = raw;
    const idx = parseInt(raw, 10);
    if (!isNaN(idx) && idx >= 0 && idx < total) newPage = idx;

  } else if (interaction.isButton()) {
    session.lastButton = decoded.action;

    switch (decoded.action) {
      case 'prev':
        newPage = Math.max(0, newPage - 1);
        break;
      case 'next':
        newPage = Math.min(total - 1, newPage + 1);
        break;
      case 'close':
        await interaction.message.delete().catch(() => {});
        deleteSession(decoded.sessionId);
        await interaction.deferUpdate().catch(() => {});
        return;
      default: {
        // Custom button — check if it has a target page
        const custom = (session.nodeData.buttons?.list || []).find((b) => String(b.id) === decoded.action);
        if (custom?.page !== undefined) {
          newPage = Math.min(Math.max(Number(custom.page), 0), total - 1);
        }
        break;
      }
    }
  }

  session.currentPage = newPage;
  registerSession(decoded.sessionId, session); // refresh TTL

  // ── Build and send update ─────────────────────────────────────────────────
  const payload = buildUpdatePayload(session, newPage);
  try {
    await interaction.update(payload);
  } catch (err) {
    logger.error(`Interaction update failed: ${err.message}`);
    await interaction.reply({ content: '❌ Failed to update menu.', ephemeral: true }).catch(() => {});
  }
}

// ── Wire to Discord client ────────────────────────────────────────────────────
let _attached = false;
function attachToClient(client) {
  if (_attached) return;
  _attached = true;
  client.on('interactionCreate', (i) =>
    handleInteraction(i).catch((err) =>
      logger.error(`Unhandled interaction error: ${err.message}`, { stack: err.stack })
    )
  );
  logger.info('Interaction handler attached to client');
}

// Reset for hot-reload
function detach() { _attached = false; }

module.exports = {
  generateSessionId,
  registerSession,
  getSession,
  deleteSession,
  encodeId,
  decodeId,
  buildEmbed,
  buildComponents,
  buildUpdatePayload,
  handleInteraction,
  attachToClient,
  detach,
};
