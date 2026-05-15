import React, { useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { demoSub, varHint, BUILTIN_VARS, PLUGIN_VARS } from '../utils/variables';

export default function CustomCommandNode({ id, data, selected }) {
 const { setNodes } = useReactFlow();
 const collapsed = !!data.collapsed;

 const update = useCallback((key, val) => {
 setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: val } } : n));
 }, [id, setNodes]);

 const toggle = useCallback(() => {
 setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n));
 }, [id, setNodes]);

 const apiPreview = demoSub(data.apiReply || data.reply || '{apiResult}', {
 ...data,
 apiResult: 'Example API result',
 result: 'Example API result',
 apiStatus: '200',
 apiStatusText: 'OK',
 apiOk: 'true',
 });

 return (
 <div className={`bl-node ${selected ? 'selected' : ''} ${collapsed ? 'bl-node-min' : ''}`} style={{ minWidth: 220 }}>
 <div className="bl-node-hdr bl-hdr-command">
 <button className="bl-collapse-btn" onClick={toggle} title={collapsed ? 'Expand' : 'Minimize'}>
 {collapsed ? '▶' : '▼'}
 </button>
 <span className="bl-node-hdr-icon">💬</span>
 <span className="bl-node-hdr-title">Custom Command</span>
 {collapsed && (
 <>
 <Handle type="target" position={Position.Left} id="input" className="handle-gray" />
 <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
 </>
 )}
 </div>

 {!collapsed && (
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
 <span className="bl-field-lbl">{data.apiEnabled ? 'Fallback Reply' : 'Reply'}</span>
 <textarea
 className="bl-node-textarea"
 value={data.reply || ''}
 onChange={(e) => update('reply', e.target.value)}
 placeholder="Hello {user}!"
 rows={2}
 spellCheck={false}
 />
 <span className="bl-field-hint">{varHint(BUILTIN_VARS)}</span>
 </div>

 <div className="bl-node-divider" />
 <div className="bl-field">
 <label className="bl-embed-toggle">
 <input type="checkbox" checked={!!data.apiEnabled} onChange={(e) => update('apiEnabled', e.target.checked)} />
 API Request
 </label>
 <span className="bl-field-hint">Call any REST API, then reply with API variables.</span>
 </div>

 {data.apiEnabled && (
 <>
 <div className="bl-field">
 <span className="bl-field-lbl">Method</span>
 <select className="bl-node-input" value={data.apiMethod || 'GET'} onChange={(e) => update('apiMethod', e.target.value)}>
 <option value="GET">GET</option>
 <option value="POST">POST</option>
 <option value="PUT">PUT</option>
 <option value="PATCH">PATCH</option>
 <option value="DELETE">DELETE</option>
 </select>
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">API URL</span>
 <textarea
 className="bl-node-textarea"
 value={data.apiUrl || ''}
 onChange={(e) => update('apiUrl', e.target.value)}
 placeholder="https://api.example.com/search?q={args}"
 rows={2}
 spellCheck={false}
 />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Headers</span>
 <textarea
 className="bl-node-textarea"
 value={data.apiHeaders || ''}
 onChange={(e) => update('apiHeaders', e.target.value)}
 placeholder={'Accept: application/json\nAuthorization: Bearer YOUR_KEY'}
 rows={2}
 spellCheck={false}
 />
 </div>
 {!['GET', 'HEAD'].includes(data.apiMethod || 'GET') && (
 <div className="bl-field">
 <span className="bl-field-lbl">Body</span>
 <textarea
 className="bl-node-textarea"
 value={data.apiBody || ''}
 onChange={(e) => update('apiBody', e.target.value)}
 placeholder={'{"prompt":"{args}","user":"{user}"}'}
 rows={3}
 spellCheck={false}
 />
 </div>
 )}
 <div className="bl-field">
 <span className="bl-field-lbl">Result Path</span>
 <input
 className="bl-node-input"
 value={data.apiResultPath || ''}
 onChange={(e) => update('apiResultPath', e.target.value)}
 placeholder="data.0.name or choices.0.message.content"
 spellCheck={false}
 />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">API Reply</span>
 <textarea
 className="bl-node-textarea"
 value={data.apiReply || ''}
 onChange={(e) => update('apiReply', e.target.value)}
 placeholder="{apiResult}"
 rows={2}
 spellCheck={false}
 />
 <span className="bl-field-hint">{varHint(['args', 'arg0', 'apiResult', 'apiStatus', 'apiOk', 'apiError'])}</span>
 </div>
 </>
 )}

 {/* Output preview */}
 {(data.reply || data.apiEnabled) && (
 <div className="bl-out-preview">
 <div className="bl-out-preview-lbl">Output preview</div>
 {data.apiEnabled ? apiPreview : demoSub(data.reply, data) || <span className="bl-out-preview-empty">empty</span>}
 </div>
 )}

 {/* Embed section */}
 <div className="bl-node-divider" />
 <div className="bl-field">
 <label className="bl-embed-toggle">
 <input type="checkbox" checked={!!data.embedEnabled} onChange={(e) => update('embedEnabled', e.target.checked)} />
 Embed Reply
 </label>
 </div>

 {data.embedEnabled && (
 <>
 <div className="bl-field">
 <span className="bl-field-lbl">Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} />
 <input type="text" className="bl-node-input" value={data.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Image URL</span>
 <input className="bl-node-input" value={data.imageUrl || ''} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://…" spellCheck={false} />
 </div>
 {data.imageUrl && (
 <div className="bl-field">
 <span className="bl-field-lbl">Position</span>
 <div className="bl-img-pos-row">
 <button className={`bl-img-pos-btn ${(data.imagePosition || 'image') === 'image' ? 'active' : ''}`} onClick={() => update('imagePosition', 'image')}>▬ Bottom</button>
 <button className={`bl-img-pos-btn ${data.imagePosition === 'thumbnail' ? 'active' : ''}`} onClick={() => update('imagePosition', 'thumbnail')}>▪ Top-Right</button>
 </div>
 </div>
 )}
 </>
 )}

 {data.apiEnabled && (
 <div className="bl-field">
 <span className="bl-field-hint">{varHint(PLUGIN_VARS.slice(0, 28))}</span>
 </div>
 )}

 <div className="bl-node-divider" />
 <div className="bl-row bl-row-out">
 <span className="bl-socket-label">Pass-through</span>
 <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
 </div>
 </div>
 )}
 </div>
 );
}
