import React, { useState, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import LoadProjectModal from './LoadProjectModal';

function serializeNodes(nodes) {
  return nodes.map(({ id, type, position, data }) => ({ id, type, position, data }));
}

export default function Toolbar({ nodes, edges }) {
  const { projectData, projectPath, updateProject, botRunning, botInfo, addLog, setScreen } = useProject();
  const [tokenModal, setTokenModal] = useState(false);
  const [prefixModal, setPrefixModal] = useState(false);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [runLoading, setRunLoading] = useState(false);

  const payload = useCallback(() => ({
    ...projectData,
    nodes: serializeNodes(nodes),
    edges,
  }), [projectData, nodes, edges]);

  const handleSave = useCallback(async () => {
    if (!projectPath) return;
    setSaveState('saving');
    await window.electronAPI.saveProject({ projectPath, projectData: payload() });
    addLog('[System] Project saved to server.');
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 1400);
  }, [projectPath, payload, addLog]);

  const handleRun = useCallback(async () => {
    if (botRunning || runLoading) return;
    if (!projectData?.token) {
      addLog('[Error] No token set. Click Token button.');
      setTokenModal(true);
      return;
    }
    setRunLoading(true);
    addLog('[System] Starting Discord bot...');
    const r = await window.electronAPI.runBot({ projectData: payload(), projectPath });
    setRunLoading(false);
    if (!r.success) addLog(`[Error] ${r.error}`);
  }, [botRunning, runLoading, projectData, projectPath, payload, addLog]);

  const handleStop = useCallback(async () => {
    const r = await window.electronAPI.stopBot(projectPath);
    if (!r.success) addLog(`[Error] ${r.error}`);
  }, [projectPath, addLog]);

  const handleExportCode = useCallback(async () => {
    setExportMenuOpen(false);
    const r = await window.electronAPI.exportCode({ projectData: payload() });
    if (r.success) addLog(`[System] Exported ${r.path}`);
    else if (r.error) addLog(`[Error] ${r.error}`);
  }, [payload, addLog]);

  const handleExportJson = useCallback(() => {
    setExportMenuOpen(false);
    if (window.electronAPI?.exportProjectJson) {
      window.electronAPI.exportProjectJson(payload());
      addLog('[System] Exported project.json backup.');
    }
  }, [payload, addLog]);

  const toggleFullscreen = useCallback(() => {
    window.electronAPI?.toggleMaximizeWindow?.();
  }, []);

  const saveLabel = saveState === 'saving' ? '...' : saveState === 'saved' ? '✓ Saved' : '💾 Save';

  return (
    <>
      <div className="h-14 flex items-center px-4 gap-3 bg-black/50 backdrop-blur-md border-b border-purple-900/40 z-50 select-none shadow-sm">
        {/* Logo & Project Title */}
        <div className="flex items-center gap-2 mr-2">
          <img className="w-6 h-6 rounded shadow-[0_0_10px_rgba(139,92,246,0.2)] cursor-pointer" src="./kiodium.ico" alt="" onClick={() => setScreen('home')} title="Home" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-100 tracking-tight flex items-center gap-1.5">
              {projectData?.name || 'Kiodium Bot'}
              {botInfo?.tag && (
                <span className="text-[10px] text-purple-400 font-mono font-normal">
                  (@{botInfo.tag})
                </span>
              )}
            </span>
          </div>
        </div>

        <button
          className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-[11px] font-medium transition-all border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 active:scale-95"
          onClick={() => setProjectsModalOpen(true)}
          title="Switch or manage projects"
        >
          📂 Projects
        </button>

        <div className="w-px h-5 bg-zinc-800 mx-1" />

        {/* Bot Controls */}
        <button
          className="h-8 px-4 flex items-center gap-2 rounded-lg text-[11px] font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-900/50 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 hover:border-emerald-700/60 active:scale-95"
          onClick={handleRun}
          disabled={botRunning || runLoading}
          title="Start Bot on Server"
        >
          ▶ {runLoading ? 'Starting...' : 'Run'}
        </button>

        <button
          className="h-8 px-4 flex items-center gap-2 rounded-lg text-[11px] font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border border-rose-900/50 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 hover:border-rose-700/60 active:scale-95"
          onClick={handleStop}
          disabled={!botRunning}
          title="Stop Bot on Server"
        >
          ⏹ Stop
        </button>

        <div className="w-px h-5 bg-purple-900/40 mx-1" />

        {/* Bot Status Indicator */}
        <span className={`text-[10px] flex items-center gap-2 font-medium ${botRunning ? 'text-emerald-400' : 'text-zinc-500'}`}>
          <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${botRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600 shadow-none'}`} />
          {botRunning ? 'Online (Hosted)' : 'Offline'}
        </span>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            className="h-8 px-3 flex items-center justify-center rounded-lg text-[11px] font-medium transition-all border border-purple-900/40 bg-black/60 text-zinc-300 hover:bg-purple-900/20 hover:text-zinc-100 hover:border-purple-500/40 active:scale-95 shadow-[0_0_10px_rgba(139,92,246,0.05)]"
            onClick={handleSave}
            title="Save changes to server (Ctrl+S)"
          >
            {saveLabel}
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              className="h-8 px-3 flex items-center gap-1 rounded-lg text-[11px] font-medium transition-all border border-purple-900/40 bg-black/60 text-zinc-300 hover:bg-purple-900/20 hover:text-zinc-100 hover:border-purple-500/40 active:scale-95 shadow-[0_0_10px_rgba(139,92,246,0.05)]"
              onClick={() => setExportMenuOpen((o) => !o)}
              title="Export Options"
            >
              📥 Export ▾
            </button>

            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 top-10 w-48 bg-zinc-900 border border-purple-900/60 rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <button
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-900/30 text-zinc-200 hover:text-purple-200 transition flex items-center gap-2"
                    onClick={handleExportCode}
                  >
                    <span>📜</span>
                    <div>
                      <div className="font-medium">Export bot.js</div>
                      <div className="text-[10px] text-zinc-500">Standalone JS code</div>
                    </div>
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-900/30 text-zinc-200 hover:text-purple-200 transition flex items-center gap-2"
                    onClick={handleExportJson}
                  >
                    <span>💾</span>
                    <div>
                      <div className="font-medium">Export project.json</div>
                      <div className="text-[10px] text-zinc-500">Complete bot backup</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            className="h-8 px-3 flex items-center justify-center rounded-lg text-[11px] font-medium transition-all border border-amber-900/40 bg-amber-950/20 text-amber-500 hover:bg-amber-900/40 hover:text-amber-400 active:scale-95 shadow-sm"
            onClick={() => setTokenModal(true)}
            title="Bot Token"
          >
            🔑 Token
          </button>

          <button
            className="h-8 px-3 flex items-center justify-center rounded-lg text-[11px] font-medium transition-all border border-purple-900/40 bg-black/60 text-zinc-300 hover:bg-purple-900/20 hover:text-zinc-100 hover:border-purple-500/40 active:scale-95 shadow-[0_0_10px_rgba(139,92,246,0.05)]"
            onClick={() => setPrefixModal(true)}
            title="Global command prefix"
          >
            Prefix ({projectData?.prefix || '!'})
          </button>
        </div>

        {/* Web Utilities */}
        <div className="ml-2 flex items-center gap-1.5">
          <button
            className="w-9 h-8 flex items-center justify-center rounded-lg text-[12px] font-semibold transition-all border border-zinc-800 bg-black/50 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100 active:scale-95"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            ⛶
          </button>
          <button
            className="w-9 h-8 flex items-center justify-center rounded-lg text-[12px] font-semibold transition-all border border-zinc-800 bg-black/50 text-zinc-400 hover:bg-purple-950/40 hover:border-purple-800 hover:text-purple-300 active:scale-95"
            onClick={() => setScreen('home')}
            title="Go to Home"
          >
            🏠
          </button>
        </div>
      </div>

      {tokenModal && <TokenModal onClose={() => setTokenModal(false)} />}
      {prefixModal && <PrefixModal onClose={() => setPrefixModal(false)} />}
      <LoadProjectModal
        isOpen={projectsModalOpen}
        onClose={() => setProjectsModalOpen(false)}
      />
    </>
  );
}

function PrefixModal({ onClose }) {
  const { projectData, projectPath, updateProject } = useProject();
  const [prefix, setPrefix] = useState(projectData?.prefix ?? '!');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const nextPrefix = prefix.trim() || '!';
    const updated = { ...projectData, prefix: nextPrefix };
    await window.electronAPI.saveProject({ projectPath, projectData: updated });
    updateProject({ prefix: nextPrefix });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-sm glass-panel p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-purple-100 mb-2">⚡ Command Prefix</h3>
        <p className="text-[11px] text-purple-200/60 mb-4 leading-relaxed">
          A global prefix prepended to all command names (e.g. <code className="bg-purple-900/30 border border-purple-800/30 px-1 py-0.5 rounded text-purple-300 font-mono text-[10px]">!</code> turns <code className="bg-purple-900/30 border border-purple-800/30 px-1 py-0.5 rounded text-purple-300 font-mono text-[10px]">ping</code> into <code className="bg-purple-900/30 border border-purple-800/30 px-1 py-0.5 rounded text-purple-300 font-mono text-[10px]">!ping</code>).
          Leave blank to use full command strings per node.
        </p>
        <div className="mb-6">
          <input
            className="w-full bg-black/50 border border-purple-900/40 rounded-xl px-4 py-2.5 text-xs text-zinc-200 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-zinc-600 shadow-inner"
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="e.g. ! or ? or $"
            spellCheck={false}
            autoFocus
            maxLength={8}
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          <button className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all active:scale-95 disabled:opacity-50" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Prefix'}
          </button>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-[400px] glass-panel p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-purple-100 mb-2">🔑 Bot Token</h3>
        <p className="text-[11px] text-purple-200/60 mb-4 leading-relaxed">
          Stored securely in your bot project on the server. Used by the server to run your bot.
        </p>
        <div className="relative mb-6">
          <input
            className="w-full bg-black/50 border border-purple-900/40 rounded-xl pl-4 pr-10 py-2.5 text-xs text-zinc-200 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-zinc-600 font-mono shadow-inner"
            type={show ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your Discord bot token..."
            spellCheck={false}
            autoFocus
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-purple-300 hover:bg-purple-900/30 rounded-lg transition-colors" onClick={() => setShow((s) => !s)}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all active:scale-95 disabled:opacity-50" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Token'}
          </button>
        </div>
      </div>
    </div>
  );
}
