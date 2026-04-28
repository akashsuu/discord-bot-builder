import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export const GUILD_EVENTS = [
  { value: 'guildCreate',    label: 'Guild Join' },
  { value: 'guildDelete',    label: 'Guild Leave' },
  { value: 'guildUpdate',    label: 'Guild Update' },
  { value: 'guildAvailable', label: 'Guild Available' },
];

export default function EventGuildNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const collapsed = !!data.collapsed;

  const toggle = useCallback(() => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n));
  }, [id, setNodes]);

  const onChange = useCallback((val) => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, event: val } } : n));
  }, [id, setNodes]);

  const ev = data.event || 'guildCreate';

  return (
    <div className={`bl-node ${selected ? 'selected' : ''} ${collapsed ? 'bl-node-min' : ''}`}>
      <div className="bl-node-hdr bl-hdr-guild">
        <button className="bl-collapse-btn" onClick={toggle} title={collapsed ? 'Expand' : 'Minimize'}>
          {collapsed ? '▶' : '▼'}
        </button>
        <span className="bl-node-hdr-icon">🏰</span>
        <span className="bl-node-hdr-title">Guild Event</span>
        {collapsed && (
          <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
        )}
      </div>
      {!collapsed && (
        <div className="bl-node-body">
          <div className="bl-field">
            <select className="bl-node-select" value={ev} onChange={(e) => onChange(e.target.value)}>
              {GUILD_EVENTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div className="bl-row bl-row-out">
            <span className="bl-socket-label">Guild</span>
            <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
          </div>
        </div>
      )}
    </div>
  );
}
