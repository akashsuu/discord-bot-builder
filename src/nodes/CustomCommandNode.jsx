import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export default function CustomCommandNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const update = useCallback((key, val) => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: val } } : n));
  }, [id, setNodes]);

  return (
    <div className={`bl-node ${selected ? 'selected' : ''}`}>
      <div className="bl-node-hdr bl-hdr-command">
        <span className="bl-node-hdr-icon">💬</span>
        <span className="bl-node-hdr-title">Custom Command</span>
      </div>
      <div className="bl-node-body">
        <div className="bl-row bl-row-in">
          <Handle type="target" position={Position.Left} id="input" className="handle-gray" />
          <span className="bl-socket-label">Message</span>
        </div>

        <div className="bl-node-divider" />

        <div className="bl-field">
          <span className="bl-field-lbl">Command</span>
          <input
            className="bl-node-input"
            value={data.command || ''}
            onChange={(e) => update('command', e.target.value)}
            placeholder="!hello"
            spellCheck={false}
          />
        </div>

        <div className="bl-field">
          <span className="bl-field-lbl">Reply</span>
          <input
            className="bl-node-input"
            value={data.reply || ''}
            onChange={(e) => update('reply', e.target.value)}
            placeholder="Hello {user}!"
            spellCheck={false}
          />
          <span className="bl-field-hint">{'{user}  {args}  {tag}'}</span>
        </div>

        <div className="bl-node-divider" />

        <div className="bl-row bl-row-out">
          <span className="bl-socket-label">Pass-through</span>
          <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
        </div>
      </div>
    </div>
  );
}
