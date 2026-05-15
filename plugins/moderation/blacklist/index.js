'use strict';

const { PermissionFlagsBits } = require('discord.js');

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function parseUserIds(value) {
 const raw = Array.isArray(value) ? value : String(value || '').split(/[\s,;]+/);
 return [...new Set(raw.map((v) => String(v).trim()).filter((id) => /^\d{17,20}$/.test(id)))];
}

function buildVars(message, mode) {
 const now = new Date();
 return {
 user: message.author?.username || 'Unknown',
 tag: message.author?.tag || 'Unknown#0000',
 id: message.author?.id || '0',
 mention: `<@${message.author?.id || '0'}>`,
 mode,
 server: message.guild?.name || 'Unknown',
 channel: message.channel?.name || 'Unknown',
 date: now.toISOString().slice(0, 10),
 time: now.toTimeString().slice(0, 8),
 };
}

function isBlockedByMode(message, mode, prefix) {
 const content = String(message.content || '');
 if (mode === 'block_all') return true;
 if (mode === 'block_commands') {
 if (!prefix) return content.startsWith('!');
 return content.startsWith(prefix);
 }
 return false;
}

module.exports = {
 meta: {
 name: 'Blacklist',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Blocks configured user IDs from bot usage.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_blacklist: {
 label: 'Blacklist',
 icon: 'BL',
 color: '#5B1D1D',
 description: 'Blocks blacklisted users. Supports command-only blocking or all-message blocking.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 enabled: { type: 'boolean', default: true, required: false },
 userIds: {
 type: 'string',
 default: '',
 required: true,
 description: 'Blacklisted user IDs, separated by comma, space, semicolon, or new line'
 },
 mode: {
 type: 'string',
 default: 'block_commands',
 enum: ['block_commands', 'block_all'],
 required: false,
 description: 'block_commands blocks command messages only; block_all blocks every message.'
 },
 deleteMessage: { type: 'boolean', default: false, required: false },
 warnUser: { type: 'boolean', default: true, required: false },
 ignoreAdmins: { type: 'boolean', default: true, required: false },
 output: {
 type: 'string',
 default: '{mention}, you are blacklisted from using this server bot.',
 required: false
 },
 },

 async execute(ctx) {
 const { node, message, prefix } = ctx;

 if (node.data?.enabled === false) return false;
 if (!message || !message.guild || message.author?.bot) return false;

 if (
 node.data?.ignoreAdmins !== false &&
 message.member?.permissions.has(PermissionFlagsBits.Administrator)
 ) {
 return false;
 }

 const blacklist = parseUserIds(node.data?.userIds);
 if (!blacklist.length || !blacklist.includes(message.author.id)) return false;

 const mode = node.data?.mode || 'block_commands';
 if (!isBlockedByMode(message, mode, prefix || '')) return false;

 if (node.data?.deleteMessage) {
 await message.delete().catch(() => {});
 }

 if (node.data?.warnUser !== false) {
 const vars = buildVars(message, mode);
 const text = applyTemplate(
 node.data?.output || '{mention}, you are blacklisted from using this server bot.',
 vars
 );

 try {
 if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, text);
 else await message.reply(text);
 } catch {
 await message.reply(text).catch(() => {});
 }
 }

 return false;
 },

 generateCode(node) {
 const ids = JSON.stringify(parseUserIds(node.data?.userIds));
 const mode = node.data?.mode || 'block_commands';
 const output = (node.data?.output || '{mention}, you are blacklisted from using this server bot.')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');
 const deleteMessage = !!node.data?.deleteMessage;
 const warnUser = node.data?.warnUser !== false;
 const ignoreAdmins = node.data?.ignoreAdmins !== false;

 return `
// Blacklist
{
 const _bl_ids = ${ids};
 const _bl_isBlacklisted = _bl_ids.includes(message.author?.id);
 const _bl_modeBlock = ${
 mode === 'block_all'
 ? 'true'
 : '(typeof prefix !== "undefined" && prefix ? message.content.startsWith(prefix) : message.content.startsWith("!"))'
 };

 if (_bl_isBlacklisted && _bl_modeBlock${ignoreAdmins ? ' && !message.member?.permissions.has("Administrator")' : ''}) {
 ${deleteMessage ? 'try { await message.delete(); } catch {}' : ''}
 ${warnUser ? `
 const _bl_vars = {
 mention: \`<@\${message.author?.id}>\`
 };
 const _bl_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _bl_vars[k] - m);
 message.reply(_bl_apply(\`${output}\`)).catch(() => {});
 ` : ''}
 return;
 }
}
`;
 },
 },
 },
};
