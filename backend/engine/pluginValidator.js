'use strict';

// WHY a dedicated validator module:
// Validation logic is complex and grows over time (new required fields,
// stricter rules, new node port shapes). Keeping it isolated means
// pluginLoader stays clean — it loads, validator decides correctness.

const semver     = require('./semver');
const { ValidationError, IncompatibleVersionError } = require('./errors');

const ENGINE_VERSION = require('../../package.json').version;

const REQUIRED_META = ['name', 'version', 'author', 'engineVersion'];

// ── Meta block ────────────────────────────────────────────────────────────────
function validateMeta(meta, pluginId) {
  if (!meta || typeof meta !== 'object') {
    throw new ValidationError('Plugin must export a "meta" object', pluginId, 'meta');
  }

  for (const field of REQUIRED_META) {
    if (!meta[field] || typeof meta[field] !== 'string') {
      throw new ValidationError(
        `meta.${field} must be a non-empty string`,
        pluginId,
        `meta.${field}`
      );
    }
  }

  if (!semver.valid(meta.version)) {
    throw new ValidationError(
      `meta.version "${meta.version}" is not a valid semver string (e.g. "1.0.0")`,
      pluginId,
      'meta.version'
    );
  }

  // WHY semver range check: prevents plugins built for a future breaking engine
  // version from silently misbehaving at runtime.
  if (!semver.satisfies(ENGINE_VERSION, meta.engineVersion)) {
    throw new IncompatibleVersionError(pluginId, meta.engineVersion, ENGINE_VERSION);
  }
}

// ── Config schema (optional per-node) ────────────────────────────────────────
function validateConfigSchema(schema, pluginId, path) {
  if (schema === undefined) return; // optional
  if (typeof schema !== 'object' || Array.isArray(schema)) {
    throw new ValidationError(
      `${path} must be a plain object { fieldName: { type, default?, required? } }`,
      pluginId,
      path
    );
  }
  for (const [key, def] of Object.entries(schema)) {
    if (!def || typeof def !== 'object') {
      throw new ValidationError(`${path}.${key} descriptor must be an object`, pluginId, `${path}.${key}`);
    }
    if (def.type && !['string','number','boolean','object','array'].includes(def.type)) {
      throw new ValidationError(
        `${path}.${key}.type "${def.type}" is not a recognised type`,
        pluginId,
        `${path}.${key}.type`
      );
    }
  }
}

// ── Node ports (inputs / outputs) ─────────────────────────────────────────────
function validatePorts(ports, pluginId, path) {
  if (ports === undefined) return; // optional
  if (!Array.isArray(ports)) {
    throw new ValidationError(`${path} must be an array of port descriptors`, pluginId, path);
  }
  ports.forEach((p, i) => {
    if (!p || typeof p !== 'object') {
      throw new ValidationError(`${path}[${i}] must be an object`, pluginId, `${path}[${i}]`);
    }
    if (typeof p.id !== 'string' || !p.id) {
      throw new ValidationError(`${path}[${i}].id must be a non-empty string`, pluginId, `${path}[${i}].id`);
    }
  });
}

// ── Single node definition ────────────────────────────────────────────────────
function validateNode(nodeType, def, pluginId) {
  const path = `nodes.${nodeType}`;

  if (!def || typeof def !== 'object') {
    throw new ValidationError(`${path} must be an object`, pluginId, path);
  }
  if (typeof def.label !== 'string' || !def.label.trim()) {
    throw new ValidationError(`${path}.label must be a non-empty string`, pluginId, `${path}.label`);
  }
  if (typeof def.execute !== 'function') {
    throw new ValidationError(`${path}.execute must be a function`, pluginId, `${path}.execute`);
  }

  // WHY check for async: a synchronous execute() that throws will crash the
  // await call site; we need every execute to return a Promise.
  const isAsync = def.execute.constructor.name === 'AsyncFunction';
  if (!isAsync) {
    throw new ValidationError(
      `${path}.execute must be declared async (or explicitly return a Promise)`,
      pluginId,
      `${path}.execute`
    );
  }

  validatePorts(def.inputs,  pluginId, `${path}.inputs`);
  validatePorts(def.outputs, pluginId, `${path}.outputs`);
  validateConfigSchema(def.configSchema, pluginId, `${path}.configSchema`);
}

// ── Top-level plugin export ───────────────────────────────────────────────────
function validatePlugin(plugin, pluginId) {
  if (!plugin || typeof plugin !== 'object' || Array.isArray(plugin)) {
    throw new ValidationError('Plugin export must be a plain object', pluginId, 'root');
  }

  // WHY allow missing meta: hundreds of legacy plugins pre-date the meta block.
  // We warn instead of erroring so the engine stays backward-compatible.
  // Version-checking is simply skipped for legacy plugins.
  if (plugin.meta) {
    validateMeta(plugin.meta, pluginId);
  }

  if (!plugin.nodes || typeof plugin.nodes !== 'object' || Array.isArray(plugin.nodes)) {
    throw new ValidationError('Plugin must export a "nodes" plain object', pluginId, 'nodes');
  }
  const nodeTypes = Object.keys(plugin.nodes);
  if (nodeTypes.length === 0) {
    throw new ValidationError('Plugin must define at least one node', pluginId, 'nodes');
  }
  for (const [nodeType, def] of Object.entries(plugin.nodes)) {
    validateNode(nodeType, def, pluginId);
  }

  // Lifecycle hooks are optional but must be functions when present
  for (const hook of ['onLoad', 'onUnload']) {
    if (plugin[hook] !== undefined && typeof plugin[hook] !== 'function') {
      throw new ValidationError(
        `Lifecycle hook "${hook}" must be a function`,
        pluginId,
        hook
      );
    }
  }

  return true;
}

module.exports = { validatePlugin };
