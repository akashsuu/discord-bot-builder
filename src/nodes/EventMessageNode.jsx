import React from 'react';
import { Handle, Position } from 'reactflow';

export default function EventMessageNode({ data, selected }) {
  return (
    <div className={`custom-node node-event ${selected ? 'node-selected' : ''}`}>
      <div className="node-header node-header-event">
        <span className="node-icon">⚡</span>
        <span className="node-label">Message Event</span>
      </div>
      <div className="node-body">
        <p className="node-desc">Fires on every message received.</p>
        <div className="node-socket-row output-row">
          <span className="socket-label">message</span>
          <Handle
            type="source"
            position={Position.Right}
            id="output"
            className="handle-output"
          />
        </div>
      </div>
    </div>
  );
}
