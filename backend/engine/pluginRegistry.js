'use strict';

// WHY a registry class (not a plain object):
// A class gives us a clear contract: explicit register/unregister lifecycle,
// conflict detection at registration time, and the ability to expose read-only
// views (getMetaList) for the GUI without leaking internal mutable state.
// It is exported as a singleton so the entire engine shares one source of truth.

const { NodeTypeConflictError, PluginError } = require('./errors');

class PluginRegistry {
  constructor() {
    // pluginId → PluginEntry
    this._plugins = new Map();

    // WHY separate node map: O(1) lookup for executeNode() — the hot path.
    // nodeType → { pluginId, definition, safeAPI }
    this._nodes   = new Map();
  }

  // ── Write operations ────────────────────────────────────────────────────────

  register(pluginId, entry) {
    if (this._plugins.has(pluginId)) {
      throw new PluginError(`Plugin "${pluginId}" is already registered`, pluginId);
    }

    // Check every node type for conflicts BEFORE touching state
    for (const nodeType of Object.keys(entry.nodes)) {
      const existing = this._nodes.get(nodeType);
      if (existing) {
        throw new NodeTypeConflictError(nodeType, pluginId, existing.pluginId);
      }
    }

    this._plugins.set(pluginId, entry);

    for (const [nodeType, definition] of Object.entries(entry.nodes)) {
      this._nodes.set(nodeType, {
        pluginId,
        definition,
        safeAPI:   entry.safeAPI ?? null,
        category:  entry.category ?? null,
      });
    }
  }

  unregister(pluginId) {
    if (!this._plugins.has(pluginId)) return false;

    for (const [nodeType, entry] of this._nodes) {
      if (entry.pluginId === pluginId) this._nodes.delete(nodeType);
    }
    this._plugins.delete(pluginId);
    return true;
  }

  // ── Read operations ─────────────────────────────────────────────────────────

  getNode(nodeType)   { return this._nodes.get(nodeType)   ?? null; }
  getPlugin(pluginId) { return this._plugins.get(pluginId) ?? null; }
  hasNode(nodeType)   { return this._nodes.has(nodeType); }
  hasPlugin(id)       { return this._plugins.has(id); }

  getPluginCount() { return this._plugins.size; }
  getNodeCount()   { return this._nodes.size; }

  getAllPluginIds()  { return [...this._plugins.keys()]; }
  getAllNodeTypes()  { return [...this._nodes.keys()]; }

  // Safe serialisable snapshot for GUI / marketplace listing
  getMetaList() {
    return [...this._plugins.entries()].map(([id, p]) => ({
      id,
      name:        p.meta.name,
      version:     p.meta.version,
      author:      p.meta.author,
      description: p.meta.description || '',
      category:    p.category || null,
      nodeTypes:   Object.keys(p.nodes),
      nodeCount:   Object.keys(p.nodes).length,
    }));
  }

  // Flat list of node-type metadata — used by the UI palette and addNodeAtPos()
  getNodeMetaList() {
    return [...this._nodes.entries()].map(([type, entry]) => {
      const def   = entry.definition;
      const pluginEntry = this._plugins.get(entry.pluginId) || {};

      // plugin.json nodeConfig — used by legacy plugins for label/icon/color/defaults
      const uiCfg      = pluginEntry.uiMeta?.nodeConfig || {};
      const uiDefaults = uiCfg.defaults || {};

      // configSchema scalar defaults from index.js (authoritative for simple fields)
      const schemaDefaults = def.configSchema
        ? Object.fromEntries(
            Object.entries(def.configSchema)
              .filter(([, d]) => d.default !== undefined)
              .map(([k, d]) => [k, d.default])
          )
        : {};

      // WHY merge order: uiDefaults first (complex objects: pages[], dropdown, buttons),
      // then schemaDefaults override (authoritative scalar values like command, embedColor).
      // This means pages/dropdown/buttons from plugin.json survive, while simple fields
      // from configSchema take precedence.
      const mergedDefaults = { ...uiDefaults, ...schemaDefaults };

      return {
        type,
        pluginId:    entry.pluginId,
        category:    entry.category,
        label:       def.label      || uiCfg.label    || type,
        icon:        def.icon       || uiCfg.icon     || '🔌',
        color:       def.color      || uiCfg.color    || '#2A2A3A',
        // hasInput/Output: prefer index.js ports array, fall back to plugin.json flag
        hasInput:    def.inputs?.length  > 0 || uiCfg.hasInput  !== false,
        hasOutput:   def.outputs?.length > 0 || uiCfg.hasOutput !== false,
        defaults:    mergedDefaults,
        description: def.description || pluginEntry.uiMeta?.description || '',
      };
    });
  }
}

// Singleton — entire engine shares one registry instance
module.exports = new PluginRegistry();
