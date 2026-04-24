import React from 'react';
import { Handle, Position } from 'reactflow';

export default function EventMessageNode({ selected }) {
  return (
    <div className={`bl-node ${selected ? 'selected' : ''}`}>
      <div className="bl-node-hdr bl-hdr-event">
        <span className="bl-node-hdr-icon">⚡</span>
        <span className="bl-node-hdr-title">Message Event</span>
      </div>
      <div className="bl-node-body">
        <div className="bl-row bl-row-out">
          <span className="bl-socket-label">Message</span>
          <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
        </div>
      </div>
    </div>
  );
}
