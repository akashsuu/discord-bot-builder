'use strict';

const { PermissionFlagsBits, ChannelType } = require('discord.js');

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function buildVars(message, reason, lockedCount, failedCount) {
 return {
 mention: `<@${message.author?.id || '0'}>`,
 user: message.author?.username || 'Unknown',
 reason,
 lockedCount: String(lockedCount),
 failedCount: String(failedCount),
 server: message.guild?.name || 'Unknown'
 };
}

function getTargetChannels(guild, includeForum, includeVoice) {
 const allowed = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement]);
 if (includeForum) allowed.add(ChannelType.GuildForum);
 if (includeVoice) {
 allowed.add(ChannelType.GuildVoice);
 allowed.add(ChannelType.GuildStageVoice);
 allowed.add(ChannelType.GuildMedia);
 }

 return guild.channels.cache.filter((channel) =>
 channel &&
 channel.type !== ChannelType.DM &&
 allowed.has(channel.type) &&
 'permissionOverwrites' in channel
 );
}

module.exports = {
 meta: {
 name: 'Lockdown',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Locks multiple channels at once by disabling Send Messages for @everyone.',
 engineVersion: '>=1.0.0'
 },

 nodes: {
 moderation_lockdown: {
 label: 'Lockdown',
 icon: 'LD',
 color: '#7F1D1D',
 description: 'Prefix command that locks all selected channel types in a server.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'lockdown', required: true },
 reason: { type: 'string', default: 'Server lockdown', required: false },
 includeForum: { type: 'boolean', default: true, required: false },
 includeVoice: { type: 'boolean', default: false, required: false },
 output: {
 type: 'string',
 default: 'Lockdown complete by {mention}. Locked: {lockedCount}, Failed: {failedCount}. Reason: {reason}',
 required: false
 }
 },

 async execute(ctx) {
 const { node, message, prefix } = ctx;
 if (!message || !message.guild || message.author?.bot) return false;

 const rawCmd = (node.data?.command || 'lockdown').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
 await message.reply('I need Manage Channels permission.').catch(() => {});
 return false;
 }
 if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
 await message.reply('You need Manage Channels permission.').catch(() => {});
 return false;
 }

 const afterCmd = message.content.slice(cmd.length).trim();
 const reasonText = afterCmd || node.data?.reason || 'Server lockdown';
 const includeForum = node.data?.includeForum !== false;
 const includeVoice = !!node.data?.includeVoice;

 const channels = getTargetChannels(message.guild, includeForum, includeVoice);
 if (!channels.size) {
 await message.reply('No eligible channels found for lockdown.').catch(() => {});
 return false;
 }

 let lockedCount = 0;
 let failedCount = 0;
 for (const channel of channels.values()) {
 try {
 await channel.permissionOverwrites.edit(
 message.guild.roles.everyone,
 { SendMessages: false, AddReactions: false },
 { reason: `Lockdown by ${message.author.tag}: ${reasonText}` }
 );
 lockedCount += 1;
 } catch {
 failedCount += 1;
 }
 }

 const vars = buildVars(message, reasonText, lockedCount, failedCount);
 const text = applyTemplate(
 node.data?.output || 'Lockdown complete by {mention}. Locked: {lockedCount}, Failed: {failedCount}. Reason: {reason}',
 vars
 );

 try {
 if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, text);
 else await message.channel.send(text);
 } catch {
 await message.channel.send(text).catch(() => {});
 }

 return lockedCount > 0;
 },

 generateCode(node, prefix = '') {
 const rawCmd = (node.data?.command || 'lockdown').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const reason = (node.data?.reason || 'Server lockdown').replace(/"/g, '\\"');
 const includeForum = node.data?.includeForum !== false;
 const includeVoice = !!node.data?.includeVoice;
 const output = (node.data?.output || 'Lockdown complete by {mention}. Locked: {lockedCount}, Failed: {failedCount}. Reason: {reason}')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');

 return `
// Lockdown
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 const _ld_after = message.content.slice("${cmd}".length).trim();
 const _ld_reason = _ld_after || "${reason}";
 let _ld_locked = 0;
 let _ld_failed = 0;
 const _ld_allowed = new Set(["GuildText", "GuildAnnouncement"${includeForum ? ', "GuildForum"' : ''}${includeVoice ? ', "GuildVoice", "GuildStageVoice", "GuildMedia"' : ''}]);
 for (const _ld_channel of message.guild.channels.cache.values()) {
 if (!_ld_channel?.type || !_ld_allowed.has(String(_ld_channel.type))) continue;
 if (!("permissionOverwrites" in _ld_channel)) continue;
 try {
 await _ld_channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false, AddReactions: false }, { reason: \`Lockdown by \${message.author.tag}: \${_ld_reason}\` });
 _ld_locked++;
 } catch {
 _ld_failed++;
 }
 }
 const _ld_vars = { mention: \`<@\${message.author?.id}>\`, reason: _ld_reason, lockedCount: String(_ld_locked), failedCount: String(_ld_failed) };
 const _ld_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _ld_vars[k] - m);
 message.channel.send(_ld_apply(\`${output}\`)).catch(() => {});
}
`;
 }
 }
 }
};
