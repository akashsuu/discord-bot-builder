'use strict';

module.exports = {
 meta: {
 name: 'Flow Command',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Command trigger with alias support, cooldown, and argument parsing.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 flow_command: {
 label: 'Flow Command',
 icon: '⚡',
 color: '#1E3A5F',
 description: 'Triggers on a command string. Parses args, enforces cooldowns, and seeds the shared flow context.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'kick', required: true, description: 'Primary command word (without prefix)' },
 aliases: { type: 'string', default: '', required: false, description: 'Comma-separated alias words' },
 cooldown: { type: 'number', default: 0, min: 0, max: 3600, description: 'Per-user cooldown in seconds (0 = disabled)' },
 cooldownMessage: { type: 'string', default: '⏱️ Please wait **{remaining}s** before using this command again.', required: false },
 },

 async execute(node, message, ctx) {
 if (!message || message.author.bot) return false;
 if (!message.guild) return false;

 // ── 1. Build full command string (apply prefix) ─────────────────────
 const prefix = ctx?.prefix || '';
 const rawCmd = (node.data?.command || 'kick').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;

 // Parse and prefix aliases
 const rawAliases = String(node.data?.aliases || '')
 .split(',').map((s) => s.trim()).filter(Boolean);
 const aliases = rawAliases.map((a) =>
 (prefix && !a.startsWith(prefix)) ? prefix + a : a
 );

 // ── 2. Match command or alias ────────────────────────────────────────
 const content = message.content;
 const allTriggers = [cmd, ...aliases];
 const matched = allTriggers.find((t) =>
 content.toLowerCase().startsWith(t.toLowerCase())
 );
 if (!matched) return false;

 // ── 3. Cooldown enforcement ──────────────────────────────────────────
 const cooldownSec = Number(node.data?.cooldown - 0);
 if (cooldownSec > 0 && ctx.cooldowns instanceof Map) {
 const key = `${message.guild.id}:${message.author.id}:${rawCmd}`;
 const last = ctx.cooldowns.get(key) || 0;
 const diff = Date.now() - last;

 if (diff < cooldownSec * 1000) {
 const remaining = ((cooldownSec * 1000 - diff) / 1000).toFixed(1);
 const tpl = node.data?.cooldownMessage
 || '⏱️ Please wait **{remaining}s** before using this command again.';
 const msg = tpl.replace(/\{remaining\}/g, remaining);

 try {
 if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, msg);
 else await message.reply(msg);
 } catch { await message.reply(msg).catch(() => {}); }
 return false;
 }
 ctx.cooldowns.set(key, Date.now());
 }

 // ── 4. Parse arguments ────────────────────────────────────────────────
 const rawArgs = content.slice(matched.length).trim();
 const parsed = rawArgs ? rawArgs.split(/\s+/) : [];

 // Mutate shared array in-place so downstream nodes see the same ref
 if (Array.isArray(ctx.args)) {
 ctx.args.length = 0;
 ctx.args.push(...parsed);
 }

 // ── 5. Populate shared flow object for primitives ─────────────────────
 // ctx.flow is a plain object reference shared across all nodes in this run.
 if (ctx.flow && typeof ctx.flow === 'object') {
 ctx.flow.command = matched;
 ctx.flow.targetMember = message.mentions.members?.first() || null;
 ctx.flow.targetUser = message.mentions.users?.first() || null;
 // reason = everything after mentions, without the mention tokens
 ctx.flow.reason = rawArgs.replace(/<@!?\d+>/g, '').replace(/\s+/g, ' ').trim() || null;
 }

 // ── 6. Guarantee allowedUsers / allowedRoles are ready ────────────────
 // These are Set references from botRunner — defensive check only.
 if (!(ctx.allowedUsers instanceof Set)) ctx.allowedUsers = new Set();
 if (!(ctx.allowedRoles instanceof Set)) ctx.allowedRoles = new Set();

 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = (node.data?.command || 'kick').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const cooldown = Number(node.data?.cooldown - 0);
 return `
// ── Flow Command: ${cmd} ${'─'.repeat(Math.max(0, 40 - cmd.length))}
if (!message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) return;
${cooldown > 0 ? `
const _cdKey = \`\${message.guild?.id}:\${message.author.id}:${rawCmd}\`;
const _cdLast = (_cooldowns - _cooldowns_${rawCmd.replace(/\W/g,'')} -= new Map()).get(_cdKey) || 0;
if (Date.now() - _cdLast < ${cooldown * 1000}) {
 const _rem = ((${cooldown * 1000} - (Date.now() - _cdLast)) / 1000).toFixed(1);
 message.reply(\`⏱️ Wait \${_rem}s.\`); return;
}
(_cooldowns - new Map()).set(_cdKey, Date.now());` : ''}
const _args = message.content.slice("${cmd}".length).trim().split(/\\s+/).filter(Boolean);
const _target = message.mentions.members?.first() || null;
const _reason = message.content.slice("${cmd}".length).replace(/<@!?\\d+>/g,'').trim() || null;`;
 },
 },
 },
};
