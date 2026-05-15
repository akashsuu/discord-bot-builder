'use strict';

// WHY two loop-protection strategies (depth + visited):
// Depth limit catches infinite RECURSION (A→B→C→A in a chain).
// Visited tracking catches DIAMOND or FAN-IN patterns where the same node
// is reachable via multiple paths — without it we'd execute it multiple times
// per graph run (incorrect behaviour, not just a performance issue).
// visited is scoped to a single executeGraph() call so nodes CAN fire again
// on the NEXT event without being permanently blocked.

const logger = require('./logger').child('Execution');
const registry = require('./pluginRegistry');
const { LoopProtectionError, ExecutionError } = require('./errors');

const MAX_DEPTH = 50; // max recursion depth per graph traversal
const NODE_TIMEOUT_MS = 10_000; // 10 s hard cap per node execution

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOutputNodes(nodeId, nodes, edges, handleId = null) {
 return edges
 .filter((e) => e.source === nodeId && (handleId == null || e.sourceHandle === handleId))
 .map((e) => nodes.find((n) => n.id === e.target))
 .filter(Boolean);
}

function withTimeout(promise, ms, nodeId) {
 return new Promise((resolve, reject) => {
 const timer = setTimeout(
 () => reject(new ExecutionError(`Node timed out after ${ms}ms`, nodeId, null)),
 ms
 );
 promise.then(
 (v) => { clearTimeout(timer); resolve(v); },
 (e) => { clearTimeout(timer); reject(e); }
 );
 });
}

function template(text, vars) {
 return String(text || '').replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, key) => (
 vars[key] === undefined || vars[key] === null ? match : String(vars[key])
 ));
}

function deepGet(obj, dotPath) {
 if (!dotPath || !String(dotPath).trim()) return obj;
 return String(dotPath).split('.').reduce((cur, key) => {
 if (cur === null || cur === undefined) return undefined;
 return Array.isArray(cur) ? cur[Number(key)] : cur[key];
 }, obj);
}

function parseHeaders(raw, vars) {
 const headers = {};
 const text = template(raw || '', vars).trim();
 if (!text) return headers;

 if (text.startsWith('{')) {
 try {
 const parsed = JSON.parse(text);
 for (const [key, value] of Object.entries(parsed || {})) {
 if (key && value !== undefined && value !== null) headers[key] = String(value);
 }
 return headers;
 } catch {
 // Fall back to line parsing below.
 }
 }

 for (const line of text.split(/\r?\n/)) {
 const idx = line.indexOf(':');
 if (idx <= 0) continue;
 const key = line.slice(0, idx).trim();
 const value = line.slice(idx + 1).trim();
 if (key) headers[key] = value;
 }
 return headers;
}

function buildCommandVars(message, prefix, cmd, rawArgs, extra = {}) {
 const parts = rawArgs ? rawArgs.split(/\s+/).filter(Boolean) : [];
 return {
 user: message?.author?.username || '',
 username: message?.author?.username || '',
 tag: message?.author?.tag || '',
 id: message?.author?.id || '',
 user_id: message?.author?.id || '',
 userId: message?.author?.id || '',
 mention: message?.author?.id ? `<@${message.author.id}>` : '',
 server: message?.guild?.name || '',
 guild: message?.guild?.name || '',
 serverId: message?.guild?.id || '',
 server_id: message?.guild?.id || '',
 channel: message?.channel?.name || '',
 channelId: message?.channel?.id || '',
 channel_id: message?.channel?.id || '',
 channelMention: message?.channel?.id ? `<#${message.channel.id}>` : '',
 memberCount: String(message?.guild?.memberCount ?? ''),
 member_count: String(message?.guild?.memberCount ?? ''),
 prefix,
 command: cmd,
 args: rawArgs,
 arg0: parts[0] || '',
 arg1: parts[1] || '',
 arg2: parts[2] || '',
 message: message?.content || '',
 date: new Date().toISOString().slice(0, 10),
 time: new Date().toTimeString().slice(0, 8),
 ...extra,
 };
}

async function runCustomCommandApi(node, eventObj, prefix, cmd, rawArgs) {
 const d = node.data || {};
 const method = String(d.apiMethod || 'GET').toUpperCase();
 const vars = buildCommandVars(eventObj, prefix, cmd, rawArgs);
 const url = template(d.apiUrl || '', vars).trim();
 if (!url) throw new Error('No API URL configured.');

 const headers = parseHeaders(d.apiHeaders || '', vars);
 const noBody = ['GET', 'HEAD'].includes(method);
 if (!noBody && !headers['Content-Type'] && !headers['content-type']) {
 headers['Content-Type'] = 'application/json';
 }

 const controller = new AbortController();
 const timeout = Math.max(1000, Number(d.apiTimeout || 15000));
 const timer = setTimeout(() => controller.abort(), timeout);
 try {
 const options = { method, headers, signal: controller.signal };
 if (!noBody) options.body = template(d.apiBody || '', vars);
 const response = await fetch(url, options);
 const contentType = response.headers.get('content-type') || '';
 const body = contentType.includes('application/json') ? await response.json() : await response.text();
 const extracted = deepGet(body, d.apiResultPath || '');
 const apiResult = extracted && typeof extracted === 'object'
 ? JSON.stringify(extracted, null, 2)
 : String(extracted - (typeof body === 'string' ? body : JSON.stringify(body)));

 if (!response.ok) {
 const err = new Error(`HTTP ${response.status} ${response.statusText}`);
 err.api = { body, apiResult, status: response.status, statusText: response.statusText };
 throw err;
 }

 return {
 apiResult,
 result: apiResult,
 apiStatus: String(response.status),
 apiStatusText: response.statusText,
 apiOk: String(response.ok),
 apiJson: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
 };
 } finally {
 clearTimeout(timer);
 }
}

// ── Build the execution context passed to every plugin's execute() ────────────
// WHY a dedicated context builder:
// Centralising context construction means adding a new field (e.g. "guildConfig")
// only happens in one place — not scattered across every call site.
function buildContext(node, eventObj, eventType, prefix, safeAPI, builtinHelpers) {
 return {
 node, // the graph node (id, type, data/config)
 eventType, // Discord event name, e.g. 'messageCreate'
 eventData: eventObj, // raw Discord object for the event

 // Convenience shorthand — plugins commonly need these
 message: eventType === 'messageCreate' ? eventObj : null,
 prefix: prefix || '!',

 // Safe surfaced API (proxied client, scoped logger, config, utils)
 api: safeAPI,

 // Built-in emit helpers so plugins don't need to re-implement embed logic
 ...builtinHelpers,
 };
}

// ── Core node executor ────────────────────────────────────────────────────────
async function executeNode(node, nodes, edges, eventObj, eventType, prefix, builtinHelpers, depth, visited) {
 // ── Loop protection ─────────────────────────────────────────────────────────
 if (depth > MAX_DEPTH) {
 throw new LoopProtectionError(node.id, depth);
 }
 if (visited.has(node.id)) {
 logger.warn(`Cycle detected — skipping already-visited node "${node.id}"`, { nodeId: node.id });
 return;
 }
 visited.add(node.id);

 logger.debug(`→ ${node.type} (id:${node.id}, depth:${depth})`);

 // ── Plugin node execution ───────────────────────────────────────────────────
 const entry = registry.getNode(node.type);

 if (entry) {
 const ctx = buildContext(node, eventObj, eventType, prefix, entry.safeAPI, builtinHelpers);
 let cont = false;

 try {
 // WHY detect old 3-arg signature:
 // Existing plugins use execute(node, message, ctx). New plugins use execute(ctx).
 // We bridge this so the engine upgrade is non-breaking.
 const execFn = entry.definition.execute;
 const isLegacy = execFn.length >= 2; // legacy: (node, eventObj, ctx)

 const raw = isLegacy
 ? execFn(node, eventObj, { ...builtinHelpers, prefix, eventType, eventData: eventObj })
 : execFn(ctx);

 cont = await withTimeout(
 Promise.resolve(raw),
 NODE_TIMEOUT_MS,
 node.id
 );
 } catch (err) {
 // WHY swallow here: one bad plugin must not kill the whole graph run.
 // LoopProtectionError is re-thrown because it signals a structural problem.
 if (err instanceof LoopProtectionError) throw err;

 logger.error(
 `Plugin node "${node.type}" (${node.id}) threw: ${err.message}`,
 { nodeId: node.id, nodeType: node.type, stack: err.stack }
 );
 return; // do not traverse outputs after a failure
 }

 if (cont) {
 for (const next of getOutputNodes(node.id, nodes, edges)) {
 await executeNode(next, nodes, edges, eventObj, eventType, prefix, builtinHelpers, depth + 1, visited);
 }
 }
 return;
 }

 // ── Built-in node execution (event pass-through, custom_command, etc.) ──────
 await executeBuiltinNode(node, nodes, edges, eventObj, eventType, prefix, builtinHelpers, depth, visited);
}

async function executeBuiltinNode(node, nodes, edges, eventObj, eventType, prefix, builtinHelpers, depth, visited) {
 const { substitute, buildEmbed } = builtinHelpers;

 switch (node.type) {
 case 'event_message':
 case 'event_channel':
 case 'event_client':
 case 'event_emoji':
 case 'event_guild':
 case 'event_member':
 case 'event_role': {
 for (const next of getOutputNodes(node.id, nodes, edges)) {
 await executeNode(next, nodes, edges, eventObj, eventType, prefix, builtinHelpers, depth + 1, visited);
 }
 break;
 }

 case 'custom_command': {
 const rawCmd = (node.data.command || '').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const content = eventObj?.content || '';
 if (!cmd || !content.startsWith(cmd)) return;
 const nextChar = content.charAt(cmd.length);
 if (nextChar && !/\s/.test(nextChar)) return;
 const rawArgs = content.slice(cmd.length).trim();

 if (node.data.apiEnabled) {
 try {
 if (eventObj?.channel?.sendTyping) await eventObj.channel.sendTyping().catch(() => {});
 const apiVars = await runCustomCommandApi(node, eventObj, prefix, cmd, rawArgs);
 const text = template(
 node.data.apiReply || node.data.reply || '{apiResult}',
 buildCommandVars(eventObj, prefix, cmd, rawArgs, apiVars)
 );
 if (node.data.embedEnabled) {
 await eventObj.channel.send({ embeds: [buildEmbed(node.data, text)] });
 } else if (text) {
 await eventObj.channel.send(text.slice(0, 2000));
 }
 } catch (err) {
 const apiError = err?.message || 'API request failed';
 const text = template(
 node.data.apiErrorMessage || 'API error: {apiError}',
 buildCommandVars(eventObj, prefix, cmd, rawArgs, {
 apiError,
 error: apiError,
 apiStatus: String(err?.api?.status || ''),
 apiStatusText: err?.api?.statusText || '',
 apiResult: err?.api?.apiResult || '',
 apiOk: 'false',
 })
 );
 if (text && eventObj?.channel) await eventObj.channel.send(text.slice(0, 2000)).catch(() => {});
 return;
 }
 } else if (node.data.reply) {
 const text = substitute(node.data.reply, eventObj, buildCommandVars(eventObj, prefix, cmd, rawArgs));
 if (node.data.embedEnabled) {
 await eventObj.channel.send({ embeds: [buildEmbed(node.data, text)] });
 } else {
 await eventObj.channel.send(text);
 }
 }
 for (const next of getOutputNodes(node.id, nodes, edges)) {
 await executeNode(next, nodes, edges, eventObj, eventType, prefix, builtinHelpers, depth + 1, visited);
 }
 break;
 }

 case 'send_message': {
 const text = substitute(node.data.text || '', eventObj);
 const chan = eventObj?.channel;
 if (chan) {
 if (node.data.embedEnabled) {
 await chan.send({ embeds: [buildEmbed(node.data, text)] });
 } else if (text) {
 await chan.send(text);
 }
 }
 for (const next of getOutputNodes(node.id, nodes, edges)) {
 await executeNode(next, nodes, edges, eventObj, eventType, prefix, builtinHelpers, depth + 1, visited);
 }
 break;
 }

 case 'condition_branch': {
 const val = node.data.value || '';
 const content = eventObj?.content || '';
 let result = false;
 switch (node.data.condition) {
 case 'starts_with': result = content.startsWith(val); break;
 case 'contains': result = content.includes(val); break;
 case 'equals': result = content === val; break;
 }
 const branch = result ? 'true' : 'false';
 for (const next of getOutputNodes(node.id, nodes, edges, branch)) {
 await executeNode(next, nodes, edges, eventObj, eventType, prefix, builtinHelpers, depth + 1, visited);
 }
 break;
 }

 default:
 logger.warn(`Unknown node type "${node.type}" — skipping`);
 }
}

// ── Public entry point ────────────────────────────────────────────────────────
// One call per triggering event node — creates a fresh visited Set per run.
async function executeGraph(eventNode, nodes, edges, eventObj, eventType, prefix, builtinHelpers) {
 const visited = new Set();
 try {
 await executeNode(eventNode, nodes, edges, eventObj, eventType, prefix, builtinHelpers, 0, visited);
 } catch (err) {
 if (err instanceof LoopProtectionError) {
 logger.error(`Loop protection: ${err.message}`, { nodeId: err.nodeId, depth: err.depth });
 } else {
 logger.error(`Graph execution failed: ${err.message}`, { stack: err.stack });
 }
 }
}

module.exports = { executeGraph, getOutputNodes };
