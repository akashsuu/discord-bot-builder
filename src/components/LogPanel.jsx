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
    if (text.includes('[Error]'))  return 'bl-log-error';
    if (text.includes('[Bot]'))    return 'bl-log-bot';
    if (text.includes('[Engine]')) return 'bl-log-engine';
    if (text.includes('[System]')) return 'bl-log-system';
    return 'bl-log-default';
  };

  return (
    <div className={`bl-console ${collapsed ? 'collapsed' : ''}`}>
      <div className="bl-console-hdr">
        <button className="bl-console-toggle" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? '▲' : '▼'}
        </button>
        <span className="bl-console-title">Console</span>
        <span className="bl-console-count">{logs.length}</span>
        <div className="bl-console-fill" />
        <label className="bl-console-autoscroll">
          <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
          &nbsp;Scroll
        </label>
        <button className="bl-console-clear" onClick={clearLogs} title="Clear">✕ Clear</button>
      </div>

      {!collapsed && (
        <div className="bl-console-body">
          {logs.length === 0 && (
            <div className="bl-console-empty">No output. Run your bot to see logs.</div>
          )}
          {logs.map((entry) => (
            <div key={entry.id} className={`bl-log-line ${logClass(entry.text)}`}>
              <span className="bl-log-time">{entry.time}</span>
              <span className="bl-log-text">{entry.text}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
