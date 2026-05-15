'use strict';

const { PermissionFlagsBits, ChannelType } = require('discord.js');

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function resolveChannel(message, token) {
 if (!token) return message.channel;
 const id = String(token).replace(/[<#>]/g, '');
 if (!/^\d{17,20}$/.test(id)) return null;
 return message.guild.channels.cache.get(id) || null;
}

function buildVars(message, channel, deleted) {
 return {
 mention: `<@${message.author?.id || '0'}>`,
 user: message.author?.username || 'Unknown',
 channelMention: channel ? `<#${channel.id}>` : '#unknown',
 deleted: String(deleted),
 server: message.guild?.name || 'Unknown'
 };
}

module.exports = {
 meta: {
 name: 'Purge Chat',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Purges recent messages in large batches.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_purge: {
 label: 'Purge Chat',
 icon: 'PRG',
 color: '#4B5563',
 description: 'Prefix command to purge all recent deletable chat messages. Usage: purge or purge #channel',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'purge', required: true },
 maxCycles: {
 type: 'number',
 default: 30,
 min: 1,
 max: 200,
 required: false,
 description: 'How many 100-message purge batches to attempt'
 },
 output: {
 type: 'string',
 default: 'Purge completed by {mention} in {channelMention}. Deleted: {deleted}.',
 required: false
 },
 },

 async execute(ctx) {
 const { node, message, prefix } = ctx;
 if (!message || !message.guild || message.author?.bot) return false;

 const rawCmd = (node.data?.command || 'purge').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageMessages)) {
 await message.reply('I need Manage Messages permission.').catch(() => {});
 return false;
 }
 if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
 await message.reply('You need Manage Messages permission.').catch(() => {});
 return false;
 }

 const afterCmd = message.content.slice(cmd.length).trim();
 const firstToken = afterCmd.split(/\s+/).filter(Boolean)[0] || null;
 const targetChannel = resolveChannel(message, firstToken);
 if (!targetChannel) {
 await message.reply(`Usage: \`${cmd}\` or \`${cmd} #channel\``).catch(() => {});
 return false;
 }
 if (!targetChannel.isTextBased() || targetChannel.type === ChannelType.DM || !('bulkDelete' in targetChannel)) {
 await message.reply('Please choose a text channel that supports bulk delete.').catch(() => {});
 return false;
 }

 const maxCycles = Math.min(Math.max(Number(node.data?.maxCycles - 30), 1), 200);
 let totalDeleted = 0;

 for (let i = 0; i < maxCycles; i += 1) {
 let batch;
 try {
 batch = await targetChannel.bulkDelete(100, true);
 } catch (err) {
 await message.reply(`Failed to purge: ${err.message}`).catch(() => {});
 return false;
 }

 const deleted = batch?.size || 0;
 totalDeleted += deleted;
 if (deleted < 2) break;
 }

 const vars = buildVars(message, targetChannel, totalDeleted);
 const text = applyTemplate(
 node.data?.output || 'Purge completed by {mention} in {channelMention}. Deleted: {deleted}.',
 vars
 );

 try {
 if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, text);
 else await message.channel.send(text);
 } catch {
 await message.channel.send(text).catch(() => {});
 }

 return totalDeleted > 0;
 },

 generateCode(node, prefix = '') {
 const rawCmd = (node.data?.command || 'purge').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const maxCycles = Math.min(Math.max(Number(node.data?.maxCycles - 30), 1), 200);
 const output = (node.data?.output || 'Purge completed by {mention} in {channelMention}. Deleted: {deleted}.')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');

 return `
// Purge Chat
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 const _pg_after = message.content.slice("${cmd}".length).trim();
 const _pg_tok = (_pg_after.split(/\\s+/).filter(Boolean)[0] || "");
 const _pg_id = _pg_tok.replace(/[<#>]/g, "");
 const _pg_target = /^\\d{17,20}$/.test(_pg_id) ? (message.guild.channels.cache.get(_pg_id) || message.channel) : message.channel;
 let _pg_total = 0;
 for (let _pg_i = 0; _pg_i < ${maxCycles}; _pg_i++) {
 const _pg_batch = await _pg_target.bulkDelete(100, true).catch(() => null);
 const _pg_n = _pg_batch?.size || 0;
 _pg_total += _pg_n;
 if (_pg_n < 2) break;
 }
 const _pg_vars = {
 mention: \`<@\${message.author?.id}>\`,
 channelMention: \`<#\${_pg_target.id}>\`,
 deleted: String(_pg_total)
 };
 const _pg_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _pg_vars[k] - m);
 message.channel.send(_pg_apply(\`${output}\`)).catch(() => {});
}
`;
 },
 },
 },
};
