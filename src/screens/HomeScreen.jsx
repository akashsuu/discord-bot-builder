import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import LoadProjectModal from '../components/LoadProjectModal';
import logoIcon from '../assets/coquetteflow-icon.png';
import logoWordmark from '../assets/coquetteflow-wordmark.png';

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
        <div className="home-logo flex flex-col items-center text-center">
          <img
            src={logoIcon}
            alt="CoquetteFlow Logo"
            className="w-16 h-16 rounded-2xl mb-5 object-contain shadow-[0_12px_36px_rgba(0,0,0,0.9)] border border-[#353535]"
          />
          <img
            src={logoWordmark}
            alt="CoquetteFlow"
            className="h-20 sm:h-24 md:h-28 w-auto max-w-[360px] mb-4 object-contain filter drop-shadow-[0_14px_35px_rgba(0,0,0,0.9)] select-none"
          />
          <p className="home-subtitle text-xs text-[#a0a0a0] font-sans">
            Minimalist Node-Based Discord Bot Builder
          </p>
        </div>

        <div className="home-actions">
          <div className="home-buttons">
            <button className="cq-btn-primary flex-1 justify-center py-2.5" type="button" onClick={handleCreate}>
              <span className="text-sm">+</span>
              Create Bot Project
            </button>
            <button className="cq-btn-secondary flex-1 justify-center py-2.5" type="button" onClick={() => setLoadModalOpen(true)}>
              My Projects
            </button>
          </div>

          <div className="home-link-buttons">
            <button className="cq-btn-secondary flex-1 justify-center text-xs py-2" type="button" onClick={() => handleOpenExternal(DISCORD_URL)}>
              Discord Community
            </button>
            <button className="cq-btn-secondary flex-1 justify-center text-xs py-2" type="button" onClick={() => handleOpenExternal(HELP_URL)}>
              Documentation
            </button>
          </div>
        </div>
      </div>

      <LoadProjectModal
        isOpen={loadModalOpen}
        onClose={() => setLoadModalOpen(false)}
      />

      <footer className="home-footer font-mono">
        CoquetteFlow • Visual Discord Bot Development Platform
      </footer>
    </div>
  );
}
