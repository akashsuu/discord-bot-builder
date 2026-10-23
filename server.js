'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const pluginLoader = require('./backend/pluginLoader');
const botManager = require('./backend/botManager');
const projectStore = require('./backend/projectStore');
const codeExporter = require('./backend/codeExporter');
const logger = require('./backend/engine/logger').child('Server');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static frontend from dist
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Favicon and static files fallback
app.get('/kiodium.ico', (_req, res) => {
  const icoPath = path.join(__dirname, 'kiodium.ico');
  if (fs.existsSync(icoPath)) {
    res.sendFile(icoPath);
  } else {
    res.status(404).end();
  }
});

// ─── REST APIs ─────────────────────────────────────────────────────────────

// Health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeBots: botManager.bots.size,
    timestamp: new Date().toISOString(),
  });
});

// Plugins Node Types
app.get('/api/plugins/node-types', async (_req, res) => {
  try {
    const nodeTypes = pluginLoader.getPluginNodeTypes();
    res.json({ success: true, nodeTypes });
  } catch (err) {
    logger.error(`Failed to get plugin node types: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// List Projects
app.get('/api/projects', (_req, res) => {
  try {
    const projects = projectStore.listProjects();
    // Add running status to each project
    const enriched = projects.map((p) => {
      const status = botManager.getStatus(p.id);
      return {
        ...p,
        botRunning: status.running,
        botStatus: status.status,
      };
    });
    res.json({ success: true, projects: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Project
app.post('/api/projects', (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Project name is required' });
    }
    const project = projectStore.createProject(name);
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Project by ID
app.get('/api/projects/:id', (req, res) => {
  try {
    const project = projectStore.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    const status = botManager.getStatus(req.params.id);
    res.json({ success: true, project, botStatus: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save Project by ID
app.put('/api/projects/:id', (req, res) => {
  try {
    const { projectData } = req.body || {};
    if (!projectData) {
      return res.status(400).json({ success: false, error: 'Missing projectData' });
    }
    const saved = projectStore.saveProject(req.params.id, projectData);
    res.json({ success: true, project: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Project by ID
app.delete('/api/projects/:id', async (req, res) => {
  try {
    await botManager.stopBot(req.params.id).catch(() => {});
    const deleted = projectStore.deleteProject(req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Import Project JSON
app.post('/api/projects/import', (req, res) => {
  try {
    const { projectData } = req.body || {};
    if (!projectData || typeof projectData !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid project JSON' });
    }
    const id = projectData.id || `proj_${Date.now()}`;
    const saved = projectStore.saveProject(id, projectData);
    res.json({ success: true, project: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bot Run
app.post('/api/bot/run', async (req, res) => {
  try {
    const { projectId, projectData } = req.body || {};
    const id = projectId || projectData?.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Missing projectId' });
    }

    let finalData = projectData;
    if (finalData) {
      projectStore.saveProject(id, finalData);
    } else {
      finalData = projectStore.getProject(id);
    }

    if (!finalData) {
      return res.status(404).json({ success: false, error: 'Project data not found' });
    }

    await botManager.startBot(id, finalData);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Bot Stop
app.post('/api/bot/stop', async (req, res) => {
  try {
    const { projectId } = req.body || {};
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'Missing projectId' });
    }
    await botManager.stopBot(projectId);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Bot Status
app.get('/api/bot/status/:projectId', (req, res) => {
  try {
    const status = botManager.getStatus(req.params.projectId);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export Code
app.post('/api/code/export', async (req, res) => {
  try {
    const { projectData } = req.body || {};
    if (!projectData) {
      return res.status(400).json({ success: false, error: 'Missing projectData' });
    }
    const plugins = pluginLoader.getPlugins();
    const code = codeExporter.generateCode(projectData, plugins);
    res.json({ success: true, code });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SPA fallback: send index.html for all non-API paths
app.use((_req, res) => {
  const indexHtml = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.status(503).send('Building frontend... please refresh in a moment.');
  }
});

// ─── WebSocket Server ──────────────────────────────────────────────────────

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'subscribe' && data.projectId) {
        botManager.subscribe(data.projectId, ws);
      } else if (data.type === 'unsubscribe' && data.projectId) {
        botManager.unsubscribe(data.projectId, ws);
      } else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      // ignore bad JSON
    }
  });

  ws.on('close', () => {
    botManager.removeSocket(ws);
  });
});

// Heartbeat interval for stale WebSockets
const heartbeatInterval = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// ─── Start Server ──────────────────────────────────────────────────────────

async function bootstrap() {
  try {
    logger.info('Loading plugins...');
    await pluginLoader.loadPlugins(path.join(__dirname, 'plugins'));
    logger.info(`Plugins loaded: ${pluginLoader.getPluginNodeTypes().length} node types available`);

    server.listen(PORT, HOST, () => {
      logger.info(`=======================================================`);
      logger.info(`  Kiodium Bot Builder Web Server is running!`);
      logger.info(`  URL: http://localhost:${PORT}`);
      logger.info(`  Host: ${HOST}:${PORT}`);
      logger.info(`=======================================================`);
    });
  } catch (err) {
    logger.error(`Server bootstrap failed: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  try {
    await botManager.stopAll();
    wss.close();
    server.close(() => {
      logger.info('Server closed. Goodbye!');
      process.exit(0);
    });
  } catch (err) {
    logger.error(`Error during shutdown: ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

bootstrap();
