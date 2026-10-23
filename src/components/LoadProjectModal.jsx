import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';

export default function LoadProjectModal({ isOpen, onClose }) {
  const { openProject, setScreen } = useProject();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await window.electronAPI.listProjects();
      setProjects(res || []);
    } catch (err) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = async (projectId) => {
    setActionLoading(true);
    try {
      const result = await window.electronAPI.loadProject(projectId);
      if (result.success) {
        openProject(result.projectPath, result.projectData);
        onClose();
        if (!result.projectData.token) {
          setScreen('token');
        } else {
          setScreen('editor');
        }
      } else {
        setError(result.error || 'Failed to load project');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (e, projectId, projectName) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${projectName}"? This cannot be undone.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await window.electronAPI.deleteProject(projectId);
      await fetchProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionLoading(true);
    setError('');
    try {
      const text = await file.text();
      const projectData = JSON.parse(text);
      if (!projectData || typeof projectData !== 'object') {
        throw new Error('Invalid project file: expected a JSON object');
      }
      const res = await window.electronAPI.importProject(projectData);
      if (res.success && res.project) {
        openProject(res.project.id, res.project);
        onClose();
        setScreen(res.project.token ? 'editor' : 'token');
      } else {
        setError(res.error || 'Failed to import project');
      }
    } catch (err) {
      setError(`Failed to import file: ${err.message}`);
    } finally {
      setActionLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[3000] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#141414] border border-[#353535] rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#242424]">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              🤖 Saved Bot Projects
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Select a bot to load into the visual editor or run on your server.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 text-lg px-2 py-1 rounded-lg hover:bg-[#222222] transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-2">
          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Loading projects from server...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-[#2a2a2a] rounded-xl">
              <p className="text-sm text-zinc-400 font-medium">No projects found</p>
              <p className="text-xs text-zinc-600 mt-1 mb-4">
                Create a new bot or import an existing project.json file to get started.
              </p>
              <button
                className="cq-btn-primary"
                onClick={() => {
                  onClose();
                  setScreen('create');
                }}
              >
                + Create First Bot
              </button>
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handleSelect(proj.id)}
                className="group flex items-center justify-between p-3.5 rounded-xl border border-[#262626] bg-[#111111] hover:bg-[#1a1a1a] hover:border-[#454545] cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1c1c1c] border border-[#333333] flex items-center justify-center text-zinc-200 font-bold text-sm">
                    {proj.name?.charAt(0)?.toUpperCase() || 'B'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                        {proj.name}
                      </span>
                      {proj.botRunning ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Offline
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-3 font-mono">
                      <span>Prefix: <code className="text-zinc-400">{proj.prefix || '!'}</code></span>
                      <span>•</span>
                      <span>{proj.nodeCount || 0} nodes</span>
                      {proj.updatedAt && (
                        <>
                          <span>•</span>
                          <span>Updated {new Date(proj.updatedAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(e, proj.id, proj.name)}
                    disabled={actionLoading}
                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                    title="Delete Project"
                  >
                    🗑️
                  </button>
                  <span className="text-xs text-zinc-400 font-medium group-hover:translate-x-0.5 transition-transform">
                    Open →
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-[#242424] flex items-center justify-between gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={actionLoading}
            className="cq-btn-secondary text-xs"
          >
            📁 Import project.json
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cq-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                setScreen('create');
              }}
              className="cq-btn-primary text-xs"
            >
              + New Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
