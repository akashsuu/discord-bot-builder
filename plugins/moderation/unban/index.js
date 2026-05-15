'use strict';

const { PermissionFlagsBits } = require('discord.js');

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function parseUserId(raw) {
 const token = String(raw || '').trim();
 const id = token.replace(/[<@!>]/g, '');
 return /^\d{17,20}$/.test(id) ? id : null;
}

function buildVars(message, targetId, reason) {
 return {
 mention: `<@${message.author?.id || '0'}>`,
 user: message.author?.username || 'Unknown',
 targetId,
 reason,
 server: message.guild?.name || 'Unknown'
 };
}

module.exports = {
 meta: {
 name: 'Unban',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Unbans a user by ID.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_unban: {
 label: 'Unban',
 icon: 'UB',
 color: '#166534',
 description: 'Prefix command to unban user. Usage: unban <userId> [reason]',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'unban', required: true },
 reason: { type: 'string', default: 'No reason provided', required: false },
 output: {
 type: 'string',
 default: 'User **{targetId}** has been unbanned by {mention}.\nReason: {reason}',
 required: false
 },
 },

 async execute(ctx) {
 const { node, message, prefix } = ctx;
 if (!message || !message.guild || message.author?.bot) return false;

 const rawCmd = (node.data?.command || 'unban').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
 await message.reply('I need Ban Members permission.').catch(() => {});
 return false;
 }
 if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers)) {
 await message.reply('You need Ban Members permission.').catch(() => {});
 return false;
 }

 const afterCmd = message.content.slice(cmd.length).trim();
 const parts = afterCmd ? afterCmd.split(/\s+/) : [];
 const targetId = parseUserId(parts[0]);
 if (!targetId) {
 await message.reply(`Usage: \`${cmd} <userId> [reason]\``).catch(() => {});
 return false;
 }

 const reason = parts.slice(1).join(' ').trim()
 || node.data?.reason
 || 'No reason provided';

 try {
 await message.guild.members.unban(targetId, `Unban by ${message.author.tag}: ${reason}`);
 } catch (err) {
 await message.reply(`Failed to unban: ${err.message}`).catch(() => {});
 return false;
 }

 const text = applyTemplate(
 node.data?.output || 'User **{targetId}** has been unbanned by {mention}.\nReason: {reason}',
 buildVars(message, targetId, reason)
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
 const rawCmd = (node.data?.command || 'unban').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const reason = (node.data?.reason || 'No reason provided').replace(/"/g, '\\"');
 const output = (node.data?.output || 'User **{targetId}** has been unbanned by {mention}.\\nReason: {reason}')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');

 return `
// Unban
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 const _ub_after = message.content.slice("${cmd}".length).trim();
 const _ub_parts = _ub_after ? _ub_after.split(/\\s+/) : [];
 const _ub_id = String(_ub_parts[0] || "").replace(/[<@!>]/g, "");
 if (!/^\\d{17,20}$/.test(_ub_id)) {
 message.reply(\`Usage: \\\`${cmd} <userId> [reason]\\\`\`).catch(() => {});
 } else {
 const _ub_reason = _ub_parts.slice(1).join(" ").trim() || "${reason}";
 message.guild.members.unban(_ub_id, \`Unban by \${message.author.tag}: \${_ub_reason}\`)
 .then(() => {
 const _ub_vars = { mention: \`<@\${message.author?.id}>\`, targetId: _ub_id, reason: _ub_reason };
 const _ub_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _ub_vars[k] - m);
 message.channel.send(_ub_apply(\`${output}\`)).catch(() => {});
 })
 .catch((e) => message.reply(\`Failed to unban: \${e.message}\`).catch(() => {}));
 }
}
`;
 },
 },
 },
};
