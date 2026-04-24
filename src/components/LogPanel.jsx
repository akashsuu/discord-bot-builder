import React, { useEffect, useRef, useState } from 'react';
import { useProject } from '../context/ProjectContext';

export default function LogPanel() {
  const { logs, clearLogs } = useProject();
  const bottomRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getLogClass = (text) => {
    if (text.includes('[Error]')) return 'log-error';
    if (text.includes('[Bot]')) return 'log-bot';
    if (text.includes('[Engine]')) return 'log-engine';
    if (text.includes('[System]')) return 'log-system';
    return 'log-default';
  };

  return (
    <div className={`log-panel ${collapsed ? 'log-collapsed' : ''}`}>
      <div className="log-header">
        <div className="log-header-left">
          <button
            className="log-toggle"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand logs' : 'Collapse logs'}
          >
            {collapsed ? '▲' : '▼'}
          </button>
          <span className="log-title">Console</span>
          <span className="log-count">{logs.length} entries</span>
        </div>
        <div className="log-header-right">
          <label className="log-autoscroll">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
          <button className="log-clear-btn" onClick={clearLogs} title="Clear logs">
            🗑 Clear
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="log-body">
          {logs.length === 0 && (
            <p className="log-empty">No logs yet. Run your bot to see output here.</p>
          )}
          {logs.map((entry) => (
            <div key={entry.id} className={`log-line ${getLogClass(entry.text)}`}>
              <span className="log-time">{entry.time}</span>
              <span className="log-text">{entry.text}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
