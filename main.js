const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let botRunner = null;
let pluginLoader = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#08080f',
    title: 'Discord Bot Builder — Akashsuu',
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('[Main] Failed to load renderer:', code, desc);
  });
}

app.whenReady().then(() => {
  // Lazy-load backend modules so app opens fast
  botRunner = require('./backend/botRunner');
  pluginLoader = require('./backend/pluginLoader');

  pluginLoader.loadPlugins(path.join(__dirname, 'plugins'));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  botRunner.stop().catch(() => {});
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Create Project ───────────────────────────────────────────────────
ipcMain.handle('dialog:createProject', async (_event, projectName) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose folder to save project in',
    properties: ['openDirectory'],
  });

  if (result.canceled) return { success: false };

  const folderPath = path.join(result.filePaths[0], projectName);

  try {
    fs.mkdirSync(folderPath, { recursive: true });

    const projectData = { name: projectName, token: '', nodes: [], edges: [] };
    const projectPath = path.join(folderPath, 'project.json');
    fs.writeFileSync(projectPath, JSON.stringify(projectData, null, 2));

    return { success: true, projectPath, projectData };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: Load Project ─────────────────────────────────────────────────────
ipcMain.handle('dialog:loadProject', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open project.json',
    filters: [{ name: 'Project Files', extensions: ['json'] }],
    properties: ['openFile'],
  });

  if (result.canceled) return { success: false };

  try {
    const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
    const projectData = JSON.parse(raw);
    return { success: true, projectPath: result.filePaths[0], projectData };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: Save Project ─────────────────────────────────────────────────────
ipcMain.handle('project:save', async (_event, { projectPath, projectData }) => {
  try {
    fs.writeFileSync(projectPath, JSON.stringify(projectData, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: Run Bot ──────────────────────────────────────────────────────────
ipcMain.handle('bot:run', async (_event, { projectData }) => {
  try {
    const plugins = pluginLoader.getPlugins();
    await botRunner.start(
      projectData,
      plugins,
      (log) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('bot:log', log);
        }
      },
      (info) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('bot:info', info);
        }
      }
    );
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bot:status', { running: true });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: Stop Bot ─────────────────────────────────────────────────────────
ipcMain.handle('bot:stop', async () => {
  try {
    await botRunner.stop();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bot:status', { running: false });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: Export Code ──────────────────────────────────────────────────────
ipcMain.handle('code:export', async (_event, { projectData }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Bot Code',
    defaultPath: 'bot.js',
    filters: [{ name: 'JavaScript', extensions: ['js'] }],
  });

  if (result.canceled) return { success: false };

  try {
    const codeExporter = require('./backend/codeExporter');
    const plugins = pluginLoader.getPlugins();
    const code = codeExporter.generateCode(projectData, plugins);
    fs.writeFileSync(result.filePath, code, 'utf-8');
    return { success: true, path: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── IPC: Get Plugin Node Types ────────────────────────────────────────────
ipcMain.handle('plugins:getNodeTypes', async () => {
  return pluginLoader.getPluginNodeTypes();
});
