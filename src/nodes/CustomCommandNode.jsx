import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export default function CustomCommandNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const update = useCallback((key, value) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n
      )
    );
  }, [id, setNodes]);

  return (
    <div className={`custom-node node-command ${selected ? 'node-selected' : ''}`}>
      <div className="node-header node-header-command">
        <span className="node-icon">💬</span>
        <span className="node-label">Custom Command</span>
      </div>

      <div className="node-body">
        <div className="node-socket-row input-row">
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            className="handle-input"
          />
          <span className="socket-label">message</span>
        </div>

        <div className="node-field">
          <label className="field-label">Command</label>
          <input
            className="node-input"
            value={data.command || ''}
            onChange={(e) => update('command', e.target.value)}
            placeholder="!hello"
            spellCheck={false}
          />
        </div>

        <div className="node-field">
          <label className="field-label">Reply</label>
          <input
            className="node-input"
            value={data.reply || ''}
            onChange={(e) => update('reply', e.target.value)}
            placeholder="Hello {user}!"
            spellCheck={false}
          />
          <span className="field-hint">Use {'{user}'} or {'{args}'}</span>
        </div>

        <div className="node-socket-row output-row">
          <span className="socket-label">pass-through</span>
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
