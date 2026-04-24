import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export default function SendMessageNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const update = useCallback((key, value) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n
      )
    );
  }, [id, setNodes]);

  return (
    <div className={`custom-node node-action ${selected ? 'node-selected' : ''}`}>
      <div className="node-header node-header-action">
        <span className="node-icon">📤</span>
        <span className="node-label">Send Message</span>
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
          <label className="field-label">Text</label>
          <textarea
            className="node-textarea"
            value={data.text || ''}
            onChange={(e) => update('text', e.target.value)}
            placeholder="Hello {user}!"
            rows={3}
            spellCheck={false}
          />
          <span className="field-hint">Use {'{user}'} or {'{args}'}</span>
        </div>
      </div>
    </div>
  );
}
