'use strict';

// WHY a config manager:
// Plugins declare what options they accept (configSchema). The manager
// initialises defaults, validates user-supplied values against the schema,
// and provides get/set for both global (plugin-level) and per-node config.
// Keeping this separate from the registry means config can evolve independently
// (e.g. persisted to disk, loaded from a GUI settings panel) without touching
// registry or execution logic.

class ConfigManager {
  constructor() {
    // pluginId → { global: {}, nodes: { nodeType: {} } }
    this._store = new Map();
  }

  // Called once when a plugin is registered
  init(pluginId, globalDefaults = {}, nodeDefaults = {}) {
    if (this._store.has(pluginId)) return; // idempotent
    this._store.set(pluginId, {
      global: { ...globalDefaults },
      nodes:  Object.fromEntries(
        Object.entries(nodeDefaults).map(([k, v]) => [k, { ...v }])
      ),
    });
  }

  // ── Getters (return copies — callers cannot mutate internal state) ──────────

  getGlobal(pluginId) {
    return { ...(this._store.get(pluginId)?.global ?? {}) };
  }

  getNode(pluginId, nodeType) {
    return { ...(this._store.get(pluginId)?.nodes?.[nodeType] ?? {}) };
  }

  // ── Setters ─────────────────────────────────────────────────────────────────

  setGlobal(pluginId, patch) {
    const cfg = this._store.get(pluginId);
    if (!cfg) throw new Error(`No config entry for plugin "${pluginId}"`);
    cfg.global = { ...cfg.global, ...patch };
  }

  setNode(pluginId, nodeType, patch) {
    const cfg = this._store.get(pluginId);
    if (!cfg) throw new Error(`No config entry for plugin "${pluginId}"`);
    cfg.nodes[nodeType] = { ...(cfg.nodes[nodeType] ?? {}), ...patch };
  }

  cleanup(pluginId) {
    this._store.delete(pluginId);
  }

  // ── Schema validation ────────────────────────────────────────────────────────
  // Returns [] on success, [errorString, ...] on failure.
  // WHY not throw: callers often want to collect all errors and display them
  // to the user at once rather than stopping at the first failure.
  validate(schema, config) {
    if (!schema) return [];
    const errors = [];

    for (const [key, def] of Object.entries(schema)) {
      const val = config?.[key];

      if (def.required && (val === undefined || val === null)) {
        errors.push(`"${key}" is required`);
        continue;
      }
      if (val === undefined || val === null) continue; // optional, not supplied

      if (def.type && typeof val !== def.type) {
        errors.push(`"${key}" must be ${def.type}, got ${typeof val}`);
      }
      if (def.enum && !def.enum.includes(val)) {
        errors.push(`"${key}" must be one of: ${def.enum.join(', ')}`);
      }
      if (def.type === 'number' || def.type === 'string') {
        if (def.min !== undefined && val < def.min)
          errors.push(`"${key}" must be >= ${def.min}`);
        if (def.max !== undefined && val > def.max)
          errors.push(`"${key}" must be <= ${def.max}`);
        if (def.minLength !== undefined && String(val).length < def.minLength)
          errors.push(`"${key}" must be at least ${def.minLength} characters`);
        if (def.maxLength !== undefined && String(val).length > def.maxLength)
          errors.push(`"${key}" must be at most ${def.maxLength} characters`);
      }
      if (def.pattern && !new RegExp(def.pattern).test(String(val))) {
        errors.push(`"${key}" does not match required pattern`);
      }
    }

    return errors;
  }
}

module.exports = new ConfigManager();
