import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

function pluginPreview(template, data) {
  const d = data || {};
  return (template || '')
    .replace(/\{user\}/g,          'Akashsuu')
    .replace(/\{tag\}/g,           'Akashsuu#0000')
    .replace(/\{id\}/g,            '123456789012345678')
    .replace(/\{mention\}/g,       '@Akashsuu')
    .replace(/\{target\}/g,        'OwO#8456')
    .replace(/\{targetName\}/g,    'OwO')
    .replace(/\{targetId\}/g,      '987654321098765432')
    .replace(/\{targetMention\}/g, '@OwO')
    .replace(/\{command\}/g,       d.command || '!command')
    .replace(/\{args\}/g,          'hello world')
    .replace(/\{reason\}/g,        d.reason  || 'No reason provided')
    .replace(/\{server\}/g,        'My Server')
    .replace(/\{channel\}/g,       'general')
    .replace(/\{memberCount\}/g,   '1,234')
    .replace(/\{latency\}/g,       '42')
    .replace(/\{date\}/g,          '2026-05-05')
    .replace(/\{time\}/g,          '12:00:00');
}

const EMBED_KEYS = new Set([
  'embedEnabled', 'embedColor', 'embedTitle', 'embedFooter', 'embedTimestamp',
  'logoUrl', 'logoName', 'imageUrl', 'imagePosition',
  'dmEnabled', 'dmMessage',
  'pages', 'dropdown', 'buttons',
]);

// ── Section header ────────────────────────────────────────────────────────────
function SectionHead({ color = '#888', children }) {
  return (
    <div style={{ color, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '2px 0 3px', userSelect: 'none' }}>
      {children}
    </div>
  );
}

export default function PluginNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const collapsed = !!data.collapsed;

  // ── Top-level field updater ────────────────────────────────────────────────
  const update = useCallback((key, val) => {
    setNodes((ns) => ns.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, [key]: val } } : n
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

  // ── Pages updaters ────────────────────────────────────────────────────────
  const updatePage = useCallback((index, key, val) => {
    setNodes((ns) => ns.map((n) => {
      if (n.id !== id) return n;
      const pages = [...(n.data.pages || [])];
      pages[index] = { ...pages[index], [key]: val };
      return { ...n, data: { ...n.data, pages } };
    }));
  }, [id, setNodes]);

  const addPage = useCallback(() => {
    setNodes((ns) => ns.map((n) => {
      if (n.id !== id) return n;
      const pages = [...(n.data.pages || [])];
      const num   = pages.length + 1;
      pages.push({ id: `page${num}`, title: `Page ${num}`, content: '' });
      return { ...n, data: { ...n.data, pages } };
    }));
  }, [id, setNodes]);

  const removePage = useCallback((index) => {
    setNodes((ns) => ns.map((n) => {
      if (n.id !== id) return n;
      const pages = (n.data.pages || []).filter((_, i) => i !== index);
      return { ...n, data: { ...n.data, pages } };
    }));
  }, [id, setNodes]);

  const movePage = useCallback((index, dir) => {
    setNodes((ns) => ns.map((n) => {
      if (n.id !== id) return n;
      const pages  = [...(n.data.pages || [])];
      const target = index + dir;
      if (target < 0 || target >= pages.length) return n;
      [pages[index], pages[target]] = [pages[target], pages[index]];
      return { ...n, data: { ...n.data, pages } };
    }));
  }, [id, setNodes]);

  const inputFields = Object.entries(data).filter(
    ([k]) => !k.startsWith('_') && k !== 'collapsed' && k !== 'output' && !EMBED_KEYS.has(k)
  );
  const hasOutput   = 'output' in data;
  const previewText = hasOutput ? pluginPreview(data.output, data) : null;
  const hasPages    = 'pages'    in data;
  const hasDropdown = 'dropdown' in data;
  const hasButtons  = 'buttons'  in data;

  const dd  = data.dropdown || {};
  const bt  = data.buttons  || {};
  const pgs = Array.isArray(data.pages) ? data.pages : [];

  return (
    <div className={`bl-node ${selected ? 'selected' : ''} ${collapsed ? 'bl-node-min' : ''}`} style={{ minWidth: 240 }}>
      <div className="bl-node-hdr" style={{ background: data._color || '#2A2A3A' }}>
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
        <div className="bl-node-body">
          {data._hasInput && (
            <div className="bl-row bl-row-in">
              <Handle type="target" position={Position.Left} id="input" className="handle-gray" />
              <span className="bl-socket-label">Message</span>
            </div>
          )}

          {/* ── Standard input fields ─────────────────────────────────── */}
          {inputFields.length > 0 && <div className="bl-node-divider" />}
          {inputFields.map(([key, val]) => (
            <div key={key} className="bl-field">
              <span className="bl-field-lbl">{key}</span>
              <input className="bl-node-input" value={val || ''} onChange={(e) => update(key, e.target.value)} spellCheck={false} />
            </div>
          ))}

          {/* ── Output message template ───────────────────────────────── */}
          {hasOutput && (
            <>
              <div className="bl-node-divider" />
              <div className="bl-field">
                <span className="bl-field-lbl" style={{ color: '#6AAA4A' }}>Output Message</span>
                <textarea
                  className="bl-node-textarea"
                  style={{ borderColor: '#2A4A1A', minHeight: 48 }}
                  value={data.output || ''}
                  onChange={(e) => update('output', e.target.value)}
                  spellCheck={false}
                  rows={3}
                />
                <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
                  <span style={{ color: '#7EB8F7' }}>{'{user}  {tag}  {id}  {mention}'}</span>{'  ·  '}
                  <span style={{ color: '#E07070' }}>{'{target}  {targetName}  {targetId}  {targetMention}'}</span>{'  ·  '}
                  <span style={{ color: '#A8D08D' }}>{'{reason}  {command}  {args}'}</span>{'  ·  '}
                  <span style={{ color: '#C8A0F0' }}>{'{server}  {channel}  {memberCount}'}</span>{'  ·  '}
                  <span style={{ color: '#888' }}>{'{date}  {time}  {latency}'}</span>
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

          {/* ── DM section ────────────────────────────────────────────── */}
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
                    spellCheck={false}
                    rows={2}
                  />
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PAGES EDITOR
          ══════════════════════════════════════════════════════════════ */}
          {hasPages && (
            <>
              <div className="bl-node-divider" style={{ borderColor: '#2A2A4A' }} />
              <div className="bl-field">
                <SectionHead color="#C8A0F0">📄 Pages ({pgs.length})</SectionHead>
              </div>

              {pgs.length === 0 && (
                <div style={{ color: '#555', fontSize: 11, padding: '2px 0 4px', textAlign: 'center' }}>
                  No pages yet — click + Add Page
                </div>
              )}

              {pgs.map((page, i) => (
                <div
                  key={i}
                  style={{ background: '#16162A', border: '1px solid #2A2A44', borderRadius: 5, padding: '6px 7px', marginBottom: 5 }}
                >
                  {/* Page header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                    <span style={{ color: '#555', fontSize: 10, minWidth: 18, textAlign: 'right' }}>#{i + 1}</span>
                    <input
                      className="bl-node-input"
                      value={page.title || ''}
                      onChange={(e) => updatePage(i, 'title', e.target.value)}
                      placeholder="Page title"
                      spellCheck={false}
                      style={{ flex: 1, minWidth: 0 }}
                    />
                    {/* Move up */}
                    <button
                      disabled={i === 0}
                      onClick={() => movePage(i, -1)}
                      title="Move up"
                      style={{ background: 'transparent', border: 'none', color: i === 0 ? '#333' : '#888', cursor: i === 0 ? 'default' : 'pointer', padding: '0 3px', fontSize: 11 }}
                    >▲</button>
                    {/* Move down */}
                    <button
                      disabled={i === pgs.length - 1}
                      onClick={() => movePage(i, 1)}
                      title="Move down"
                      style={{ background: 'transparent', border: 'none', color: i === pgs.length - 1 ? '#333' : '#888', cursor: i === pgs.length - 1 ? 'default' : 'pointer', padding: '0 3px', fontSize: 11 }}
                    >▼</button>
                    {/* Remove */}
                    <button
                      onClick={() => removePage(i)}
                      title="Remove page"
                      style={{ background: '#3A1010', border: '1px solid #5A1A1A', color: '#FF6060', borderRadius: 3, cursor: 'pointer', padding: '1px 6px', fontSize: 11, lineHeight: 1.4 }}
                    >✕</button>
                  </div>

                  {/* Page content */}
                  <textarea
                    className="bl-node-textarea"
                    value={page.content || ''}
                    onChange={(e) => updatePage(i, 'content', e.target.value)}
                    placeholder="Content… supports {user}, {server}, {date}, etc."
                    spellCheck={false}
                    rows={2}
                    style={{ minHeight: 40, fontSize: 11 }}
                  />
                </div>
              ))}

              <button
                onClick={addPage}
                style={{
                  width: '100%', background: '#1A2A1A', border: '1px solid #2A4A2A',
                  color: '#6AAA4A', borderRadius: 4, cursor: 'pointer',
                  padding: '4px 0', fontSize: 11, marginTop: 2,
                }}
              >
                + Add Page
              </button>
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
                      />
                      Auto-generate options from Pages
                    </label>
                  </div>
                  {!dd.usePages && (
                    <div style={{ color: '#666', fontSize: 10, padding: '2px 0', textAlign: 'center' }}>
                      Custom options can be set in project.json
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
                      />
                      Navigation Buttons
                    </label>
                  </div>
                  {bt.navigation !== false && (
                    <div style={{ display: 'flex', gap: 4, padding: '3px 0 2px' }}>
                      {['⬅ Prev', 'Next ➡', '❌ Close'].map((lbl) => (
                        <span
                          key={lbl}
                          style={{
                            flex: 1, textAlign: 'center', fontSize: 10,
                            background: '#1A2A3A', border: '1px solid #2A3A4A',
                            borderRadius: 3, padding: '3px 0', color: '#7EB8F7',
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
              <input type="checkbox" checked={!!data.embedEnabled} onChange={(e) => update('embedEnabled', e.target.checked)} />
              Embed Output
            </label>
          </div>

          {data.embedEnabled && (
            <>
              <div className="bl-field">
                <span className="bl-field-lbl">Color</span>
                <div className="bl-color-field">
                  <input type="color" className="bl-color-pick" value={data.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} />
                  <input type="text"  className="bl-node-input" value={data.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} spellCheck={false} style={{ flex: 1 }} />
                </div>
              </div>

              <div className="bl-node-divider" style={{ borderColor: '#2A3A4A' }} />
              <div className="bl-field">
                <span className="bl-field-lbl" style={{ color: '#4A8ACA' }}>▲ Logo (top-left)</span>
              </div>
              <div className="bl-field">
                <span className="bl-field-lbl">Logo URL</span>
                <input className="bl-node-input" value={data.logoUrl || ''} onChange={(e) => update('logoUrl', e.target.value)} placeholder="https://…icon.png" spellCheck={false} />
              </div>
              <div className="bl-field">
                <span className="bl-field-lbl">Logo Name</span>
                <input className="bl-node-input" value={data.logoName || ''} onChange={(e) => update('logoName', e.target.value)} placeholder="Bot name" spellCheck={false} />
              </div>

              <div className="bl-node-divider" style={{ borderColor: '#2A3A4A' }} />
              <div className="bl-field">
                <span className="bl-field-lbl" style={{ color: '#4A8ACA' }}>▬ Image (bottom)</span>
              </div>
              <div className="bl-field">
                <span className="bl-field-lbl">Image URL</span>
                <input className="bl-node-input" value={data.imageUrl || ''} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://…image.png" spellCheck={false} />
              </div>

              <div className="bl-field">
                <span className="bl-field-lbl">Footer</span>
                <input className="bl-node-input" value={data.embedFooter || ''} onChange={(e) => update('embedFooter', e.target.value)} placeholder="Footer text" spellCheck={false} />
              </div>
            </>
          )}

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
