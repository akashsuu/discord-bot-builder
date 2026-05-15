'use strict';

const { PermissionFlagsBits, ChannelType } = require('discord.js');

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function buildVars(message, channel, deleted, requested, cmd) {
 const now = new Date();
 return {
 user: message.author?.username || 'Unknown',
 mention: `<@${message.author?.id || '0'}>`,
 id: message.author?.id || '0',
 command: cmd,
 deleted: String(deleted),
 requested: String(requested),
 channel: channel?.name || 'unknown',
 channelId: channel?.id || '0',
 channelMention: channel ? `<#${channel.id}>` : '#unknown',
 server: message.guild?.name || 'Unknown',
 date: now.toISOString().slice(0, 10),
 time: now.toTimeString().slice(0, 8),
 };
}

function resolveChannel(message, token) {
 if (!token) return message.channel;
 const id = token.replace(/[<#>]/g, '');
 if (!/^\d{17,20}$/.test(id)) return null;
 return message.guild.channels.cache.get(id) || null;
}

function parseCommandArgs(contentAfterCommand) {
 const parts = String(contentAfterCommand || '').trim().split(/\s+/).filter(Boolean);
 if (!parts.length) return { amount: null, channelToken: null };

 const first = parts[0];
 const second = parts[1];

 if (/^\d+$/.test(first)) {
 return { amount: Number(first), channelToken: second || null };
 }

 if (/^<#?\d{17,20}>?$/.test(first) || /^\d{17,20}$/.test(first)) {
 return { amount: /^\d+$/.test(second || '') ? Number(second) : null, channelToken: first };
 }

 return { amount: null, channelToken: null };
}

module.exports = {
 meta: {
 name: 'Clear Chat',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Bulk deletes messages from a channel.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_clear: {
 label: 'Clear Chat',
 icon: 'CLR',
 color: '#374151',
 description: 'Prefix command to bulk delete channel messages. Usage: clear [amount] or clear [#channel] [amount].',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'clear', required: true },
 defaultAmount: { type: 'number', default: 10, min: 1, max: 100, required: false },
 maxAmount: { type: 'number', default: 100, min: 1, max: 100, required: false },
 output: {
 type: 'string',
 default: 'Deleted **{deleted}** message(s) in {channelMention}.',
 required: false
 },
 },

 async execute(ctx) {
 const { node, message, prefix } = ctx;
 if (!message || !message.guild || message.author?.bot) return false;

 const rawCmd = (node.data?.command || 'clear').trim();
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
 const parsed = parseCommandArgs(afterCmd);

 const targetChannel = resolveChannel(message, parsed.channelToken);
 if (!targetChannel) {
 await message.reply(`Usage: \`${cmd} [amount]\` or \`${cmd} [#channel] [amount]\``).catch(() => {});
 return false;
 }

 if (!targetChannel.isTextBased() || targetChannel.type === ChannelType.DM) {
 await message.reply('Please choose a text channel.').catch(() => {});
 return false;
 }

 if (!('bulkDelete' in targetChannel)) {
 await message.reply('This channel does not support bulk deletion.').catch(() => {});
 return false;
 }

 const defaultAmount = Math.min(Math.max(Number(node.data?.defaultAmount ?? 10), 1), 100);
 const maxAmount = Math.min(Math.max(Number(node.data?.maxAmount ?? 100), 1), 100);
 const requestedAmount = parsed.amount - defaultAmount;
 const amount = Math.min(Math.max(requestedAmount, 1), maxAmount);

 let deletedCount = 0;
 try {
 const deleted = await targetChannel.bulkDelete(amount, true);
 deletedCount = deleted?.size || 0;
 } catch (err) {
 await message.reply(`Failed to clear messages: ${err.message}`).catch(() => {});
 return false;
 }

 const vars = buildVars(message, targetChannel, deletedCount, amount, cmd);
 const outputTpl = node.data?.output || 'Deleted **{deleted}** message(s) in {channelMention}.';
 const text = applyTemplate(outputTpl, vars);

 try {
 if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, text);
 else await message.channel.send(text);
 } catch {
 await message.channel.send(text).catch(() => {});
 }

 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = (node.data?.command || 'clear').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const defaultAmount = Math.min(Math.max(Number(node.data?.defaultAmount ?? 10), 1), 100);
 const maxAmount = Math.min(Math.max(Number(node.data?.maxAmount ?? 100), 1), 100);
 const output = (node.data?.output || 'Deleted **{deleted}** message(s) in {channelMention}.')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');

 return `
// Clear Chat
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 if (!message.guild.members.me?.permissions.has("ManageMessages")) {
 message.reply("I need Manage Messages permission.").catch(() => {});
 } else if (!message.member?.permissions.has("ManageMessages")) {
 message.reply("You need Manage Messages permission.").catch(() => {});
 } else {
 const _cl_after = message.content.slice("${cmd}".length).trim();
 const _cl_parts = _cl_after.split(/\\s+/).filter(Boolean);
 let _cl_channelToken = null;
 let _cl_amountToken = null;
 if (_cl_parts[0] && /^\\d+$/.test(_cl_parts[0])) {
 _cl_amountToken = _cl_parts[0];
 _cl_channelToken = _cl_parts[1] || null;
 } else if (_cl_parts[0] && (/^<#?\\d{17,20}>?$/.test(_cl_parts[0]) || /^\\d{17,20}$/.test(_cl_parts[0]))) {
 _cl_channelToken = _cl_parts[0];
 _cl_amountToken = _cl_parts[1] || null;
 }
 const _cl_channelId = (_cl_channelToken || "").replace(/[<#>]/g, "");
 const _cl_target = (/^\\d{17,20}$/.test(_cl_channelId) ? message.guild.channels.cache.get(_cl_channelId) : null) || message.channel;
 const _cl_req = /^\\d+$/.test(_cl_amountToken || "") ? Number(_cl_amountToken) : ${defaultAmount};
 const _cl_amount = Math.min(Math.max(_cl_req, 1), ${maxAmount});

 _cl_target.bulkDelete(_cl_amount, true).then((deleted) => {
 const _cl_vars = {
 deleted: String(deleted?.size || 0),
 channelMention: \`<#\${_cl_target.id}>\`
 };
 const _cl_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _cl_vars[k] - m);
 message.channel.send(_cl_apply(\`${output}\`)).catch(() => {});
 }).catch((e) => message.reply(\`Failed to clear messages: \${e.message}\`).catch(() => {}));
 }
}
`;
 },
 },
 },
};
