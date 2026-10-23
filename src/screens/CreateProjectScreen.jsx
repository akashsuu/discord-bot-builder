import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import logoIcon from '../assets/coquetteflow-icon.png';
import logoWordmark from '../assets/coquetteflow-wordmark.png';

export default function CreateProjectScreen() {
  const { setScreen, openProject } = useProject();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Project name is required.');
      return;
    }
    if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
      setError('Name may only contain letters, numbers, spaces, _ or -');
      return;
    }

    setLoading(true);
    setError('');

    const result = await window.electronAPI.createProject(trimmed);
    setLoading(false);

    if (result.success) {
      openProject(result.projectPath, result.projectData);
      setScreen('token');
    } else if (result.error) {
      setError(result.error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') setScreen('home');
  };

  return (
    <div className="centered-screen">
      <div className="form-card">
        <button className="back-btn" onClick={() => setScreen('home')}>← Back</button>

        <div className="flex items-center gap-2 mb-3">
          <img src={logoIcon} alt="CoquetteFlow" className="w-5 h-5 rounded object-contain shrink-0" />
          <img src={logoWordmark} alt="CoquetteFlow" className="h-3.5 object-contain opacity-90" />
        </div>

        <h2 className="form-title">New Project</h2>
        <p className="form-hint">Choose a name for your bot project.</p>

        <input
          className="form-input"
          type="text"
          placeholder="e.g. My Awesome Bot"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          autoFocus
          maxLength={50}
        />

        {error && <p className="form-error">{error}</p>}

        <button className="btn-primary full-width" onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating…' : 'Create Project'}
        </button>
      </div>
    </div>
  );
}
