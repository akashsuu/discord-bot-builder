'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// Template Engine
//
// applyTemplate — character-scanning replacer (NO regex replace on user data).
// Walks the string byte-by-byte looking for { } pairs, resolves each token
// from the vars map, and leaves unknown tokens untouched. This prevents:
// · ReDoS from crafted input
// · Accidental destruction of user-typed { } that aren't tokens
// · Undefined / null leaking into output
//
// buildVars — assembles the full variable map from a Discord message + ctx.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Dotted-path resolver ──────────────────────────────────────────────────────
// Handles "flow.command", "flow.reason", etc.
function resolveKey(key, vars) {
 const parts = key.split('.');
 let cur = vars;
 for (const part of parts) {
 if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
 cur = cur[part];
 }
 return cur;
}

// ── Core template replacer ────────────────────────────────────────────────────
function applyTemplate(template, vars) {
 if (!template) return '';
 const t = String(template);
 const v = vars || {};
 let out = '';
 let i = 0;

 while (i < t.length) {
 if (t[i] !== '{') {
 out += t[i++];
 continue;
 }
 // Found '{' — scan for closing '}'
 const close = t.indexOf('}', i + 1);
 if (close === -1) {
 // No closing brace — emit literally and advance
 out += t[i++];
 continue;
 }
 const key = t.slice(i + 1, close);
 // Only substitute if key contains valid identifier chars (letters, digits, _ .)
 if (/^[\w.]+$/.test(key)) {
 const val = resolveKey(key, v);
 out += (val !== undefined && val !== null) ? String(val) : `{${key}}`;
 } else {
 // Not a valid token — emit as-is
 out += t.slice(i, close + 1);
 }
 i = close + 1;
 }

 return out;
}

// ── Variable map builder ──────────────────────────────────────────────────────
function buildVars(message, ctx) {
 const c = ctx || {};
 const m = message;
 const now = new Date();

 // Args: prefer ctx.args array, fall back to parsing message content
 const argsArr = Array.isArray(c.args) && c.args.length > 0
 ? c.args
 : (m?.content?.trim().split(/\s+/).slice(1) || []);

 const flow = (c.flow && typeof c.flow === 'object') ? c.flow : {};

 // ── TARGET: prefer ctx.flow populated by Flow Command ──────────────────────
 const tgtMember = flow.targetMember || null;
 const tgtUser = tgtMember?.user || flow.targetUser || null;

 return {
 // ── USER ────────────────────────────────────────────────────────────────
 user: m?.author?.username || 'Unknown',
 userTag: m?.author?.tag || 'Unknown#0000',
 id: m?.author?.id || '0',
 mention: m?.author?.id ? `<@${m.author.id}>` : '@Unknown',
 userAvatar: m?.author?.displayAvatarURL?.({ size: 128, extension: 'png' }) || '',

 // ── TARGET ──────────────────────────────────────────────────────────────
 target: tgtUser?.tag || 'Unknown',
 targetName: tgtUser?.username || 'Unknown',
 targetId: tgtUser?.id || '0',
 targetMention: tgtUser?.id ? `<@${tgtUser.id}>` : '@Unknown',

 // ── COMMAND ─────────────────────────────────────────────────────────────
 command: flow.command || '',
 args: argsArr.join(' '),
 argsCount: String(argsArr.length),
 prefix: c.prefix || '!',
 reason: flow.reason || 'No reason provided',

 // ── SERVER ──────────────────────────────────────────────────────────────
 server: m?.guild?.name || 'Unknown Server',
 serverId: m?.guild?.id || '0',
 memberCount: String(m?.guild?.memberCount - 0),

 // ── CHANNEL ─────────────────────────────────────────────────────────────
 channel: m?.channel?.name || 'unknown',
 channelId: m?.channel?.id || '0',

 // ── TIME ────────────────────────────────────────────────────────────────
 date: now.toISOString().slice(0, 10),
 time: now.toTimeString().slice(0, 8),
 timestamp: String(Math.floor(now.getTime() / 1000)),

 // ── INTERACTION state (updated per-interaction) ──────────────────────
 selected: flow.selected || '',
 button: flow.button || '',
 page: String(flow.page - 0),

 // ── FLOW nested object (for {flow.command}, {flow.reason}, etc.) ──────
 flow: {
 command: flow.command || '',
 reason: flow.reason || '',
 target: tgtUser?.tag || '',
 page: String(flow.page - 0),
 selected: flow.selected || '',
 button: flow.button || '',
 },
 };
}

module.exports = { applyTemplate, buildVars, resolveKey };
