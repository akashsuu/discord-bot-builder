import React, { useEffect, useRef, useState } from 'react';
import { useProject } from '../context/ProjectContext';

export default function LogPanel() {
 const { logs, clearLogs } = useProject();
 const bottomRef = useRef(null);
 const [collapsed, setCollapsed] = useState(false);
 const [autoScroll, setAutoScroll] = useState(true);

 useEffect(() => {
 if (autoScroll && !collapsed && bottomRef.current) {
 bottomRef.current.scrollIntoView({ behavior: 'smooth' });
 }
 }, [logs, autoScroll, collapsed]);

 const logClass = (text) => {
 if (text.includes('[Error]')) return 'bl-log-error';
 if (text.includes('[Bot]')) return 'bl-log-bot';
 if (text.includes('[Engine]')) return 'bl-log-engine';
 if (text.includes('[System]')) return 'bl-log-system';
 return 'bl-log-default';
 };

 return (
 <div className={`absolute bottom-4 left-4 right-[340px] z-50 glass-panel flex flex-col transition-all duration-300 overflow-hidden ${collapsed ? 'h-10' : 'h-64'}`}>
 <div className="flex items-center px-4 h-10 border-b border-purple-900/40 shrink-0 select-none bg-gradient-to-r from-purple-500/20 to-fuchsia-500/10">
 <button className="flex items-center justify-center w-6 h-6 mr-2 text-[10px] text-zinc-500 hover:text-zinc-200 hover:bg-black/60 rounded transition-colors" onClick={() => setCollapsed((c) => !c)}>
 {collapsed ? '▲' : '▼'}
 </button>
 <span className="text-xs font-semibold tracking-wide text-zinc-300">Console</span>
 <span className="ml-3 bg-black/60 border border-purple-900/40 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400">{logs.length}</span>
 <div className="flex-1" />
 <label className="flex items-center text-[10px] text-zinc-400 mr-4 cursor-pointer hover:text-zinc-200">
 <input type="checkbox" className="mr-1.5 accent-purple-500" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
 Auto-scroll
 </label>
 <button className="text-[10px] font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 px-2 py-1 rounded transition-colors" onClick={clearLogs} title="Clear Logs">✕ Clear</button>
 </div>

 {!collapsed && (
 <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed custom-scrollbar">
 {logs.length === 0 && (
 <div className="text-zinc-500 italic text-center mt-6">No output. Run your bot to see logs.</div>
 )}
 {logs.map((entry) => {
 const isErr = entry.text.includes('[Error]');
 const isBot = entry.text.includes('[Bot]');
 const isSys = entry.text.includes('[System]');
 return (
 <div key={entry.id} className="flex items-start mb-1 hover:bg-black/40 px-2 py-1 rounded border border-transparent hover:border-purple-900/30 transition-colors">
 <span className="text-zinc-500 w-20 shrink-0 select-none">{entry.time}</span>
 <span className={`flex-1 break-words ${isErr ? 'text-rose-400 font-semibold' : isBot ? 'text-emerald-400' : isSys ? 'text-purple-400' : 'text-zinc-300'}`}>{entry.text}</span>
 </div>
 );
 })}
 <div ref={bottomRef} />
 </div>
 )}
 </div>
 );
}
