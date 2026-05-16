import React from 'react';
import { useProject } from '../context/ProjectContext';

const DISCORD_URL = 'https://discord.gg/coquette';
const HELP_URL = 'https://akashsuu.oops.wtf/';

export default function HomeScreen() {
 const { setScreen, openProject } = useProject();

 const handleCreate = () => setScreen('create');

 const handleOpenExternal = async (url) => {
 const result = await window.electronAPI.openExternal(url);
 if (!result?.success) console.error('[HomeScreen] Could not open link:', result?.error);
 };

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

 <div className="home-actions">
 <div className="home-buttons">
 <button className="btn-primary" type="button" onClick={handleCreate}>
 <span className="btn-icon"></span>
 Create Project
 </button>
 <button className="btn-secondary" type="button" onClick={handleLoad}>
 <span className="btn-icon"></span>
 Load Project
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

 <footer className="home-footer">
 Kiodium. All rights reserved.
 </footer>
 </div>
 );
}
