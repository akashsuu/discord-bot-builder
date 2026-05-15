'use strict';

const { PermissionFlagsBits } = require('discord.js');
const warningsStore = globalThis.__warningsStore - (globalThis.__warningsStore = new Map());

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function buildVars(message, target, reason) {
 return {
 mention: `<@${message.author?.id || '0'}>`,
 user: message.author?.username || 'Unknown',
 target: target.user?.tag || target.user?.username || 'Unknown',
 targetMention: `<@${target.user?.id || '0'}>`,
 reason,
 server: message.guild?.name || 'Unknown',
 channel: message.channel?.name || 'Unknown'
 };
}

function getGuildWarnings(guildId) {
 if (!warningsStore.has(guildId)) warningsStore.set(guildId, new Map());
 return warningsStore.get(guildId);
}

module.exports = {
 meta: {
 name: 'Warn User',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Warns a mentioned user.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_warn: {
 label: 'Warn User',
 icon: 'WARN',
 color: '#D97706',
 description: 'Prefix command to warn user. Usage: warn @user [reason]',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'warn', required: true },
 reason: { type: 'string', default: 'No reason provided', required: false },
 dmEnabled: { type: 'boolean', default: false, required: false },
 dmMessage: {
 type: 'string',
 default: 'You were warned in **{server}** by **{user}**.\nReason: {reason}',
 required: false
 },
 output: {
 type: 'string',
 default: '{targetMention} has been warned by {mention}.\nReason: {reason}',
 required: false
 },
 },

 async execute(ctx) {
 const { node, message, prefix } = ctx;
 if (!message || !message.guild || message.author?.bot) return false;

 const rawCmd = (node.data?.command || 'warn').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

 if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
 await message.reply('You need Moderate Members permission.').catch(() => {});
 return false;
 }

 const target = message.mentions.members?.first() || null;
 if (!target) {
 await message.reply(`Usage: \`${cmd} @user [reason]\``).catch(() => {});
 return false;
 }
 if (target.id === message.author.id) {
 await message.reply('You cannot warn yourself.').catch(() => {});
 return false;
 }
 if (target.user?.bot) {
 await message.reply('You cannot warn a bot user with this command.').catch(() => {});
 return false;
 }

 const afterCmd = message.content.slice(cmd.length).trim();
 const reason = afterCmd.replace(/<@!?\d+>/g, '').replace(/\s+/g, ' ').trim()
 || node.data?.reason
 || 'No reason provided';

 const vars = buildVars(message, target, reason);

 const guildWarnings = getGuildWarnings(message.guild.id);
 if (!guildWarnings.has(target.id)) guildWarnings.set(target.id, []);
 guildWarnings.get(target.id).push({
 userId: target.id,
 moderatorId: message.author.id,
 reason,
 at: Date.now()
 });

 if (node.data?.dmEnabled) {
 const dmText = applyTemplate(
 node.data?.dmMessage || 'You were warned in **{server}** by **{user}**.\nReason: {reason}',
 vars
 );
 await target.send(dmText).catch(() => {});
 }

 const text = applyTemplate(
 node.data?.output || '{targetMention} has been warned by {mention}.\nReason: {reason}',
 vars
 );

 try {
 if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, text);
 else await message.channel.send(text);
 } catch {
 await message.channel.send(text).catch(() => {});
 }

 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = (node.data?.command || 'warn').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const reason = (node.data?.reason || 'No reason provided').replace(/"/g, '\\"');
 const dmEnabled = !!node.data?.dmEnabled;
 const dmMessage = (node.data?.dmMessage || 'You were warned in **{server}** by **{user}**.\\nReason: {reason}')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');
 const output = (node.data?.output || '{targetMention} has been warned by {mention}.\\nReason: {reason}')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');

 return `
// Warn User
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 const _wr_target = message.mentions.members?.first();
 if (!_wr_target) {
 message.reply(\`Usage: \\\`${cmd} @user [reason]\\\`\`).catch(() => {});
 } else {
 const _wr_reason = message.content.slice("${cmd}".length).trim().replace(/<@!?\\d+>/g, "").replace(/\\s+/g, " ").trim() || "${reason}";
 const _wr_vars = {
 mention: \`<@\${message.author?.id}>\`,
 user: message.author?.username || "Unknown",
 targetMention: \`<@\${_wr_target.user?.id}>\`,
 reason: _wr_reason,
 server: message.guild?.name || "Unknown"
 };
 const _wr_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _wr_vars[k] - m);
 ${dmEnabled ? `try { await _wr_target.send(_wr_apply(\`${dmMessage}\`)); } catch {}` : ''}
 message.channel.send(_wr_apply(\`${output}\`)).catch(() => {});
 }
}
`;
 },
 },
 },
};
