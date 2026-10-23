import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import LoadProjectModal from '../components/LoadProjectModal';

const DISCORD_URL = 'https://discord.gg/coquette';
const HELP_URL = 'https://akashsuu.oops.wtf/';

export default function HomeScreen() {
  const { setScreen } = useProject();
  const [loadModalOpen, setLoadModalOpen] = useState(false);

  const handleCreate = () => setScreen('create');

  const handleOpenExternal = async (url) => {
    const result = await window.electronAPI.openExternal(url);
    if (!result?.success) console.error('[HomeScreen] Could not open link:', result?.error);
  };

  return (
    <div className="home-screen">
      <div className="home-content">
        <div className="home-logo">
          <img className="logo-icon-img" src="./kiodium.ico" alt="" aria-hidden="true" />
          <h1 className="home-title">Kiodium</h1>
          <p className="home-subtitle">Visual Discord Bot Builder — Web Edition</p>
        </div>

        <div className="home-actions">
          <div className="home-buttons">
            <button className="btn-primary" type="button" onClick={handleCreate}>
              <span className="btn-icon">+</span>
              Create Project
            </button>
            <button className="btn-secondary" type="button" onClick={() => setLoadModalOpen(true)}>
              <span className="btn-icon">📂</span>
              My Projects
            </button>
          </div>

          <div className="home-link-buttons">
            <button className="btn-secondary" type="button" onClick={() => handleOpenExternal(DISCORD_URL)}>
              Discord
            </button>
            <button className="btn-secondary" type="button" onClick={() => handleOpenExternal(HELP_URL)}>
              Help Website
            </button>
          </div>
        </div>
      </div>

      <LoadProjectModal
        isOpen={loadModalOpen}
        onClose={() => setLoadModalOpen(false)}
      />

      <footer className="home-footer">
        Kiodium Bot Builder • Hosted Online
      </footer>
    </div>
  );
}
