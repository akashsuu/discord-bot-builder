import React, { useState, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';

function serializeNodes(nodes) {
  return nodes.map(({ id, type, position, data }) => ({ id, type, position, data }));
}

export default function Toolbar({ nodes, edges }) {
  const { projectData, projectPath, updateProject, botRunning, addLog } = useProject();
  const [tokenModal, setTokenModal]   = useState(false);
  const [prefixModal, setPrefixModal] = useState(false);
  const [saveState, setSaveState]     = useState('idle');
  const [runLoading, setRunLoading]   = useState(false);

  const payload = useCallback(() => ({
    ...projectData,
    nodes: serializeNodes(nodes),
    edges,
  }), [projectData, nodes, edges]);

  const handleSave = useCallback(async () => {
    if (!projectPath) return;
    setSaveState('saving');
    await window.electronAPI.saveProject({ projectPath, projectData: payload() });
    addLog('[System] Saved.');
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 1400);
  }, [projectPath, payload, addLog]);

  const handleRun = useCallback(async () => {
    if (botRunning || runLoading) return;
    if (!projectData?.token) { addLog('[Error] No token set. Click Token button.'); return; }
    setRunLoading(true);
    const r = await window.electronAPI.runBot({ projectData: payload() });
    setRunLoading(false);
    if (!r.success) addLog(`[Error] ${r.error}`);
  }, [botRunning, runLoading, projectData, payload, addLog]);

  const handleStop = useCallback(async () => {
    const r = await window.electronAPI.stopBot();
    if (!r.success) addLog(`[Error] ${r.error}`);
  }, [addLog]);

  const handleExport = useCallback(async () => {
    const r = await window.electronAPI.exportCode({ projectData: payload() });
    if (r.success) addLog(`[System] Exported → ${r.path}`);
    else if (r.error) addLog(`[Error] ${r.error}`);
  }, [payload, addLog]);

  const saveLabel = saveState === 'saving' ? '…' : saveState === 'saved' ? '✓ Saved' : '💾 Save';

  return (
    <>
      <div className="bl-header">
        <div className="bl-brand">
          <span className="bl-brand-icon">⚡</span>
          <span className="bl-brand-name">{projectData?.name || 'Bot Builder'}</span>
        </div>

        <div className="bl-header-sep" />

        <button
          className="bl-btn bl-btn-run"
          onClick={handleRun}
          disabled={botRunning || runLoading}
          title="Run Bot"
        >
          ▶ {runLoading ? '…' : 'Run'}
        </button>

        <button
          className="bl-btn bl-btn-stop"
          onClick={handleStop}
          disabled={!botRunning}
          title="Stop Bot"
        >
          ■ Stop
        </button>

        <div className="bl-header-sep" />

        <span className={`bl-status-label ${botRunning ? 'online' : ''}`}>
          <span className={`bl-status-dot ${botRunning ? 'online' : 'offline'}`} />
          {botRunning ? 'Online' : 'Offline'}
        </span>

        <div className="bl-header-fill" />

        <button className="bl-btn" onClick={handleSave} title="Save (Ctrl+S)">{saveLabel}</button>
        <button className="bl-btn" onClick={handleExport} title="Export bot.js">📦 Export</button>
        <button className="bl-btn bl-btn-token" onClick={() => setTokenModal(true)} title="Bot Token">🔑 Token</button>
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
        <p className="modal-desc">Stored locally in <code>project.json</code>. Never shared.</p>
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
          <button className="eye-btn" onClick={() => setShow((s) => !s)}>{show ? '🙈' : '👁️'}</button>
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
