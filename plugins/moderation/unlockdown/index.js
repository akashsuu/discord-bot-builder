'use strict';

const { PermissionFlagsBits, ChannelType } = require('discord.js');

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function buildVars(message, reason, unlockedCount, failedCount) {
 return {
 mention: `<@${message.author?.id || '0'}>`,
 user: message.author?.username || 'Unknown',
 reason,
 unlockedCount: String(unlockedCount),
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
 name: 'Unlockdown',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Unlocks multiple channels at once by restoring Send Messages for @everyone.',
 engineVersion: '>=1.0.0'
 },

 nodes: {
 moderation_unlockdown: {
 label: 'Unlockdown',
 icon: 'ULD',
 color: '#166534',
 description: 'Prefix command that unlocks selected channel types in a server.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'unlockdown', required: true },
 reason: { type: 'string', default: 'Server unlockdown', required: false },
 includeForum: { type: 'boolean', default: true, required: false },
 includeVoice: { type: 'boolean', default: false, required: false },
 output: {
 type: 'string',
 default: 'Unlockdown complete by {mention}. Unlocked: {unlockedCount}, Failed: {failedCount}. Reason: {reason}',
 required: false
 }
 },

 async execute(ctx) {
 const { node, message, prefix } = ctx;
 if (!message || !message.guild || message.author?.bot) return false;

 const rawCmd = (node.data?.command || 'unlockdown').trim();
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
 const reasonText = afterCmd || node.data?.reason || 'Server unlockdown';
 const includeForum = node.data?.includeForum !== false;
 const includeVoice = !!node.data?.includeVoice;

 const channels = getTargetChannels(message.guild, includeForum, includeVoice);
 if (!channels.size) {
 await message.reply('No eligible channels found for unlockdown.').catch(() => {});
 return false;
 }

 let unlockedCount = 0;
 let failedCount = 0;
 for (const channel of channels.values()) {
 try {
 await channel.permissionOverwrites.edit(
 message.guild.roles.everyone,
 { SendMessages: null, AddReactions: null },
 { reason: `Unlockdown by ${message.author.tag}: ${reasonText}` }
 );
 unlockedCount += 1;
 } catch {
 failedCount += 1;
 }
 }

 const vars = buildVars(message, reasonText, unlockedCount, failedCount);
 const text = applyTemplate(
 node.data?.output || 'Unlockdown complete by {mention}. Unlocked: {unlockedCount}, Failed: {failedCount}. Reason: {reason}',
 vars
 );

 try {
 if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, text);
 else await message.channel.send(text);
 } catch {
 await message.channel.send(text).catch(() => {});
 }

 return unlockedCount > 0;
 },

 generateCode(node, prefix = '') {
 const rawCmd = (node.data?.command || 'unlockdown').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const reason = (node.data?.reason || 'Server unlockdown').replace(/"/g, '\\"');
 const includeForum = node.data?.includeForum !== false;
 const includeVoice = !!node.data?.includeVoice;
 const output = (node.data?.output || 'Unlockdown complete by {mention}. Unlocked: {unlockedCount}, Failed: {failedCount}. Reason: {reason}')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');

 return `
// Unlockdown
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 const _ud_after = message.content.slice("${cmd}".length).trim();
 const _ud_reason = _ud_after || "${reason}";
 let _ud_unlocked = 0;
 let _ud_failed = 0;
 const _ud_allowed = new Set(["GuildText", "GuildAnnouncement"${includeForum ? ', "GuildForum"' : ''}${includeVoice ? ', "GuildVoice", "GuildStageVoice", "GuildMedia"' : ''}]);
 for (const _ud_channel of message.guild.channels.cache.values()) {
 if (!_ud_channel?.type || !_ud_allowed.has(String(_ud_channel.type))) continue;
 if (!("permissionOverwrites" in _ud_channel)) continue;
 try {
 await _ud_channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null, AddReactions: null }, { reason: \`Unlockdown by \${message.author.tag}: \${_ud_reason}\` });
 _ud_unlocked++;
 } catch {
 _ud_failed++;
 }
 }
 const _ud_vars = { mention: \`<@\${message.author?.id}>\`, reason: _ud_reason, unlockedCount: String(_ud_unlocked), failedCount: String(_ud_failed) };
 const _ud_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _ud_vars[k] - m);
 message.channel.send(_ud_apply(\`${output}\`)).catch(() => {});
}
`;
 }
 }
 }
};
