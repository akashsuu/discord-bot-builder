import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';

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
