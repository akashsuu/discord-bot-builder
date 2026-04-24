import React, { useState, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';

function serializeNodes(nodes) {
  return nodes.map(({ id, type, position, data }) => ({ id, type, position, data }));
}

export default function Toolbar({ nodes, edges }) {
  const {
    projectData, projectPath, updateProject,
    botRunning, addLog,
  } = useProject();

  const [tokenModal, setTokenModal] = useState(false);
  const [savingState, setSavingState] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [runLoading, setRunLoading] = useState(false);

  const getPayload = useCallback(() => ({
    ...projectData,
    nodes: serializeNodes(nodes),
    edges,
  }), [projectData, nodes, edges]);

  const handleSave = useCallback(async () => {
    if (!projectPath) return;
    setSavingState('saving');
    try {
      await window.electronAPI.saveProject({
        projectPath,
        projectData: getPayload(),
      });
      addLog('[System] Project saved.');
      setSavingState('saved');
      setTimeout(() => setSavingState('idle'), 1500);
    } catch {
      setSavingState('idle');
    }
  }, [projectPath, getPayload, addLog]);

  const handleRun = useCallback(async () => {
    if (botRunning || runLoading) return;
    if (!projectData?.token) {
      addLog('[Error] No bot token set. Use the Token button to add one.');
      return;
    }
    setRunLoading(true);
    const result = await window.electronAPI.runBot({ projectData: getPayload() });
    setRunLoading(false);
    if (!result.success) addLog(`[Error] ${result.error}`);
  }, [botRunning, runLoading, projectData, getPayload, addLog]);

  const handleStop = useCallback(async () => {
    const result = await window.electronAPI.stopBot();
    if (!result.success) addLog(`[Error] ${result.error}`);
  }, [addLog]);

  const handleExport = useCallback(async () => {
    const result = await window.electronAPI.exportCode({ projectData: getPayload() });
    if (result.success) {
      addLog(`[System] Code exported → ${result.path}`);
    } else if (result.error) {
      addLog(`[Error] Export: ${result.error}`);
    }
  }, [getPayload, addLog]);

  const saveLabel = savingState === 'saving' ? '…' : savingState === 'saved' ? '✓ Saved' : '💾 Save';

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-brand">
          <span className="toolbar-logo">⚡</span>
          <span className="toolbar-project-name">{projectData?.name || 'Bot Builder'}</span>
        </div>

        <div className="toolbar-center">
          <button
            className={`tb-btn run-btn ${botRunning || runLoading ? 'tb-disabled' : ''}`}
            onClick={handleRun}
            disabled={botRunning || runLoading}
            title="Run Bot (requires token)"
          >
            {runLoading ? '…' : '▶ Run Bot'}
          </button>

          <button
            className={`tb-btn stop-btn ${!botRunning ? 'tb-disabled' : ''}`}
            onClick={handleStop}
            disabled={!botRunning}
            title="Stop Bot"
          >
            ⏹ Stop Bot
          </button>

          <div className={`bot-badge ${botRunning ? 'badge-online' : 'badge-offline'}`}>
            <span className="badge-dot" />
            {botRunning ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="toolbar-right">
          <button className="tb-btn" onClick={handleSave} title="Save project (Ctrl+S)">
            {saveLabel}
          </button>
          <button className="tb-btn" onClick={handleExport} title="Export as bot.js">
            📦 Export
          </button>
          <button className="tb-btn token-btn" onClick={() => setTokenModal(true)} title="Set bot token">
            🔑 Token
          </button>
        </div>
      </div>

      {tokenModal && <TokenModal onClose={() => setTokenModal(false)} />}
    </>
  );
}

function TokenModal({ onClose }) {
  const { projectData, projectPath, updateProject } = useProject();
  const [token, setToken] = useState(projectData?.token || '');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updated = { ...projectData, token: token.trim() };
    await window.electronAPI.saveProject({ projectPath, projectData: updated });
    updateProject({ token: token.trim() });
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">🔑 Bot Token</h3>
        <p className="modal-desc">
          Stored locally in <code>project.json</code>. Never shared.
        </p>
        <div className="token-row">
          <input
            className="modal-input"
            type={show ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your Discord bot token…"
            spellCheck={false}
            autoFocus
          />
          <button className="eye-btn" onClick={() => setShow((s) => !s)}>
            {show ? '🙈' : '👁️'}
          </button>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Token'}
          </button>
        </div>
      </div>
    </div>
  );
}
