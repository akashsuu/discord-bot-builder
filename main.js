const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let botRunner = null;
let pluginLoader = null;
let pluginsReady = Promise.resolve();

function createWindow() {
 const rendererPath = path.join(__dirname, 'dist', 'index.html');

 mainWindow = new BrowserWindow({
 width: 1440,
 height: 900,
 minWidth: 1024,
 minHeight: 700,
 icon: path.join(__dirname, 'kiodium.ico'),
 webPreferences: {
 preload: path.join(__dirname, 'preload.js'),
 contextIsolation: true,
 nodeIntegration: false,
 },
 backgroundColor: '#09090b',
 title: 'Kiodium',
 show: true,
 frame: false,
 titleBarStyle: 'hidden',
 });

 if (!fs.existsSync(rendererPath)) {
 const message = 'Renderer build not found. Run "npm run build" before launching the app.';
 console.error('[Main]', message);
 mainWindow.loadURL(
 `data:text/html;charset=utf-8,${encodeURIComponent(
 `<body style="margin:0;background:#09090b;color:#f4f4f5;font-family:Segoe UI,sans-serif;display:grid;place-items:center;height:100vh">
 <main style="max-width:640px;padding:32px;text-align:center">
 <h1 style="font-size:22px;margin:0 0 12px">Kiodium could not start</h1>
 <p style="color:#a1a1aa;line-height:1.5">${message}</p>
 </main>
 </body>`
 )}`
 );
 } else {
 mainWindow.loadFile(rendererPath);
 }

 mainWindow.once('ready-to-show', () => {
 mainWindow.show();
 });

 mainWindow.webContents.on('did-finish-load', () => {
 if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
 });

 mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
 console.error('[Main] Failed to load renderer:', code, desc);
 });

 mainWindow.webContents.on('render-process-gone', (_event, details) => {
 console.error('[Main] Renderer process gone:', details);
 });
}

app.whenReady().then(async () => {
 app.setName('Kiodium');
 botRunner = require('./backend/botRunner');
 pluginLoader = require('./backend/pluginLoader');

 createWindow();

 pluginsReady = pluginLoader.loadPlugins(path.join(__dirname, 'plugins')).catch((err) => {
 console.error('[Main] Plugin loading failed:', err);
 return null;
 });

 app.on('activate', () => {
 if (BrowserWindow.getAllWindows().length === 0) createWindow();
 });
});

app.on('window-all-closed', () => {
 if (botRunner) botRunner.stop().catch(() => {});
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

 const projectData = { name: projectName, token: '', prefix: '!', nodes: [], edges: [] };
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
 await pluginsReady;
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
 await pluginsReady;
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
 await pluginsReady;
 return pluginLoader.getPluginNodeTypes();
});

ipcMain.handle('shell:openExternal', async (_event, url) => {
 try {
 const parsed = new URL(String(url));
 if (!['http:', 'https:'].includes(parsed.protocol)) {
 throw new Error('Only http and https links can be opened.');
 }
 await shell.openExternal(parsed.toString());
 return { success: true };
 } catch (err) {
 return { success: false, error: err.message };
 }
});

// Window controls
ipcMain.handle('window:minimize', () => {
 if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
 return { success: true };
});

ipcMain.handle('window:toggleMaximize', () => {
 if (!mainWindow || mainWindow.isDestroyed()) return { success: false };
 if (mainWindow.isMaximized()) {
 mainWindow.unmaximize();
 return { success: true, maximized: false };
 }
 mainWindow.maximize();
 return { success: true, maximized: true };
});

ipcMain.handle('window:close', () => {
 if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
 return { success: true };
});
