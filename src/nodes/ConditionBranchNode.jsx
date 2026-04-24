import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

const CONDITIONS = ['starts_with', 'contains', 'equals'];

export default function ConditionBranchNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const update = useCallback((key, value) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n
      )
    );
  }, [id, setNodes]);

  return (
    <div className={`custom-node node-condition ${selected ? 'node-selected' : ''}`}>
      <div className="node-header node-header-condition">
        <span className="node-icon">🔀</span>
        <span className="node-label">Condition Branch</span>
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
          <label className="field-label">Condition</label>
          <select
            className="node-select"
            value={data.condition || 'starts_with'}
            onChange={(e) => update('condition', e.target.value)}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="node-field">
          <label className="field-label">Value</label>
          <input
            className="node-input"
            value={data.value || ''}
            onChange={(e) => update('value', e.target.value)}
            placeholder="!test"
            spellCheck={false}
          />
        </div>

        <div className="branch-outputs">
          <div className="branch-row">
            <span className="branch-label true-label">✓ True</span>
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              className="handle-true"
              style={{ top: '65%' }}
            />
          </div>
          <div className="branch-row">
            <span className="branch-label false-label">✗ False</span>
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              className="handle-false"
              style={{ top: '80%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
