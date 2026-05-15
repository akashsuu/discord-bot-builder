import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export const EMOJI_EVENTS = [
 { value: 'emojiCreate', label: 'Emoji Create' },
 { value: 'emojiDelete', label: 'Emoji Delete' },
 { value: 'emojiUpdate', label: 'Emoji Update' },
];

export default function EventEmojiNode({ id, data, selected }) {
 const { setNodes } = useReactFlow();
 const collapsed = !!data.collapsed;

 const toggle = useCallback(() => {
 setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n));
 }, [id, setNodes]);

 const onChange = useCallback((val) => {
 setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, event: val } } : n));
 }, [id, setNodes]);

 const ev = data.event || 'emojiCreate';

 return (
 <div className={`bl-node ${selected ? 'selected' : ''} ${collapsed ? 'bl-node-min' : ''}`}>
 <div className="bl-node-hdr bl-hdr-emoji">
 <button className="bl-collapse-btn" onClick={toggle} title={collapsed ? 'Expand' : 'Minimize'}>
 {collapsed ? '▶' : '▼'}
 </button>
 <span className="bl-node-hdr-icon">😀</span>
 <span className="bl-node-hdr-title">Emoji Event</span>
 {collapsed && (
 <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
 )}
 </div>
 {!collapsed && (
 <div className="bl-node-body">
 <div className="bl-field">
 <select
 className="bl-node-select nodrag nopan"
 value={ev}
 onChange={(e) => onChange(e.target.value)}
 >
 {EMOJI_EVENTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
 </select>
 </div>
 <div className="bl-row bl-row-out">
 <span className="bl-socket-label">Emoji</span>
 <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
 </div>
 </div>
 )}
 </div>
 );
}
