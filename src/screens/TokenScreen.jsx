import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';

export default function TokenScreen() {
  const { projectData, projectPath, updateProject, setScreen } = useProject();
  const [token, setToken] = useState(projectData?.token || '');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!token.trim()) {
      setError('Token cannot be empty.');
      return;
    }

    setSaving(true);
    const updated = { ...projectData, token: token.trim() };
    await window.electronAPI.saveProject({ projectPath, projectData: updated });
    updateProject({ token: token.trim() });
    setSaving(false);
    setScreen('editor');
  };

  const handleSkip = () => setScreen('editor');

  return (
    <div className="centered-screen">
      <div className="form-card">
        <h2 className="form-title">🔑 Discord Bot Token</h2>
        <p className="form-hint">
          Enter your bot token from the{' '}
          <span className="link-text">Discord Developer Portal</span>.
          It is stored only in your local <code>project.json</code>.
        </p>

        <div className="token-input-wrap">
          <input
            className="form-input"
            type={show ? 'text' : 'password'}
            placeholder="Paste your bot token here…"
            value={token}
            onChange={(e) => { setToken(e.target.value); setError(''); }}
            autoFocus
            spellCheck={false}
          />
          <button
            className="token-toggle"
            onClick={() => setShow((s) => !s)}
            title={show ? 'Hide token' : 'Show token'}
          >
            {show ? '🙈' : '👁️'}
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="token-actions">
          <button className="btn-ghost" onClick={handleSkip}>Skip for now</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save & Open Editor'}
          </button>
        </div>

        <p className="token-warning">
          ⚠ Never share your token with anyone.
        </p>
      </div>
    </div>
  );
}
