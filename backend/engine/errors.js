'use strict';

// WHY custom error classes: typed errors let callers react differently to
// validation failures vs. version mismatches vs. runtime crashes — a single
// generic Error forces consumers to parse message strings.

class PluginError extends Error {
 constructor(message, pluginId, cause = null) {
 super(message);
 this.name = 'PluginError';
 this.pluginId = pluginId;
 this.cause = cause;
 }
}

class ValidationError extends PluginError {
 constructor(message, pluginId, field = null) {
 super(message, pluginId);
 this.name = 'ValidationError';
 this.field = field;
 }
}

class IncompatibleVersionError extends PluginError {
 constructor(pluginId, required, actual) {
 super(
 `Plugin "${pluginId}" requires engine v${required}, current engine is v${actual}`,
 pluginId
 );
 this.name = 'IncompatibleVersionError';
 this.required = required;
 this.actual = actual;
 }
}

class NodeTypeConflictError extends PluginError {
 constructor(nodeType, pluginId, existingPluginId) {
 super(
 `Node type "${nodeType}" from "${pluginId}" conflicts with one already registered by "${existingPluginId}"`,
 pluginId
 );
 this.name = 'NodeTypeConflictError';
 this.nodeType = nodeType;
 this.existingPluginId = existingPluginId;
 }
}

class ExecutionError extends Error {
 constructor(message, nodeId, nodeType, cause = null) {
 super(message);
 this.name = 'ExecutionError';
 this.nodeId = nodeId;
 this.nodeType = nodeType;
 this.cause = cause;
 }
}

class LoopProtectionError extends Error {
 constructor(nodeId, depth) {
 super(`Loop protection triggered at node "${nodeId}" (depth ${depth})`);
 this.name = 'LoopProtectionError';
 this.nodeId = nodeId;
 this.depth = depth;
 }
}

module.exports = {
 PluginError,
 ValidationError,
 IncompatibleVersionError,
 NodeTypeConflictError,
 ExecutionError,
 LoopProtectionError,
};
