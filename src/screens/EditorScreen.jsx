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
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useProject } from '../context/ProjectContext';
import builtinNodeTypes, { DEFAULT_NODE_DATA, NODE_PALETTE } from '../nodes/nodeTypes';
import PluginNode from '../nodes/PluginNode';
import Toolbar from '../components/Toolbar';
import LogPanel from '../components/LogPanel';
import { varHint, BUILTIN_VARS, PLUGIN_VARS } from '../utils/variables';

let _nc = 1;

const MINIMAP_NODE_COLOR = {
  event_message:    '#1a0d40',
  event_channel:    '#0f1245',
  event_client:     '#200a42',
  event_emoji:      '#2a0a45',
  event_guild:      '#0a1838',
  event_member:     '#0d1050',
  event_role:       '#280838',
  custom_command:   '#0a0c30',
  send_message:     '#0c1a10',
  condition_branch: '#200808',
};

const CATEGORIES = [
  { label: 'Events',   items: ['event_message', 'event_channel', 'event_client', 'event_emoji', 'event_guild', 'event_member', 'event_role'] },
  { label: 'Commands', items: ['custom_command'] },
  { label: 'Actions',  items: ['send_message'] },
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

// ── Event node types that get their own submenu column ───────────────────────
const EVENT_SUBMENU_MAP = {
  event_message: 'message',
  event_channel: 'channel',
  event_client:  'client',
  event_emoji:   'emoji',
  event_guild:   'guild',
  event_member:  'member',
  event_role:    'role',
};
const EVENT_SUBMENU_CATS = new Set(Object.values(EVENT_SUBMENU_MAP));

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
    if (key in EVENT_SUBMENU_MAP) {
      const folderCat    = EVENT_SUBMENU_MAP[key];
      const p            = palette.find((x) => x.type === key);
      const folderPlugins = (pluginMeta || []).filter((x) => x.category === folderCat);
      return (
        <>
          <div className="bl-ctx-sub-section">Event Node</div>
          <div className="bl-ctx-item" onMouseDown={() => { onAdd(key); onClose(); }}>
            <span className="bl-ctx-item-dot" style={{ background: p?.color }} />
            {p?.label}
          </div>
          {folderPlugins.length > 0 ? (
            <>
              <div className="bl-ctx-divider" />
              <div className="bl-ctx-sub-section">Plugins</div>
              {folderPlugins.map((pl) => (
                <div key={pl.type} className="bl-ctx-item" onMouseDown={() => { onAdd(pl.type); onClose(); }}>
                  <span className="bl-ctx-item-dot" style={{ background: pl.color }} />
                  {pl.label}
                </div>
              ))}
            </>
          ) : (
            <div className="bl-ctx-sub-empty">plugins/{folderCat}/</div>
          )}
        </>
      );
    }
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
              {Object.entries(EVENT_SUBMENU_MAP).map(([type]) => {
                const p = palette.find((x) => x.type === type);
                if (!p) return null;
                const isActive = activeSub?.key === type;
                return (
                  <div
                    key={type}
                    className={`bl-ctx-item bl-ctx-item-sub${isActive ? ' bl-ctx-item-active' : ''}`}
                    onMouseEnter={(e) => openSub(type, e.currentTarget)}
                    onMouseLeave={closeSub}
                  >
                    <span className="bl-ctx-item-dot" style={{ background: p.color }} />
                    <span style={{ flex: 1 }}>{p.label.replace(' Event', '')}</span>
                    <span className="bl-ctx-arrow">▶</span>
                  </div>
                );
              })}

              {/* ── Commands, Actions, Logic ── */}
              {[
                { label: 'Commands', items: ['custom_command'] },
                { label: 'Actions',  items: ['send_message'] },
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

// ── Variable substitution for preview (built-in + plugin vars) ───────────────
function demoSub(text, nodeData) {
  const d = nodeData || {};
  return (text || '')
    .replace(/\{target\}/g,  'OwO#8456')
    .replace(/\{latency\}/g, '42')
    .replace(/\{reason\}/g,  d.reason  || 'No reason provided')
    .replace(/\{command\}/g, d.command || '!command')
    .replace(/\{user\}/g,    'Akashsuu')
    .replace(/\{args\}/g,    'world')
    .replace(/\{tag\}/g,     'Akashsuu#0000')
    .replace(/\{channel\}/g, 'general');
}

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

  if (node.type === 'custom_command')    rawText = d.reply  || '';
  else if (node.type === 'send_message') rawText = d.text   || '';
  else {
    // Plugin node — prefer the 'output' field template, then fall back to first string field
    if (d.output !== undefined) {
      rawText = d.output || '';
    } else {
      const entry = Object.entries(d).find(([k, v]) => !k.startsWith('_') && k !== 'collapsed' && typeof v === 'string');
      rawText = entry ? entry[1] : '';
    }
  }

  const text = demoSub(rawText, d);
  const hasContent = text || d.embedEnabled;

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
      <div className="dc-msg">
        {/* Avatar: real bot avatar if online, otherwise placeholder */}
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
          {d.embedEnabled ? (
            <DiscordEmbed data={d} text={text} />
          ) : (
            <div className="dc-plain">{text}</div>
          )}
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
          <input type="checkbox" checked={!!d.embedEnabled} onChange={(e) => update('embedEnabled', e.target.checked)} />
          Embed
        </label>
      </div>

      {d.embedEnabled && (
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
      <div className="bl-npanel">
        <div className="bl-npanel-empty">
          Select a node<br />to see properties
        </div>
        <div className="bl-npanel-hint">Press N to hide this panel</div>
      </div>
    );
  }

  const palette = NODE_PALETTE.find((p) => p.type === selectedNode.type);
  const d = selectedNode.data;

  return (
    <div className="bl-npanel">
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
              <div style={{ color: '#42386a', fontSize: 11 }}>No editable properties.</div>
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
      {!selectedNode.type.startsWith('event_') && selectedNode.type !== 'condition_branch' && (
        <div className="bl-npanel-section">
          <div className="bl-npanel-section-hdr" onClick={() => toggle('preview')}>
            <span className="arrow">{openSections.preview ? '▼' : '▶'}</span>
            Discord Preview
          </div>
          {openSections.preview && <DiscordPreview node={selectedNode} />}
        </div>
      )}

      <div className="bl-npanel-hint">Press N to toggle panel</div>
    </div>
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
      style: { stroke: '#9333ea', strokeWidth: 1.5 },
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
      data = { ...builtin };
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
        ...(pm.defaults || {}),
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
            defaultEdgeOptions={{
              type: 'default',
              style: { stroke: '#9333ea', strokeWidth: 1.5 },
            }}
            connectionLineStyle={{ stroke: '#9333ea', strokeWidth: 1.5 }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#1e1a3c"
            />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(n) => MINIMAP_NODE_COLOR[n.type] || '#3D3D3D'}
              maskColor="rgba(5,4,15,0.80)"
              style={{ background: '#0e0e1c', border: '1px solid #1e1a3c' }}
            />
            <Panel position="top-right">
              <div className="canvas-info">{nodes.length} nodes · {edges.length} edges · RMB = add</div>
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
