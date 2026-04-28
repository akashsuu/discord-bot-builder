'use strict';

const path = require('path');
const fs   = require('fs');

const plugins = {}; // { [nodeType]: { execute, generateCode } }
const meta    = []; // [{ type, label, category, ... }]

function loadOnePlugin(dir, jsonPath, indexPath, category) {
  try {
    const pluginMeta   = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const pluginModule = require(indexPath);

    if (pluginModule.nodes && typeof pluginModule.nodes === 'object') {
      const cfg = pluginMeta.nodeConfig || {};
      for (const [nodeType, impl] of Object.entries(pluginModule.nodes)) {
        plugins[nodeType] = impl;
        meta.push({
          type:        nodeType,
          label:       cfg.label       || pluginMeta.name || nodeType,
          icon:        cfg.icon        || pluginMeta.icon || '🔌',
          color:       cfg.color       || '#2A2A3A',
          description: pluginMeta.description || '',
          version:     pluginMeta.version || '1.0.0',
          hasInput:    cfg.hasInput  !== false,
          hasOutput:   cfg.hasOutput !== false,
          defaults:    cfg.defaults  || {},
          category:    category || null,
        });
        const catTag = category ? ` [${category}]` : '';
        console.log(`[Plugins] Registered node type: "${nodeType}" (from ${pluginMeta.name})${catTag}`);
      }
    }
  } catch (err) {
    console.error(`[Plugins] Failed to load "${path.basename(dir)}": ${err.message}`);
  }
}

function loadPlugins(pluginsDir) {
  if (!fs.existsSync(pluginsDir)) {
    console.log('[Plugins] No plugins directory found — skipping.');
    return;
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dir      = path.join(pluginsDir, entry.name);
    const jsonPath = path.join(dir, 'plugin.json');
    const indexPath = path.join(dir, 'index.js');

    if (fs.existsSync(jsonPath) && fs.existsSync(indexPath)) {
      // Direct plugin (root-level, no category)
      loadOnePlugin(dir, jsonPath, indexPath, null);
    } else if (!fs.existsSync(jsonPath)) {
      // Treat as a category folder — scan one level deeper
      const category = entry.name;
      const subEntries = fs.readdirSync(dir, { withFileTypes: true });
      for (const sub of subEntries) {
        if (!sub.isDirectory()) continue;
        const subDir      = path.join(dir, sub.name);
        const subJson     = path.join(subDir, 'plugin.json');
        const subIndex    = path.join(subDir, 'index.js');
        if (fs.existsSync(subJson) && fs.existsSync(subIndex)) {
          loadOnePlugin(subDir, subJson, subIndex, category);
        }
      }
    }
  }
}

function getPlugins()         { return plugins; }
function getPluginNodeTypes() { return meta; }

module.exports = { loadPlugins, getPlugins, getPluginNodeTypes };
