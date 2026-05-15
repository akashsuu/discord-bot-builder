'use strict';

const { PermissionFlagsBits } = require('discord.js');

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function buildVars(message, target, role) {
 return {
 mention: `<@${message.author?.id || '0'}>`,
 user: message.author?.username || 'Unknown',
 target: target.user?.tag || target.user?.username || 'Unknown',
 targetMention: `<@${target.user?.id || '0'}>`,
 role: role.name || 'Unknown',
 roleId: role.id || '0',
 roleMention: `<@&${role.id || '0'}>`,
 server: message.guild?.name || 'Unknown'
 };
}

function findRoleFromContent(message, content) {
 const mentioned = message.mentions.roles?.first();
 if (mentioned) return mentioned;

 const roleIdMatch = String(content || '').match(/\b(\d{17,20})\b/);
 if (roleIdMatch) {
 const role = message.guild.roles.cache.get(roleIdMatch[1]);
 if (role) return role;
 }

 return null;
}

module.exports = {
 meta: {
 name: 'Role Remove',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Removes a role from a mentioned user.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_roleremove: {
 label: 'Role Remove',
 icon: 'RR',
 color: '#B91C1C',
 description: 'Prefix command to remove role. Usage: roleremove @user @role',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'roleremove', required: true },
 output: {
 type: 'string',
 default: '{mention} removed role {roleMention} from {targetMention}.',
 required: false
 },
 },

 async execute(ctx) {
 const { node, message, prefix } = ctx;
 if (!message || !message.guild || message.author?.bot) return false;

 const rawCmd = (node.data?.command || 'roleremove').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
 await message.reply('I need Manage Roles permission.').catch(() => {});
 return false;
 }
 if (!message.member?.permissions.has(PermissionFlagsBits.ManageRoles)) {
 await message.reply('You need Manage Roles permission.').catch(() => {});
 return false;
 }

 const target = message.mentions.members?.first() || null;
 if (!target) {
 await message.reply(`Usage: \`${cmd} @user @role\``).catch(() => {});
 return false;
 }

 const afterCmd = message.content.slice(cmd.length).trim();
 const role = findRoleFromContent(message, afterCmd);
 if (!role) {
 await message.reply(`Usage: \`${cmd} @user @role\``).catch(() => {});
 return false;
 }

 if (!target.roles.cache.has(role.id)) {
 await message.reply(`${target} does not have ${role}.`).catch(() => {});
 return false;
 }

 if (!target.manageable) {
 await message.reply('I cannot edit that user roles (role may be higher than mine).').catch(() => {});
 return false;
 }

 const botHighest = message.guild.members.me?.roles?.highest;
 if (botHighest && role.position >= botHighest.position) {
 await message.reply('I cannot remove that role because it is equal or higher than my highest role.').catch(() => {});
 return false;
 }

 try {
 await target.roles.remove(role, `Role removed by ${message.author.tag}`);
 } catch (err) {
 await message.reply(`Failed to remove role: ${err.message}`).catch(() => {});
 return false;
 }

 const text = applyTemplate(
 node.data?.output || '{mention} removed role {roleMention} from {targetMention}.',
 buildVars(message, target, role)
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
 const rawCmd = (node.data?.command || 'roleremove').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const output = (node.data?.output || '{mention} removed role {roleMention} from {targetMention}.')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');

 return `
// Role Remove
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 const _rr_target = message.mentions.members?.first();
 const _rr_role = message.mentions.roles?.first();
 if (!_rr_target || !_rr_role) {
 message.reply(\`Usage: \\\`${cmd} @user @role\\\`\`).catch(() => {});
 } else if (!_rr_target.roles.cache.has(_rr_role.id)) {
 message.reply(\`\${_rr_target} does not have \${_rr_role}.\`).catch(() => {});
 } else {
 _rr_target.roles.remove(_rr_role, \`Role removed by \${message.author.tag}\`).then(() => {
 const _rr_vars = {
 mention: \`<@\${message.author?.id}>\`,
 targetMention: \`<@\${_rr_target.user?.id}>\`,
 roleMention: \`<@&\${_rr_role.id}>\`
 };
 const _rr_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _rr_vars[k] - m);
 message.channel.send(_rr_apply(\`${output}\`)).catch(() => {});
 }).catch((e) => message.reply(\`Failed to remove role: \${e.message}\`).catch(() => {}));
 }
}
`;
 },
 },
 },
};
