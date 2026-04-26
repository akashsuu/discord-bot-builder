import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

// Substitute all known demo + field-based variables
function pluginPreview(template, data) {
  return (template || '')
    .replace(/\{target\}/g,  'OwO#8456')
    .replace(/\{latency\}/g, '42')
    .replace(/\{reason\}/g,  data.reason  || 'No reason provided')
    .replace(/\{command\}/g, data.command || '!command')
    .replace(/\{user\}/g,    'Akashsuu')
    .replace(/\{args\}/g,    'world')
    .replace(/\{tag\}/g,     'Akashsuu#0000')
    .replace(/\{channel\}/g, 'general');
}

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

  // Separate output field from other input fields
  const inputFields  = Object.entries(data).filter(([k]) => !k.startsWith('_') && k !== 'collapsed' && k !== 'output');
  const hasOutput    = 'output' in data;
  const previewText  = hasOutput ? pluginPreview(data.output, data) : null;

  return (
    <div className={`bl-node ${selected ? 'selected' : ''} ${collapsed ? 'bl-node-min' : ''}`} style={{ minWidth: 210 }}>
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

          {/* Input fields (command, reason, etc.) */}
          {inputFields.length > 0 && <div className="bl-node-divider" />}
          {inputFields.map(([key, val]) => (
            <div key={key} className="bl-field">
              <span className="bl-field-lbl">{key}</span>
              <input
                className="bl-node-input"
                value={val || ''}
                onChange={(e) => update(key, e.target.value)}
                spellCheck={false}
              />
            </div>
          ))}

          {/* Output message template */}
          {hasOutput && (
            <>
              <div className="bl-node-divider" />
              <div className="bl-field">
                <span className="bl-field-lbl" style={{ color: '#6AAA4A' }}>Output Message</span>
                <textarea
                  className="bl-node-textarea"
                  style={{ borderColor: '#2A4A1A', minHeight: 52 }}
                  value={data.output || ''}
                  onChange={(e) => update('output', e.target.value)}
                  spellCheck={false}
                  rows={3}
                />
                <span className="bl-field-hint">
                  {'{target}  {reason}  {latency}  {user}  {command}'}
                </span>
              </div>

              {/* Live output preview */}
              {previewText && (
                <div className="bl-out-preview">
                  <div className="bl-out-preview-lbl">Output preview</div>
                  {previewText}
                </div>
              )}
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
