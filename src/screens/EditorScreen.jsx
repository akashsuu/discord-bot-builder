import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
  Panel,
  SelectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';

import { useProject } from '../context/ProjectContext';
import builtinNodeTypes, { DEFAULT_NODE_DATA, NODE_PALETTE } from '../nodes/nodeTypes';
import PluginNode from '../nodes/PluginNode';
import Toolbar from '../components/Toolbar';
import LogPanel from '../components/LogPanel';
import { demoSub, varHint, BUILTIN_VARS, PLUGIN_VARS } from '../utils/variables';

let _nc = 1;

const MINIMAP_NODE_COLOR = {
  event_message:    '#1E4030',
  event_channel:    '#162040',
  event_client:     '#2A1840',
  event_emoji:      '#3A2800',
  event_guild:      '#0A2A1A',
  event_member:     '#1A2840',
  event_role:       '#3A1018',
  custom_command:   '#1E2E46',
  send_message:     '#3A4A1A',
  condition_branch: '#4A3010',
};

const CATEGORIES = [
  { label: 'Events',   items: ['event_message', 'event_channel', 'event_client', 'event_emoji', 'event_guild', 'event_member', 'event_role'] },
  { label: 'Commands', items: ['custom_command'] },
  { label: 'Actions',  items: ['send_message', 'page_menu'] },
  { label: 'Logic',    items: ['condition_branch'] },
];

// Event sub-options for each new event node type (used in NPanel + node components)
const EVENT_NODE_OPTIONS = {
  event_channel: [
    { value: 'channelCreate',     label: 'Channel Create' },
    { value: 'channelDelete',     label: 'Channel Delete' },
    { value: 'channelUpdate',     label: 'Channel Update' },
    { value: 'channelPinsUpdate', label: 'Pins Update' },
  ],
  event_client: [
    { value: 'ready', label: 'Ready' },
    { value: 'warn',  label: 'Warn'  },
  ],
  event_emoji: [
    { value: 'emojiCreate', label: 'Emoji Create' },
    { value: 'emojiDelete', label: 'Emoji Delete' },
    { value: 'emojiUpdate', label: 'Emoji Update' },
  ],
  event_guild: [
    { value: 'guildCreate',    label: 'Guild Join' },
    { value: 'guildDelete',    label: 'Guild Leave' },
    { value: 'guildUpdate',    label: 'Guild Update' },
    { value: 'guildAvailable', label: 'Guild Available' },
  ],
  event_member: [
    { value: 'guildMemberAdd',    label: 'Member Join' },
    { value: 'guildMemberRemove', label: 'Member Leave' },
    { value: 'guildMemberUpdate', label: 'Member Update' },
  ],
  event_role: [
    { value: 'roleCreate', label: 'Role Create' },
    { value: 'roleDelete', label: 'Role Delete' },
    { value: 'roleUpdate', label: 'Role Update' },
  ],
};

function serialize(nodes) {
  return nodes.map(({ id, type, position, data }) => ({ id, type, position, data }));
}

// ── Category definitions — all plugin folders shown in the right-click menu ──
const CATEGORY_LIST = [
  { key: 'moderation',   label: 'Moderation',   color: '#C0392B', eventType: 'event_guild'   },
  { key: 'fun',          label: 'Fun',          color: '#F39C12', eventType: 'event_emoji'   },
  { key: 'utility',      label: 'Utility',      color: '#2980B9', eventType: 'event_channel' },
  { key: 'music',        label: 'Music',        color: '#8E44AD', eventType: 'event_client'  },
  { key: 'economy',      label: 'Economy',      color: '#27AE60', eventType: 'event_member'  },
  { key: 'games',        label: 'Games',        color: '#D35400', eventType: 'event_message' },
  { key: 'giveaway',     label: 'Giveaway',     color: '#E84393', eventType: null            },
  { key: 'admin',        label: 'Admin',        color: '#7F8C8D', eventType: 'event_role'    },
  { key: 'info',         label: 'Info',         color: '#16A085', eventType: null            },
  { key: 'tickets',      label: 'Tickets',      color: '#1ABC9C', eventType: 'event_message' },
  { key: 'ai',           label: 'AI',           color: '#3498DB', eventType: null            },
];

// Derived maps kept for botRunner / codeExporter compatibility
const EVENT_SUBMENU_MAP = Object.fromEntries(
  CATEGORY_LIST.filter((c) => c.eventType).map((c) => [c.eventType, c.key])
);
const EVENT_SUBMENU_CATS = new Set(CATEGORY_LIST.map((c) => c.key));

// ── Right-click context menu ──────────────────────────────────────────────────
function ContextMenu({ menu, palette, pluginMeta, onAdd, onClose }) {
  const [search, setSearch] = useState('');
  // activeSub: { key, top, left, right } — screen rect of the hovered row
  const [activeSub, setActive] = useState(null);
  const inputRef   = useRef(null);
  const hoverTimer = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  // Capture the row's screen rect so the submenu can be placed with position:fixed
  const openSub  = (key, el) => {
    clearTimeout(hoverTimer.current);
    const r = el.getBoundingClientRect();
    setActive({ key, top: r.top, left: r.left, right: r.right });
  };
  const closeSub = ()  => { hoverTimer.current = setTimeout(() => setActive(null), 150); };
  const keepSub  = ()  => clearTimeout(hoverTimer.current);

  const extraPluginGroups = useMemo(() => {
    const list = (pluginMeta || []).filter((p) => !EVENT_SUBMENU_CATS.has(p.category));
    if (!list.length) return [];
    const map = new Map();
    for (const p of list) {
      const key = p.category
        ? p.category.charAt(0).toUpperCase() + p.category.slice(1) + ' Plugins'
        : 'Plugins';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return Array.from(map.entries());
  }, [pluginMeta]);

  const allItems = [
    ...palette,
    ...(pluginMeta || []).map((p) => ({ type: p.type, label: p.label, color: p.color })),
  ];
  const filtered = search.trim()
    ? allItems.filter((p) => p.label.toLowerCase().includes(search.toLowerCase()))
    : null;

  // Build the content shown inside the fixed submenu panel
  const buildSubContent = (key) => {
    const catDef = CATEGORY_LIST.find((c) => c.key === key);
    if (catDef) {
      const eventNode    = catDef.eventType ? palette.find((x) => x.type === catDef.eventType) : null;
      const folderPlugins = (pluginMeta || []).filter((x) => x.category === key);
      return (
        <>
          {eventNode && (
            <>
              <div className="bl-ctx-sub-section">Event Node</div>
              <div className="bl-ctx-item" onMouseDown={() => { onAdd(catDef.eventType); onClose(); }}>
                <span className="bl-ctx-item-dot" style={{ background: eventNode.color }} />
                {eventNode.label}
              </div>
            </>
          )}
          {folderPlugins.length > 0 ? (
            <>
              {eventNode && <div className="bl-ctx-divider" />}
              <div className="bl-ctx-sub-section">Plugins</div>
              {folderPlugins.map((pl) => (
                <div key={pl.type} className="bl-ctx-item" onMouseDown={() => { onAdd(pl.type); onClose(); }}>
                  <span className="bl-ctx-item-dot" style={{ background: pl.color }} />
                  {pl.label}
                </div>
              ))}
            </>
          ) : (
            !eventNode && <div className="bl-ctx-sub-empty">plugins/{key}/ — empty</div>
          )}
        </>
      );
    }
    // Fallback: unknown extra category
    const group = extraPluginGroups.find(([label]) => label === key);
    if (group) {
      return group[1].map((p) => (
        <div key={p.type} className="bl-ctx-item" onMouseDown={() => { onAdd(p.type); onClose(); }}>
          <span className="bl-ctx-item-dot" style={{ background: p.color }} />
          {p.label}
        </div>
      ));
    }
    return null;
  };

  // Fixed-position left edge: right of the row, or left-shifted near screen edge
  const subLeft = activeSub
    ? (activeSub.right > window.innerWidth - 400 ? activeSub.left - 196 : activeSub.right)
    : 0;

  return (
    <>
      <div className="bl-ctx-overlay" onMouseDown={onClose}>
        <div
          className="bl-ctx-menu"
          style={{ left: menu.x, top: menu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="bl-ctx-header">Add Node</div>
          <input
            ref={inputRef}
            className="bl-ctx-search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {filtered ? (
            filtered.length === 0
              ? <div style={{ padding: '8px 10px', color: '#555', fontSize: 11 }}>No results</div>
              : filtered.map((p) => (
                <div key={p.type} className="bl-ctx-item" onMouseDown={() => { onAdd(p.type); onClose(); }}>
                  <span className="bl-ctx-item-dot" style={{ background: p.color }} />
                  {p.label}
                </div>
              ))
          ) : (
            <>
              {/* ── Events ── */}
              <div className="bl-ctx-cat">Events</div>
              {CATEGORY_LIST.map((cat) => {
                const isActive = activeSub?.key === cat.key;
                return (
                  <div
                    key={cat.key}
                    className={`bl-ctx-item bl-ctx-item-sub${isActive ? ' bl-ctx-item-active' : ''}`}
                    onMouseEnter={(e) => openSub(cat.key, e.currentTarget)}
                    onMouseLeave={closeSub}
                  >
                    <span className="bl-ctx-item-dot" style={{ background: cat.color }} />
                    <span style={{ flex: 1 }}>{cat.label}</span>
                    <span className="bl-ctx-arrow">▶</span>
                  </div>
                );
              })}

              {/* ── Commands, Actions, Logic ── */}
              {[
                { label: 'Commands', items: ['custom_command'] },
                { label: 'Actions',  items: ['send_message', 'page_menu'] },
                { label: 'Logic',    items: ['condition_branch'] },
              ].map((cat) => (
                <React.Fragment key={cat.label}>
                  <div className="bl-ctx-cat">{cat.label}</div>
                  {cat.items.map((type) => {
                    const p = palette.find((x) => x.type === type);
                    if (!p) return null;
                    return (
                      <div key={type} className="bl-ctx-item" onMouseDown={() => { onAdd(type); onClose(); }}>
                        <span className="bl-ctx-item-dot" style={{ background: p.color }} />
                        {p.label}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}

              {/* ── Extra plugin groups ── */}
              {extraPluginGroups.length > 0 && (
                <>
                  <div className="bl-ctx-divider" />
                  {extraPluginGroups.map(([label, items]) => {
                    const isActive = activeSub?.key === label;
                    return (
                      <div
                        key={label}
                        className={`bl-ctx-item bl-ctx-item-sub${isActive ? ' bl-ctx-item-active' : ''}`}
                        onMouseEnter={(e) => openSub(label, e.currentTarget)}
                        onMouseLeave={closeSub}
                      >
                        <span className="bl-ctx-item-dot" style={{ background: items[0]?.color || '#555' }} />
                        <span style={{ flex: 1 }}>{label}</span>
                        <span className="bl-ctx-arrow">▶</span>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Submenu panel — position:fixed, completely outside overflow:hidden ancestors */}
      {activeSub && (
        <div
          className="bl-ctx-submenu-panel"
          style={{ top: activeSub.top, left: subLeft }}
          onMouseEnter={keepSub}
          onMouseLeave={closeSub}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {buildSubContent(activeSub.key)}
        </div>
      )}
    </>
  );
}

// demoSub is imported at the top of this file from '../utils/variables'

// ── Discord embed block ───────────────────────────────────────────────────────
function DiscordEmbed({ data, text }) {
  const color    = data.embedColor || '#5865F2';
  // built-in nodes: thumbnail = top-right square, image = bottom rect
  // plugin nodes: logoUrl = top-left author icon, imageUrl = bottom rect
  const isThumb  = data.imageUrl && data.imagePosition === 'thumbnail';
  const isImgBot = data.imageUrl && data.imagePosition !== 'thumbnail';
  // plugin logo (author icon, top-left)
  const hasLogo  = data.logoUrl || data.logoName;

  return (
    <div className="dc-embed" style={{ borderLeftColor: color }}>
      <div className="dc-embed-inner">

        {/* Author row — top-left logo icon + name */}
        {hasLogo && (
          <div className="dc-embed-author">
            {data.logoUrl
              ? <img src={data.logoUrl} className="dc-author-icon" alt="logo" onError={(e) => { e.target.style.display='none'; }} />
              : <div className="dc-author-icon-ph" />
            }
            {data.logoName && <span className="dc-author-name">{data.logoName}</span>}
          </div>
        )}

        {/* Title + thumbnail (built-in nodes) */}
        <div className="dc-embed-top">
          <div className="dc-embed-main">
            {data.embedTitle && <div className="dc-embed-title">{data.embedTitle}</div>}
            {text && <div className="dc-embed-desc">{text}</div>}
          </div>
          {isThumb && (
            data.imageUrl
              ? <img src={data.imageUrl} className="dc-embed-thumb" alt="thumb" onError={(e) => { e.target.style.display='none'; }} />
              : <div className="dc-thumb-placeholder">thumb</div>
          )}
        </div>

        {/* Bottom rectangle image */}
        {(isImgBot || data.imageUrl) && !isThumb && (
          data.imageUrl
            ? <img src={data.imageUrl} className="dc-embed-img" alt="img" onError={(e) => { e.target.style.display='none'; }} />
            : <div className="dc-img-placeholder">Image will appear here</div>
        )}

        {data.embedFooter && <div className="dc-embed-footer">{data.embedFooter}</div>}
      </div>
    </div>
  );
}

// ── Full Discord message preview ──────────────────────────────────────────────
function DiscordPreview({ node }) {
  const { botInfo } = useProject();
  const now  = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!node) {
    return (
      <div className="dc-wrap">
        <div className="dc-no-out">Select a command or send node</div>
      </div>
    );
  }

  const d = node.data;
  let rawText = '';
  let rawEmbedText = '';

  // Keys that are never output text — skip them when searching for a preview string
  const PREVIEW_SKIP = new Set([
    'embedColor', 'embedTitle', 'embedFooter', 'embedTimestamp',
    'logoUrl', 'logoName', 'imageUrl', 'imagePosition',
    'denyMessage', 'cooldownMessage', 'usageMessage', 'errorMessage', 'dmMessage',
    'event', 'condition', 'value', 'permission', 'mode',
    'pages', 'dropdown', 'buttons', 'totalPages',
    'apiUrl', 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate',
    'collapsed',
  ]);

  // Page index state lives here so NPanel preview can be paginated
  const [nPanelPage, setNPanelPage] = React.useState(0);

  let embedTitleOverride = null;

  if (node.type === 'custom_command')    rawText = d.reply  || '';
  else if (node.type === 'send_message') rawText = d.text   || '';
  else {
    if (Array.isArray(d.pages) && d.pages.length > 0) {
      // Page menu node — preview the selected page
      const safePg = Math.min(nPanelPage, d.pages.length - 1);
      const page   = d.pages[safePg] || d.pages[0];
      rawText            = page.content || '';
      embedTitleOverride = page.title   || null;
    } else if (d.output !== undefined) {
      rawText = d.output || '';
    } else if (d.embedEnabled !== false && typeof d.descriptionTemplate === 'string' && d.descriptionTemplate.trim()) {
      rawText = d.plainTextTemplate || d.descriptionTemplate;
      rawEmbedText = d.descriptionTemplate;
      embedTitleOverride = d.titleTemplate || null;
    } else if (d.embedEnabled === false && typeof d.plainTextTemplate === 'string' && d.plainTextTemplate.trim()) {
      rawText = d.plainTextTemplate;
    } else {
      const entry = Object.entries(d).find(([k, v]) =>
        !k.startsWith('_') &&
        !PREVIEW_SKIP.has(k) &&
        typeof v === 'string' &&
        v.trim().length > 0
      );
      rawText = entry ? entry[1] : '';
    }
  }

  const isPageMenu  = Array.isArray(d.pages) && d.pages.length > 0;
  const totalPages  = isPageMenu ? d.pages.length : 0;
  const safePgIdx   = Math.min(nPanelPage, Math.max(0, totalPages - 1));

  // Pass page-specific demo values into demoSub
  const extraTokens = isPageMenu
    ? { page: String(safePgIdx + 1), totalPages: String(totalPages) }
    : { author: 'akashsuu', target: 'arzu_ly', gif: 'https://nekos.best/dance.gif', anime: 'Kyoukai no Kanata' };

  const text = demoSub(rawText, { ...d, ...extraTokens });
  const embedText = demoSub(rawEmbedText || rawText, { ...d, ...extraTokens });

  // Build effective embed data: if page menu, inject page title as embed title
  const effectiveData = {
    ...d,
    imageUrl: d.imageUrl || extraTokens.gif,
    embedFooter: demoSub(d.embedFooter || 'Anime: {anime}', { ...d, ...extraTokens }),
    ...(embedTitleOverride ? { embedTitle: embedTitleOverride } : {}),
  };

  const hasContent = text || d.embedEnabled !== false;

  if (!hasContent) {
    return (
      <div className="dc-wrap">
        <div className="dc-no-out">No output configured on this node.</div>
      </div>
    );
  }

  const botName = botInfo?.username || 'YourBot';
  const botTag  = botInfo?.tag      || null;

  return (
    <div className="dc-wrap">
      {/* Page selector tabs — shown only for page menu nodes */}
      {isPageMenu && totalPages > 1 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '0 4px 6px' }}>
          {d.pages.map((p, i) => (
            <button
              key={i}
              onClick={() => setNPanelPage(i)}
              style={{
                background:   safePgIdx === i ? '#2A2A5A' : '#1A1A2A',
                border:       `1px solid ${safePgIdx === i ? '#5865F2' : '#2A2A3A'}`,
                color:        safePgIdx === i ? '#7EB8F7' : '#555',
                borderRadius: 3, cursor: 'pointer',
                padding: '1px 8px', fontSize: 10,
                fontWeight: safePgIdx === i ? 700 : 400,
              }}
            >
              {i + 1}
            </button>
          ))}
          <span style={{ color: '#444', fontSize: 10, alignSelf: 'center', marginLeft: 2 }}>
            {d.pages[safePgIdx]?.title || ''}
          </span>
        </div>
      )}

      <div className="dc-msg">
        {botInfo?.avatarURL
          ? <img
              src={botInfo.avatarURL}
              className="dc-avatar-img"
              alt={botName}
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          : null
        }
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex' }}>⚡</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            {botTag && <span className="dc-bot-tag-label">#{botTag.split('#')[1]}</span>}
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          {text && <div className="dc-plain">{text}</div>}
          {effectiveData.embedEnabled !== false ? (
            <DiscordEmbed data={{ ...effectiveData, embedFooter: `${effectiveData.embedFooter} • Today at ${time}` }} text={embedText} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Shared embed sub-form used in NPanel ─────────────────────────────────────
function EmbedFields({ d, update }) {
  return (
    <>
      <div style={{ height: 1, background: '#2A2A2A', margin: '6px 0' }} />

      <div className="bl-prop-row" style={{ gridTemplateColumns: '1fr' }}>
        <label className="bl-embed-toggle" style={{ paddingLeft: 0 }}>
          <input type="checkbox" checked={d.embedEnabled !== false} onChange={(e) => update('embedEnabled', e.target.checked)} />
          Embed
        </label>
      </div>

      {d.embedEnabled !== false && (
        <>
          <div className="bl-prop-row">
            <span className="bl-prop-label">Color</span>
            <div className="bl-color-field">
              <input type="color" className="bl-color-pick" value={d.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} />
              <input type="text" className="bl-field-input" value={d.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} spellCheck={false} style={{ flex: 1 }} />
            </div>
          </div>

          <div className="bl-prop-row">
            <span className="bl-prop-label">Title</span>
            <input className="bl-field-input" value={d.embedTitle || ''} onChange={(e) => update('embedTitle', e.target.value)} placeholder="Optional" spellCheck={false} />
          </div>

          <div className="bl-prop-row">
            <span className="bl-prop-label">Image URL</span>
            <input className="bl-field-input" value={d.imageUrl || ''} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://…" spellCheck={false} />
          </div>

          {d.imageUrl && (
            <div className="bl-prop-row">
              <span className="bl-prop-label">Position</span>
              <div className="bl-img-pos-row">
                <button
                  className={`bl-img-pos-btn ${(d.imagePosition || 'image') === 'image' ? 'active' : ''}`}
                  onClick={() => update('imagePosition', 'image')}
                  title="Large rectangle at bottom"
                >▬ Bottom</button>
                <button
                  className={`bl-img-pos-btn ${d.imagePosition === 'thumbnail' ? 'active' : ''}`}
                  onClick={() => update('imagePosition', 'thumbnail')}
                  title="Small square at top-right"
                >▪ Top-Right</button>
              </div>
            </div>
          )}

          <div className="bl-prop-row">
            <span className="bl-prop-label">Footer</span>
            <input className="bl-field-input" value={d.embedFooter || ''} onChange={(e) => update('embedFooter', e.target.value)} placeholder="Optional" spellCheck={false} />
          </div>
        </>
      )}
    </>
  );
}

// ── Properties N-panel ────────────────────────────────────────────────────────
function ticketSplitCsv(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function ticketSplitCsvLoose(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim());
}

function ticketTitleCase(value) {
  const clean = String(value || '').replace(/[-_]+/g, ' ').trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Support';
}

function getTicketPanelOptions(data) {
  const categories = data.categories == null ? ['support'] : ticketSplitCsvLoose(data.categories);
  const labels = ticketSplitCsvLoose(data.categoryLabels || '');
  const length = Math.max(categories.length, labels.length, 1);
  return Array.from({ length }, (_, index) => {
    const category = categories[index] ?? (index === 0 && labels.length === 0 ? 'support' : '');
    return {
      category,
      label: labels[index] ?? ticketTitleCase(category),
    };
  }).filter((option, index, list) =>
    list.length === 1 || option.category !== '' || option.label !== ''
  );
}

const DISCORD_BUTTON_STYLES = {
  Primary: { background: '#5865F2', border: '#5865F2', color: '#FFFFFF' },
  Secondary: { background: '#4E5058', border: '#4E5058', color: '#FFFFFF' },
  Success: { background: '#248046', border: '#248046', color: '#FFFFFF' },
  Danger: { background: '#DA373C', border: '#DA373C', color: '#FFFFFF' },
};

function DiscordPreviewTicketPanel({ data }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const color = data.embedColor || '#5865F2';
  const options = getTicketPanelOptions(data).slice(0, 25);
  const mode = String(data.panelMode || 'buttons').toLowerCase();
  const buttonStyle = DISCORD_BUTTON_STYLES[data.buttonStyle] || DISCORD_BUTTON_STYLES.Primary;
  const title = demoSub(data.embedTitle || 'Support Tickets', data);
  const description = demoSub(data.embedDescription || 'Need help? Click below to open a ticket.', data);
  const footer = data.embedFooter ? demoSub(data.embedFooter, data) : '';
  const botName = botInfo?.username || 'YourBot';
  const hasLogo = data.logoUrl || data.logoName;
  const imageUrl = data.imageUrl || data.embedImage;
  const thumbUrl = data.embedThumbnail;

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex' }}>T</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          <div className="dc-embed" style={{ borderLeftColor: color }}>
            {hasLogo && (
              <div className="dc-embed-author">
                {data.logoUrl ? (
                  <img src={data.logoUrl} className="dc-author-icon" alt="logo" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="dc-author-icon-ph" />
                )}
                {data.logoName && <span className="dc-author-name">{demoSub(data.logoName, data)}</span>}
              </div>
            )}
            <div className="dc-embed-main">
              <div className="dc-embed-content">
                <div className="dc-embed-title">{title}</div>
                <div className="dc-embed-desc">{description}</div>
              </div>
              {thumbUrl && (
                <img src={thumbUrl} className="dc-embed-thumb" alt="thumb" onError={(e) => { e.target.style.display = 'none'; }} />
              )}
            </div>
            {imageUrl && (
              <img src={imageUrl} className="dc-embed-img" alt="ticket panel" onError={(e) => { e.target.style.display = 'none'; }} />
            )}
            {footer && <div className="dc-embed-footer">{footer}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {mode === 'dropdown' ? (
              <div style={{
                width: '100%',
                minHeight: 38,
                background: '#1E1F22',
                border: '1px solid #3F4147',
                borderRadius: 3,
                color: '#B5BAC1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                fontSize: 13,
              }}>
                <span>{data.dropdownPlaceholder || 'Select a ticket category'}</span>
                <span style={{ color: '#80848E' }}>v</span>
              </div>
            ) : (
              options.map((option, index) => (
                <button
                  key={`${option.category}_${index}`}
                  type="button"
                  style={{
                    background: buttonStyle.background,
                    border: `1px solid ${buttonStyle.border}`,
                    color: buttonStyle.color,
                    borderRadius: 3,
                    padding: '7px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {option.label || ticketTitleCase(option.category)}
                </button>
              ))
            )}
          </div>
          {mode === 'dropdown' && (
            <div style={{ display: 'grid', gap: 2, marginTop: 4, color: '#949BA4', fontSize: 11 }}>
              {options.slice(0, 5).map((option, index) => (
                <span key={`${option.category}_preview_${index}`}>{option.label || ticketTitleCase(option.category)}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ticketStatusPreviewText(node) {
  const data = node?.data || {};
  const fallback = node?.type === 'ticket_lock'
    ? '🔐 **Ticket Locked** — The ticket owner can no longer send messages.'
    : '🔓 **Ticket Unlocked** — The ticket owner can send messages again.';
  const raw = node?.type === 'ticket_lock'
    ? (data.lockMessage ?? fallback)
    : (data.unlockMessage ?? fallback);
  return demoSub(raw, {
    ...data,
    user: 'Akashsuu',
    mention: '@Akashsuu',
    ticketId: 'ticket-0001',
    channel: 'ticket-akashsuu',
  });
}

function DiscordPreviewTicketStatus({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const botName = botInfo?.username || 'YourBot';
  const isLock = node?.type === 'ticket_lock';
  const color = isLock ? '#F59E0B' : '#34D399';

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: color }}>
          {isLock ? 'L' : 'U'}
        </div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          <div className="dc-plain">{ticketStatusPreviewText(node)}</div>
        </div>
      </div>
    </div>
  );
}

function getTicketEmbedPreview(node) {
  const d = node?.data || {};
  if (node?.type === 'ticket_create') {
    return {
      data: {
        ...d,
        embedTitle: d.welcomeTitle || 'Ticket Opened',
        embedFooter: d.embedFooter || 'Ticket • ticket-0001',
      },
      text: d.welcomeDescription || 'Hello Akashsuu! A staff member will assist you shortly.',
    };
  }
  if (node?.type === 'ticket_claim') {
    return {
      data: { ...d, embedTitle: 'Ticket Claimed' },
      text: 'This ticket has been claimed by @Akashsuu.',
    };
  }
  if (node?.type === 'ticket_close') {
    return {
      data: { ...d, embedTitle: 'Close Ticket?' },
      text: 'Are you sure you want to close this ticket?\n\nA transcript will be saved and the channel will be deleted.',
    };
  }
  return null;
}

function DiscordPreviewTicketEmbed({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const preview = getTicketEmbedPreview(node);
  if (!preview) return <DiscordPreview node={node} />;

  const botName = botInfo?.username || 'YourBot';
  const text = demoSub(preview.text, {
    ...(node?.data || {}),
    user: 'Akashsuu',
    mention: '@Akashsuu',
    ticketId: 'ticket-0001',
    channel: 'ticket-akashsuu',
  });

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex' }}>T</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          <DiscordEmbed data={preview.data} text={text} />
        </div>
      </div>
    </div>
  );
}

function afkPreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    afkUser: 'Support',
    afkTag: 'Support#0000',
    afkId: '987654321098765432',
    afkMention: '@Support',
    reason: data.defaultReason || 'AFK',
    since: '12m',
    server: 'My Server',
    channel: 'general',
    date: '2026-05-10',
    time: '12:00',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewAfk({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const previews = [
    {
      label: 'Set AFK',
      avatar: 'A',
      text: afkPreviewText(d.setMessage || '{mention} is now AFK: {reason}', d),
    },
    {
      label: 'Mention Reply',
      avatar: 'M',
      text: afkPreviewText(d.mentionMessage || '{afkMention} is AFK: {reason} (since {since})', d),
    },
    {
      label: 'Return',
      avatar: 'R',
      text: afkPreviewText(d.returnMessage || 'Welcome back {mention}, I removed your AFK status. You were AFK for {since}.', d),
    },
  ];

  return (
    <div className="dc-wrap" style={{ display: 'grid', gap: 10 }}>
      {previews.map((preview) => (
        <div key={preview.label}>
          <div style={{ color: '#7D8590', fontSize: 10, margin: '0 0 4px 42px', textTransform: 'uppercase', fontWeight: 700 }}>
            {preview.label}
          </div>
          <div className="dc-msg">
            {botInfo?.avatarURL ? (
              <img
                src={botInfo.avatarURL}
                className="dc-avatar-img"
                alt={botName}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#5865F2' }}>
              {preview.avatar}
            </div>
            <div className="dc-msg-body">
              <div className="dc-msg-hdr">
                <span className="dc-bot-name">{botName}</span>
                <span className="dc-bot-badge">BOT</span>
                <span className="dc-timestamp">Today at {time}</span>
              </div>
              {d.embedEnabled === false ? (
                <div className="dc-plain">{preview.text}</div>
              ) : (
                <DiscordEmbed data={{ ...d, embedTitle: d.embedTitle || 'AFK' }} text={preview.text} />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function avatarPreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    targetName: 'Support',
    targetTag: 'Support#0000',
    targetId: '987654321098765432',
    targetMention: '@Support',
    avatarUrl: 'https://cdn.discordapp.com/avatars/123/avatar.png?size=4096',
    server: 'My Server',
    serverId: '123456789012345678',
    channel: 'general',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewAvatar({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const previewImage = d.imageUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';
  const title = avatarPreviewText(d.titleTemplate || "{targetName}'s Avatar", d);
  const text = avatarPreviewText(d.descriptionTemplate || 'Requested by {mention}', d);
  const buttons = [
    d.showDownloadButton !== false ? (d.downloadButtonLabel || 'Download') : null,
    d.showOpenButton !== false ? (d.openButtonLabel || 'Open Avatar') : null,
    d.showServerButton !== false ? (d.serverButtonLabel || 'Server Icon') : null,
  ].filter(Boolean);

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#3B82F6' }}>AV</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          {d.embedEnabled === false ? (
            <div className="dc-plain">{`${title}\n${text}\n${previewImage}`}</div>
          ) : (
            <DiscordEmbed
              data={{
                ...d,
                embedTitle: title,
                embedFooter: avatarPreviewText(d.embedFooter || 'Avatar command', d),
                imageUrl: previewImage,
                imagePosition: 'bottom',
              }}
              text={text}
            />
          )}
          {buttons.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {buttons.map((label, index) => (
                <button
                  key={`${label}_${index}`}
                  type="button"
                  style={{
                    background: '#5865F2',
                    border: '1px solid #4752C4',
                    color: '#FFF',
                    borderRadius: 3,
                    padding: '7px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div style={{ color: '#72767D', fontSize: 10, marginTop: 6 }}>
            Preview uses the Image URL field as the sample avatar.
          </div>
        </div>
      </div>
    </div>
  );
}

function setBoostPreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    member: 'Akashsuu',
    memberMention: '@Akashsuu',
    server: 'My Server',
    serverId: '123456789012345678',
    channel: data.boostChannelId ? '#boosts' : '#general',
    channelId: data.boostChannelId || '123456789012345678',
    boostCount: '14',
    boostTier: '2',
    status: data.enabledByDefault === false ? 'OFF' : 'ON',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewSetBoost({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const panelText = [
    setBoostPreviewText(d.panelDescription || 'Configure boost announcements for {server}.', d),
    '',
    `Status: **${d.enabledByDefault === false ? 'OFF' : 'ON'}**`,
    `Channel: ${d.boostChannelId ? '#boosts' : '#general'}`,
  ].join('\n');
  const boostText = setBoostPreviewText(
    d.boostMessage || 'Thank you {memberMention} for boosting {server}! We now have {boostCount} boosts.',
    d
  );
  const buttons = [
    d.enabledByDefault === false ? (d.disableButtonLabel || 'Boost Messages: OFF') : (d.enableButtonLabel || 'Boost Messages: ON'),
    d.testButtonLabel || 'Send Test',
    d.resetButtonLabel || 'Reset',
  ];

  const renderMessage = (label, avatar, content, titleOverride) => (
    <div key={label}>
      <div style={{ color: '#7D8590', fontSize: 10, margin: '0 0 4px 42px', textTransform: 'uppercase', fontWeight: 700 }}>
        {label}
      </div>
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#F472B6' }}>{avatar}</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          {d.embedEnabled === false ? (
            <div className="dc-plain">{content}</div>
          ) : (
            <DiscordEmbed
              data={{
                ...d,
                embedTitle: setBoostPreviewText(titleOverride || d.embedTitle || 'Boost Settings', d),
                embedFooter: setBoostPreviewText(d.embedFooter || 'Boost setup panel', d),
              }}
              text={content}
            />
          )}
          {label === 'Setup Panel' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {buttons.map((button, index) => (
                <button
                  key={`${button}_${index}`}
                  type="button"
                  style={{
                    background: index === 0 && d.enabledByDefault !== false ? '#248046' : index === 2 ? '#DA373C' : '#5865F2',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#FFF',
                    borderRadius: 3,
                    padding: '7px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {button}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="dc-wrap" style={{ display: 'grid', gap: 10 }}>
      {renderMessage('Setup Panel', 'B', panelText, d.panelTitle || 'Boost Message Settings')}
      {renderMessage('Test Boost Message', 'B', boostText, d.embedTitle || 'Boost Settings')}
    </div>
  );
}

function boostCountPreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    server: 'My Server',
    serverId: '123456789012345678',
    boostCount: '14',
    boosts: '14',
    boostTier: '2',
    boostTierLabel: 'Level 2',
    channel: 'general',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewBoostCount({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const title = boostCountPreviewText(d.titleTemplate || '{server} Boost Count', d);
  const text = boostCountPreviewText(
    d.descriptionTemplate || '{server} currently has **{boostCount}** boosts.\nBoost tier: **{boostTierLabel}**',
    d
  );
  const plain = boostCountPreviewText(d.plainTextTemplate || '{server} has {boostCount} boosts ({boostTierLabel}).', d);

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#F472B6' }}>BC</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          {d.embedEnabled === false ? (
            <div className="dc-plain">{plain}</div>
          ) : (
            <DiscordEmbed
              data={{
                ...d,
                embedTitle: title,
                embedFooter: boostCountPreviewText(d.embedFooter || 'Boost count requested by {user}', d),
              }}
              text={text}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function channelInfoPreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    server: 'My Server',
    serverId: '123456789012345678',
    channelName: 'general',
    channelMention: '#general',
    channelId: '987654321098765432',
    channelType: 'Text',
    category: 'Community',
    topic: 'Chat, support, and updates',
    nsfw: 'No',
    slowmode: '5s',
    position: '3',
    createdAt: 'January 1, 2024 (2 years ago)',
    permissionsSummary: 'View Channel: Yes\nSend Messages: Yes\nManage Channel: No',
    canView: 'Yes',
    canSend: 'Yes',
    canManage: 'No',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewChannelInfo({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const title = channelInfoPreviewText(d.titleTemplate || 'Channel Info: #{channelName}', d);
  const text = channelInfoPreviewText(
    d.descriptionTemplate || '**Mention:** {channelMention}\n**ID:** `{channelId}`\n**Type:** {channelType}\n**Category:** {category}\n**Topic:** {topic}\n**NSFW:** {nsfw}\n**Slowmode:** {slowmode}\n**Position:** {position}\n**Created:** {createdAt}\n\n**Permissions**\n{permissionsSummary}',
    d
  );
  const plain = channelInfoPreviewText(d.plainTextTemplate || '#{channelName} ({channelType}) - ID: {channelId} - {permissionsSummary}', d);

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#22C55E' }}>CI</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          {d.embedEnabled === false ? (
            <div className="dc-plain">{plain}</div>
          ) : (
            <DiscordEmbed
              data={{
                ...d,
                embedTitle: title,
                embedFooter: channelInfoPreviewText(d.embedFooter || 'Channel info requested by {user}', d),
              }}
              text={text}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DiscordPreviewEmbedBuilder({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const buttonRows = [
    [
      d.authorTextButtonLabel || 'Author Text',
      d.authorIconButtonLabel || 'Author Icon',
      d.titleButtonLabel || 'Title',
      d.descriptionButtonLabel || 'Description',
      d.thumbnailButtonLabel || 'Thumbnail',
    ],
    [
      d.imageButtonLabel || 'Image',
      d.footerTextButtonLabel || 'Footer Text',
      d.footerIconButtonLabel || 'Footer Icon',
      d.colorButtonLabel || 'Color',
      d.resetButtonLabel || 'Reset Embed',
    ],
    [
      d.sendButtonLabel || 'Send to Channel',
      d.abortButtonLabel || 'Abort',
    ],
  ];

  const previewEmbed = {
    ...d,
    embedTitle: d.defaultTitle || 'Embed Title',
    embedFooter: d.defaultFooterText || d.embedFooter || '',
    logoName: d.defaultAuthorText || d.logoName || '',
    logoUrl: d.defaultAuthorIcon || d.logoUrl || '',
    imageUrl: d.defaultImage || d.imageUrl || '',
    imagePosition: 'bottom',
    embedColor: d.defaultColor || d.embedColor || '#5865F2',
  };
  const description = d.defaultDescription || 'Embed description goes here.';

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.defaultColor || d.embedColor || '#5865F2' }}>E</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          <button
            type="button"
            style={{
              background: '#2F3136',
              border: '1px solid #4B4D55',
              color: '#DCDDDE',
              borderRadius: 3,
              padding: '10px 16px',
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            {d.panelButtonLabel || 'Improve the Embed'}
          </button>
          <DiscordEmbed data={previewEmbed} text={description} />
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {buttonRows.map((row, rowIndex) => (
              <div key={rowIndex} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {row.map((label) => {
                  const isReset = label === (d.resetButtonLabel || 'Reset Embed');
                  const isSend = label === (d.sendButtonLabel || 'Send to Channel');
                  const isAbort = label === (d.abortButtonLabel || 'Abort');
                  return (
                    <button
                      key={label}
                      type="button"
                      style={{
                        background: isSend ? '#248046' : (isReset || isAbort) ? '#DA373C' : '#5865F2',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#FFF',
                        borderRadius: 8,
                        padding: '10px 14px',
                        fontSize: 13,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function invitePreviewText(template, data, extra = {}) {
  const clientId = data.clientId || '123456789012345678';
  const fallbackUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${encodeURIComponent(data.permissions || '8')}&scope=${encodeURIComponent(data.scopes || 'bot applications.commands')}`;
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    botName: 'YourBot',
    botId: clientId,
    inviteUrl: data.customInviteUrl || fallbackUrl,
    server: 'My Server',
    channel: 'general',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewInvite({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const title = invitePreviewText(d.titleTemplate || 'Invite {botName}', d, { botName });
  const text = invitePreviewText(d.descriptionTemplate || 'Use the button below to invite **{botName}** to your server.', d, { botName });
  const plain = invitePreviewText(d.plainTextTemplate || 'Invite {botName}: {inviteUrl}', d, { botName });
  const buttons = [
    d.inviteButtonLabel || 'Invite Bot',
    d.showSupportButton ? (d.supportButtonLabel || 'Support Server') : null,
  ].filter(Boolean);

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#5865F2' }}>I</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          {d.embedEnabled === false ? (
            <div className="dc-plain">{plain}</div>
          ) : (
            <DiscordEmbed
              data={{
                ...d,
                embedTitle: title,
                embedFooter: invitePreviewText(d.embedFooter || 'Requested by {user}', d, { botName }),
              }}
              text={text}
            />
          )}
          {buttons.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {buttons.map((label) => (
                <button
                  key={label}
                  type="button"
                  style={{
                    background: '#5865F2',
                    border: '1px solid #4752C4',
                    color: '#FFF',
                    borderRadius: 3,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function memberCountPreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    server: 'My Server',
    serverId: '123456789012345678',
    memberCount: '1,234',
    members: '1,234',
    humanCount: '1,200',
    botCount: '34',
    cachedCount: '1,234',
    channel: 'general',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewMemberCount({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const title = memberCountPreviewText(d.titleTemplate || '{server} Members', d);
  const text = memberCountPreviewText(
    d.descriptionTemplate || '**Total Members:** {memberCount}\n**Humans:** {humanCount}\n**Bots:** {botCount}',
    d
  );
  const plain = memberCountPreviewText(d.plainTextTemplate || '{server} has {memberCount} members.', d);

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#22C55E' }}>MC</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          {d.embedEnabled === false ? (
            <div className="dc-plain">{plain}</div>
          ) : (
            <DiscordEmbed
              data={{
                ...d,
                embedTitle: title,
                embedFooter: memberCountPreviewText(d.embedFooter || 'Member count requested by {user}', d),
              }}
              text={text}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function serverIconPreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    server: 'My Server',
    serverId: '123456789012345678',
    iconUrl: data.imageUrl || 'https://cdn.discordapp.com/icons/123/servericon.png?size=4096',
    channel: 'general',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewServerIcon({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const iconUrl = d.imageUrl || 'https://cdn.discordapp.com/embed/avatars/1.png';
  const title = serverIconPreviewText(d.titleTemplate || "{server}'s Server Icon", d);
  const text = serverIconPreviewText(d.descriptionTemplate || 'Requested by {mention}\nServer ID: `{serverId}`', d);
  const plain = serverIconPreviewText(d.plainTextTemplate || "{server}'s server icon: {iconUrl}", d);
  const buttons = [
    d.showDownloadButton !== false ? (d.downloadButtonLabel || 'Download') : null,
    d.showOpenButton !== false ? (d.openButtonLabel || 'Open Icon') : null,
  ].filter(Boolean);

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#3B82F6' }}>SI</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          {d.embedEnabled === false ? (
            <div className="dc-plain">{plain}</div>
          ) : (
            <DiscordEmbed
              data={{
                ...d,
                embedTitle: title,
                embedFooter: serverIconPreviewText(d.embedFooter || 'Server icon requested by {user}', d),
                imageUrl: iconUrl,
                imagePosition: 'bottom',
              }}
              text={text}
            />
          )}
          {buttons.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {buttons.map((label) => (
                <button
                  key={label}
                  type="button"
                  style={{
                    background: '#5865F2',
                    border: '1px solid #4752C4',
                    color: '#FFF',
                    borderRadius: 3,
                    padding: '8px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function statsPreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    botName: 'YourBot',
    botTag: 'YourBot#0000',
    botId: '123456789012345678',
    server: 'My Server',
    serverId: '123456789012345678',
    serverCount: '42',
    userCount: '18,420',
    channelCount: '1,337',
    ping: '42',
    uptime: '3d 4h 12m',
    memoryUsed: '96 MB',
    memoryTotal: '160 MB',
    nodeVersion: 'v20.11.0',
    discordVersion: '14.14.1',
    platform: 'win32',
    channel: 'general',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewStats({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const title = statsPreviewText(d.titleTemplate || '{botName} Statistics', d, { botName });
  const text = statsPreviewText(
    d.descriptionTemplate || '**Servers:** {serverCount}\n**Users:** {userCount}\n**Channels:** {channelCount}\n**Ping:** {ping}ms\n**Uptime:** {uptime}\n**Memory:** {memoryUsed} / {memoryTotal}\n**Node.js:** {nodeVersion}\n**Discord.js:** {discordVersion}',
    d,
    { botName }
  );
  const plain = statsPreviewText(d.plainTextTemplate || '{botName}: {serverCount} servers, {userCount} users, {ping}ms ping, uptime {uptime}.', d, { botName });

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#8B5CF6' }}>ST</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          {d.embedEnabled === false ? (
            <div className="dc-plain">{plain}</div>
          ) : (
            <DiscordEmbed
              data={{
                ...d,
                embedTitle: title,
                embedFooter: statsPreviewText(d.embedFooter || 'Stats requested by {user}', d, { botName }),
              }}
              text={text}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function stealPreviewText(template, data, extra = {}) {
  const result = data.successMessage || 'Added {type} **{name}** to {server}.';
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    server: 'My Server',
    serverId: '123456789012345678',
    channel: 'general',
    type: 'emoji',
    name: data.defaultName || 'stolen',
    emoji: ':stolen:',
    url: data.imageUrl || 'https://cdn.discordapp.com/emojis/123456789012345678.png?quality=lossless',
    error: 'Missing permissions',
    ...extra,
  };
  vars.result = String(result).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewSteal({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const title = stealPreviewText(d.titleTemplate || 'Stolen {type}', d);
  const text = stealPreviewText(d.descriptionTemplate || '{result}', d);
  const plain = stealPreviewText(d.plainTextTemplate || '{result}', d);
  const imageUrl = d.imageUrl || 'https://cdn.discordapp.com/embed/avatars/4.png';

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#F59E0B' }}>ST</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          {d.embedEnabled === false ? (
            <div className="dc-plain">{plain}</div>
          ) : (
            <DiscordEmbed
              data={{
                ...d,
                embedTitle: title,
                embedFooter: stealPreviewText(d.embedFooter || 'Requested by {user}', d),
                imageUrl,
                imagePosition: 'bottom',
              }}
              text={text}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function userInfoPreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    server: 'My Server',
    serverId: '123456789012345678',
    channel: 'general',
    target: 'OwO#8456',
    targetName: 'OwO',
    targetUsername: 'OwO',
    targetGlobalName: 'OwO',
    targetTag: 'OwO#8456',
    targetId: '987654321098765432',
    targetMention: '@OwO',
    targetBot: 'No',
    createdAt: 'June 12, 2020 (6 years ago)',
    joinedAt: 'March 4, 2024 (2 years ago)',
    roleCount: '5',
    roles: '@Admin @Support @Member',
    topRole: '@Admin',
    status: 'Online',
    avatarUrl: data.imageUrl || 'https://cdn.discordapp.com/embed/avatars/1.png',
    bannerUrl: '',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewUserInfo({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const avatarUrl = d.imageUrl || 'https://cdn.discordapp.com/embed/avatars/1.png';
  const title = userInfoPreviewText(d.titleTemplate || 'User Info: {targetName}', d);
  const text = userInfoPreviewText(
    d.descriptionTemplate || '**User:** {targetMention}\n**Tag:** {targetTag}\n**ID:** `{targetId}`\n**Bot:** {targetBot}\n**Created:** {createdAt}\n**Joined:** {joinedAt}\n**Roles:** {roleCount}\n**Top Role:** {topRole}\n**Status:** {status}',
    d,
    { avatarUrl }
  );
  const plain = userInfoPreviewText(d.plainTextTemplate || '{targetTag} ({targetId}) joined {server} on {joinedAt}.', d);

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#3B82F6' }}>UI</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          {d.embedEnabled === false ? (
            <div className="dc-plain">{plain}</div>
          ) : (
            <DiscordEmbed
              data={{
                ...d,
                embedTitle: title,
                embedFooter: userInfoPreviewText(d.embedFooter || 'User info requested by {user}', d),
                imageUrl: avatarUrl,
                imagePosition: 'thumbnail',
              }}
              text={text}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function prefixPreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    server: 'My Server',
    serverId: '123456789012345678',
    channel: 'general',
    command: data.command || 'prefix',
    oldPrefix: '!',
    newPrefix: '?',
    prefix: '?',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewPrefix({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const title = prefixPreviewText(d.titleTemplate || 'Prefix Updated', d);
  const text = prefixPreviewText(d.descriptionTemplate || 'Prefix changed from `{oldPrefix}` to `{newPrefix}`.', d);
  const plain = prefixPreviewText(d.plainTextTemplate || 'Prefix changed from {oldPrefix} to {newPrefix}.', d);

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#14B8A6' }}>PX</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          {d.embedEnabled === false ? (
            <div className="dc-plain">{plain}</div>
          ) : (
            <DiscordEmbed
              data={{
                ...d,
                embedTitle: title,
                embedFooter: prefixPreviewText(d.embedFooter || 'Prefix changed by {user}', d),
              }}
              text={text}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function calculatorPreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    server: 'My Server',
    serverId: '123456789012345678',
    channel: 'general',
    command: data.command || 'calculator',
    aliases: '+calculator, +math, +solve',
    expression: '0',
    result: data.readyText || 'Ready',
    status: data.readyText || 'Ready',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function CalculatorButtonGrid() {
  const rows = [
    [
      ['C', '#DA373C'],
      ['⌫', '#2B2D31'],
      ['(', '#2B2D31'],
      [')', '#2B2D31'],
      ['÷', '#5865F2'],
    ],
    [
      ['7', '#2B2D31'],
      ['8', '#2B2D31'],
      ['9', '#2B2D31'],
      ['×', '#5865F2'],
      ['^', '#5865F2'],
    ],
    [
      ['4', '#2B2D31'],
      ['5', '#2B2D31'],
      ['6', '#2B2D31'],
      ['-', '#5865F2'],
      ['%', '#5865F2'],
    ],
    [
      ['1', '#2B2D31'],
      ['2', '#2B2D31'],
      ['3', '#2B2D31'],
      ['+', '#5865F2'],
      ['=', '#0A8F54'],
    ],
    [
      ['0', '#2B2D31'],
      ['.', '#2B2D31'],
      ['π', '#2B2D31'],
      ['e', '#2B2D31'],
      ['SOLVE', '#0A8F54'],
    ],
  ];
  return (
    <div className="dc-calculator-grid">
      {rows.map((row, index) => (
        <div key={index} className="dc-calculator-row">
          {row.map(([label, color]) => (
            <button
              key={label}
              type="button"
              className="dc-calculator-button"
              style={{ background: color }}
            >
              {label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function DiscordPreviewCalculator({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const expression = '0';
  const result = d.readyText || 'Ready';
  const status = d.readyText || 'Ready';
  const title = calculatorPreviewText(d.titleTemplate || 'Calculator Screen', d, { expression, result, status });
  const text = [
    `**${d.expressionLabel || 'Expression'}**`,
    `\`${expression}\``,
    '',
    `**${d.resultLabel || 'Result'}**`,
    `\`${result}\``,
    '',
    `**${d.statusLabel || 'Status'}**`,
    status,
  ].join('\n');

  return (
    <div className="dc-wrap dc-calculator-preview">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#5865F2' }}>CA</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          <DiscordEmbed
            data={{
              ...d,
              embedTitle: title,
              embedFooter: calculatorPreviewText(d.footerTemplate || 'Aliases: {aliases} • Today at {time}', d, { expression, result, status }),
            }}
            text={text}
          />
          <CalculatorButtonGrid />
        </div>
      </div>
    </div>
  );
}

function playingPreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    server: 'My Server',
    serverId: '123456789012345678',
    channel: 'general',
    command: data.command || 'playing',
    activityName: data.activityName || 'ROBLOX',
    activityType: data.activityType || 'Playing',
    producerName: data.producerName || 'Producer',
    status: data.status || 'online',
    imageUrl: data.imageUrl || '',
    animatedAvatarUrl: data.animatedAvatarUrl || '',
    animatedBannerUrl: data.animatedBannerUrl || '',
    profileUpdate: [
      data.useAnimatedAvatar ? 'Avatar updated' : null,
      data.useAnimatedBanner ? 'Banner updated' : null,
    ].filter(Boolean).join('\n') || 'Activity only',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewPlaying({ node }) {
  const { botInfo } = useProject();
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const activityName = d.activityName || 'ROBLOX';
  const activityType = d.activityType || 'Playing';
  const producerName = d.producerName || 'Producer';
  const status = d.status || 'online';
  const imageUrl = d.imageUrl || botInfo?.avatarURL || '';
  const avatarUrl = d.useAnimatedAvatar && d.animatedAvatarUrl ? d.animatedAvatarUrl : botInfo?.avatarURL;
  const bannerUrl = d.useAnimatedBanner && d.animatedBannerUrl ? d.animatedBannerUrl : '';
  const statusColor = status === 'idle' ? '#F0B232' : status === 'dnd' ? '#F23F43' : '#23A55A';
  const isListening = activityType === 'Listening';

  return (
    <div className="dc-profile-preview">
      <div
        className="dc-profile-banner"
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : { background: d.embedColor || '#1D1B7A' }}
      />
      <div className="dc-profile-body">
        <div className="dc-profile-avatar-wrap">
          {avatarUrl ? (
            <img src={avatarUrl} className="dc-profile-avatar-img" alt={botName} />
          ) : (
            <div className="dc-profile-avatar-fallback">B</div>
          )}
          <span className="dc-profile-status" style={{ background: statusColor }} />
        </div>
        <div className="dc-profile-name">{botName}</div>
        <div className="dc-profile-tag">bot_profile</div>
        <div className="dc-profile-bio">Custom bot presence preview</div>
        <div className="dc-activity-card">
          <div className="dc-activity-head">{isListening ? 'Listening to' : activityType}</div>
          <div className="dc-activity-row">
            {imageUrl ? (
              <img src={imageUrl} className="dc-activity-image" alt={activityName} />
            ) : (
              <div className="dc-activity-image dc-activity-image-fallback">APP</div>
            )}
            <div className="dc-activity-meta">
              <div className="dc-activity-title">{activityName}</div>
              {isListening && <div className="dc-activity-producer">{producerName}</div>}
              <div className="dc-activity-time">{isListening ? 'Music session' : '28 : 44'}</div>
            </div>
          </div>
        </div>
        <div className="dc-profile-command">
          {playingPreviewText(d.titleTemplate || 'Bot Activity Updated', d)}
        </div>
      </div>
    </div>
  );
}

function nukePreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'Akashsuu',
    tag: 'Akashsuu#0000',
    id: '123456789012345678',
    mention: '@Akashsuu',
    server: 'My Server',
    serverId: '123456789012345678',
    channel: 'general',
    channelId: '987654321098765432',
    channelMention: '#general',
    command: `!${data.command || 'nuke'}`,
    confirmationKeyword: data.confirmationKeyword || 'confirm',
    reason: data.reason || 'Channel nuked by {user}',
    error: 'Missing permissions',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function DiscordPreviewNuke({ node }) {
  const { botInfo } = useProject();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = node?.data || {};
  const botName = botInfo?.username || 'YourBot';
  const text = d.confirmationRequired !== false
    ? nukePreviewText(d.confirmMessage || 'This will delete the whole channel and recreate it. Run `{command} {confirmationKeyword}` to confirm.', d)
    : nukePreviewText(d.successMessage || 'Channel nuked by {mention}. This is the new {channelMention}.', d);

  return (
    <div className="dc-wrap">
      <div className="dc-msg">
        {botInfo?.avatarURL ? (
          <img
            src={botInfo.avatarURL}
            className="dc-avatar-img"
            alt={botName}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="dc-avatar" style={{ display: botInfo?.avatarURL ? 'none' : 'flex', background: d.embedColor || '#DC2626' }}>NU</div>
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at {time}</span>
          </div>
          {d.embedEnabled === false ? (
            <div className="dc-plain">{text}</div>
          ) : (
            <DiscordEmbed
              data={{
                ...d,
                embedTitle: nukePreviewText(d.embedTitle || 'Channel Nuked', d),
                embedFooter: nukePreviewText(d.embedFooter || 'Nuke requested by {user}', d),
              }}
              text={text}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function musicPlayPreviewText(template, data, extra = {}) {
  const vars = {
    ...data,
    user: 'akashsuu',
    mention: '@akashsuu',
    command: `/${data.command || 'play'}`,
    query: 'E-GIRLS ARE RUINING MY LIFE!',
    title: 'E-GIRLS ARE RUINING MY LIFE!',
    author: 'CORPSE, Savage Ga$p',
    duration: '1:45',
    posterUrl: 'https://i.ytimg.com/vi/5qap5aO4i9A/maxresdefault.jpg',
    error: 'Connection refused',
    ...extra,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function MusicButton({ children, color = '#2B2D31', wide = false }) {
  return (
    <button type="button" className={`dc-music-button ${wide ? 'wide' : ''}`} style={{ background: color }}>
      {children}
    </button>
  );
}

function DiscordPreviewMusicPlay({ node }) {
  const { botInfo } = useProject();
  const d = node?.data || {};
  const botName = botInfo?.username || 'Euphony';
  const poster = musicPlayPreviewText('{posterUrl}', d);
  const title = musicPlayPreviewText(d.nowPlayingTitle || '{title}', d);
  const artist = musicPlayPreviewText(d.artistTemplate || '{author}', d);
  const duration = musicPlayPreviewText(d.durationTemplate || '{duration}', d);
  const completed = musicPlayPreviewText(d.completedMessage || 'Use `{command}` to add more songs to the queue', d);

  return (
    <div className="dc-wrap dc-music-preview">
      <div className="dc-msg">
        {botInfo?.avatarURL ? <img src={botInfo.avatarURL} className="dc-avatar-img" alt={botName} /> : <div className="dc-avatar">🎵</div>}
        <div className="dc-msg-body">
          <div className="dc-msg-hdr">
            <span className="dc-bot-name">{botName}</span>
            <span className="dc-bot-badge">BOT</span>
            <span className="dc-timestamp">Today at 10:41</span>
          </div>
          <div className="dc-music-card">
            <div className="dc-music-user-row"><span>01</span><span>@akashsuu</span></div>
            <img src={poster} className="dc-music-poster" alt={title} onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="dc-music-title">{title}</div>
            <div className="dc-music-artist">{artist}</div>
            <div className="dc-music-duration">{duration}</div>
            <div className="dc-music-separator" />
            <div className="dc-music-controls">
              <MusicButton>{d.shuffleButtonLabel || '↝'}</MusicButton>
              <MusicButton>{d.previousButtonLabel || '◀'}</MusicButton>
              <MusicButton color="#3B3D45">{d.pauseButtonLabel || '⏸'}</MusicButton>
              <MusicButton>{d.skipButtonLabel || '▶'}</MusicButton>
              <MusicButton>{d.queueButtonLabel || '☷'}</MusicButton>
            </div>
            <div className="dc-music-select">Player options <span>⌄</span></div>
            <div className="dc-music-footer-buttons">
              <MusicButton wide>{d.playlistsButtonLabel || '▣ Playlists'}</MusicButton>
              <MusicButton wide>{d.browseButtonLabel || '▦ Browse'}</MusicButton>
              <MusicButton>{d.settingsButtonLabel || '⚙'}</MusicButton>
            </div>
          </div>
          <div className="dc-music-complete-card">
            <div className="dc-music-complete-text">{completed}</div>
            <div className="dc-music-complete-row">
              <MusicButton color="#5865F2" wide>∞ {d.autoplayButtonLabel || 'Start Autoplay'}</MusicButton>
              <MusicButton wide>↻ {d.restartButtonLabel || 'Restart Queue'}</MusicButton>
              <MusicButton color="#DA373C" wide>↷ {d.disconnectButtonLabel || 'Disconnect bot'}</MusicButton>
            </div>
            <div className="dc-music-footer-buttons">
              <MusicButton wide>{d.playlistsButtonLabel || '▣ Playlists'}</MusicButton>
              <MusicButton wide>{d.browseButtonLabel || '▦ Browse'}</MusicButton>
              <MusicButton>{d.settingsButtonLabel || '⚙'}</MusicButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketPanelEditor({ d, update }) {
  return (
    <>
      <div className="bl-prop-row">
        <span className="bl-prop-label">Embed</span>
        <label className="bl-embed-toggle" style={{ paddingLeft: 0 }}>
          <input type="checkbox" checked={d.embedEnabled !== false} onChange={(e) => update('embedEnabled', e.target.checked)} />
          Enabled
        </label>
      </div>
      <div className="bl-prop-row" style={{ gridTemplateColumns: '1fr' }}>
        <span className="bl-prop-label" style={{ textAlign: 'left' }}>Description</span>
        <textarea className="bl-field-input" style={{ resize: 'vertical', minHeight: 72 }} value={d.embedDescription || ''} onChange={(e) => update('embedDescription', e.target.value)} spellCheck={false} />
      </div>
      <div className="bl-prop-row">
        <span className="bl-prop-label">Title</span>
        <input className="bl-field-input" value={d.embedTitle || ''} onChange={(e) => update('embedTitle', e.target.value)} placeholder="Support Tickets" spellCheck={false} />
      </div>
      <div className="bl-prop-row">
        <span className="bl-prop-label">Color</span>
        <div className="bl-color-field">
          <input type="color" className="bl-color-pick" value={d.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} />
          <input type="text" className="bl-field-input" value={d.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} spellCheck={false} style={{ flex: 1 }} />
        </div>
      </div>
      <div className="bl-prop-row">
        <span className="bl-prop-label">Logo URL</span>
        <input className="bl-field-input" value={d.logoUrl || ''} onChange={(e) => update('logoUrl', e.target.value)} placeholder="https://...icon.png" spellCheck={false} />
      </div>
      <div className="bl-prop-row">
        <span className="bl-prop-label">Logo Name</span>
        <input className="bl-field-input" value={d.logoName || ''} onChange={(e) => update('logoName', e.target.value)} placeholder="Support Team" spellCheck={false} />
      </div>
      <div className="bl-prop-row">
        <span className="bl-prop-label">Image URL</span>
        <input className="bl-field-input" value={d.imageUrl || ''} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://...banner.png" spellCheck={false} />
      </div>
      <div className="bl-prop-row">
        <span className="bl-prop-label">Footer</span>
        <input className="bl-field-input" value={d.embedFooter || ''} onChange={(e) => update('embedFooter', e.target.value)} placeholder="Optional" spellCheck={false} />
      </div>
    </>
  );
}

function NPanel({ selectedNode, setNodes }) {
  const [openSections, setOpenSections] = useState({ node: true, props: true, embed: true, preview: true });

  const toggle = (k) => setOpenSections((s) => ({ ...s, [k]: !s[k] }));

  const update = useCallback((key, val) => {
    if (!selectedNode) return;
    setNodes((ns) => ns.map((n) =>
      n.id === selectedNode.id ? { ...n, data: { ...n.data, [key]: val } } : n
    ));
  }, [selectedNode, setNodes]);

  if (!selectedNode) {
    return (
      <div className="w-72 min-w-[288px] bg-zinc-950/40 backdrop-blur-3xl border-l border-zinc-800/50 flex flex-col overflow-hidden text-xs text-zinc-400 absolute right-0 top-12 bottom-0 z-50 shadow-2xl">
        <div className="flex items-center justify-center flex-1 text-center p-6 leading-relaxed">
          Select a node<br />to see properties
        </div>
        <div className="p-3 text-[10px] text-zinc-500 border-t border-zinc-800/50">Press N to hide this panel</div>
      </div>
    );
  }

  const palette = NODE_PALETTE.find((p) => p.type === selectedNode.type);
  const d = selectedNode.data;
  const isTicketPanel = selectedNode.type === 'ticket_panel';
  const isTicketStatus = selectedNode.type === 'ticket_lock' || selectedNode.type === 'ticket_unlock';
  const isTicketEmbedPreview = ['ticket_create', 'ticket_claim', 'ticket_close'].includes(selectedNode.type);
  const isAfkPreview = selectedNode.type === 'util_afk';
  const isAvatarPreview = selectedNode.type === 'util_avatar';
  const isSetBoostPreview = selectedNode.type === 'util_setboost';
  const isBoostCountPreview = selectedNode.type === 'util_boostcount';
  const isChannelInfoPreview = selectedNode.type === 'util_channelinfo';
  const isEmbedBuilderPreview = selectedNode.type === 'util_embedbuilder';
  const isInvitePreview = selectedNode.type === 'util_invite';
  const isMemberCountPreview = selectedNode.type === 'util_membercount';
  const isServerIconPreview = selectedNode.type === 'util_servericon';
  const isStatsPreview = selectedNode.type === 'util_stats';
  const isStealPreview = selectedNode.type === 'util_steal';
  const isUserInfoPreview = selectedNode.type === 'util_userinfo';
  const isPrefixPreview = selectedNode.type === 'util_prefix';
  const isCalculatorPreview = selectedNode.type === 'util_calculator';
  const isPlayingPreview = selectedNode.type === 'info_playing';
  const isMusicPlayPreview = selectedNode.type === 'music_play';

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className={`${isTicketPanel ? 'w-[420px] min-w-[420px]' : 'w-80 min-w-[320px]'} bg-zinc-900/60 backdrop-blur-2xl border border-zinc-800 rounded-2xl flex flex-col overflow-hidden text-xs absolute right-4 top-4 bottom-4 z-50 shadow-2xl shadow-black/50`}
    >
      {/* Node section */}
      <div className="bl-npanel-section">
        <div className="bl-npanel-section-hdr" onClick={() => toggle('node')}>
          <span className="arrow">{openSections.node ? '▼' : '▶'}</span>
          Node
        </div>
        {openSections.node && (
          <div className="bl-npanel-body">
            <div className="bl-prop-row">
              <span className="bl-prop-label">Type</span>
              <span className="bl-prop-value" style={{ color: palette?.color }}>{palette?.label || selectedNode.type}</span>
            </div>
            <div className="bl-prop-row">
              <span className="bl-prop-label">ID</span>
              <span className="bl-prop-value" style={{ fontSize: 10, color: '#666' }}>{selectedNode.id}</span>
            </div>
          </div>
        )}
      </div>

      {/* Properties section */}
      <div className="bl-npanel-section">
        <div className="bl-npanel-section-hdr" onClick={() => toggle('props')}>
          <span className="arrow">{openSections.props ? '▼' : '▶'}</span>
          Properties
        </div>
        {openSections.props && (
          <div className="bl-npanel-body">
            {selectedNode.type === 'event_message' && (
              <div style={{ color: '#666', fontSize: 11 }}>No editable properties.</div>
            )}

            {['page_menu', 'util_pagemenu', 'util_helpmenu'].includes(selectedNode.type) && (
              <>
                <div style={{ color: '#888', fontSize: 10, lineHeight: 1.6, marginBottom: 4 }}>
                  Edit pages, dropdown &amp; buttons directly on the node.<br />
                  Quick settings below:
                </div>
                <div className="bl-prop-row">
                  <span className="bl-prop-label">Embed Color</span>
                  <div className="bl-color-field">
                    <input type="color" className="bl-color-pick" value={d.embedColor || '#D35400'} onChange={(e) => update('embedColor', e.target.value)} />
                    <input type="text" className="bl-field-input" value={d.embedColor || '#D35400'} onChange={(e) => update('embedColor', e.target.value)} spellCheck={false} style={{ flex: 1 }} />
                  </div>
                </div>
                <div className="bl-prop-row">
                  <span className="bl-prop-label">Footer</span>
                  <input className="bl-field-input" value={d.embedFooter || ''} onChange={(e) => update('embedFooter', e.target.value)} placeholder="Page {page} of {totalPages}" spellCheck={false} />
                </div>
              </>
            )}

            {selectedNode.type === 'util_serverinfo' && (
              <>
                <div style={{ color: '#888', fontSize: 10, lineHeight: 1.6, marginBottom: 4 }}>
                  Edit each section directly on the node.<br />
                  Quick settings below:
                </div>
                <div className="bl-prop-row">
                  <span className="bl-prop-label">Embed Color</span>
                  <div className="bl-color-field">
                    <input type="color" className="bl-color-pick" value={d.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} />
                    <input type="text" className="bl-field-input" value={d.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} spellCheck={false} style={{ flex: 1 }} />
                  </div>
                </div>
                <div className="bl-prop-row">
                  <span className="bl-prop-label">Command</span>
                  <input className="bl-field-input" value={d.command || 'serverinfo'} onChange={(e) => update('command', e.target.value)} spellCheck={false} />
                </div>
              </>
            )}

            {EVENT_NODE_OPTIONS[selectedNode.type] && (
              <div className="bl-prop-row">
                <span className="bl-prop-label">Event</span>
                <select
                  className="bl-field-select"
                  value={d.event || (EVENT_NODE_OPTIONS[selectedNode.type][0]?.value ?? '')}
                  onChange={(e) => update('event', e.target.value)}
                >
                  {EVENT_NODE_OPTIONS[selectedNode.type].map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {isTicketPanel && (
              <TicketPanelEditor d={d} update={update} />
            )}

            {selectedNode.type === 'custom_command' && (
              <>
                <div className="bl-prop-row">
                  <span className="bl-prop-label">Command</span>
                  <input className="bl-field-input" value={d.command || ''} onChange={(e) => update('command', e.target.value)} spellCheck={false} />
                </div>
                <div className="bl-prop-row">
                  <span className="bl-prop-label">Reply</span>
                  <input className="bl-field-input" value={d.reply || ''} onChange={(e) => update('reply', e.target.value)} spellCheck={false} />
                </div>
                <EmbedFields d={d} update={update} />
              </>
            )}

            {selectedNode.type === 'send_message' && (
              <>
                <div className="bl-prop-row" style={{ gridTemplateColumns: '1fr' }}>
                  <span className="bl-prop-label" style={{ textAlign: 'left' }}>Text</span>
                  <textarea
                    className="bl-field-input"
                    style={{ resize: 'vertical', minHeight: 56 }}
                    value={d.text || ''}
                    onChange={(e) => update('text', e.target.value)}
                    spellCheck={false}
                  />
                </div>
                <EmbedFields d={d} update={update} />
              </>
            )}

            {selectedNode.type === 'condition_branch' && (
              <>
                <div className="bl-prop-row">
                  <span className="bl-prop-label">Condition</span>
                  <select className="bl-field-select" value={d.condition || 'starts_with'} onChange={(e) => update('condition', e.target.value)}>
                    <option value="starts_with">starts with</option>
                    <option value="contains">contains</option>
                    <option value="equals">equals</option>
                  </select>
                </div>
                <div className="bl-prop-row">
                  <span className="bl-prop-label">Value</span>
                  <input className="bl-field-input" value={d.value || ''} onChange={(e) => update('value', e.target.value)} spellCheck={false} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Discord Preview section — shown for any node that outputs something */}
      {(!selectedNode.type.startsWith('event_') && selectedNode.type !== 'condition_branch') && (
        <div className="border-b border-zinc-800/50">
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/80 cursor-pointer text-[11px] font-semibold text-zinc-400 uppercase tracking-wider select-none hover:text-zinc-200" onClick={() => toggle('preview')}>
            <span className="text-[9px]">{openSections.preview ? '▼' : '▶'}</span>
            Discord Preview
          </div>
          {openSections.preview && (
            <div className="p-3 bg-zinc-950/50">
              {isTicketPanel ? (
                <DiscordPreviewTicketPanel data={d} />
              ) : isTicketStatus ? (
                <DiscordPreviewTicketStatus node={selectedNode} />
              ) : isTicketEmbedPreview ? (
                <DiscordPreviewTicketEmbed node={selectedNode} />
              ) : isAfkPreview ? (
                <DiscordPreviewAfk node={selectedNode} />
              ) : isAvatarPreview ? (
                <DiscordPreviewAvatar node={selectedNode} />
              ) : isSetBoostPreview ? (
                <DiscordPreviewSetBoost node={selectedNode} />
              ) : isBoostCountPreview ? (
                <DiscordPreviewBoostCount node={selectedNode} />
              ) : isChannelInfoPreview ? (
                <DiscordPreviewChannelInfo node={selectedNode} />
              ) : isEmbedBuilderPreview ? (
                <DiscordPreviewEmbedBuilder node={selectedNode} />
              ) : isInvitePreview ? (
                <DiscordPreviewInvite node={selectedNode} />
              ) : isMemberCountPreview ? (
                <DiscordPreviewMemberCount node={selectedNode} />
              ) : isServerIconPreview ? (
                <DiscordPreviewServerIcon node={selectedNode} />
              ) : isStatsPreview ? (
                <DiscordPreviewStats node={selectedNode} />
              ) : isStealPreview ? (
                <DiscordPreviewSteal node={selectedNode} />
              ) : isUserInfoPreview ? (
                <DiscordPreviewUserInfo node={selectedNode} />
              ) : isPrefixPreview ? (
                <DiscordPreviewPrefix node={selectedNode} />
              ) : isCalculatorPreview ? (
                <DiscordPreviewCalculator node={selectedNode} />
              ) : isPlayingPreview ? (
                <DiscordPreviewPlaying node={selectedNode} />
              ) : isMusicPlayPreview ? (
                <DiscordPreviewMusicPlay node={selectedNode} />
              ) : (
                <DiscordPreview node={selectedNode} />
              )}
            </div>
          )}
        </div>
      )}

      <div className="p-3 text-[10px] text-zinc-500 border-t border-zinc-800/50 mt-auto">Press N to toggle panel</div>
    </motion.div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────
function EditorInner() {
  const { projectData, projectPath, addLog } = useProject();

  const [nodes, setNodes, onNodesChange] = useNodesState(projectData?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(projectData?.edges || []);
  const [contextMenu, setContextMenu] = useState(null);
  const [showNPanel, setShowNPanel] = useState(true);
  const [pluginMeta, setPluginMeta] = useState([]);

  // Load plugin node types registered in the main process
  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.getPluginNodeTypes().then((types) => {
      setPluginMeta(types || []);
    }).catch(() => {});
  }, []);

  // Keep existing plugin nodes visually in sync with latest plugin metadata
  // (e.g. when a plugin color/icon/label is changed on disk).
  useEffect(() => {
    if (!pluginMeta.length) return;
    const pluginByType = new Map(pluginMeta.map((p) => [p.type, p]));
    setNodes((prev) => prev.map((n) => {
      const meta = pluginByType.get(n.type);
      if (!meta) return n;
      return {
        ...n,
        data: {
          ...n.data,
          _color: meta.color || n.data?._color,
          _icon: meta.icon || n.data?._icon,
          _label: meta.label || n.data?._label,
        },
      };
    }));
  }, [pluginMeta, setNodes]);

  // Build combined nodeTypes: builtins + one PluginNode component per plugin type
  const nodeTypes = useMemo(() => {
    const extra = {};
    for (const p of pluginMeta) extra[p.type] = PluginNode;
    return { ...builtinNodeTypes, ...extra };
  }, [pluginMeta]);

  const { project: rfProject } = useReactFlow();
  const wrapperRef = useRef(null);
  const autoSaveRef = useRef(null);

  const selectedNode = nodes.find((n) => n.selected) || null;

  // ── Auto-save ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectPath) return;
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      await window.electronAPI.saveProject({
        projectPath,
        projectData: { ...projectData, nodes: serialize(nodes), edges },
      });
    }, 2000);
    return () => clearTimeout(autoSaveRef.current);
  }, [nodes, edges]);

  // ── Ctrl+S ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!projectPath) return;
        await window.electronAPI.saveProject({
          projectPath,
          projectData: { ...projectData, nodes: serialize(nodes), edges },
        });
        addLog('[System] Saved (Ctrl+S).');
      }
      // N = toggle N-panel (only when not in an input)
      if (e.key === 'n' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        setShowNPanel((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nodes, edges, projectPath, projectData, addLog]);

  // ── Connect ────────────────────────────────────────────────────────────
  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({
      ...params,
      type: 'default',
      style: {
        stroke: '#a855f7',
        strokeWidth: 2,
        filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.85))',
      },
    }, eds));
  }, [setEdges]);

  // ── Right-click to add node ─────────────────────────────────────────────
  const onPaneContextMenu = useCallback((e) => {
    e.preventDefault();
    if (!wrapperRef.current) return;
    const bounds = wrapperRef.current.getBoundingClientRect();
    const flowPos = rfProject({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
    setContextMenu({ x: e.clientX, y: e.clientY, flowPos });
  }, [rfProject]);

  const addNodeAtPos = useCallback((type) => {
    if (!contextMenu) return;
    const id = `${type}_${Date.now()}_${_nc++}`;

    let data;
    const builtin = DEFAULT_NODE_DATA[type];
    if (builtin) {
      // Deep-clone so we don't share array/object references between nodes
      data = JSON.parse(JSON.stringify(builtin));
    } else {
      // Plugin node — seed embed fields first so they're always present,
      // then plugin defaults override anything they define
      const pm = pluginMeta.find((p) => p.type === type) || {};
      data = {
        _label:     pm.label    || type,
        _icon:      pm.icon     || '🔌',
        _color:     pm.color    || '#2A2A3A',
        _hasInput:  pm.hasInput  !== false,
        _hasOutput: pm.hasOutput !== false,
        // embed defaults (always present so PluginNode renders the section)
        embedEnabled: false,
        embedColor:   '#5865F2',
        logoUrl:      '',
        logoName:     '',
        imageUrl:     '',
        embedFooter:  '',
        ...JSON.parse(JSON.stringify(pm.defaults || {})),
      };
    }

    setNodes((prev) => [...prev, { id, type, position: contextMenu.flowPos, data }]);
  }, [contextMenu, setNodes, pluginMeta]);

  // close context menu when clicking outside
  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  return (
    <div className="editor-screen">
      <Toolbar nodes={nodes} edges={edges} />

      <div className="editor-body">
        <div className="rf-wrapper" ref={wrapperRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onPaneContextMenu={onPaneContextMenu}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode="Delete"
            snapToGrid
            snapGrid={[10, 10]}
            selectionOnDrag={true}
            panOnDrag={[1, 2]}
            panOnScroll={false}
            zoomOnScroll={true}
            selectionMode={SelectionMode.Partial}
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'default',
              style: { stroke: '#a855f7', strokeWidth: 2, filter: 'drop-shadow(0 0 5px rgba(168,85,247,0.5))' },
            }}
            connectionLineStyle={{
              stroke: '#a855f7',
              strokeWidth: 2,
              filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.85))',
            }}
            className="node-editor-flow"
          >
            {/* Base line grid — thin grey lines on black */}
            <Background
              id="1"
              variant={BackgroundVariant.Lines}
              gap={40}
              size={1}
              color="#787878"
            />
            {/* Intersection dots — brighter so grid nodes are clear */}
            <Background
              id="2"
              variant={BackgroundVariant.Dots}
              gap={40}
              size={3}
              color="#cfcfcf"
            />
            <Controls className="bg-black/60 backdrop-blur-xl border border-purple-900/30 rounded-xl overflow-hidden shadow-xl" />
            <MiniMap
              nodeColor={(n) => MINIMAP_NODE_COLOR[n.type] || '#2e1a47'}
              maskColor="rgba(0, 0, 0, 0.7)"
              style={{ background: '#0d0b14', border: '1px solid #2e1a47', borderRadius: '12px' }}
            />
            <Panel position="top-right">
              <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-full px-4 py-1.5 text-[10px] font-medium text-zinc-400 shadow-xl select-none">
                {nodes.length} nodes · {edges.length} edges · RMB = add
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {showNPanel && (
          <NPanel selectedNode={selectedNode} setNodes={setNodes} />
        )}
      </div>

      <LogPanel />

      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          palette={NODE_PALETTE}
          pluginMeta={pluginMeta}
          onAdd={addNodeAtPos}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export default function EditorScreen() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}
