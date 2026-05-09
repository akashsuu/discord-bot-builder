'use strict';

// WHY this module is separate from pluginRegistry:
// The registry is a pure data store. The loader handles the messy I/O:
// reading files, requiring modules, running lifecycle hooks, wiring up
// safeAPI, and managing the require() cache for hot-reload.
// Separation means you can unit-test the registry without touching the FS.

const path          = require('path');
const fs            = require('fs');
const registry      = require('./pluginRegistry');
const configManager = require('./configManager');
const { validatePlugin }  = require('./pluginValidator');
const { createSafeAPI }   = require('./safeAPI');
const logger              = require('./logger').child('PluginLoader');
const { PluginError, ValidationError, IncompatibleVersionError } = require('./errors');

// Tracks pluginId → absolute index.js path for hot-reload / unload
const _loadedPaths = new Map();

// ── Single plugin loader ──────────────────────────────────────────────────────
async function loadPlugin(pluginDir, client) {
  pluginDir = path.resolve(pluginDir);
  const pluginId  = path.basename(pluginDir);
  const indexPath = path.join(pluginDir, 'index.js');

  if (!fs.existsSync(indexPath)) {
    logger.warn(`Skipping "${pluginId}" — no index.js found`);
    return null;
  }

  // WHY clear require cache: allows runtime hot-reload without restarting
  // the Electron process. On first load this is a no-op.
  let pluginModule;
  try {
    delete require.cache[require.resolve(indexPath)];
    pluginModule = require(indexPath);
  } catch (err) {
    logger.error(`Failed to load "${pluginId}": ${err.message}`, { stack: err.stack });
    return null;
  }

  // Support both ES-module-style { default: ... } and CommonJS direct export
  const plugin = pluginModule?.default ?? pluginModule;

  // ── Read plugin.json for UI metadata (optional — legacy plugins have it) ──
  // WHY: plugin.json carries label, icon, color, hasInput/Output, and full
  // defaults (including complex objects like pages[], dropdown, buttons).
  // index.js configSchema only has simple scalar defaults.
  // We store both and let getNodeMetaList() merge them so the canvas palette
  // and node.data initialisation get the complete defaults.
  let uiMeta = null;
  const jsonPath = path.join(pluginDir, 'plugin.json');
  if (fs.existsSync(jsonPath)) {
    try { uiMeta = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); }
    catch { /* malformed plugin.json — continue without it */ }
  }

  // Build an effectiveMeta so registry.getMetaList() never crashes on undefined
  const effectiveMeta = plugin.meta || {
    name:          uiMeta?.name        || pluginId,
    version:       uiMeta?.version     || '1.0.0',
    author:        uiMeta?.author      || 'Unknown',
    description:   uiMeta?.description || '',
    engineVersion: '*',
  };

  // Legacy plugins often keep their display metadata in plugin.json instead
  // of index.js. Normalize those fields before validation so older plugins
  // still register cleanly with the stricter engine.
  if (plugin.nodes && typeof plugin.nodes === 'object') {
    const uiCfg = uiMeta?.nodeConfig || {};
    for (const [nodeType, nodeDef] of Object.entries(plugin.nodes)) {
      if (!nodeDef || typeof nodeDef !== 'object') continue;
      if (typeof nodeDef.label !== 'string' || !nodeDef.label.trim()) {
        nodeDef.label = uiCfg.label || uiMeta?.name || nodeType;
      }
      if (typeof nodeDef.icon !== 'string' || !nodeDef.icon.trim()) {
        nodeDef.icon = uiCfg.icon || uiMeta?.icon || 'plugin';
      }
      if (typeof nodeDef.color !== 'string' || !nodeDef.color.trim()) {
        nodeDef.color = uiCfg.color || '#2A2A3A';
      }
    }
  }

  // ── Validation ───────────────────────────────────────────────────────────
  try {
    validatePlugin(plugin, pluginId);
  } catch (err) {
    if (err instanceof IncompatibleVersionError) {
      logger.error(`Version mismatch — skipping "${pluginId}": ${err.message}`);
    } else if (err instanceof ValidationError) {
      logger.error(`Invalid plugin "${pluginId}" at ${err.field}: ${err.message}`);
    } else {
      logger.error(`Validation error in "${pluginId}": ${err.message}`);
    }
    return null;
  }

  // ── Conflict check ───────────────────────────────────────────────────────
  if (registry.hasPlugin(pluginId)) {
    logger.warn(`Plugin "${pluginId}" is already registered — skipping`);
    return null;
  }

  // ── Config initialisation ─────────────────────────────────────────────────
  const globalDefaults = plugin.config?.defaults ?? {};
  const nodeDefaults   = {};
  for (const [nodeType, nodeDef] of Object.entries(plugin.nodes)) {
    if (nodeDef.configSchema) {
      nodeDefaults[nodeType] = Object.fromEntries(
        Object.entries(nodeDef.configSchema)
          .filter(([, def]) => def.default !== undefined)
          .map(([k, def]) => [k, def.default])
      );
    }
  }
  configManager.init(pluginId, globalDefaults, nodeDefaults);

  // ── Safe API ──────────────────────────────────────────────────────────────
  const pluginLogger = logger.child(pluginId);
  const safeAPI = client
    ? createSafeAPI(client, pluginLogger, configManager.getGlobal(pluginId))
    : null; // safeAPI is null when no Discord client is connected yet

  // ── onLoad lifecycle hook ─────────────────────────────────────────────────
  if (typeof plugin.onLoad === 'function') {
    try {
      await plugin.onLoad(safeAPI);
      logger.debug(`"${pluginId}" onLoad completed`);
    } catch (err) {
      logger.error(`"${pluginId}" onLoad hook failed — aborting registration: ${err.message}`);
      return null;
    }
  }

  // ── Determine category from parent directory ──────────────────────────────
  const category = path.basename(path.dirname(pluginDir));

  // ── Register ──────────────────────────────────────────────────────────────
  try {
    registry.register(pluginId, {
      meta:     effectiveMeta,
      nodes:    plugin.nodes,
      onUnload: plugin.onUnload ?? null,
      category: category === 'plugins' ? null : category,
      safeAPI,
      uiMeta,   // full plugin.json content — used by getNodeMetaList()
    });
  } catch (err) {
    logger.error(`Registration failed for "${pluginId}": ${err.message}`);
    return null;
  }

  _loadedPaths.set(pluginId, indexPath);
  logger.info(
    `Loaded "${pluginId}" v${effectiveMeta.version} [${category}] — ${Object.keys(plugin.nodes).length} node(s)`,
    { nodeTypes: Object.keys(plugin.nodes) }
  );
  return pluginId;
}

// ── Unload ────────────────────────────────────────────────────────────────────
async function unloadPlugin(pluginId) {
  const entry = registry.getPlugin(pluginId);
  if (!entry) return false;

  if (typeof entry.onUnload === 'function') {
    try {
      await entry.onUnload();
    } catch (err) {
      logger.error(`"${pluginId}" onUnload threw: ${err.message}`);
    }
  }

  registry.unregister(pluginId);
  configManager.cleanup(pluginId);
  _loadedPaths.delete(pluginId);
  logger.info(`Unloaded plugin "${pluginId}"`);
  return true;
}

// ── Hot-reload ────────────────────────────────────────────────────────────────
// WHY hot-reload: plugin development iteration and the future marketplace
// both need install/update without restarting the Electron process.
async function reloadPlugin(pluginId, client) {
  const indexPath = _loadedPaths.get(pluginId);
  if (!indexPath) throw new PluginError(`"${pluginId}" is not currently loaded`, pluginId);

  const pluginDir = path.dirname(indexPath);
  await unloadPlugin(pluginId);
  return loadPlugin(pluginDir, client);
}

// ── Batch directory loader ────────────────────────────────────────────────────
async function loadPluginsFromDir(pluginsDir, client) {
  pluginsDir = path.resolve(pluginsDir);
  if (!fs.existsSync(pluginsDir)) {
    logger.warn(`Plugins directory not found: ${pluginsDir}`);
    return;
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  let loaded = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dir = path.join(pluginsDir, entry.name);

    // Root-level plugin (has its own index.js directly)
    if (fs.existsSync(path.join(dir, 'index.js'))) {
      const id = await loadPlugin(dir, client);
      if (id) loaded++;
      continue;
    }

    // Category folder — scan one level deeper
    const subEntries = fs.readdirSync(dir, { withFileTypes: true });
    for (const sub of subEntries) {
      if (!sub.isDirectory()) continue;
      const subDir = path.join(dir, sub.name);
      if (fs.existsSync(path.join(subDir, 'index.js'))) {
        const id = await loadPlugin(subDir, client);
        if (id) loaded++;
      }
    }
  }

  logger.info(
    `Done. ${loaded} plugin(s) loaded, ` +
    `${registry.getPluginCount()} total, ` +
    `${registry.getNodeCount()} node type(s) registered.`
  );
}

// ── Plugin install at runtime (marketplace) ───────────────────────────────────
// Validates a plugin from an arbitrary path without side effects first,
// then loads it — gives the GUI a safe "dry run" before committing.
async function validateExternalPlugin(pluginDir) {
  const indexPath = path.join(pluginDir, 'index.js');
  if (!fs.existsSync(indexPath)) return { valid: false, errors: ['No index.js found'] };

  let plugin;
  try {
    delete require.cache[require.resolve(indexPath)];
    const mod = require(indexPath);
    plugin = mod?.default ?? mod;
  } catch (err) {
    return { valid: false, errors: [`require() failed: ${err.message}`] };
  }

  try {
    validatePlugin(plugin, path.basename(pluginDir));
    return { valid: true, errors: [], meta: plugin.meta, nodeTypes: Object.keys(plugin.nodes) };
  } catch (err) {
    return { valid: false, errors: [err.message] };
  }
}

module.exports = {
  loadPlugin,
  unloadPlugin,
  reloadPlugin,
  loadPluginsFromDir,
  validateExternalPlugin,
};
