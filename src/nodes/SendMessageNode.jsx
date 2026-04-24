import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export default function SendMessageNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const update = useCallback((key, val) => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: val } } : n));
  }, [id, setNodes]);

  return (
    <div className={`bl-node ${selected ? 'selected' : ''}`}>
      <div className="bl-node-hdr bl-hdr-action">
        <span className="bl-node-hdr-icon">📤</span>
        <span className="bl-node-hdr-title">Send Message</span>
      </div>
      <div className="bl-node-body">
        <div className="bl-row bl-row-in">
          <Handle type="target" position={Position.Left} id="input" className="handle-gray" />
          <span className="bl-socket-label">Message</span>
        </div>

        <div className="bl-node-divider" />

        <div className="bl-field">
          <span className="bl-field-lbl">Text</span>
          <textarea
            className="bl-node-textarea"
            value={data.text || ''}
            onChange={(e) => update('text', e.target.value)}
            placeholder="Hello {user}!"
            rows={3}
            spellCheck={false}
          />
          <span className="bl-field-hint">{'{user}  {args}  {tag}  {channel}'}</span>
        </div>
      </div>
    </div>
  );
}
