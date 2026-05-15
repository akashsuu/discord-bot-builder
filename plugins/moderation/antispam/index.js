'use strict';

const { PermissionFlagsBits } = require('discord.js');

const buckets = new Map();

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function buildVars(message, count, intervalSeconds, timeoutSeconds) {
 const now = new Date();

 return {
 user: message.author?.username || 'Unknown',
 tag: message.author?.tag || 'Unknown#0000',
 id: message.author?.id || '0',
 mention: `<@${message.author?.id || '0'}>`,
 count: String(count),
 limit: String(count),
 interval: String(intervalSeconds),
 timeout: String(timeoutSeconds),
 server: message.guild?.name || 'Unknown',
 channel: message.channel?.name || 'Unknown',
 date: now.toISOString().slice(0, 10),
 time: now.toTimeString().slice(0, 8),
 };
}

function getRecentMessageCount(message, intervalMs) {
 const key = `${message.guild.id}:${message.channel.id}:${message.author.id}`;
 const now = Date.now();
 const recent = (buckets.get(key) || []).filter((timestamp) => now - timestamp <= intervalMs);

 recent.push(now);
 buckets.set(key, recent);

 return recent.length;
}

module.exports = {
 meta: {
 name: 'Anti Spam',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Blocks users who send too many messages in a short time.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_antispam: {
 label: 'Anti Spam',
 icon: 'SPAM',
 color: '#B45309',
 description: 'Rate-limits repeated messages per user and channel with optional deletion, warning, and timeout.',

 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 enabled: { type: 'boolean', default: true, required: false },
 maxMessages: {
 type: 'number',
 default: 5,
 min: 2,
 max: 30,
 required: false,
 description: 'How many messages are allowed in the interval'
 },
 intervalSeconds: {
 type: 'number',
 default: 8,
 min: 2,
 max: 120,
 required: false,
 description: 'Time window for spam detection'
 },
 deleteMessage: { type: 'boolean', default: true, required: false },
 warnUser: { type: 'boolean', default: true, required: false },
 ignoreAdmins: { type: 'boolean', default: true, required: false },
 timeoutSeconds: {
 type: 'number',
 default: 0,
 min: 0,
 max: 2419200,
 required: false,
 description: 'Optional timeout duration in seconds, 0 disables timeout'
 },
 output: {
 type: 'string',
 default: '{mention}, slow down. Spam is not allowed here.',
 required: false
 },
 },

 async execute(ctx) {
 const { node, message } = ctx;

 if (node.data?.enabled === false) return false;
 if (!message || !message.guild || message.author?.bot) return false;

 if (
 node.data?.ignoreAdmins !== false &&
 message.member?.permissions.has(PermissionFlagsBits.Administrator)
 ) {
 return false;
 }

 const maxMessages = Math.max(2, Number(node.data?.maxMessages ?? 5));
 const intervalSeconds = Math.max(2, Number(node.data?.intervalSeconds ?? 8));
 const count = getRecentMessageCount(message, intervalSeconds * 1000);

 if (count <= maxMessages) return false;

 if (node.data?.deleteMessage !== false) {
 await message.delete().catch(() => {});
 }

 const timeoutSeconds = Math.max(0, Number(node.data?.timeoutSeconds ?? 0));
 if (timeoutSeconds > 0) {
 const botCanTimeout = message.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers);
 const memberCanBeTimedOut = Boolean(message.member?.moderatable);

 if (botCanTimeout && memberCanBeTimedOut) {
 await message.member.timeout(timeoutSeconds * 1000, 'Anti spam triggered').catch(() => {});
 }
 }

 if (node.data?.warnUser !== false) {
 const vars = buildVars(message, maxMessages, intervalSeconds, timeoutSeconds);
 const outputTpl = node.data?.output || '{mention}, slow down. Spam is not allowed here.';
 const text = applyTemplate(outputTpl, vars);

 try {
 if (ctx.sendEmbed) {
 await ctx.sendEmbed(message, node.data, text);
 } else {
 await message.channel.send(text);
 }
 } catch {
 await message.channel.send(text).catch(() => {});
 }
 }

 return true;
 },

 generateCode(node) {
 const maxMessages = Math.max(2, Number(node.data?.maxMessages ?? 5));
 const intervalSeconds = Math.max(2, Number(node.data?.intervalSeconds ?? 8));
 const timeoutSeconds = Math.max(0, Number(node.data?.timeoutSeconds ?? 0));
 const output = (node.data?.output || '{mention}, slow down. Spam is not allowed here.')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');
 const deleteMessage = node.data?.deleteMessage !== false;
 const warnUser = node.data?.warnUser !== false;
 const ignoreAdmins = node.data?.ignoreAdmins !== false;

 return `
// Anti Spam
{
 const _as_buckets = globalThis.__antiSpamBuckets -= new Map();
 const _as_key = \`\${message.guild?.id}:\${message.channel?.id}:\${message.author?.id}\`;
 const _as_now = Date.now();
 const _as_recent = (_as_buckets.get(_as_key) || []).filter((time) => _as_now - time <= ${intervalSeconds * 1000});
 _as_recent.push(_as_now);
 _as_buckets.set(_as_key, _as_recent);

 if (_as_recent.length > ${maxMessages}${ignoreAdmins ? ' && !message.member?.permissions.has("Administrator")' : ''}) {
 ${deleteMessage ? 'try { await message.delete(); } catch {}' : ''}
 ${timeoutSeconds > 0 ? `if (message.guild.members.me?.permissions.has("ModerateMembers") && message.member?.moderatable) {
 await message.member.timeout(${timeoutSeconds * 1000}, "Anti spam triggered").catch(() => {});
 }` : ''}
 ${warnUser ? `
 const _as_vars = {
 user: message.author?.username,
 tag: message.author?.tag,
 id: message.author?.id,
 mention: \`<@\${message.author?.id}>\`,
 count: String(${maxMessages}),
 limit: String(${maxMessages}),
 interval: String(${intervalSeconds}),
 timeout: String(${timeoutSeconds}),
 server: message.guild?.name,
 channel: message.channel?.name,
 date: new Date().toISOString().slice(0, 10),
 time: new Date().toTimeString().slice(0, 8),
 };
 const _as_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _as_vars[k] - m);
 message.channel.send(_as_apply(\`${output}\`)).catch(() => {});
 ` : ''}
 }
}
`;
 },
 },
 },
};
