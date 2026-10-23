import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext';
import { NODE_PALETTE } from '../nodes/nodeTypes';
import logoIcon from '../assets/coquetteflow-icon.png';
import logoWordmark from '../assets/coquetteflow-wordmark.png';

// Structured categories matching Section 4 & 5
const SIDEBAR_CATEGORIES = [
  {
    id: 'events',
    title: 'Events & Triggers',
    icon: '⚡',
    types: [
      { type: 'event_message', label: 'Message Received', desc: 'Trigger on every Discord message' },
      { type: 'event_channel', label: 'Channel Event', desc: 'Channel create, delete, update' },
      { type: 'event_client', label: 'Client Event', desc: 'Bot ready, rate limits, errors' },
      { type: 'event_guild', label: 'Guild Event', desc: 'Server join, leave, update' },
      { type: 'event_member', label: 'Member Event', desc: 'Member join, leave, role update' },
      { type: 'event_role', label: 'Role Event', desc: 'Role created, deleted, changed' },
      { type: 'event_emoji', label: 'Emoji Event', desc: 'Custom emoji added or updated' },
    ],
  },
  {
    id: 'commands',
    title: 'Commands',
    icon: '💬',
    types: [
      { type: 'custom_command', label: 'Custom Command', desc: 'Prefix command matcher with API & reply' },
    ],
  },
  {
    id: 'messages',
    title: 'Messages & Embeds',
    icon: '📤',
    types: [
      { type: 'send_message', label: 'Send Message', desc: 'Send text, reply, or channel message' },
      { type: 'page_menu', label: 'Page Menu', desc: 'Interactive multi-page embed with buttons' },
    ],
  },
  {
    id: 'logic',
    title: 'Conditions & Logic',
    icon: '🔀',
    types: [
      { type: 'condition_branch', label: 'Condition Branch', desc: 'Branch flow based on conditions' },
    ],
  },
];

export default function LeftSidebar({ isOpen, onToggle, onAddNode, pluginMeta = [] }) {
  const { projectData, projectPath, updateProject, botRunning, botInfo, addLog } = useProject();
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'config' | 'workflows'
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState({ events: true, commands: true, messages: true, logic: true });
  const [tokenInput, setTokenInput] = useState(projectData?.token || '');
  const [showToken, setShowToken] = useState(false);
  const [prefixInput, setPrefixInput] = useState(projectData?.prefix || '!');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSavedToast, setConfigSavedToast] = useState(false);

  // Group plugins by category for library display
  const pluginCategories = useMemo(() => {
    const groups = {};
    (pluginMeta || []).forEach((p) => {
      const cat = p.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return Object.entries(groups).map(([cat, list]) => ({
      id: `plugin_${cat}`,
      title: cat.charAt(0).toUpperCase() + cat.slice(1) + ' Plugins',
      icon: '🧩',
      types: list.map((item) => ({
        type: item.type,
        label: item.label,
        desc: `Plugin node for ${cat}`,
        color: item.color,
      })),
    }));
  }, [pluginMeta]);

  const allCategories = useMemo(() => {
    return [...SIDEBAR_CATEGORIES, ...pluginCategories];
  }, [pluginCategories]);

  // Filter items across categories
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCategories;

    return allCategories
      .map((cat) => ({
        ...cat,
        types: cat.types.filter(
          (t) => t.label.toLowerCase().includes(q) || (t.desc && t.desc.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.types.length > 0);
  }, [allCategories, search]);

  const toggleCategory = (id) => {
    setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('text/plain', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    const updated = {
      ...projectData,
      token: tokenInput.trim(),
      prefix: prefixInput.trim() || '!',
    };
    await window.electronAPI.saveProject({ projectPath, projectData: updated });
    updateProject({ token: tokenInput.trim(), prefix: prefixInput.trim() || '!' });
    setSavingConfig(false);
    setConfigSavedToast(true);
    setTimeout(() => setConfigSavedToast(false), 2000);
    addLog('[System] Bot configuration updated.');
  };

  if (!isOpen) {
    return (
      <button
        className="cq-sidebar-collapsed-btn nodrag"
        onClick={onToggle}
        title="Open Left Sidebar (Library, Config, Workflows)"
      >
        <span className="text-xs">☰</span>
      </button>
    );
  }

  return (
    <aside className="cq-left-sidebar nodrag select-none" onContextMenu={(e) => e.stopPropagation()}>
      {/* Sidebar Header */}
      <div className="cq-sidebar-hdr">
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="CoquetteFlow" className="w-4 h-4 rounded object-contain shrink-0" />
          <img src={logoWordmark} alt="CoquetteFlow" className="h-3 object-contain opacity-90" />
        </div>
        <button
          className="cq-sidebar-close-btn"
          onClick={onToggle}
          title="Collapse Sidebar"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="cq-sidebar-tabs">
        <button
          className={`cq-sidebar-tab ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          Node Library
        </button>
        <button
          className={`cq-sidebar-tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Bot Config
        </button>
        <button
          className={`cq-sidebar-tab ${activeTab === 'workflows' ? 'active' : ''}`}
          onClick={() => setActiveTab('workflows')}
        >
          Files
        </button>
      </div>

      {/* Tab: Node Library */}
      {activeTab === 'library' && (
        <div className="cq-sidebar-content">
          <div className="p-3 border-b border-[#262626]">
            <div className="relative">
              <input
                className="cq-search-input"
                type="text"
                placeholder="Search nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 text-xs"
                  onClick={() => setSearch('')}
                >
                  ✕
                </button>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5 flex items-center justify-between">
              <span>Drag node to canvas or click to add</span>
              <span className="font-mono text-[9px] text-zinc-600">RMB also works</span>
            </p>
          </div>

          <div className="cq-category-list">
            {filteredCategories.map((cat) => {
              const isExpanded = search ? true : !!expandedCats[cat.id];
              return (
                <div key={cat.id} className="cq-category-group">
                  <button
                    className="cq-category-header"
                    onClick={() => toggleCategory(cat.id)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xs">{cat.icon}</span>
                      <span>{cat.title}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="cq-node-items">
                      {cat.types.map((node) => (
                        <div
                          key={node.type}
                          className="cq-node-item"
                          draggable
                          onDragStart={(e) => onDragStart(e, node.type)}
                          onClick={() => onAddNode?.(node.type)}
                          title={`${node.label} — ${node.desc || ''}\n(Click or drag to canvas)`}
                        >
                          <div className="cq-node-item-dot" />
                          <div className="flex-1 min-w-0">
                            <div className="cq-node-item-label">{node.label}</div>
                            {node.desc && (
                              <div className="cq-node-item-desc">{node.desc}</div>
                            )}
                          </div>
                          <span className="cq-node-item-add">+</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredCategories.length === 0 && (
              <div className="p-6 text-center text-zinc-500 text-xs">
                No nodes match "{search}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Bot Config */}
      {activeTab === 'config' && (
        <div className="cq-sidebar-content p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="cq-field-label">Bot Project Name</label>
            <div className="cq-static-field">{projectData?.name || 'Untitled Bot'}</div>
          </div>

          <div className="space-y-1.5">
            <label className="cq-field-label">Status</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-[#141414] border border-[#2a2a2a] rounded-lg">
              <span className={`w-2 h-2 rounded-full ${botRunning ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-600'}`} />
              <span className="text-xs font-mono text-zinc-300">
                {botRunning ? 'Running on Server' : 'Stopped'}
              </span>
              {botInfo?.tag && (
                <span className="text-[10px] text-zinc-500 ml-auto font-mono">@{botInfo.tag}</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="cq-field-label">Command Prefix</label>
            <input
              className="cq-field-input font-mono"
              type="text"
              value={prefixInput}
              onChange={(e) => setPrefixInput(e.target.value)}
              placeholder="e.g. ! or ?"
              maxLength={8}
            />
            <p className="text-[10px] text-zinc-500">Prefix triggers custom command nodes</p>
          </div>

          <div className="space-y-1.5">
            <label className="cq-field-label">Discord Bot Token</label>
            <div className="relative">
              <input
                className="cq-field-input font-mono pr-14"
                type={showToken ? 'text' : 'password'}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste bot token..."
                spellCheck={false}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded bg-[#202020]"
                onClick={() => setShowToken((s) => !s)}
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">Used by the server to run your bot instance</p>
          </div>

          <button
            className="cq-btn-primary w-full justify-center"
            onClick={handleSaveConfig}
            disabled={savingConfig}
          >
            {savingConfig ? 'Saving...' : configSavedToast ? '✓ Saved' : 'Save Configuration'}
          </button>
        </div>
      )}

      {/* Tab: Workflows & Project Files */}
      {activeTab === 'workflows' && (
        <div className="cq-sidebar-content p-4 space-y-4">
          <div className="space-y-2">
            <span className="cq-field-label">Project Structure</span>
            <div className="space-y-1 font-mono text-xs text-zinc-400 bg-[#121212] p-3 rounded-lg border border-[#262626]">
              <div className="flex items-center gap-2 text-zinc-200">
                <span>📁</span>
                <span>{projectData?.name || 'discord-bot'}/</span>
              </div>
              <div className="flex items-center gap-2 pl-4 text-zinc-300">
                <span>📄</span>
                <span>bot.js</span>
                <span className="text-[10px] text-zinc-600 ml-auto">Runtime</span>
              </div>
              <div className="flex items-center gap-2 pl-4 text-zinc-300">
                <span>📄</span>
                <span>project.json</span>
                <span className="text-[10px] text-zinc-600 ml-auto">Graph State</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="cq-field-label">Export &amp; Backup</span>
            <button
              className="cq-btn-secondary w-full justify-start text-xs"
              onClick={async () => {
                const r = await window.electronAPI.exportCode({ projectData });
                if (r?.success) addLog(`[Export] Saved bot.js to ${r.path}`);
              }}
            >
              <span>📜</span>
              <span>Export bot.js</span>
            </button>
            <button
              className="cq-btn-secondary w-full justify-start text-xs"
              onClick={() => {
                window.electronAPI?.exportProjectJson?.(projectData);
                addLog('[Export] Exported project.json backup.');
              }}
            >
              <span>💾</span>
              <span>Export project.json</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#262626]">
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              CoquetteFlow connects nodes into an execution graph and outputs standard Discord.js v14 code.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
