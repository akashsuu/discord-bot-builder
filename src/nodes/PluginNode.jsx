import React, { useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

// ── Demo variable substitution ─────────────────────────────────────────────────
// Replaces every {token} with a realistic preview value.
// Accepts `extra` for page-specific tokens ({page}, {totalPages}).
function pluginPreview(template, data, extra) {
  const d = data  || {};
  const e = extra || {};
  return (template || '')
    // Sender
    .replace(/\{user\}/g,          'Akashsuu')
    .replace(/\{tag\}/g,           'Akashsuu#0000')
    .replace(/\{id\}/g,            '123456789012345678')
    .replace(/\{mention\}/g,       '@Akashsuu')
    // Target
    .replace(/\{target\}/g,        'OwO#8456')
    .replace(/\{targetName\}/g,    'OwO')
    .replace(/\{targetId\}/g,      '987654321098765432')
    .replace(/\{targetMention\}/g, '@OwO')
    // Command / args
    .replace(/\{command\}/g,       d.command || '!command')
    .replace(/\{args\}/g,          'hello world')
    .replace(/\{reason\}/g,        d.reason  || 'No reason provided')
    // Server / channel
    .replace(/\{server\}/g,        'My Server')
    .replace(/\{channel\}/g,       'general')
    .replace(/\{memberCount\}/g,   '1,234')
    // Page-specific (updated per page)
    .replace(/\{page\}/g,          e.page       ?? '1')
    .replace(/\{totalPages\}/g,    e.totalPages ?? '1')
    .replace(/\{selected\}/g,      e.selected   ?? '')
    .replace(/\{button\}/g,        e.button     ?? '')
    // Utility
    .replace(/\{latency\}/g,       '42')
    .replace(/\{date\}/g,          '2026-05-05')
    .replace(/\{time\}/g,          '12:00:00');
}

// ── Keys hidden from plain-input renderer ──────────────────────────────────────
const EMBED_KEYS = new Set([
  'embedEnabled', 'embedColor', 'embedTitle', 'embedFooter', 'embedTimestamp',
  'logoUrl', 'logoName', 'imageUrl', 'imagePosition',
  'embedDescription', 'embedThumbnail', 'embedImage',
  'dmEnabled', 'dmMessage',
  'pages', 'dropdown', 'buttons',
  // serverinfo template sections
  'ownerTemplate', 'serverIdTemplate', 'createdTemplate', 'membersTemplate',
  'channelsTemplate', 'rolesTemplate', 'boostTemplate', 'verificationTemplate',
]);

const TICKET_PANEL_KEYS = new Set([
  'panelMode', 'categories', 'categoryLabels', 'buttonStyle', 'dropdownPlaceholder',
]);

const PLUGIN_HEADER_PURPLE = '#7c3aed';

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitCsvLoose(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim());
}

function titleCase(value) {
  const clean = String(value || '').replace(/[-_]+/g, ' ').trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Support';
}

function getTicketPanelOptions(data) {
  const categories = data.categories == null ? ['support'] : splitCsvLoose(data.categories);
  const labels = splitCsvLoose(data.categoryLabels || '');
  const length = Math.max(categories.length, labels.length, 1);
  return Array.from({ length }, (_, index) => {
    const category = categories[index] ?? (index === 0 && labels.length === 0 ? 'support' : '');
    return {
      category,
      label: labels[index] ?? titleCase(category),
    };
  }).filter((option, index, list) =>
    list.length === 1 || option.category !== '' || option.label !== ''
  );
}

// ── Small section heading ──────────────────────────────────────────────────────
function SectionHead({ color = '#888', children }) {
  return (
    <div style={{ color, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '2px 0 3px', userSelect: 'none' }}>
      {children}
    </div>
  );
}

// ── Inline Discord message preview ────────────────────────────────────────────
function DiscordPreviewInline({ pages, pageIdx, data }) {
  const pgs    = Array.isArray(pages) ? pages : [];
  const page   = pgs[pageIdx] || pgs[0] || { title: '', content: '' };
  const extra  = { page: String(pageIdx + 1), totalPages: String(pgs.length) };
  const color  = data.embedColor || '#5865F2';

  const title   = pluginPreview(page.title   || '', data, extra);
  const content = pluginPreview(page.content || '', data, extra);
  const footer  = data.embedFooter
    ? pluginPreview(data.embedFooter, data, extra)
    : null;

  return (
    <div style={{ background: '#36393F', borderRadius: 5, padding: '7px 8px', fontSize: 11 }}>
      {/* Bot header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: color, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 13, flexShrink: 0,
        }}>⚡</div>
        <span style={{ color: '#FFF', fontWeight: 700, fontSize: 12 }}>YourBot</span>
        <span style={{
          background: '#5865F2', color: '#FFF', fontSize: 9,
          padding: '1px 4px', borderRadius: 3, fontWeight: 700,
        }}>BOT</span>
        <span style={{ color: '#72767D', fontSize: 10, marginLeft: 'auto' }}>Today at 12:00</span>
      </div>

      {/* Message body */}
      {data.embedEnabled !== false ? (
        /* Embed */
        <div style={{
          borderLeft: `4px solid ${color}`,
          background: '#2F3136',
          borderRadius: '0 4px 4px 0',
          padding: '8px 10px',
        }}>
          {title && (
            <div style={{ color: '#FFF', fontWeight: 700, fontSize: 12, marginBottom: 3, lineHeight: 1.3 }}>
              {title}
            </div>
          )}
          {content && (
            <div style={{ color: '#DCDDDE', fontSize: 11, whiteSpace: 'pre-wrap', lineHeight: 1.5, wordBreak: 'break-word' }}>
              {content}
            </div>
          )}
          {footer && (
            <div style={{
              color: '#72767D', fontSize: 10, marginTop: 6,
              borderTop: '1px solid #40444B', paddingTop: 4,
            }}>
              {footer}
            </div>
          )}
        </div>
      ) : (
        /* Plain text */
        <div style={{ color: '#DCDDDE', fontSize: 11, whiteSpace: 'pre-wrap', lineHeight: 1.5, wordBreak: 'break-word' }}>
          {content || <span style={{ color: '#555' }}>(empty page)</span>}
        </div>
      )}
    </div>
  );
}

// ── Server Info inline Discord preview ───────────────────────────────────────
const SI_DEMO = {
  server: 'My Server',  serverId: '123456789012345678',
  memberCount: '1,234', humanCount: '1,200', botCount: '34',
  owner: 'ServerOwner', ownerMention: '@ServerOwner', ownerId: '987654321098765432',
  boostTier: 'No Level', boostBar: 'No boosts yet', boostCount: '0',
  roles: '25', textChannels: '13', voiceChannels: '4', categories: '6',
  verification: '🔒 Low',
  createdAt: 'January 1, 2023',
  createdTimestamp: 'January 1, 2023 (2 years ago)',
  user: 'Akashsuu', command: 'serverinfo',
  date: '2026-05-06', time: '12:00:00',
};

function siApply(template, extra = {}) {
  const vars = { ...SI_DEMO, ...extra };
  return String(template || '').replace(/\{(\w+)\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m
  );
}

function DiscordPreviewServerInfo({ data }) {
  const color = data.embedColor || '#5865F2';

  const sections = [
    data.ownerTemplate        || '👑 Owner\n{ownerMention} ({owner})',
    data.serverIdTemplate     || '🆔 Server ID\n{serverId}',
    data.createdTemplate      || '📅 Created\n{createdAt} ({createdTimestamp})',
    data.membersTemplate      || '👥 Members\n{memberCount} total\n👤 Humans: {humanCount}\n🤖 Bots: {botCount}',
    data.channelsTemplate     || '💬 Channels\n💬 Text: {textChannels}\n🔊 Voice: {voiceChannels}\n📂 Categories: {categories}',
    data.rolesTemplate        || '🎭 Roles\n{roles} roles',
    data.boostTemplate        || '🚀 Boost — {boostTier}\n{boostBar}\n{boostCount} boosts',
    data.verificationTemplate || '🔒 Verification\n{verification}',
  ].map((t) => siApply(t)).join('\n\n');

  const title  = siApply(data.embedTitle  || '🏠 {server}');
  const footer = siApply(data.embedFooter || 'Server ID: {serverId}');

  return (
    <div style={{ background: '#36393F', borderRadius: 5, padding: '7px 8px', fontSize: 11, marginTop: 6 }}>
      {/* Bot row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🏠</div>
        <span style={{ color: '#FFF', fontWeight: 700, fontSize: 12 }}>YourBot</span>
        <span style={{ background: '#5865F2', color: '#FFF', fontSize: 9, padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>BOT</span>
        <span style={{ color: '#72767D', fontSize: 10, marginLeft: 'auto' }}>Today at 12:00</span>
      </div>
      {/* Embed */}
      <div style={{ borderLeft: `4px solid ${color}`, background: '#2F3136', borderRadius: '0 4px 4px 0', padding: '8px 10px' }}>
        <div style={{ color: '#FFF', fontWeight: 700, fontSize: 12, marginBottom: 5 }}>{title}</div>
        <div style={{ color: '#DCDDDE', fontSize: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6, wordBreak: 'break-word' }}>{sections}</div>
        <div style={{ color: '#72767D', fontSize: 10, marginTop: 6, borderTop: '1px solid #40444B', paddingTop: 4 }}>{footer}</div>
      </div>
    </div>
  );
}

export default function PluginNode({ id, type, data, selected }) {
  const { setNodes }    = useReactFlow();
  const collapsed       = !!data.collapsed;
  const [previewPg, setPreviewPg] = useState(0);

  // ── Top-level updater ─────────────────────────────────────────────────────
  const update = useCallback((key, val) => {
    setNodes((ns) => ns.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, [key]: val } } : n
    ));
  }, [id, setNodes]);

  const updateMany = useCallback((patch) => {
    setNodes((ns) => ns.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
    ));
  }, [id, setNodes]);

  const toggle = useCallback(() => {
    setNodes((ns) => ns.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n
    ));
  }, [id, setNodes]);

  // ── Dropdown updater ──────────────────────────────────────────────────────
  const updateDropdown = useCallback((key, val) => {
    setNodes((ns) => ns.map((n) => {
      if (n.id !== id) return n;
      const dd = { enabled: false, placeholder: '', usePages: true, ...(n.data.dropdown || {}), [key]: val };
      return { ...n, data: { ...n.data, dropdown: dd } };
    }));
  }, [id, setNodes]);

  // ── Buttons updater ───────────────────────────────────────────────────────
  const updateButtons = useCallback((key, val) => {
    setNodes((ns) => ns.map((n) => {
      if (n.id !== id) return n;
      const bt = { enabled: false, navigation: true, list: [], ...(n.data.buttons || {}), [key]: val };
      return { ...n, data: { ...n.data, buttons: bt } };
    }));
  }, [id, setNodes]);

  // ── Pages: single immutable updater ─────────────────────────────────────
  const updatePages = useCallback((pages) => {
    update('pages', pages);
  }, [update]);

  // ── Derived values ────────────────────────────────────────────────────────
  const inputFields = Object.entries(data).filter(
    ([k]) => !k.startsWith('_') && k !== 'collapsed' && k !== 'output' && !EMBED_KEYS.has(k) && !TICKET_PANEL_KEYS.has(k) && k !== 'pages' && k !== 'dropdown' && k !== 'buttons'
  );
  const commandFields = inputFields.filter(([key]) => key === 'command');
  const configFields = inputFields.filter(([key]) => key !== 'command');
  const hasOutput   = 'output' in data;
  const previewText = hasOutput ? pluginPreview(data.output, data, {}) : null;

  // Show page editor if pages key exists OR if this is a known page-menu node type
  const PAGE_MENU_TYPES = new Set(['page_menu', 'util_pagemenu', 'util_helpmenu']);
  const isPageMenuType  = PAGE_MENU_TYPES.has(type || '');
  const hasPages    = 'pages' in data || isPageMenuType;
  const hasDropdown = 'dropdown' in data;
  const hasButtons  = 'buttons'  in data;

  // Auto-seed a blank pages array on first render if this is a page-menu type
  // but arrived without pages (e.g. old saved project before fix)
  React.useEffect(() => {
    if (isPageMenuType && !Array.isArray(data.pages)) {
      update('pages', [{ id: `page_1`, title: 'Page 1', content: 'Edit this text' }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dd  = data.dropdown || {};
  const bt  = data.buttons  || {};
  const pgs = Array.isArray(data.pages) ? data.pages : [];
  const ticketOptions = getTicketPanelOptions(data);

  const saveTicketOptions = useCallback((options) => {
    const safe = options.length ? options : [{ category: 'support', label: 'Support' }];
    updateMany({
      categories: safe.map((option) => option.category ?? 'support').join(','),
      categoryLabels: safe.map((option) => option.label ?? titleCase(option.category)).join(','),
    });
  }, [updateMany]);

  const updateTicketOption = useCallback((index, patch) => {
    const next = ticketOptions.map((option, optionIndex) => (
      optionIndex === index ? { ...option, ...patch } : option
    ));
    saveTicketOptions(next);
  }, [ticketOptions, saveTicketOptions]);

  const addTicketOption = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const nextIndex = ticketOptions.length + 1;
    saveTicketOptions([
      ...ticketOptions,
      { category: `support_${nextIndex}`, label: `Support ${nextIndex}` },
    ]);
  }, [ticketOptions, saveTicketOptions]);

  const removeTicketOption = useCallback((index, event) => {
    event.preventDefault();
    event.stopPropagation();
    saveTicketOptions(ticketOptions.filter((_, optionIndex) => optionIndex !== index));
  }, [ticketOptions, saveTicketOptions]);

  // Keep previewPg in bounds when pages shrink
  const safePg = Math.min(previewPg, Math.max(0, pgs.length - 1));

  return (
    <div
      className={`bl-node ${selected ? 'selected' : ''} ${collapsed ? 'bl-node-min' : ''}`}
      style={{ minWidth: 260 }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bl-node-hdr" style={{ background: PLUGIN_HEADER_PURPLE }}>
        <button className="bl-collapse-btn" onClick={toggle} title={collapsed ? 'Expand' : 'Minimize'}>
          {collapsed ? '▶' : '▼'}
        </button>
        <span className="bl-node-hdr-icon">{data._icon || '🔌'}</span>
        <span className="bl-node-hdr-title">{data._label || 'Plugin Node'}</span>
        {collapsed && (
          <>
            {data._hasInput  && <Handle type="target" position={Position.Left}  id="input"  className="handle-gray"   />}
            {data._hasOutput && <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />}
          </>
        )}
      </div>

      {!collapsed && (
        <div className="bl-node-body nodrag nowheel">
          {/* ── Input socket ─────────────────────────────────────────────── */}
          {data._hasInput && (
            <div className="bl-row bl-row-in">
              <Handle type="target" position={Position.Left} id="input" className="handle-gray" />
              <span className="bl-socket-label">Message</span>
            </div>
          )}

          {/* ── Standard text inputs (e.g. command, reason) ──────────────── */}
          {commandFields.length > 0 && (
            <>
              <div className="bl-node-divider" />
              <SectionHead color="#F59E0B">Prefix Command</SectionHead>
              {commandFields.map(([key, val]) => (
                <div key={key} className="bl-field">
                  <span className="bl-field-lbl">Command</span>
                  <input
                    className="bl-node-input"
                    value={val || ''}
                    onChange={(e) => update(key, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="ticket-panel"
                    spellCheck={false}
                  />
                  <span className="bl-field-hint">Use the command word only. The project prefix is added when the bot runs.</span>
                </div>
              ))}
            </>
          )}

          {type === 'ticket_panel' && (
            <>
              <div className="bl-node-divider" />
              <SectionHead color="#F59E0B">Ticket Buttons</SectionHead>
              <div className="bl-field">
                <span className="bl-field-lbl">Panel Mode</span>
                <select
                  className="bl-node-input"
                  value={data.panelMode || 'buttons'}
                  onChange={(e) => update('panelMode', e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <option value="buttons">Buttons</option>
                  <option value="dropdown">Dropdown</option>
                </select>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {ticketOptions.map((option, index) => (
                  <div
                    key={`${option.category}_${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 28px',
                      gap: 6,
                      alignItems: 'center',
                      background: '#171720',
                      border: '1px solid #2A2A3A',
                      borderRadius: 5,
                      padding: 6,
                    }}
                  >
                    <input
                      className="bl-node-input"
                      value={option.label}
                      onChange={(e) => updateTicketOption(index, { label: e.target.value })}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder={data.panelMode === 'dropdown' ? 'Option label' : 'Button label'}
                      spellCheck={false}
                      style={{ minWidth: 0 }}
                    />
                    <input
                      className="bl-node-input"
                      value={option.category}
                      onChange={(e) => updateTicketOption(index, { category: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="category_id"
                      spellCheck={false}
                      style={{ minWidth: 0 }}
                    />
                    <button
                      type="button"
                      onClick={(e) => removeTicketOption(index, e)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      title="Delete button"
                      style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #5A2020', background: '#331015', color: '#FF7070', cursor: 'pointer', fontWeight: 800 }}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addTicketOption}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ width: '100%', background: '#132116', border: '1px solid #245332', color: '#7BE395', borderRadius: 5, cursor: 'pointer', padding: '7px 0', fontSize: 11, marginTop: 7, fontWeight: 700 }}
              >
                Add {data.panelMode === 'dropdown' ? 'Option' : 'Button'}
              </button>
              <span className="bl-field-hint">Edit description and preview in the right properties panel.</span>
            </>
          )}

          {configFields.length > 0 && <div className="bl-node-divider" />}
          {configFields.map(([key, val]) => (
            <div key={key} className="bl-field">
              <span className="bl-field-lbl">{key}</span>
              {typeof val === 'boolean' ? (
                <label className="bl-embed-toggle" style={{ fontSize: 11 }}>
                  <input
                    type="checkbox"
                    checked={!!val}
                    onChange={(e) => update(key, e.target.checked)}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  Enabled
                </label>
              ) : (
                <input
                  className="bl-node-input"
                  value={val ?? ''}
                  onChange={(e) => update(key, typeof val === 'number' ? Number(e.target.value) : e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  type={typeof val === 'number' ? 'number' : 'text'}
                  spellCheck={false}
                />
              )}
            </div>
          ))}

          {/* ── Output message template (for non-page plugins) ───────────── */}
          {hasOutput && type !== 'util_serverinfo' && (
            <>
              <div className="bl-node-divider" />
              <div className="bl-field">
                <span className="bl-field-lbl" style={{ color: '#6AAA4A' }}>Output Message</span>
                <textarea
                  className="bl-node-textarea"
                  style={{ borderColor: '#2A4A1A', minHeight: 48 }}
                  value={data.output || ''}
                  onChange={(e) => update('output', e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  spellCheck={false}
                  rows={3}
                />
                <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
                  <span style={{ color: '#7EB8F7' }}>{'{user}  {tag}  {mention}'}</span>{'  · '}
                  <span style={{ color: '#E07070' }}>{'{target}  {targetName}'}</span>{'  · '}
                  <span style={{ color: '#A8D08D' }}>{'{reason}  {command}  {args}'}</span>{'  · '}
                  <span style={{ color: '#C8A0F0' }}>{'{server}  {channel}'}</span>{'  · '}
                  <span style={{ color: '#888' }}>{'{date}  {time}'}</span>
                </span>
              </div>
              {previewText && (
                <div className="bl-out-preview">
                  <div className="bl-out-preview-lbl">Output preview</div>
                  {previewText}
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SERVER INFO — editable embed section templates
          ══════════════════════════════════════════════════════════════ */}
          {type === 'util_serverinfo' && (() => {
            const SI_FIELDS = [
              { key: 'embedTitle',          label: '🏠 Embed Title',    hint: '{server}' },
              { key: 'ownerTemplate',       label: '👑 Owner',          hint: '{ownerMention} {owner} {ownerId}' },
              { key: 'serverIdTemplate',    label: '🆔 Server ID',      hint: '{serverId}' },
              { key: 'createdTemplate',     label: '📅 Created',        hint: '{createdAt} {createdTimestamp}' },
              { key: 'membersTemplate',     label: '👥 Members',        hint: '{memberCount} {humanCount} {botCount}' },
              { key: 'channelsTemplate',    label: '💬 Channels',       hint: '{textChannels} {voiceChannels} {categories}' },
              { key: 'rolesTemplate',       label: '🎭 Roles',          hint: '{roles}' },
              { key: 'boostTemplate',       label: '🚀 Boost',          hint: '{boostTier} {boostBar} {boostCount}' },
              { key: 'verificationTemplate',label: '🔒 Verification',   hint: '{verification}' },
              { key: 'embedFooter',         label: '📝 Footer',         hint: '{serverId} {server} {user}' },
            ];
            return (
              <>
                <div className="bl-node-divider" style={{ borderColor: '#1A3A5A' }} />
                <div className="bl-field">
                  <SectionHead color="#7EB8F7">🏠 Server Info Sections</SectionHead>
                </div>
                <div className="nowheel" style={{ maxHeight: 480, overflowY: 'auto' }}>
                  {SI_FIELDS.map(({ key, label, hint }) => (
                    <div key={key} style={{ marginBottom: 8 }}>
                      <span style={{ color: '#9AAFBF', fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 3 }}>
                        {label}
                      </span>
                      <textarea
                        className="bl-node-textarea"
                        value={data[key] || ''}
                        onChange={(e) => update(key, e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder={hint}
                        spellCheck={false}
                        rows={key === 'embedTitle' || key === 'embedFooter' ? 1 : 3}
                        style={{ fontSize: 11, minHeight: key === 'embedTitle' || key === 'embedFooter' ? 28 : 52 }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ color: '#3A5A7A', fontSize: 10, padding: '2px 0 4px', lineHeight: 1.6 }}>
                  <span style={{ color: '#7EB8F7' }}>{'{server} {serverId} {memberCount}'}</span>
                  {' · '}
                  <span style={{ color: '#A8D08D' }}>{'{owner} {ownerMention} {ownerId}'}</span>
                  {' · '}
                  <span style={{ color: '#C8A0F0' }}>{'{roles} {verification} {createdAt}'}</span>
                </div>

                {/* ── Live Discord preview ── */}
                <div className="bl-node-divider" style={{ borderColor: '#1A3A5A' }} />
                <div className="bl-field">
                  <SectionHead color="#72767D">👁 Discord Preview</SectionHead>
                </div>
                <DiscordPreviewServerInfo data={data} />
              </>
            );
          })()}



          {/* ── DM target ────────────────────────────────────────────────── */}
          {'dmEnabled' in data && (
            <>
              <div className="bl-node-divider" />
              <div className="bl-field">
                <label className="bl-embed-toggle">
                  <input type="checkbox" checked={!!data.dmEnabled} onChange={(e) => update('dmEnabled', e.target.checked)} />
                  DM Target
                </label>
              </div>
              {data.dmEnabled && (
                <div className="bl-field">
                  <span className="bl-field-lbl">DM Message</span>
                  <textarea
                    className="bl-node-textarea"
                    style={{ minHeight: 44 }}
                    value={data.dmMessage || ''}
                    onChange={(e) => update('dmMessage', e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    spellCheck={false}
                    rows={2}
                  />
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PAGES EDITOR + INLINE DISCORD PREVIEW
          ══════════════════════════════════════════════════════════════ */}
          {hasPages && (
            <>
              <div className="bl-node-divider" style={{ borderColor: '#2A2A4A' }} />

              {/* SAFE ARRAY */}
              {(!data.pages || data.pages.length === 0) && (
                <p style={{ color: '#555', fontSize: 11, padding: '2px 0 4px', textAlign: 'center' }}>No pages yet</p>
              )}

              <div className="nowheel" style={{ maxHeight: 420, overflowY: 'auto' }}>
                {(data.pages || []).map((page, i) => {
                  const pages = data.pages || [];

                  return (
                    <div key={page.id || i} style={{
                      border: "1px solid #333",
                      padding: "10px",
                      marginBottom: "10px",
                      borderRadius: "6px",
                      background: '#16162A'
                    }}>

                      <strong style={{ display: 'block', marginBottom: 5, color: '#C8A0F0' }}>Page {i + 1}</strong>

                      {/* TITLE */}
                      <input
                        className="bl-node-input"
                        value={page.title || ""}
                        placeholder="Page Title"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const newPages = [...pages];
                          newPages[i] = { ...newPages[i], title: e.target.value };
                          updatePages(newPages);
                        }}
                        style={{ width: '100%', marginBottom: 5 }}
                      />

                      {/* DESCRIPTION */}
                      <input
                        className="bl-node-input"
                        value={page.description || ""}
                        placeholder="Dropdown Description (Optional)"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const newPages = [...pages];
                          newPages[i] = { ...newPages[i], description: e.target.value };
                          updatePages(newPages);
                        }}
                        style={{ width: '100%', marginBottom: 5, fontSize: 10 }}
                      />

                      {/* CONTENT */}
                      <textarea
                        className="bl-node-textarea"
                        value={page.content || ""}
                        placeholder="Page Content"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        onFocus={() => setPreviewPg && setPreviewPg(i)}
                        onChange={(e) => {
                          const newPages = [...pages];
                          newPages[i] = { ...newPages[i], content: e.target.value };
                          updatePages(newPages);
                        }}
                        style={{ width: '100%', minHeight: 52, marginBottom: 5 }}
                      />

                      {/* ACTIONS */}
                      <div style={{ marginTop: 5, display: 'flex', gap: 5 }}>

                        <button
                          disabled={i === 0}
                          onClick={() => {
                            if (i === 0) return;
                            const newPages = [...pages];
                            [newPages[i - 1], newPages[i]] = [newPages[i], newPages[i - 1]];
                            updatePages(newPages);
                            setPreviewPg(i - 1);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{
                            background: '#2A2A3A', border: '1px solid #4A4A5A', color: i === 0 ? '#555' : '#DCDDDE',
                            padding: '2px 8px', borderRadius: 3, cursor: i === 0 ? 'default' : 'pointer'
                          }}
                        >
                          ▲
                        </button>

                        <button
                          disabled={i === pages.length - 1}
                          onClick={() => {
                            if (i === pages.length - 1) return;
                            const newPages = [...pages];
                            [newPages[i + 1], newPages[i]] = [newPages[i], newPages[i + 1]];
                            updatePages(newPages);
                            setPreviewPg(i + 1);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{
                            background: '#2A2A3A', border: '1px solid #4A4A5A', color: i === pages.length - 1 ? '#555' : '#DCDDDE',
                            padding: '2px 8px', borderRadius: 3, cursor: i === pages.length - 1 ? 'default' : 'pointer'
                          }}
                        >
                          ▼
                        </button>

                        <button
                          onClick={() => {
                            const newPages = [...pages];
                            newPages.splice(i, 1);
                            updatePages(newPages);
                            setPreviewPg((p) => Math.max(0, p - (p >= i ? 1 : 0)));
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{
                            background: '#3A1010', border: '1px solid #5A2020', color: '#FF7070',
                            padding: '2px 8px', borderRadius: 3, cursor: 'pointer', marginLeft: 'auto'
                          }}
                        >
                          ❌
                        </button>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ADD PAGE */}
              <button
                onClick={() => {
                  const pages = data.pages || [];
                  const newPages = [
                    ...pages,
                    {
                      id: `page_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
                      title: "New Page",
                      content: ""
                    }
                  ];
                  updatePages(newPages);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  width: '100%', background: '#1A2A1A',
                  border: '1px solid #2A4A2A', color: '#6AAA4A',
                  borderRadius: 4, cursor: 'pointer',
                  padding: '5px 0', fontSize: 11, marginBottom: 6,
                }}
              >
                ➕ Add Page
              </button>

              {/* ── Inline Discord preview ──────────────────────────────── */}
              {pgs.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                    <span style={{ color: '#555', fontSize: 10, flexShrink: 0 }}>👁 Preview</span>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1 }}>
                      {pgs.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => setPreviewPg(i)}
                          onMouseDown={(e) => e.stopPropagation()}
                          title={p.title || `Page ${i + 1}`}
                          style={{
                            background: safePg === i ? '#2A2A5A' : '#1A1A2A',
                            border:     `1px solid ${safePg === i ? '#5865F2' : '#2A2A3A'}`,
                            color:      safePg === i ? '#7EB8F7' : '#555',
                            borderRadius: 3, cursor: 'pointer',
                            padding: '1px 7px', fontSize: 10, fontWeight: safePg === i ? 700 : 400,
                          }}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                  <DiscordPreviewInline pages={pgs} pageIdx={safePg} data={data} />
                </>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              DROPDOWN MENU
          ══════════════════════════════════════════════════════════════ */}
          {hasDropdown && (
            <>
              <div className="bl-node-divider" style={{ borderColor: '#2A3A2A' }} />
              <div className="bl-field">
                <label className="bl-embed-toggle">
                  <input
                    type="checkbox"
                    checked={!!dd.enabled}
                    onChange={(e) => updateDropdown('enabled', e.target.checked)}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <SectionHead color="#6AAA4A">▼ Dropdown Menu</SectionHead>
                </label>
              </div>

              {dd.enabled && (
                <>
                  <div className="bl-field">
                    <span className="bl-field-lbl">Placeholder</span>
                    <input
                      className="bl-node-input"
                      value={dd.placeholder || ''}
                      onChange={(e) => updateDropdown('placeholder', e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Select a page…"
                      spellCheck={false}
                    />
                  </div>
                  <div className="bl-field">
                    <label className="bl-embed-toggle" style={{ fontSize: 11 }}>
                      <input
                        type="checkbox"
                        checked={dd.usePages !== false}
                        onChange={(e) => updateDropdown('usePages', e.target.checked)}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      Auto-generate options from Pages
                    </label>
                  </div>

                  {/* Preview of dropdown options */}
                  {dd.usePages && pgs.length > 0 && (
                    <div style={{ background: '#1A1A2A', border: '1px solid #2A2A3A', borderRadius: 4, padding: '4px 6px', marginTop: 2 }}>
                      {pgs.slice(0, 5).map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0', fontSize: 10 }}>
                          <span style={{ color: '#555' }}>▸</span>
                          <span style={{ color: '#DCDDDE' }}>{p.title || `Page ${i + 1}`}</span>
                        </div>
                      ))}
                      {pgs.length > 5 && (
                        <div style={{ color: '#555', fontSize: 10, paddingTop: 2 }}>+{pgs.length - 5} more…</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              BUTTON ROW
          ══════════════════════════════════════════════════════════════ */}
          {hasButtons && (
            <>
              <div className="bl-node-divider" style={{ borderColor: '#2A2A3A' }} />
              <div className="bl-field">
                <label className="bl-embed-toggle">
                  <input
                    type="checkbox"
                    checked={!!bt.enabled}
                    onChange={(e) => updateButtons('enabled', e.target.checked)}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <SectionHead color="#7EB8F7">⬛ Button Row</SectionHead>
                </label>
              </div>

              {bt.enabled && (
                <>
                  <div className="bl-field">
                    <label className="bl-embed-toggle" style={{ fontSize: 11 }}>
                      <input
                        type="checkbox"
                        checked={bt.navigation !== false}
                        onChange={(e) => updateButtons('navigation', e.target.checked)}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      Navigation Buttons
                    </label>
                  </div>

                  {/* Button preview */}
                  {bt.navigation !== false && (
                    <div style={{ display: 'flex', gap: 4, padding: '3px 0 2px' }}>
                      {[
                        { lbl: '⬅ Prev', bg: '#2A2A3A', border: '#3A3A4A', col: '#DCDDDE' },
                        { lbl: 'Next ➡', bg: '#1A2A4A', border: '#2A3A5A', col: '#7EB8F7' },
                        { lbl: '❌ Close', bg: '#3A1A1A', border: '#5A2A2A', col: '#FF7070' },
                      ].map(({ lbl, bg, border, col }) => (
                        <span
                          key={lbl}
                          style={{
                            flex: 1, textAlign: 'center', fontSize: 10,
                            background: bg, border: `1px solid ${border}`,
                            borderRadius: 3, padding: '3px 0', color: col,
                          }}
                        >{lbl}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              EMBED SECTION
          ══════════════════════════════════════════════════════════════ */}
          <div className="bl-node-divider" />
          <div className="bl-field">
            <label className="bl-embed-toggle">
              <input
                type="checkbox"
                checked={!!data.embedEnabled}
                onChange={(e) => update('embedEnabled', e.target.checked)}
                onMouseDown={(e) => e.stopPropagation()}
              />
              Embed Output
            </label>
          </div>

          {data.embedEnabled && (
            <>
              <div className="bl-field">
                <span className="bl-field-lbl">Color</span>
                <div className="bl-color-field">
                  <input type="color" className="bl-color-pick" value={data.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
                  <input type="text"  className="bl-node-input" value={data.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
                </div>
              </div>

              <div className="bl-field">
                <span className="bl-field-lbl">Footer</span>
                <input
                  className="bl-node-input"
                  value={data.embedFooter || ''}
                  onChange={(e) => update('embedFooter', e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Footer text… {page} of {totalPages}"
                  spellCheck={false}
                />
              </div>

              <div className="bl-node-divider" style={{ borderColor: '#2A3A4A' }} />
              <div className="bl-field">
                <span className="bl-field-lbl" style={{ color: '#4A8ACA' }}>▲ Logo (top-left)</span>
              </div>
              <div className="bl-field">
                <span className="bl-field-lbl">Logo URL</span>
                <input className="bl-node-input" value={data.logoUrl || ''} onChange={(e) => update('logoUrl', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="https://…icon.png" spellCheck={false} />
              </div>
              <div className="bl-field">
                <span className="bl-field-lbl">Logo Name</span>
                <input className="bl-node-input" value={data.logoName || ''} onChange={(e) => update('logoName', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="Bot name" spellCheck={false} />
              </div>

              <div className="bl-node-divider" style={{ borderColor: '#2A3A4A' }} />
              <div className="bl-field">
                <span className="bl-field-lbl" style={{ color: '#4A8ACA' }}>▬ Image (bottom)</span>
              </div>
              <div className="bl-field">
                <span className="bl-field-lbl">Image URL</span>
                <input className="bl-node-input" value={data.imageUrl || ''} onChange={(e) => update('imageUrl', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="https://…image.png" spellCheck={false} />
              </div>
            </>
          )}

          {/* ── Pass-through output socket ────────────────────────────── */}
          {data._hasOutput && (
            <>
              <div className="bl-node-divider" />
              <div className="bl-row bl-row-out">
                <span className="bl-socket-label">Pass-through</span>
                <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
