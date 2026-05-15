import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export default function EventMessageNode({ id, data, selected }) {
 const { setNodes } = useReactFlow();
 const collapsed = !!data.collapsed;

 const toggle = useCallback(() => {
 setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n));
 }, [id, setNodes]);

 return (
 <div className={`bl-node ${selected ? 'selected' : ''} ${collapsed ? 'bl-node-min' : ''}`}>
 <div className="bl-node-hdr bl-hdr-event">
 <button className="bl-collapse-btn" onClick={toggle} title={collapsed ? 'Expand' : 'Minimize'}>
 {collapsed ? '▶' : '▼'}
 </button>
 <span className="bl-node-hdr-icon">⚡</span>
 <span className="bl-node-hdr-title">Message Event</span>
 {collapsed && (
 <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
 )}
 </div>
 {!collapsed && (
 <div className="bl-node-body">
 <div className="bl-row bl-row-out">
 <span className="bl-socket-label">Message</span>
 <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
 </div>
 </div>
 )}
 </div>
 );
}
