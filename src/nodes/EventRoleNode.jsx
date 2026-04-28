import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export const ROLE_EVENTS = [
  { value: 'roleCreate', label: 'Role Create' },
  { value: 'roleDelete', label: 'Role Delete' },
  { value: 'roleUpdate', label: 'Role Update' },
];

export default function EventRoleNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const collapsed = !!data.collapsed;

  const toggle = useCallback(() => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n));
  }, [id, setNodes]);

  const onChange = useCallback((val) => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, event: val } } : n));
  }, [id, setNodes]);

  const ev = data.event || 'roleCreate';

  return (
    <div className={`bl-node ${selected ? 'selected' : ''} ${collapsed ? 'bl-node-min' : ''}`}>
      <div className="bl-node-hdr bl-hdr-role">
        <button className="bl-collapse-btn" onClick={toggle} title={collapsed ? 'Expand' : 'Minimize'}>
          {collapsed ? '▶' : '▼'}
        </button>
        <span className="bl-node-hdr-icon">🎭</span>
        <span className="bl-node-hdr-title">Role Event</span>
        {collapsed && (
          <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
        )}
      </div>
      {!collapsed && (
        <div className="bl-node-body">
          <div className="bl-field">
            <select className="bl-node-select" value={ev} onChange={(e) => onChange(e.target.value)}>
              {ROLE_EVENTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div className="bl-row bl-row-out">
            <span className="bl-socket-label">Role</span>
            <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
          </div>
        </div>
      )}
    </div>
  );
}
