'use strict';

const path = require('path');

const { applyTemplate, buildVars }         = require(path.join(__dirname, '../../../backend/engine/templateEngine'));
const {
  generateSessionId,
  registerSession,
  buildEmbed,
  buildComponents,
}                                           = require(path.join(__dirname, '../../../backend/engine/interactionHandler'));

// ── Helpers ───────────────────────────────────────────────────────────────────
function hexToInt(hex) {
  const n = parseInt(String(hex || '#5865F2').replace('#', ''), 16);
  return isNaN(n) ? 0x5865F2 : n;
}

// Normalise the pages array — ensure every entry has id, title, content
function normalisePages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ id: 'default', title: 'Menu', content: 'No pages have been configured for this menu.' }];
  }
  return raw.map((p, i) => ({
    id:          String(p.id          ?? `page${i + 1}`),
    title:       String(p.title       ?? `Page ${i + 1}`),
    description: String(p.description ?? ''),
    content:     String(p.content     ?? ''),
    imageUrl:    p.imageUrl    || null,
    thumbnail:   p.thumbnail   || null,
  }));
}

// ── Main plugin export ────────────────────────────────────────────────────────
module.exports = {
  meta: {
    name:          'Page Menu',
    version:       '1.0.0',
    author:        'Akashsuu',
    description:   'Multi-page embed menu with dropdown selection, button navigation, and full variable template support.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    util_pagemenu: {
      label:       'Page Menu',
      icon:        '📖',
      color:       '#1A4A7A',
      description: 'Sends a paginated menu. Configure pages[], dropdown, and buttons inside node.data.',
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command:     { type: 'string',  default: 'menu',      required: true  },
        embedEnabled:{ type: 'boolean', default: true,        required: false },
        embedColor:  { type: 'string',  default: '#5865F2',   required: false },
        embedFooter: { type: 'string',  default: 'Page {page} of {totalPages} · Requested by {user}', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author.bot) return false;
        if (!message.guild) return false;

        // ── 1. Command match ────────────────────────────────────────────────
        const prefix  = ctx?.prefix || '!';
        const rawCmd  = (node.data?.command || 'menu').trim();
        const cmd     = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const content = message.content;

        if (!content.toLowerCase().startsWith(cmd.toLowerCase())) return false;
        const rem = content.slice(cmd.length);
        if (rem && !/^\s/.test(rem)) return false;

        // ── 2. Init flow page state ─────────────────────────────────────────
        if (ctx.flow && typeof ctx.flow === 'object') {
          if (ctx.flow.page === null || ctx.flow.page === undefined) ctx.flow.page = 0;
        }

        // ── 3. Resolve pages ────────────────────────────────────────────────
        const pages      = normalisePages(node.data?.pages);
        const totalPages = pages.length;
        const curIdx     = 0;
        const curPage    = pages[curIdx];

        // ── 4. Build variable map ───────────────────────────────────────────
        const vars = {
          ...buildVars(message, ctx),
          page:       String(curIdx),
          totalPages: String(totalPages),
          selected:   '',
          button:     '',
          flow: {
            ...(buildVars(message, ctx).flow || {}),
            page:       String(curIdx),
            selected:   '',
            button:     '',
          },
        };

        // ── 5. Generate session ID before sending ───────────────────────────
        //    Session ID is embedded in component customIds so the interaction
        //    handler can look up state without a second API call.
        const sessionId = generateSessionId();

        // ── 6. Attach nodeId and sessionId to nodeData for component builder
        const nodeData = { ...node.data, _nodeId: node.id, _sessionId: sessionId };

        // ── 7. Build message payload ─────────────────────────────────────────
        const components = buildComponents(nodeData, curIdx, totalPages, sessionId);
        const payload    = { components };

        if (nodeData.embedEnabled !== false) {
          payload.embeds = [buildEmbed(nodeData, curPage, vars)];
        } else {
          payload.content = applyTemplate(curPage.content || '', vars) || '​'; // zero-width space fallback
        }

        // ── 8. Send ──────────────────────────────────────────────────────────
        let sent;
        try {
          sent = await message.channel.send(payload);
        } catch (err) {
          try { await message.reply(`❌ Failed to send menu: ${err.message}`); } catch {}
          return false;
        }

        // ── 9. Register session for interaction handling ─────────────────────
        registerSession(sessionId, {
          sessionId,
          nodeData,
          pages,
          currentPage: curIdx,
          selected:    '',
          lastButton:  '',
          userId:      message.author.id,
          baseVars:    vars,
        });

        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd     = (node.data?.command || 'menu').replace(/"/g, '\\"');
        const cmd        = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const color      = hexToInt(node.data?.embedColor || '#5865F2');
        const pages      = JSON.stringify(normalisePages(node.data?.pages), null, 4)
                             .split('\n').join('\n  ');
        const ddEnabled  = !!(node.data?.dropdown?.enabled);
        const btnEnabled = !!(node.data?.buttons?.enabled);

        return `
// ── Page Menu: ${cmd} ─────────────────────────────────────────────────────────
// Requires discord.js v14 (ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder)
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _pmRem = message.content.slice("${cmd}".length);
  if (_pmRem && !/^\\s/.test(_pmRem)) return;

  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
  const { randomBytes } = require('crypto');

  const _pages = ${pages};
  let _pmPage  = 0;
  const _pmSid = randomBytes(8).toString('hex');

  const _pmVars = (pg, p) => ({
    user: message.author?.username || "Unknown",
    mention: \`<@\${message.author?.id}>\`,
    server: message.guild?.name || "Unknown",
    channel: message.channel?.name || "unknown",
    date: new Date().toISOString().slice(0,10),
    time: new Date().toTimeString().slice(0,8),
    page: String(p),
    totalPages: String(_pages.length),
    selected: "",
  });

  const _pmApply = (t, vars) => {
    let r = String(t || ""), i = 0, out = "";
    while (i < r.length) {
      if (r[i] !== "{") { out += r[i++]; continue; }
      const cl = r.indexOf("}", i + 1);
      if (cl === -1) { out += r[i++]; continue; }
      const k = r.slice(i+1, cl);
      out += (k in vars && vars[k] != null) ? String(vars[k]) : "{" + k + "}";
      i = cl + 1;
    }
    return out;
  };

  const _pmBuildPayload = (pg, idx) => {
    const v = _pmVars(pg, idx);
    const rows = [];
    ${ddEnabled ? `
    const _ddMenu = new StringSelectMenuBuilder()
      .setCustomId(\`pbm:${rawCmd}:select:\${_pmSid}\`)
      .setPlaceholder("${(node.data?.dropdown?.placeholder || 'Select a page').replace(/"/g, '\\"')}")
      .addOptions(_pages.map((p, i) => ({ label: p.title.slice(0,100), value: String(i), default: i === idx })));
    rows.push(new ActionRowBuilder().addComponents(_ddMenu));` : ''}
    ${btnEnabled ? `
    const _btns = [
      new ButtonBuilder().setCustomId(\`pbm:${rawCmd}:prev:\${_pmSid}\`).setLabel("⬅ Prev").setStyle(ButtonStyle.Secondary).setDisabled(idx <= 0),
      new ButtonBuilder().setCustomId(\`pbm:${rawCmd}:next:\${_pmSid}\`).setLabel("Next ➡").setStyle(ButtonStyle.Primary).setDisabled(idx >= _pages.length - 1),
      new ButtonBuilder().setCustomId(\`pbm:${rawCmd}:close:\${_pmSid}\`).setLabel("❌ Close").setStyle(ButtonStyle.Danger),
    ];
    rows.push(new ActionRowBuilder().addComponents(_btns));` : ''}
    return {
      embeds: [{ title: _pmApply(pg.title, v), description: _pmApply(pg.content, v), color: ${color}, footer: { text: _pmApply("Page {page} of {totalPages}", v) } }],
      components: rows,
    };
  };

  const _pmMsg = await message.channel.send(_pmBuildPayload(_pages[0], 0));

  // Interaction collector
  const _pmCollect = _pmMsg.createMessageComponentCollector({ time: 15 * 60 * 1000 });
  _pmCollect.on("collect", async (i) => {
    if (i.customId.endsWith(_pmSid)) {
      if (i.isStringSelectMenu()) { _pmPage = parseInt(i.values[0], 10); }
      else if (i.customId.includes(":prev:"))  { _pmPage = Math.max(0, _pmPage - 1); }
      else if (i.customId.includes(":next:"))  { _pmPage = Math.min(_pages.length - 1, _pmPage + 1); }
      else if (i.customId.includes(":close:")) { await _pmMsg.delete().catch(()=>{}); _pmCollect.stop(); return; }
      await i.update(_pmBuildPayload(_pages[_pmPage], _pmPage));
    }
  });
  _pmCollect.on("end", () => _pmMsg.edit({ components: [] }).catch(()=>{}));
}`;
      },
    },
  },
};
