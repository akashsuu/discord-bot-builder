import React, { useState } from 'react';
import { NODE_PALETTE } from '../nodes/nodeTypes';

export default function NodePalette() {
 const [search, setSearch] = useState('');

 const filtered = NODE_PALETTE.filter(
 (n) =>
 n.label.toLowerCase().includes(search.toLowerCase()) ||
 n.description.toLowerCase().includes(search.toLowerCase())
 );

 const onDragStart = (event, nodeType) => {
 event.dataTransfer.setData('application/reactflow', nodeType);
 event.dataTransfer.effectAllowed = 'move';
 };

 return (
 <aside className="node-palette">
 <div className="palette-header">
 <span className="palette-title">Nodes</span>
 </div>

 <input
 className="palette-search"
 type="text"
 placeholder="Search nodes…"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />

 <div className="palette-list">
 {filtered.map((node) => (
 <div
 key={node.type}
 className="palette-item"
 draggable
 onDragStart={(e) => onDragStart(e, node.type)}
 title={node.description}
 style={{ '--node-accent': node.color }}
 >
 <div className="palette-item-accent" style={{ background: node.color }} />
 <div className="palette-item-content">
 <span className="palette-item-icon">{node.icon}</span>
 <div className="palette-item-text">
 <span className="palette-item-label">{node.label}</span>
 <span className="palette-item-desc">{node.description}</span>
 </div>
 </div>
 </div>
 ))}

 {filtered.length === 0 && (
 <p className="palette-empty">No nodes match "{search}"</p>
 )}
 </div>

 <div className="palette-hint">
 Drag a node onto the canvas
 </div>
 </aside>
 );
}
