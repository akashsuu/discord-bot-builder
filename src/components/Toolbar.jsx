import React, { useState, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import LoadProjectModal from './LoadProjectModal';
import logoIcon from '../assets/coquetteflow-icon.png';

function serializeNodes(nodes) {
  return nodes.map(({ id, type, position, data }) => ({ id, type, position, data }));
}

export default function Toolbar({
  nodes = [],
  edges = [],
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAddNode,
  onClearCanvas,
  showLeftSidebar = true,
  onToggleLeftSidebar,
  showNPanel = true,
  onToggleNPanel,
}) {
  const { projectData, projectPath, updateProject, botRunning, botInfo, addLog, setScreen } = useProject();
  const [tokenModal, setTokenModal] = useState(false);
  const [prefixModal, setPrefixModal] = useState(false);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
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
      addLog('[Error] No token set. Click Token in Settings.');
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

  const saveLabel = saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? '✓ Saved' : 'Save';

  return (
    <>
      <header className="cq-floating-toolbar-wrapper nodrag" onContextMenu={(e) => e.stopPropagation()}>
        <div className="cq-floating-toolbar">
          {/* Left section: Logo & Project Brand */}
          <div className="flex items-center gap-2.5 pr-2 border-r border-[#2d2d2d]">
            <button
              type="button"
              className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 text-inherit hover:opacity-85 transition"
              onClick={() => setScreen('home')}
              title="CoquetteFlow Home"
            >
              <img src={logoIcon} alt="CoquetteFlow Logo" className="w-5 h-5 rounded object-contain shrink-0" />
              <div className="flex flex-col text-left leading-none">
                <span className="text-xs font-semibold text-zinc-100 tracking-tight">CoquetteFlow</span>
                <span className="text-[10px] text-[#888888] font-mono truncate max-w-[120px] mt-0.5">
                  {projectData?.name || 'Untitled Bot'}
                </span>
              </div>
            </button>

            {/* Save Status Button */}
            <button
              className={`cq-pill-btn ${saveState === 'saved' ? 'border-zinc-500 text-zinc-100' : ''}`}
              onClick={handleSave}
              title="Save Project (Ctrl+S)"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${saveState === 'saving' ? 'bg-amber-400 animate-ping' : saveState === 'saved' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
              <span className="text-[11px]">{saveLabel}</span>
            </button>
          </div>

          {/* Sidebar Toggles */}
          <div className="flex items-center gap-1 px-1 border-r border-[#2d2d2d]">
            <button
              className={`cq-icon-btn ${showLeftSidebar ? 'active' : ''}`}
              onClick={onToggleLeftSidebar}
              title={showLeftSidebar ? 'Collapse Left Sidebar' : 'Open Left Sidebar (Library)'}
            >
              ◨
            </button>
            <button
              className={`cq-icon-btn ${showNPanel ? 'active' : ''}`}
              onClick={onToggleNPanel}
              title={showNPanel ? 'Collapse Inspector (Press N)' : 'Open Inspector (Press N)'}
            >
              ◧
            </button>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1 px-1 border-r border-[#2d2d2d]">
            <button
              className="cq-icon-btn"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              ↺
            </button>
            <button
              className="cq-icon-btn"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              ↻
            </button>
          </div>

          {/* Zoom & View Controls */}
          <div className="flex items-center gap-1 px-1 border-r border-[#2d2d2d]">
            <button
              className="cq-icon-btn text-xs font-mono"
              onClick={onZoomOut}
              title="Zoom Out"
            >
              −
            </button>
            <button
              className="cq-icon-btn text-xs font-mono"
              onClick={onZoomIn}
              title="Zoom In"
            >
              +
            </button>
            <button
              className="cq-icon-btn text-[11px]"
              onClick={onFitView}
              title="Fit / Reset View"
            >
              ⊡
            </button>
          </div>

          {/* Add Node & Clear Canvas */}
          <div className="flex items-center gap-1.5 px-1 border-r border-[#2d2d2d]">
            <button
              className="cq-pill-btn cq-pill-accent"
              onClick={onAddNode}
              title="Add Node (or right-click canvas)"
            >
              <span className="text-xs">+</span>
              <span>Add Node</span>
            </button>
            <button
              className="cq-icon-btn hover:text-rose-400"
              onClick={onClearCanvas}
              title="Clear Canvas"
            >
              🗑
            </button>
          </div>

          {/* Bot Execution Controls */}
          <div className="flex items-center gap-1.5 px-1 border-r border-[#2d2d2d]">
            {botRunning ? (
              <button
                className="cq-btn-stop"
                onClick={handleStop}
                title="Stop Discord Bot"
              >
                ⏹ Stop
              </button>
            ) : (
              <button
                className="cq-btn-run"
                onClick={handleRun}
                disabled={runLoading}
                title="Run Discord Bot on Server"
              >
                ▶ {runLoading ? 'Starting...' : 'Run'}
              </button>
            )}

            <div className="flex items-center gap-1.5 px-2 text-[10px] font-mono">
              <span className={`w-2 h-2 rounded-full ${botRunning ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-zinc-600'}`} />
              <span className={botRunning ? 'text-emerald-400' : 'text-zinc-500'}>
                {botRunning ? 'Online' : 'Idle'}
              </span>
              {botRunning && (
                <span
                  className="hidden md:inline-flex items-center gap-1 text-[9px] text-zinc-400 bg-[#161616] border border-[#2a2a2a] px-1.5 py-0.5 rounded ml-1"
                  title="Auto-sleep active: Bot runs live while you are on the site, and automatically shuts down when you close or leave CoquetteFlow to save server RAM."
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span>Auto-sleep on exit</span>
                </span>
              )}
            </div>
          </div>

          {/* Export Dropdown */}
          <div className="relative px-1">
            <button
              className="cq-pill-btn"
              onClick={() => setExportMenuOpen((o) => !o)}
              title="Export source code or project data"
            >
              <span>Export</span>
              <span className="text-[8px] text-zinc-500">▾</span>
            </button>

            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className="cq-dropdown-menu right-0 top-9 w-48">
                  <button className="cq-dropdown-item" onClick={handleExportCode}>
                    <span>📜</span>
                    <div>
                      <div className="font-semibold text-zinc-200">Export bot.js</div>
                      <div className="text-[10px] text-zinc-500">Standard Discord.js v14 code</div>
                    </div>
                  </button>
                  <button className="cq-dropdown-item" onClick={handleExportJson}>
                    <span>💾</span>
                    <div>
                      <div className="font-semibold text-zinc-200">Export project.json</div>
                      <div className="text-[10px] text-zinc-500">Node graph backup</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Settings Menu */}
          <div className="relative pl-1">
            <button
              className="cq-icon-btn"
              onClick={() => setSettingsMenuOpen((o) => !o)}
              title="Settings & Tools"
            >
              ⚙
            </button>

            {settingsMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSettingsMenuOpen(false)} />
                <div className="cq-dropdown-menu right-0 top-9 w-44">
                  <button
                    className="cq-dropdown-item"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setTokenModal(true);
                    }}
                  >
                    <span>🔑</span>
                    <span>Bot Token</span>
                  </button>
                  <button
                    className="cq-dropdown-item"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setPrefixModal(true);
                    }}
                  >
                    <span>⚡</span>
                    <span>Prefix ({projectData?.prefix || '!'})</span>
                  </button>
                  <button
                    className="cq-dropdown-item"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setProjectsModalOpen(true);
                    }}
                  >
                    <span>📂</span>
                    <span>Switch Project</span>
                  </button>
                  <button
                    className="cq-dropdown-item"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      toggleFullscreen();
                    }}
                  >
                    <span>⛶</span>
                    <span>Toggle Fullscreen</span>
                  </button>
                  <div className="h-px bg-[#262626] my-1" />
                  <button
                    className="cq-dropdown-item"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setScreen('home');
                    }}
                  >
                    <span>🏠</span>
                    <span>Exit to Home</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="w-full max-w-sm cq-modal-panel p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-zinc-100 mb-2">⚡ Command Prefix</h3>
        <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
          A global prefix prepended to all command names (e.g. <code className="bg-[#191919] border border-[#353535] px-1 py-0.5 rounded text-zinc-200 font-mono text-[10px]">!</code> turns <code className="bg-[#191919] border border-[#353535] px-1 py-0.5 rounded text-zinc-200 font-mono text-[10px]">ping</code> into <code className="bg-[#191919] border border-[#353535] px-1 py-0.5 rounded text-zinc-200 font-mono text-[10px]">!ping</code>).
        </p>
        <div className="mb-6">
          <input
            className="cq-field-input font-mono"
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
          <button className="cq-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="cq-btn-primary" onClick={handleSave} disabled={saving}>
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="w-full max-w-[420px] cq-modal-panel p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-zinc-100 mb-2">🔑 Bot Token</h3>
        <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
          Stored securely on your server instance. CoquetteFlow uses this token to run your Discord bot.
        </p>
        <div className="relative mb-6">
          <input
            className="cq-field-input font-mono pr-14"
            type={show ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your Discord bot token..."
            spellCheck={false}
            autoFocus
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200 bg-[#222222] rounded border border-[#353535]"
            onClick={() => setShow((s) => !s)}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button className="cq-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="cq-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Token'}
          </button>
        </div>
      </div>
    </div>
  );
}
