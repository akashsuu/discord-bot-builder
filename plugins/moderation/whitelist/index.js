'use strict';

const { PermissionFlagsBits } = require('discord.js');

const guildWhitelists = new Map();

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function parseUserId(token) {
 const cleaned = String(token || '').trim().replace(/[<@!>]/g, '');
 return /^\d{17,20}$/.test(cleaned) ? cleaned : null;
}

function getGuildSet(guildId) {
 if (!guildWhitelists.has(guildId)) guildWhitelists.set(guildId, new Set());
 return guildWhitelists.get(guildId);
}

module.exports = {
 meta: {
 name: 'Whitelist',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Manages whitelist entries through chat commands.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_whitelist: {
 label: 'Whitelist',
 icon: 'WL',
 color: '#1D4ED8',
 description: 'Prefix command for whitelist management: add/remove/list/check/clear.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'whitelist', required: true },
 output: {
 type: 'string',
 default: '{mention} whitelist {action} successful for `{targetId}`.',
 required: false
 },
 listOutput: {
 type: 'string',
 default: 'Whitelisted IDs ({count}): {ids}',
 required: false
 },
 },

 async execute(ctx) {
 const { node, message, prefix } = ctx;
 if (!message || !message.guild || message.author?.bot) return false;

 const rawCmd = (node.data?.command || 'whitelist').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

 if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
 await message.reply('You need Administrator permission.').catch(() => {});
 return false;
 }

 const args = message.content.slice(cmd.length).trim().split(/\s+/).filter(Boolean);
 const action = (args[0] || '').toLowerCase();
 const set = getGuildSet(message.guild.id);

 if (!action || !['add', 'remove', 'list', 'check', 'clear'].includes(action)) {
 await message.reply(`Usage: \`${cmd} <add|remove|list|check|clear> [userId]\``).catch(() => {});
 return false;
 }

 if (action === 'list') {
 const ids = [...set.values()];
 const text = applyTemplate(
 node.data?.listOutput || 'Whitelisted IDs ({count}): {ids}',
 { count: String(ids.length), ids: ids.join(', ') || 'None' }
 );
 await message.channel.send(text).catch(() => {});
 return true;
 }

 if (action === 'clear') {
 set.clear();
 await message.channel.send(`${message.author} whitelist cleared for this server.`).catch(() => {});
 return true;
 }

 const targetId = parseUserId(args[1]);
 if (!targetId) {
 await message.reply(`Usage: \`${cmd} ${action} <userId>\``).catch(() => {});
 return false;
 }

 if (action === 'add') set.add(targetId);
 if (action === 'remove') set.delete(targetId);

 if (action === 'check') {
 const exists = set.has(targetId);
 await message.channel.send(`Whitelist check for \`${targetId}\`: ${exists ? 'YES' : 'NO'}`).catch(() => {});
 return true;
 }

 const text = applyTemplate(
 node.data?.output || '{mention} whitelist {action} successful for `{targetId}`.',
 { mention: `<@${message.author?.id || '0'}>`, action, targetId }
 );
 await message.channel.send(text).catch(() => {});
 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = (node.data?.command || 'whitelist').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 return `
// Whitelist Manager
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 const _wl_store = globalThis.__whitelistStore -= new Map();
 const _wl_get = (g) => { if (!_wl_store.has(g)) _wl_store.set(g, new Set()); return _wl_store.get(g); };
 const _wl_args = message.content.slice("${cmd}".length).trim().split(/\\s+/).filter(Boolean);
 const _wl_action = (_wl_args[0] || "").toLowerCase();
 const _wl_set = _wl_get(message.guild.id);
 const _wl_parseId = (t) => {
 const c = String(t || "").trim().replace(/[<@!>]/g, "");
 return /^\\d{17,20}$/.test(c) ? c : null;
 };
 if (_wl_action === "list") {
 message.channel.send(\`Whitelisted IDs (\${_wl_set.size}): \${[..._wl_set].join(", ") || "None"}\`).catch(() => {});
 } else if (_wl_action === "clear") {
 _wl_set.clear();
 message.channel.send(\`\${message.author} whitelist cleared for this server.\`).catch(() => {});
 } else if (_wl_action === "add" || _wl_action === "remove" || _wl_action === "check") {
 const _wl_id = _wl_parseId(_wl_args[1]);
 if (!_wl_id) {
 message.reply(\`Usage: \\\`${cmd} \${_wl_action} <userId>\\\`\`).catch(() => {});
 } else if (_wl_action === "add") {
 _wl_set.add(_wl_id); message.channel.send(\`Whitelist add successful for \\\`\${_wl_id}\\\`.\`).catch(() => {});
 } else if (_wl_action === "remove") {
 _wl_set.delete(_wl_id); message.channel.send(\`Whitelist remove successful for \\\`\${_wl_id}\\\`.\`).catch(() => {});
 } else {
 message.channel.send(\`Whitelist check for \\\`\${_wl_id}\\\`: \${_wl_set.has(_wl_id) ? "YES" : "NO"}\`).catch(() => {});
 }
 } else {
 message.reply(\`Usage: \\\`${cmd} <add|remove|list|check|clear> [userId]\\\`\`).catch(() => {});
 }
}
`;
 },
 },
 },
};
