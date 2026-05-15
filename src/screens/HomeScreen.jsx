import React from 'react';
import { useProject } from '../context/ProjectContext';

export default function HomeScreen() {
  const { setScreen, openProject, addLog } = useProject();

  const handleCreate = () => setScreen('create');

  const handleLoad = async () => {
    const result = await window.electronAPI.loadProject();
    if (result.success) {
      openProject(result.projectPath, result.projectData);
      // If token is missing, ask for it first
      if (!result.projectData.token) {
        setScreen('token');
      } else {
        setScreen('editor');
      }
    }
  };

  return (
    <div className="home-screen">
      <div className="home-content">
        <div className="home-logo">
          <img className="logo-icon-img" src="./kiodium.ico" alt="" aria-hidden="true" />
          <h1 className="home-title">Kiodium</h1>
          <p className="home-subtitle">Visual Discord bot builder</p>
        </div>

        <div className="home-buttons">
          <button className="btn-primary" onClick={handleCreate}>
            <span className="btn-icon">âœ¦</span>
            Create Project
          </button>
          <button className="btn-secondary" onClick={handleLoad}>
            <span className="btn-icon">ðŸ“‚</span>
            Load Project
          </button>
        </div>

        <div className="home-features">
          <div className="feature-card">
            <span className="feature-icon">ðŸŽ¨</span>
            <span>Visual node editor</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">â–¶</span>
            <span>Run bots live</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">ðŸ“¦</span>
            <span>Export real JS code</span>
          </div>
          <div className="feature-card">
            <span className="feature-icon">ðŸ”Œ</span>
            <span>Plugin system</span>
          </div>
        </div>
      </div>

      <footer className="home-footer">
        Kiodium. All rights reserved.
      </footer>
    </div>
  );
}
