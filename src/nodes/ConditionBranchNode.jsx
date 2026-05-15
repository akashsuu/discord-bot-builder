import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

const CONDITIONS = ['starts_with', 'contains', 'equals'];

export default function ConditionBranchNode({ id, data, selected }) {
 const { setNodes } = useReactFlow();
 const collapsed = !!data.collapsed;

 const update = useCallback((key, val) => {
 setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: val } } : n));
 }, [id, setNodes]);

 const toggle = useCallback(() => {
 setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n));
 }, [id, setNodes]);

 return (
 <div className={`bl-node ${selected ? 'selected' : ''} ${collapsed ? 'bl-node-min' : ''}`}>
 <div className="bl-node-hdr bl-hdr-cond">
 <button className="bl-collapse-btn" onClick={toggle} title={collapsed ? 'Expand' : 'Minimize'}>
 {collapsed ? '▶' : '▼'}
 </button>
 <span className="bl-node-hdr-icon">🔀</span>
 <span className="bl-node-hdr-title">Condition Branch</span>
 {collapsed && (
 <>
 <Handle type="target" position={Position.Left} id="input" className="handle-gray" />
 <Handle type="source" position={Position.Right} id="true" className="handle-green" />
 <Handle type="source" position={Position.Right} id="false" className="handle-red" />
 </>
 )}
 </div>

 {!collapsed && (
 <div className="bl-node-body">
 <div className="bl-row bl-row-in">
 <Handle type="target" position={Position.Left} id="input" className="handle-gray" />
 <span className="bl-socket-label">Message</span>
 </div>

 <div className="bl-node-divider" />

 <div className="bl-field">
 <span className="bl-field-lbl">Condition</span>
 <select className="bl-node-select" value={data.condition || 'starts_with'} onChange={(e) => update('condition', e.target.value)}>
 {CONDITIONS.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
 </select>
 </div>

 <div className="bl-field">
 <span className="bl-field-lbl">Value</span>
 <input className="bl-node-input" value={data.value || ''} onChange={(e) => update('value', e.target.value)} placeholder="!test" spellCheck={false} />
 </div>

 <div className="bl-node-divider" />

 <div className="bl-branch-row">
 <span className="bl-branch-lbl bl-lbl-true">True</span>
 <Handle type="source" position={Position.Right} id="true" className="handle-green" />
 </div>
 <div className="bl-branch-row">
 <span className="bl-branch-lbl bl-lbl-false">False</span>
 <Handle type="source" position={Position.Right} id="false" className="handle-red" />
 </div>
 </div>
 )}
 </div>
 );
}
