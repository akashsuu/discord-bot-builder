'use strict';

// Thin compatibility shim — delegates to backend/engine/pluginLoader.
// main.js calls pluginLoader.loadPlugins() and pluginLoader.getPluginNodeTypes().
// Those names are preserved here so main.js needs zero changes.

const engine = require('./engine');

let _client = null; // stored when setClient() is called after Discord login

async function setClient(client) {
 _client = client;

 // Plugins are first loaded before Discord login, so their onLoad hooks see
 // safeAPI as null. Reload after login so persistent interaction handlers
 // such as ticket buttons/dropdowns are attached immediately.
 for (const plugin of engine.getMetaList()) {
 try {
 await engine.reloadPlugin(plugin.id, _client);
 } catch {
 // Keep bot startup resilient; individual plugin failures are logged by
 // the engine loader during reload.
 }
 }
}

async function loadPlugins(pluginsDir) {
 await engine.loadPluginsFromDir(pluginsDir, _client);
}

// Returns the flat node-meta array the UI needs for the palette / right-click menu
function getPluginNodeTypes() {
 return engine.getNodeMetaList();
}

// Returns { [nodeType]: { execute, generateCode } } — used by botRunner
function getPlugins() {
 const result = {};
 for (const type of engine.getAllNodeTypes()) {
 const entry = engine.getNode(type);
 if (entry) result[type] = entry.definition;
 }
 return result;
}

module.exports = { loadPlugins, getPlugins, getPluginNodeTypes, setClient };
