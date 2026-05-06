'use strict';

// =============================================================================
//  HELP MENU  —  Full dropdown + button + pages example plugin
//
//  This plugin is the complete reference implementation for the
//  dropdown / button / multi-page system.
//
//  Flow:
//    1.  User sends the trigger command (default: !help)
//    2.  Bot sends a paginated embed:
//          • Dropdown  — jump to any category / page
//          • ⬅ Prev    — go to previous page
//          • Next ➡    — go to next page
//          • ✖ Close   — delete the message
//    3.  Every interaction updates the message in-place via interaction.update()
//    4.  Session auto-expires after 15 min (cleaned up by interactionHandler)
//
//  All page content supports template variables:
//    {user}  {mention}  {server}  {channel}  {date}  {time}
//    {page}  {totalPages}  {selected}  {button}  {command}
// =============================================================================

const path = require('path');

// ── Engine helpers (shared across all plugins) ────────────────────────────────
const { applyTemplate, buildVars }  = require(path.join(__dirname, '../../../backend/engine/templateEngine'));
const {
  generateSessionId,
  registerSession,
  buildEmbed,
  buildComponents,
}                                   = require(path.join(__dirname, '../../../backend/engine/interactionHandler'));

// ── Util ──────────────────────────────────────────────────────────────────────
function hexToInt(hex) {
  const n = parseInt(String(hex || '#5865F2').replace('#', ''), 16);
  return isNaN(n) ? 0x5865F2 : n;
}

// Sanitise a single page entry — guarantees required fields are always strings.
function normalisePage(p, i) {
  return {
    id:          String(p.id          ?? `page${i + 1}`),
    title:       String(p.title       ?? `Page ${i + 1}`),
    description: String(p.description ?? ''),
    content:     String(p.content     ?? ''),
    imageUrl:    p.imageUrl    || null,
    thumbnail:   p.thumbnail   || null,
  };
}

function normalisePages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{
      id: 'default', title: '📋 Help', description: '',
      content: 'No pages configured. Add pages in the node editor.',
      imageUrl: null, thumbnail: null,
    }];
  }
  return raw.map(normalisePage);
}

// =============================================================================
module.exports = {
  meta: {
    name:          'Help Menu',
    version:       '1.0.0',
    author:        'Akashsuu',
    description:   'Multi-page help menu with dropdown category selector and Prev/Next/Close navigation.',
    engineVersion: '>=1.0.0',
  },

  nodes: {

    // ── Node definition ───────────────────────────────────────────────────────
    util_helpmenu: {
      label:       'Help Menu',
      icon:        '📋',
      color:       '#1A3A5A',
      description: 'Sends a paginated help embed. Configure pages[], dropdown, and buttons in node.data.',

      // ── Port declarations (used by the GUI to draw connectors) ─────────────
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      // ── Config schema (scalar defaults for the GUI property panel) ─────────
      // Complex objects (pages, dropdown, buttons) come from plugin.json defaults.
      configSchema: {
        command:     { type: 'string',  default: 'help',     required: true  },
        embedEnabled:{ type: 'boolean', default: true,       required: false },
        embedColor:  { type: 'string',  default: '#5865F2',  required: false },
        embedFooter: {
          type:    'string',
          default: 'Page {page} of {totalPages}  ·  {server}  ·  Requested by {user}',
          required: false,
        },
      },

      // ════════════════════════════════════════════════════════════════════════
      //  execute()  —  called once when the command is sent by a Discord user
      // ════════════════════════════════════════════════════════════════════════
      async execute(node, message, ctx) {
        // Guard: ignore bots and DMs
        if (!message || message.author.bot) return false;
        if (!message.guild)                 return false;

        // ── 1. Command match ─────────────────────────────────────────────────
        const prefix  = ctx?.prefix || '';
        const rawCmd  = (node.data?.command || 'help').trim();
        // Prepend prefix if node.data.command doesn't already include it
        const cmd     = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;

        const content = message.content;
        if (!content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        // Prevent "!helper" matching "!help"
        const remainder = content.slice(cmd.length);
        if (remainder && !/^\s/.test(remainder)) return false;

        // ── 2. Resolve pages ─────────────────────────────────────────────────
        const pages      = normalisePages(node.data?.pages);
        const totalPages = pages.length;
        const startPage  = 0;

        // ── 3. Build variable map for the initial render ─────────────────────
        //    buildVars() reads from message + ctx and returns every template
        //    variable ({user}, {server}, {date}, {page}, {flow.command}, …)
        const vars = {
          ...buildVars(message, ctx),
          page:       String(startPage + 1),
          totalPages: String(totalPages),
          selected:   '',
          button:     '',
          flow: {
            ...(buildVars(message, ctx).flow || {}),
            page:       String(startPage + 1),
            selected:   '',
            button:     '',
          },
        };

        // ── 4. Generate session ID ────────────────────────────────────────────
        //    The session ID is baked into every component customId BEFORE the
        //    message is sent.  This avoids a double API call (send → get id →
        //    edit) and ensures the interaction handler can look up state in O(1).
        const sessionId = generateSessionId();

        // ── 5. Merge nodeData with runtime fields needed by buildComponents() ─
        const nodeData = {
          ...node.data,
          _nodeId:    node.id,
          _sessionId: sessionId,
        };

        // ── 6. Build the Discord message payload ──────────────────────────────
        //    buildEmbed()      → { title, description, color, footer, … }
        //    buildComponents() → ActionRow[] with dropdown + buttons
        const components = buildComponents(nodeData, startPage, totalPages, sessionId);
        const payload    = { components };

        if (nodeData.embedEnabled !== false) {
          // Embed mode — rich card with colour bar
          payload.embeds = [buildEmbed(nodeData, pages[startPage], vars)];
        } else {
          // Plain text mode — just the page content with variables applied
          payload.content = applyTemplate(pages[startPage].content || '', vars) || '​';
        }

        // ── 7. Send ───────────────────────────────────────────────────────────
        let sent;
        try {
          sent = await message.channel.send(payload);
        } catch (err) {
          await message.reply(`❌ Could not send help menu: ${err.message}`).catch(() => {});
          return false;
        }

        // ── 8. Register session ───────────────────────────────────────────────
        //    The interaction handler (botRunner → interactionCreate event)
        //    picks this up when a user clicks a button or selects a dropdown
        //    option.  It updates the message in-place via interaction.update().
        registerSession(sessionId, {
          sessionId,
          nodeData,
          pages,
          currentPage: startPage,
          selected:    '',
          lastButton:  '',
          userId:      message.author.id,
          baseVars:    vars,
        });

        return true; // continue graph traversal to connected output nodes
      },

      // ════════════════════════════════════════════════════════════════════════
      //  generateCode()  —  produces a standalone snippet for the Export feature
      // ════════════════════════════════════════════════════════════════════════
      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'help').replace(/"/g, '\\"');
        const cmd    = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const color  = hexToInt(node.data?.embedColor || '#5865F2');
        const footer = (node.data?.embedFooter || 'Page {page} of {totalPages}').replace(/`/g, '\\`');
        const pages  = JSON.stringify(normalisePages(node.data?.pages), null, 4)
                         .split('\n').join('\n    ');

        // The exported code uses a MessageComponentCollector (per-message scope)
        // instead of the engine's global interactionCreate handler, so it works
        // as a completely self-contained standalone bot.js.
        return `
// ══════════════════════════════════════════════════════════════════
//  Help Menu: !${rawCmd}
//  Generated by Discord Bot Builder
// ══════════════════════════════════════════════════════════════════
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _rem = message.content.slice("${cmd}".length);
  if (_rem && !/^\\s/.test(_rem)) return;

  const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  } = require("discord.js");
  const { randomBytes } = require("crypto");

  // ── Pages ───────────────────────────────────────────────────────
  const _pages = ${pages};

  // ── Session ─────────────────────────────────────────────────────
  let   _page  = 0;
  const _sid   = randomBytes(8).toString("hex");
  const _total = _pages.length;

  // ── Variable replacer ────────────────────────────────────────────
  const _v = (pg, pi) => ({
    user:        message.author?.username  || "Unknown",
    mention:     \`<@\${message.author?.id}>\`,
    server:      message.guild?.name       || "Unknown",
    channel:     message.channel?.name     || "unknown",
    date:        new Date().toISOString().slice(0, 10),
    time:        new Date().toTimeString().slice(0, 8),
    command:     "${cmd}",
    page:        String(pi + 1),
    totalPages:  String(_total),
    selected:    "",
    button:      "",
  });

  const _apply = (t, vars) => {
    let r = String(t || ""), i = 0, out = "";
    while (i < r.length) {
      if (r[i] !== "{") { out += r[i++]; continue; }
      const cl = r.indexOf("}", i + 1);
      if (cl === -1) { out += r[i++]; continue; }
      const k = r.slice(i + 1, cl);
      if (/^[\\w.]+$/.test(k)) {
        const val = k.split(".").reduce((o, p) => o?.[p], vars);
        out += (val !== undefined && val !== null) ? String(val) : "{" + k + "}";
      } else { out += r.slice(i, cl + 1); }
      i = cl + 1;
    }
    return out;
  };

  // ── Build payload ────────────────────────────────────────────────
  const _build = (pi) => {
    const pg   = _pages[pi] || _pages[0];
    const vars = _v(pg, pi);
    const rows = [];

    // Dropdown row
    const _dd = new StringSelectMenuBuilder()
      .setCustomId(\`pbm:helpmenu:select:\${_sid}\`)
      .setPlaceholder("📂  Jump to a category…")
      .addOptions(_pages.map((p, i) => ({
        label:   p.title.slice(0, 100),
        value:   String(i),
        default: i === pi,
      })));
    rows.push(new ActionRowBuilder().addComponents(_dd));

    // Button row
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(\`pbm:helpmenu:prev:\${_sid}\`)
        .setLabel("⬅  Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pi <= 0),
      new ButtonBuilder()
        .setCustomId(\`pbm:helpmenu:next:\${_sid}\`)
        .setLabel("Next  ➡")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pi >= _total - 1),
      new ButtonBuilder()
        .setCustomId(\`pbm:helpmenu:close:\${_sid}\`)
        .setLabel("✖  Close")
        .setStyle(ButtonStyle.Danger),
    ));

    return {
      embeds: [{
        title:       _apply(pg.title, vars),
        description: _apply(pg.content, vars),
        color:       ${color},
        footer:      { text: _apply(\`${footer}\`, vars) },
      }],
      components: rows,
    };
  };

  // ── Send initial message ─────────────────────────────────────────
  const _msg = await message.channel.send(_build(_page));

  // ── Interaction collector (self-contained, no global handler) ────
  const _col = _msg.createMessageComponentCollector({ time: 15 * 60 * 1000 });

  _col.on("collect", async (i) => {
    if (!i.customId.endsWith(_sid)) return;

    if (i.isStringSelectMenu()) {
      const idx = parseInt(i.values[0], 10);
      if (!isNaN(idx) && idx >= 0 && idx < _total) _page = idx;
    } else if (i.isButton()) {
      if      (i.customId.includes(":prev:"))  _page = Math.max(0, _page - 1);
      else if (i.customId.includes(":next:"))  _page = Math.min(_total - 1, _page + 1);
      else if (i.customId.includes(":close:")) {
        await _msg.delete().catch(() => {});
        _col.stop();
        await i.deferUpdate().catch(() => {});
        return;
      }
    }
    await i.update(_build(_page)).catch(() => {});
  });

  _col.on("end", () => _msg.edit({ components: [] }).catch(() => {}));
}`;
      },
    },
  },
};
