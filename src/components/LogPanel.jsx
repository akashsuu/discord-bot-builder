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

  return (
    <aside
      className={`absolute bottom-4 left-4 right-[340px] z-50 bg-[#111111] border border-[#303030] rounded-xl shadow-2xl flex flex-col transition-all duration-200 overflow-hidden nodrag ${
        collapsed ? 'h-9' : 'h-60'
      }`}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {/* Console Header */}
      <div className="flex items-center px-3.5 h-9 bg-[#161616] border-b border-[#242424] shrink-0 select-none">
        <button
          type="button"
          className="flex items-center justify-center w-5 h-5 mr-2 text-[10px] text-zinc-400 hover:text-zinc-100 hover:bg-[#252525] rounded transition-colors"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand Console' : 'Collapse Console'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
        <span className="text-xs font-semibold tracking-wide text-zinc-200">Terminal &amp; Logs</span>
        <span className="ml-2.5 bg-[#202020] border border-[#353535] px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400">
          {logs.length}
        </span>
        <div className="flex-1" />
        <label className="flex items-center text-[10px] text-zinc-400 mr-4 cursor-pointer hover:text-zinc-200">
          <input
            type="checkbox"
            className="mr-1.5 accent-zinc-400"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          Auto-scroll
        </label>
        <button
          type="button"
          className="cq-btn-ghost text-[10px] px-2 py-1 hover:text-red-300"
          onClick={clearLogs}
          title="Clear Logs"
        >
          ✕ Clear
        </button>
      </div>

      {/* Console Log Output */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed bg-[#0d0d0d]">
          {logs.length === 0 && (
            <div className="text-zinc-500 italic text-center mt-6">
              No logs yet. Run your bot to stream server events.
            </div>
          )}
          {logs.map((entry) => {
            const isErr = entry.text.includes('[Error]');
            const isBot = entry.text.includes('[Bot]');
            const isSys = entry.text.includes('[System]');
            return (
              <div
                key={entry.id}
                className="flex items-start mb-0.5 hover:bg-[#161616] px-2 py-0.5 rounded transition-colors"
              >
                <span className="text-zinc-500 w-20 shrink-0 select-none text-[10px]">{entry.time}</span>
                <span
                  className={`flex-1 break-words ${
                    isErr
                      ? 'text-[#ed9999] font-medium'
                      : isBot
                      ? 'text-[#a3d9b1]'
                      : isSys
                      ? 'text-[#e4c78b]'
                      : 'text-[#d4d4d8]'
                  }`}
                >
                  {entry.text}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </aside>
  );
}
