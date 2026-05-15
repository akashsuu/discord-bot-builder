const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
 // Project
 createProject: (name) => ipcRenderer.invoke('dialog:createProject', name),
 loadProject: () => ipcRenderer.invoke('dialog:loadProject'),
 saveProject: (data) => ipcRenderer.invoke('project:save', data),

 // Bot
 runBot: (data) => ipcRenderer.invoke('bot:run', data),
 stopBot: () => ipcRenderer.invoke('bot:stop'),

 // Export
 exportCode: (data) => ipcRenderer.invoke('code:export', data),

 // Plugins
 getPluginNodeTypes: () => ipcRenderer.invoke('plugins:getNodeTypes'),

 // Window
 minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
 toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggleMaximize'),
 closeWindow: () => ipcRenderer.invoke('window:close'),

 // Events from main → renderer
 onBotLog: (cb) => ipcRenderer.on('bot:log', (_event, log) => cb(log)),
 onBotStatus: (cb) => ipcRenderer.on('bot:status', (_event, status) => cb(status)),
 onBotInfo: (cb) => ipcRenderer.on('bot:info', (_event, info) => cb(info)),

 // Cleanup
 removeListener: (channel) => ipcRenderer.removeAllListeners(channel),
});
