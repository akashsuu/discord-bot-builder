'use strict';

// ── Real-time WebSocket Connection Manager ──────────────────────────────────
class WebBridge {
  constructor() {
    this.ws = null;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.currentProjectId = null;
    this.listeners = {
      'bot:log': new Set(),
      'bot:status': new Set(),
      'bot:info': new Set(),
      'bot:logs_history': new Set(),
    };
    this.isWeb = typeof window !== 'undefined' && !window.process?.versions?.electron;
    this.initWebSocket();
    this.initPresenceLifecycle();
  }

  getWsUrl() {
    if (typeof window === 'undefined') return 'ws://localhost:3000/ws';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    return `${protocol}//${host}/ws`;
  }

  initPresenceLifecycle() {
    if (typeof window === 'undefined') return;

    // Send keep-alive heartbeat every 8 seconds while active on the builder
    this.heartbeatTimer = setInterval(() => {
      if (this.currentProjectId && this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'heartbeat', projectId: this.currentProjectId }));
        } catch {}
      }
    }, 8000);

    // Rapid shutdown beacon when tab/window closes to free server RAM
    const handleLeave = () => {
      if (!this.currentProjectId) return;
      const payload = JSON.stringify({ projectId: this.currentProjectId });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/bot/leave', new Blob([payload], { type: 'application/json' }));
      } else {
        try {
          fetch('/api/bot/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          });
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleLeave);
    window.addEventListener('pagehide', handleLeave);

    // On tab visibility restore, re-affirm presence immediately
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.currentProjectId) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.initWebSocket();
        } else {
          this.subscribeProject(this.currentProjectId);
        }
      }
    });
  }

  initWebSocket() {
    if (typeof window === 'undefined') return;
    try {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      this.ws = new WebSocket(this.getWsUrl());

      this.ws.onopen = () => {
        // Resubscribe if we have an active project
        if (this.currentProjectId) {
          this.subscribeProject(this.currentProjectId);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data || !data.type) return;

          const set = this.listeners[data.type];
          if (set) {
            for (const cb of set) {
              try {
                if (data.type === 'bot:log') cb(data.log);
                else if (data.type === 'bot:status') cb(data.status);
                else if (data.type === 'bot:info') cb(data.info);
                else if (data.type === 'bot:logs_history') cb(data.logs);
              } catch (e) {
                console.error('[WebBridge] Listener callback error:', e);
              }
            }
          }
        } catch {
          // ignore non-json
        }
      };

      this.ws.onclose = () => {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.initWebSocket(), 2000);
      };

      this.ws.onerror = () => {
        try { this.ws.close(); } catch {}
      };
    } catch (err) {
      console.warn('[WebBridge] WebSocket connection error:', err);
    }
  }

  subscribeProject(projectId) {
    if (this.currentProjectId && this.currentProjectId !== projectId) {
      this.unsubscribeProject(this.currentProjectId);
    }
    this.currentProjectId = projectId;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', projectId }));
    }
  }

  unsubscribeProject(projectId) {
    if (this.currentProjectId === projectId) {
      this.currentProjectId = null;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', projectId }));
    }
  }

  // ── Listener helpers ───────────────────────────────────────────────────────
  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event].add(cb);
  }

  off(event, cb) {
    if (this.listeners[event]) {
      if (cb) this.listeners[event].delete(cb);
      else this.listeners[event].clear();
    }
  }
}

const bridge = new WebBridge();

// ── Define window.electronAPI web implementation ─────────────────────────────
const webAPI = {
  isWeb: true,

  // Set active project for realtime WS subscriptions
  setCurrentProject: (projectId) => {
    bridge.subscribeProject(projectId);
  },

  // Project management
  listProjects: async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      return data.projects || [];
    } catch (err) {
      console.error('[API] Failed to list projects:', err);
      return [];
    }
  },

  createProject: async (name) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.success) return { success: false, error: data.error };
      bridge.subscribeProject(data.project.id);
      return {
        success: true,
        projectPath: data.project.id,
        projectData: data.project,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  loadProject: async (projectId) => {
    try {
      if (!projectId) {
        // Return projects list or fail gracefully if no id provided
        const projects = await webAPI.listProjects();
        if (projects.length === 0) {
          return { success: false, error: 'No projects found on the server. Please create one.' };
        }
        // Return latest project by default
        projectId = projects[0].id;
      }

      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (!data.success) return { success: false, error: data.error };
      bridge.subscribeProject(data.project.id);
      return {
        success: true,
        projectPath: data.project.id,
        projectData: data.project,
        botStatus: data.botStatus,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  saveProject: async ({ projectPath, projectData }) => {
    try {
      const id = projectPath || projectData?.id;
      if (!id) return { success: false, error: 'Missing project id' };

      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectData }),
      });
      const data = await res.json();
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('kiodium_last_project_id', id);
        } catch {}
      }
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  deleteProject: async (projectId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  importProject: async (projectData) => {
    try {
      const res = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectData }),
      });
      const data = await res.json();
      if (data.success && data.project?.id) {
        bridge.subscribeProject(data.project.id);
      }
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Bot execution
  runBot: async ({ projectData, projectPath }) => {
    try {
      const id = projectPath || projectData?.id || bridge.currentProjectId;
      if (id) bridge.subscribeProject(id);
      const res = await fetch('/api/bot/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, projectData }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  stopBot: async (projectPath) => {
    try {
      const id = projectPath || bridge.currentProjectId;
      const res = await fetch('/api/bot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Export code as downloadable bot.js
  exportCode: async ({ projectData }) => {
    try {
      const res = await fetch('/api/code/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectData }),
      });
      const data = await res.json();
      if (!data.success) return { success: false, error: data.error };

      const filename = `${String(projectData?.name || 'bot').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.js`;
      const blob = new Blob([data.code], { type: 'application/javascript;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true, path: filename };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Export project data as downloadable project.json
  exportProjectJson: (projectData) => {
    try {
      const filename = `${String(projectData?.name || 'project').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.json`;
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true, path: filename };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Plugin node types
  getPluginNodeTypes: async () => {
    try {
      const res = await fetch('/api/plugins/node-types');
      const data = await res.json();
      return data.nodeTypes || [];
    } catch (err) {
      console.error('[API] Failed to get plugin node types:', err);
      return [];
    }
  },

  // External links
  openExternal: (url) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Window controls (Web mode adaptations)
  minimizeWindow: () => ({ success: true }),
  toggleMaximizeWindow: () => {
    if (typeof document === 'undefined') return { success: true };
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      return { success: true, maximized: true };
    } else {
      document.exitFullscreen().catch(() => {});
      return { success: true, maximized: false };
    }
  },
  closeWindow: () => {
    if (typeof window !== 'undefined') {
      window.location.hash = '';
      window.location.reload();
    }
    return { success: true };
  },

  // Events
  onBotLog: (cb) => bridge.on('bot:log', cb),
  onBotStatus: (cb) => bridge.on('bot:status', cb),
  onBotInfo: (cb) => bridge.on('bot:info', cb),
  onLogsHistory: (cb) => bridge.on('bot:logs_history', cb),

  // Cleanup
  removeListener: (channel) => bridge.off(channel),
};

// Polyfill window.electronAPI if not in Electron environment
if (typeof window !== 'undefined' && !window.electronAPI) {
  window.electronAPI = webAPI;
}

export default webAPI;
