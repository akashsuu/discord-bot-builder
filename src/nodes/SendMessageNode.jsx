import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export default function SendMessageNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();

  const update = useCallback((key, val) => {
    setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: val } } : n));
  }, [id, setNodes]);

  return (
    <div className={`bl-node ${selected ? 'selected' : ''}`} style={{ minWidth: 220 }}>
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

        {/* ── Embed section ── */}
        <div className="bl-node-divider" />
        <div className="bl-field">
          <label className="bl-embed-toggle">
            <input type="checkbox" checked={!!data.embedEnabled} onChange={(e) => update('embedEnabled', e.target.checked)} />
            Embed Output
          </label>
        </div>

        {data.embedEnabled && (
          <>
            <div className="bl-field">
              <span className="bl-field-lbl">Color</span>
              <div className="bl-color-field">
                <input
                  type="color"
                  className="bl-color-pick"
                  value={data.embedColor || '#5865F2'}
                  onChange={(e) => update('embedColor', e.target.value)}
                />
                <input
                  type="text"
                  className="bl-node-input"
                  value={data.embedColor || '#5865F2'}
                  onChange={(e) => update('embedColor', e.target.value)}
                  spellCheck={false}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className="bl-field">
              <span className="bl-field-lbl">Title</span>
              <input
                className="bl-node-input"
                value={data.embedTitle || ''}
                onChange={(e) => update('embedTitle', e.target.value)}
                placeholder="Optional title"
                spellCheck={false}
              />
            </div>

            <div className="bl-field">
              <span className="bl-field-lbl">Image URL</span>
              <input
                className="bl-node-input"
                value={data.imageUrl || ''}
                onChange={(e) => update('imageUrl', e.target.value)}
                placeholder="https://…"
                spellCheck={false}
              />
            </div>

            {data.imageUrl && (
              <div className="bl-field">
                <span className="bl-field-lbl">Position</span>
                <div className="bl-img-pos-row">
                  <button
                    className={`bl-img-pos-btn ${(data.imagePosition || 'image') === 'image' ? 'active' : ''}`}
                    onClick={() => update('imagePosition', 'image')}
                    title="Large rectangle at bottom of embed"
                  >▬ Bottom</button>
                  <button
                    className={`bl-img-pos-btn ${data.imagePosition === 'thumbnail' ? 'active' : ''}`}
                    onClick={() => update('imagePosition', 'thumbnail')}
                    title="Small square at top-right of embed"
                  >▪ Top-Right</button>
                </div>
              </div>
            )}

            <div className="bl-field">
              <span className="bl-field-lbl">Footer</span>
              <input
                className="bl-node-input"
                value={data.embedFooter || ''}
                onChange={(e) => update('embedFooter', e.target.value)}
                placeholder="Optional footer text"
                spellCheck={false}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
