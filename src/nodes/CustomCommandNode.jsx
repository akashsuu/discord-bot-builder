import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { demoSub, varHint, BUILTIN_VARS, PLUGIN_VARS } from '../utils/variables';

function NodeSelect({ value, onChange, options }) {
 const [open, setOpen] = useState(false);
 const wrapRef = useRef(null);
 const pointerHandledRef = useRef(false);
 const current = options.find((option) => option.value === value) || options[0];

 useEffect(() => {
 if (!open) return undefined;
 const close = (event) => {
 if (!wrapRef.current?.contains(event.target)) setOpen(false);
 };
 document.addEventListener('pointerdown', close, true);
 return () => document.removeEventListener('pointerdown', close, true);
 }, [open]);

 const stop = (event) => {
 event.preventDefault();
 event.stopPropagation();
 event.nativeEvent?.stopImmediatePropagation?.();
 };

 const toggleOpenFromPointer = (event) => {
 stop(event);
 pointerHandledRef.current = true;
 setOpen((next) => !next);
 };

 const handleTriggerClick = (event) => {
 stop(event);
 if (pointerHandledRef.current) {
 pointerHandledRef.current = false;
 return;
 }
 setOpen((next) => !next);
 };

 const chooseFromPointer = (event, nextValue) => {
 stop(event);
 pointerHandledRef.current = true;
 onChange(nextValue);
 setOpen(false);
 };

 return (
 <div
 ref={wrapRef}
 className="bl-plugin-select nodrag nopan nowheel"
 onPointerDown={(e) => e.stopPropagation()}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 >
 <button
 type="button"
 className="bl-plugin-select-trigger"
 onPointerDown={toggleOpenFromPointer}
 onMouseDown={stop}
 onClick={handleTriggerClick}
 >
 <span>{current?.label || value}</span>
 <span className="bl-plugin-select-arrow">v</span>
 </button>
 {open && (
 <div className="bl-plugin-select-menu">
 {options.map((option) => (
 <button
 key={option.value}
 type="button"
 className={`bl-plugin-select-option ${option.value === value ? 'selected' : ''}`}
 onPointerDown={(e) => chooseFromPointer(e, option.value)}
 onMouseDown={stop}
 onClick={(e) => {
 stop(e);
 if (pointerHandledRef.current) {
 pointerHandledRef.current = false;
 return;
 }
 onChange(option.value);
 setOpen(false);
 }}
 >
 {option.label}
 </button>
 ))}
 </div>
 )}
 </div>
 );
}

function stopControlEvent(event) {
 event.stopPropagation();
 event.nativeEvent?.stopImmediatePropagation?.();
}

export default function CustomCommandNode({ id, data, selected }) {
 const { setNodes } = useReactFlow();
 const collapsed = !!data.collapsed;
 const collapsePointerHandledRef = useRef(false);
 const apiTogglePointerHandledRef = useRef(false);
 const embedTogglePointerHandledRef = useRef(false);

 const update = useCallback((key, val) => {
 setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: val } } : n));
 }, [id, setNodes]);

 const toggle = useCallback(() => {
 setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n));
 }, [id, setNodes]);

 const handleCollapsePointerDown = useCallback((event) => {
 event.preventDefault();
 event.stopPropagation();
 collapsePointerHandledRef.current = true;
 toggle();
 }, [toggle]);

 const handleCollapseClick = useCallback((event) => {
 event.preventDefault();
 event.stopPropagation();
 if (collapsePointerHandledRef.current) {
 collapsePointerHandledRef.current = false;
 return;
 }
 toggle();
 }, [toggle]);

 const toggleApiRequest = useCallback(() => {
 update('apiEnabled', !data.apiEnabled);
 }, [data.apiEnabled, update]);

 const handleApiRequestPointerDown = useCallback((event) => {
 event.preventDefault();
 event.stopPropagation();
 event.nativeEvent?.stopImmediatePropagation?.();
 apiTogglePointerHandledRef.current = true;
 toggleApiRequest();
 }, [toggleApiRequest]);

 const handleApiRequestClick = useCallback((event) => {
 event.preventDefault();
 event.stopPropagation();
 event.nativeEvent?.stopImmediatePropagation?.();
 if (apiTogglePointerHandledRef.current) {
 apiTogglePointerHandledRef.current = false;
 return;
 }
 toggleApiRequest();
 }, [toggleApiRequest]);

 const handleApiRequestKeyDown = useCallback((event) => {
 if (event.key !== ' ' && event.key !== 'Enter') return;
 event.preventDefault();
 event.stopPropagation();
 event.nativeEvent?.stopImmediatePropagation?.();
 toggleApiRequest();
 }, [toggleApiRequest]);

 const toggleEmbedReply = useCallback(() => {
 update('embedEnabled', !data.embedEnabled);
 }, [data.embedEnabled, update]);

 const handleEmbedReplyPointerDown = useCallback((event) => {
 event.preventDefault();
 event.stopPropagation();
 event.nativeEvent?.stopImmediatePropagation?.();
 embedTogglePointerHandledRef.current = true;
 toggleEmbedReply();
 }, [toggleEmbedReply]);

 const handleEmbedReplyKeyDown = useCallback((event) => {
 if (event.key !== ' ' && event.key !== 'Enter') return;
 event.preventDefault();
 event.stopPropagation();
 event.nativeEvent?.stopImmediatePropagation?.();
 toggleEmbedReply();
 }, [toggleEmbedReply]);

 const handleEmbedReplyClick = useCallback((event) => {
 event.preventDefault();
 event.stopPropagation();
 event.nativeEvent?.stopImmediatePropagation?.();
 if (embedTogglePointerHandledRef.current) {
 embedTogglePointerHandledRef.current = false;
 return;
 }
 toggleEmbedReply();
 }, [toggleEmbedReply]);

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
 <button
 className="bl-collapse-btn nodrag nopan"
 onPointerDown={handleCollapsePointerDown}
 onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
 onClick={handleCollapseClick}
 title={collapsed ? 'Expand' : 'Minimize'}
 >
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
 className="bl-node-input nodrag nopan nowheel"
 value={data.command || ''}
 onChange={(e) => update('command', e.target.value)}
 onPointerDown={stopControlEvent}
 onMouseDown={stopControlEvent}
 onClick={stopControlEvent}
 onKeyDown={stopControlEvent}
 placeholder="!hello"
 spellCheck={false}
 />
 </div>

 <div className="bl-field">
 <span className="bl-field-lbl">{data.apiEnabled ? 'Fallback Reply' : 'Reply'}</span>
 <textarea
 className="bl-node-textarea nodrag nopan nowheel"
 value={data.reply || ''}
 onChange={(e) => update('reply', e.target.value)}
 onPointerDown={stopControlEvent}
 onMouseDown={stopControlEvent}
 onClick={stopControlEvent}
 onKeyDown={stopControlEvent}
 placeholder="Hello {user}!"
 rows={2}
 spellCheck={false}
 />
 <span className="bl-field-hint">{varHint(BUILTIN_VARS)}</span>
 </div>

 <div className="bl-node-divider" />
 <div className="bl-field">
 <button
 type="button"
 className="bl-embed-toggle bl-check-toggle nodrag nopan nowheel"
 role="checkbox"
 aria-checked={!!data.apiEnabled}
 onPointerDown={handleApiRequestPointerDown}
 onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
 onClick={handleApiRequestClick}
 onKeyDown={handleApiRequestKeyDown}
 >
 <span className={`bl-check-box ${data.apiEnabled ? 'checked' : ''}`} aria-hidden="true" />
 <span>API Request</span>
 </button>
 <span className="bl-field-hint">Call any REST API, then reply with API variables.</span>
 </div>

 {data.apiEnabled && (
 <>
 <div className="bl-field">
 <span className="bl-field-lbl">Method</span>
 <NodeSelect
 value={data.apiMethod || 'GET'}
 onChange={(nextValue) => update('apiMethod', nextValue)}
 options={[
 { value: 'GET', label: 'GET' },
 { value: 'POST', label: 'POST' },
 { value: 'PUT', label: 'PUT' },
 { value: 'PATCH', label: 'PATCH' },
 { value: 'DELETE', label: 'DELETE' },
 ]}
 />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">API URL</span>
 <textarea
 className="bl-node-textarea nodrag nopan nowheel"
 value={data.apiUrl || ''}
 onChange={(e) => update('apiUrl', e.target.value)}
 onPointerDown={stopControlEvent}
 onMouseDown={stopControlEvent}
 onClick={stopControlEvent}
 onKeyDown={stopControlEvent}
 placeholder="https://api.example.com/search?q={args}"
 rows={2}
 spellCheck={false}
 />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Headers</span>
 <textarea
 className="bl-node-textarea nodrag nopan nowheel"
 value={data.apiHeaders || ''}
 onChange={(e) => update('apiHeaders', e.target.value)}
 onPointerDown={stopControlEvent}
 onMouseDown={stopControlEvent}
 onClick={stopControlEvent}
 onKeyDown={stopControlEvent}
 placeholder={'Accept: application/json\nAuthorization: Bearer YOUR_KEY'}
 rows={2}
 spellCheck={false}
 />
 </div>
 {!['GET', 'HEAD'].includes(data.apiMethod || 'GET') && (
 <div className="bl-field">
 <span className="bl-field-lbl">Body</span>
 <textarea
 className="bl-node-textarea nodrag nopan nowheel"
 value={data.apiBody || ''}
 onChange={(e) => update('apiBody', e.target.value)}
 onPointerDown={stopControlEvent}
 onMouseDown={stopControlEvent}
 onClick={stopControlEvent}
 onKeyDown={stopControlEvent}
 placeholder={'{"prompt":"{args}","user":"{user}"}'}
 rows={3}
 spellCheck={false}
 />
 </div>
 )}
 <div className="bl-field">
 <span className="bl-field-lbl">Result Path</span>
 <input
 className="bl-node-input nodrag nopan nowheel"
 value={data.apiResultPath || ''}
 onChange={(e) => update('apiResultPath', e.target.value)}
 onPointerDown={stopControlEvent}
 onMouseDown={stopControlEvent}
 onClick={stopControlEvent}
 onKeyDown={stopControlEvent}
 placeholder="data.0.name or choices.0.message.content"
 spellCheck={false}
 />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">API Reply</span>
 <textarea
 className="bl-node-textarea nodrag nopan nowheel"
 value={data.apiReply || ''}
 onChange={(e) => update('apiReply', e.target.value)}
 onPointerDown={stopControlEvent}
 onMouseDown={stopControlEvent}
 onClick={stopControlEvent}
 onKeyDown={stopControlEvent}
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
 <button
 type="button"
 className="bl-embed-toggle bl-check-toggle nodrag nopan nowheel"
 role="checkbox"
 aria-checked={!!data.embedEnabled}
 onPointerDown={handleEmbedReplyPointerDown}
 onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
 onClick={handleEmbedReplyClick}
 onKeyDown={handleEmbedReplyKeyDown}
 >
 <span className={`bl-check-box ${data.embedEnabled ? 'checked' : ''}`} aria-hidden="true" />
 <span>Embed Reply</span>
 </button>
 </div>

 {data.embedEnabled && (
 <>
 <div className="bl-field">
 <span className="bl-field-lbl">Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick nodrag nopan nowheel" value={data.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} onPointerDown={stopControlEvent} onMouseDown={stopControlEvent} onClick={stopControlEvent} />
 <input type="text" className="bl-node-input nodrag nopan nowheel" value={data.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} onPointerDown={stopControlEvent} onMouseDown={stopControlEvent} onClick={stopControlEvent} onKeyDown={stopControlEvent} spellCheck={false} style={{ flex: 1 }} />
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
