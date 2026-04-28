import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export const CLIENT_EVENTS = [
  { value: 'ready', label: 'Ready' },
  { value: 'warn',  label: 'Warn'  },
];

export default function EventClientNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const collapsed = !!data.collapsed;

  const toggle = useCallback(() => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n));
  }, [id, setNodes]);

  const onChange = useCallback((val) => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, event: val } } : n));
  }, [id, setNodes]);

  const ev = data.event || 'ready';

  return (
    <div className={`bl-node ${selected ? 'selected' : ''} ${collapsed ? 'bl-node-min' : ''}`}>
      <div className="bl-node-hdr bl-hdr-client">
        <button className="bl-collapse-btn" onClick={toggle} title={collapsed ? 'Expand' : 'Minimize'}>
          {collapsed ? '▶' : '▼'}
        </button>
        <span className="bl-node-hdr-icon">🤖</span>
        <span className="bl-node-hdr-title">Client Event</span>
        {collapsed && (
          <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
        )}
      </div>
      {!collapsed && (
        <div className="bl-node-body">
          <div className="bl-field">
            <select className="bl-node-select" value={ev} onChange={(e) => onChange(e.target.value)}>
              {CLIENT_EVENTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div className="bl-row bl-row-out">
            <span className="bl-socket-label">Client</span>
            <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
          </div>
        </div>
      )}
    </div>
  );
}
