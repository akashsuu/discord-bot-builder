import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

/**
 * Generic renderer for all plugin-registered node types.
 * Rendering config is stored in node.data._* fields (set when the node is created).
 * All non-underscore fields in node.data are rendered as editable inputs.
 */
export default function PluginNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const update = useCallback((key, val) => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: val } } : n));
  }, [id, setNodes]);

  // fields to render = all keys that don't start with '_'
  const fields = Object.entries(data).filter(([k]) => !k.startsWith('_'));

  return (
    <div className={`bl-node ${selected ? 'selected' : ''}`}>
      <div className="bl-node-hdr" style={{ background: data._color || '#2A2A3A' }}>
        <span className="bl-node-hdr-icon">{data._icon || '🔌'}</span>
        <span className="bl-node-hdr-title">{data._label || 'Plugin Node'}</span>
      </div>
      <div className="bl-node-body">
        {data._hasInput && (
          <div className="bl-row bl-row-in">
            <Handle type="target" position={Position.Left} id="input" className="handle-gray" />
            <span className="bl-socket-label">Message</span>
          </div>
        )}

        {fields.length > 0 && <div className="bl-node-divider" />}

        {fields.map(([key, val]) => (
          <div key={key} className="bl-field">
            <span className="bl-field-lbl">{key}</span>
            <input
              className="bl-node-input"
              value={val || ''}
              onChange={(e) => update(key, e.target.value)}
              spellCheck={false}
            />
          </div>
        ))}

        {data._hasOutput && (
          <>
            <div className="bl-node-divider" />
            <div className="bl-row bl-row-out">
              <span className="bl-socket-label">Pass-through</span>
              <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
