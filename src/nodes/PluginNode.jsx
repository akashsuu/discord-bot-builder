import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

function pluginPreview(template, data) {
  const d = data || {};
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
    // Command
    .replace(/\{command\}/g,       d.command || '!command')
    .replace(/\{args\}/g,          'hello world')
    .replace(/\{reason\}/g,        d.reason  || 'No reason provided')
    // Server / channel
    .replace(/\{server\}/g,        'My Server')
    .replace(/\{channel\}/g,       'general')
    .replace(/\{memberCount\}/g,   '1,234')
    // Utility
    .replace(/\{latency\}/g,       '42')
    .replace(/\{date\}/g,          '2026-05-05')
    .replace(/\{time\}/g,          '12:00:00');
}

// internal keys managed by the embed section — not rendered as plain inputs
const EMBED_KEYS = new Set(['embedEnabled', 'embedColor', 'logoUrl', 'logoName', 'imageUrl', 'embedFooter']);

export default function PluginNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const collapsed = !!data.collapsed;

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

  const inputFields = Object.entries(data).filter(
    ([k]) => !k.startsWith('_') && k !== 'collapsed' && k !== 'output' && !EMBED_KEYS.has(k)
  );
  const hasOutput   = 'output' in data;
  const previewText = hasOutput ? pluginPreview(data.output, data) : null;

  return (
    <div className={`bl-node ${selected ? 'selected' : ''} ${collapsed ? 'bl-node-min' : ''}`} style={{ minWidth: 220 }}>
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

          {/* ── Command / input fields ── */}
          {inputFields.length > 0 && <div className="bl-node-divider" />}
          {inputFields.map(([key, val]) => (
            <div key={key} className="bl-field">
              <span className="bl-field-lbl">{key}</span>
              <input className="bl-node-input" value={val || ''} onChange={(e) => update(key, e.target.value)} spellCheck={false} />
            </div>
          ))}

          {/* ── Output message template ── */}
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
                <span className="bl-field-hint">{'{target}  {reason}  {latency}  {user}  {command}'}</span>
              </div>
              {previewText && (
                <div className="bl-out-preview">
                  <div className="bl-out-preview-lbl">Output preview</div>
                  {previewText}
                </div>
              )}
            </>
          )}

          {/* ── Embed section ── */}
          <div className="bl-node-divider" />
          <div className="bl-field">
            <label className="bl-embed-toggle">
              <input type="checkbox" checked={!!data.embedEnabled} onChange={(e) => update('embedEnabled', e.target.checked)} />
              Embed Output
            </label>
          </div>

          {data.embedEnabled && (
            <>
              {/* Embed color */}
              <div className="bl-field">
                <span className="bl-field-lbl">Color</span>
                <div className="bl-color-field">
                  <input type="color" className="bl-color-pick" value={data.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} />
                  <input type="text"  className="bl-node-input" value={data.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} spellCheck={false} style={{ flex: 1 }} />
                </div>
              </div>

              {/* Top-left logo */}
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

              {/* Bottom image */}
              <div className="bl-node-divider" style={{ borderColor: '#2A3A4A' }} />
              <div className="bl-field">
                <span className="bl-field-lbl" style={{ color: '#4A8ACA' }}>▬ Image (bottom)</span>
              </div>
              <div className="bl-field">
                <span className="bl-field-lbl">Image URL</span>
                <input className="bl-node-input" value={data.imageUrl || ''} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://…image.png" spellCheck={false} />
              </div>

              {/* Footer */}
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
