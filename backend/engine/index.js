'use strict';

// Public API surface for the plugin engine.
// Other modules (botRunner, main.js, IPC handlers) import from here — they
// never reach into engine sub-modules directly. This keeps the internal
// structure refactorable without touching callers.

const loader = require('./pluginLoader');
const registry = require('./pluginRegistry');
const config = require('./configManager');
const logger = require('./logger');
const { executeGraph, getOutputNodes } = require('./executionEngine');

module.exports = {
 // ── Plugin lifecycle ────────────────────────────────────────────────────────
 loadPluginsFromDir: loader.loadPluginsFromDir,
 loadPlugin: loader.loadPlugin,
 unloadPlugin: loader.unloadPlugin,
 reloadPlugin: loader.reloadPlugin,
 validateExternalPlugin: loader.validateExternalPlugin,

 // ── Registry queries (read-only) ─────────────────────────────────────────────
 getPlugin: (id) => registry.getPlugin(id),
 getNode: (type) => registry.getNode(type),
 hasNode: (type) => registry.hasNode(type),
 getAllNodeTypes: () => registry.getAllNodeTypes(),
 getMetaList: () => registry.getMetaList(),
 getNodeMetaList: () => registry.getNodeMetaList(),
 getPluginCount: () => registry.getPluginCount(),
 getNodeCount: () => registry.getNodeCount(),

 // ── Execution ────────────────────────────────────────────────────────────────
 executeGraph,
 getOutputNodes,

 // ── Config ───────────────────────────────────────────────────────────────────
 getPluginConfig: (id) => config.getGlobal(id),
 getNodeConfig: (id, type) => config.getNode(id, type),
 setPluginConfig: (id, patch) => config.setGlobal(id, patch),
 setNodeConfig: (id, t, patch) => config.setNode(id, t, patch),
 validateConfig: (schema, cfg) => config.validate(schema, cfg),

 // ── Logging ──────────────────────────────────────────────────────────────────
 // Attach a listener to receive all engine log entries (used by LogPanel IPC)
 onEngineLog: (fn) => logger.onLog(fn),
};
