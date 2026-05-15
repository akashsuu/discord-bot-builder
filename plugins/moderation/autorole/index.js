'use strict';

const { PermissionFlagsBits } = require('discord.js');

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function parseRoleIds(value) {
 const raw = Array.isArray(value) ? value : String(value || '').split(/[\s,;]+/);

 return [...new Set(
 raw
 .map((roleId) => String(roleId).trim().replace(/[<@&>]/g, ''))
 .filter((roleId) => /^\d{5,}$/.test(roleId))
 )];
}

function buildVars(member, assignedRoles, failedRoles) {
 const now = new Date();

 return {
 member: member.user?.username || 'Unknown',
 tag: member.user?.tag || 'Unknown#0000',
 id: member.user?.id || '0',
 mention: `<@${member.user?.id || '0'}>`,
 roles: assignedRoles.map((role) => role.name).join(', ') || 'None',
 roleIds: assignedRoles.map((role) => role.id).join(', ') || 'None',
 failedRoleIds: failedRoles.join(', ') || 'None',
 server: member.guild?.name || 'Unknown',
 memberCount: String(member.guild?.memberCount - 0),
 date: now.toISOString().slice(0, 10),
 time: now.toTimeString().slice(0, 8),
 };
}

async function sendOutput(member, nodeData, text, ctx) {
 const channel = member.guild?.systemChannel;
 if (!channel || !text) return;

 if (nodeData.embedEnabled) {
 const embed = ctx.buildEmbed ? ctx.buildEmbed(nodeData, text) : { description: text };
 await channel.send({ embeds: [embed] });
 } else {
 await channel.send(text);
 }
}

module.exports = {
 meta: {
 name: 'Auto Role',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Automatically gives multiple configured roles to new members.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_autorole: {
 label: 'Auto Role',
 icon: 'ROLE',
 color: '#2563EB',
 description: 'Assigns many role IDs to a member on join. Separate role IDs with commas, spaces, or new lines.',

 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 enabled: { type: 'boolean', default: true, required: false },
 roleIds: {
 type: 'string',
 default: '',
 required: true,
 description: 'Role IDs to add. Supports comma, space, semicolon, or newline separated IDs.'
 },
 ignoreBots: { type: 'boolean', default: true, required: false },
 sendMessage: {
 type: 'boolean',
 default: false,
 required: false,
 description: 'Send the output message to the server system channel after assigning roles'
 },
 output: {
 type: 'string',
 default: 'Assigned auto roles to **{member}**.',
 required: false
 },
 },

 async execute(ctx) {
 const { node, eventData } = ctx;
 const member = eventData;

 if (node.data?.enabled === false) return false;
 if (!member || !member.guild || !member.roles) return false;
 if (node.data?.ignoreBots !== false && member.user?.bot) return false;

 const roleIds = parseRoleIds(node.data?.roleIds);
 if (!roleIds.length) return false;

 if (!member.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
 if (node.data?.sendMessage) {
 await sendOutput(member, node.data, 'I need **Manage Roles** permission to assign auto roles.', ctx).catch(() => {});
 }
 return false;
 }

 const assignedRoles = [];
 const failedRoles = [];

 for (const roleId of roleIds) {
 const role = member.guild.roles.cache.get(roleId);

 if (!role || member.roles.cache.has(roleId)) {
 failedRoles.push(roleId);
 continue;
 }

 try {
 await member.roles.add(role, 'Auto role');
 assignedRoles.push(role);
 } catch {
 failedRoles.push(roleId);
 }
 }

 if (node.data?.sendMessage) {
 const vars = buildVars(member, assignedRoles, failedRoles);
 const text = applyTemplate(node.data?.output || 'Assigned auto roles to **{member}**.', vars);
 await sendOutput(member, node.data, text, ctx).catch(() => {});
 }

 return assignedRoles.length > 0;
 },

 generateCode(node) {
 const roleIds = JSON.stringify(parseRoleIds(node.data?.roleIds));
 const output = (node.data?.output || 'Assigned auto roles to **{member}**.')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');
 const ignoreBots = node.data?.ignoreBots !== false;
 const sendMessage = !!node.data?.sendMessage;

 return `
// Auto Role
{
 const _ar_roleIds = ${roleIds};
 if (member?.guild && member.roles${ignoreBots ? ' && !member.user?.bot' : ''} && _ar_roleIds.length) {
 const _ar_assigned = [];
 const _ar_failed = [];

 if (!member.guild.members.me?.permissions.has("ManageRoles")) {
 ${sendMessage ? 'member.guild.systemChannel?.send("I need **Manage Roles** permission to assign auto roles.").catch(() => {});' : ''}
 } else {
 for (const _ar_id of _ar_roleIds) {
 const _ar_role = member.guild.roles.cache.get(_ar_id);
 if (!_ar_role || member.roles.cache.has(_ar_id)) {
 _ar_failed.push(_ar_id);
 continue;
 }

 try {
 await member.roles.add(_ar_role, "Auto role");
 _ar_assigned.push(_ar_role);
 } catch {
 _ar_failed.push(_ar_id);
 }
 }

 ${sendMessage ? `
 const _ar_now = new Date();
 const _ar_vars = {
 member: member.user?.username,
 tag: member.user?.tag,
 id: member.user?.id,
 mention: \`<@\${member.user?.id}>\`,
 roles: _ar_assigned.map((role) => role.name).join(", ") || "None",
 roleIds: _ar_assigned.map((role) => role.id).join(", ") || "None",
 failedRoleIds: _ar_failed.join(", ") || "None",
 server: member.guild?.name,
 memberCount: String(member.guild?.memberCount - 0),
 date: _ar_now.toISOString().slice(0, 10),
 time: _ar_now.toTimeString().slice(0, 8),
 };
 const _ar_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _ar_vars[k] - m);
 member.guild.systemChannel?.send(_ar_apply(\`${output}\`)).catch(() => {});
 ` : ''}
 }
 }
}
`;
 },
 },
 },
};
