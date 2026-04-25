import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export default function PluginNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const collapsed = !!data.collapsed;

  const update = useCallback((key, val) => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: val } } : n));
  }, [id, setNodes]);

  const toggle = useCallback(() => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n));
  }, [id, setNodes]);

  const fields = Object.entries(data).filter(([k]) => !k.startsWith('_') && k !== 'collapsed');

  return (
    <div className={`bl-node ${selected ? 'selected' : ''} ${collapsed ? 'bl-node-min' : ''}`}>
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

          {fields.length > 0 && <div className="bl-node-divider" />}

          {fields.map(([key, val]) => (
            <div key={key} className="bl-field">
              <span className="bl-field-lbl">{key}</span>
              <input className="bl-node-input" value={val || ''} onChange={(e) => update(key, e.target.value)} spellCheck={false} />
            </div>
          ))}

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
