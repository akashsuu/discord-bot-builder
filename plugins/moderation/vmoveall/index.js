'use strict';

const { ChannelType, PermissionFlagsBits } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'vmoveall').trim() || 'vmoveall';
 const effectivePrefix = String(prefix || '!');
 return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function splitAliases(value) {
 return String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
}

function matchCommand(content, commands) {
 const text = String(content || '').trim();
 for (const command of commands) {
 const cmd = String(command || '').trim();
 if (!cmd) continue;
 if (!text.toLowerCase().startsWith(cmd.toLowerCase())) continue;
 const rest = text.slice(cmd.length);
 if (!rest || /^\s/.test(rest)) return { cmd, rawArgs: rest.trim() };
 }
 return null;
}

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
 );
}

function isVoiceChannel(channel) {
 return channel?.type === ChannelType.GuildVoice || channel?.type === ChannelType.GuildStageVoice;
}

function firstChannelToken(rawArgs) {
 const text = String(rawArgs || '').trim();
 const mention = text.match(/^<#(\d{15,22})>/);
 if (mention) return { token: mention[0], id: mention[1] };
 const id = text.match(/^(\d{15,22})\b/);
 if (id) return { token: id[1], id: id[1] };
 const quoted = text.match(/^"([^"]+)"/);
 if (quoted) return { token: quoted[0], name: quoted[1] };
 const word = text.split(/\s+/).find(Boolean);
 return word ? { token: word, name: word } : null;
}

async function channelById(guild, id) {
 if (!id) return null;
 const channel = await guild.channels.fetch(id).catch(() => null);
 return isVoiceChannel(channel) ? channel : null;
}

async function resolveVoiceChannel(message, tokenInfo, configuredId) {
 const byCommand = tokenInfo?.id ? await channelById(message.guild, tokenInfo.id) : null;
 if (byCommand) return byCommand;
 const byConfig = await channelById(message.guild, String(configuredId || '').trim());
 if (byConfig) return byConfig;
 if (tokenInfo?.name) {
 const needle = tokenInfo.name.toLowerCase();
 return message.guild.channels.cache.find((channel) =>
 isVoiceChannel(channel) && channel.name.toLowerCase() === needle
 ) || null;
 }
 return null;
}

async function resolveSourceChannel(message, data) {
 const configured = await channelById(message.guild, String(data.sourceChannelId || '').trim());
 if (configured) return configured;
 return isVoiceChannel(message.member?.voice?.channel) ? message.member.voice.channel : null;
}

function reasonFrom(rawArgs, tokenInfo, fallback) {
 let text = String(rawArgs || '').trim();
 if (tokenInfo?.token) text = text.slice(tokenInfo.token.length).trim();
 return text || fallback || 'No reason provided';
}

function varsFor(message, sourceChannel, targetChannel, reason, command, extra = {}) {
 return {
 user: message.author?.username || 'Unknown',
 tag: message.author?.tag || 'Unknown#0000',
 id: message.author?.id || '0',
 mention: `<@${message.author?.id || '0'}>`,
 sourceChannel: sourceChannel?.name || 'Unknown',
 sourceChannelId: sourceChannel?.id || '0',
 targetChannel: targetChannel?.name || 'Unknown',
 targetChannelId: targetChannel?.id || '0',
 movedCount: 0,
 failedCount: 0,
 totalCount: sourceChannel?.members?.size || 0,
 reason,
 command,
 server: message.guild?.name || 'Unknown',
 channel: message.channel?.name || 'Unknown',
 error: '',
 ...extra,
 };
}

module.exports = {
 meta: {
 name: 'Voice Move All',
 version: '1.0.0',
 author: 'Kiodium',
 description: 'Move all users from one voice channel to another.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_vmoveall: {
 label: 'Voice Move All',
 icon: 'VMA',
 color: '#6366F1',
 description: 'Prefix command to move everyone from one voice channel to another.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'vmoveall', required: true },
 aliases: { type: 'string', default: 'moveall,voiceall,vcallmove' },
 embedEnabled: { type: 'boolean', default: true },
 embedColor: { type: 'string', default: '#6366F1' },
 sourceChannelId: { type: 'string', default: '' },
 targetChannelId: { type: 'string', default: '' },
 reason: { type: 'string', default: 'No reason provided' },
 successMessage: { type: 'string', default: 'Moved **{movedCount}** users from **{sourceChannel}** to **{targetChannel}**.\nReason: {reason}' },
 usageMessage: { type: 'string', default: 'Usage: `{command} <targetVoiceChannelId|#voice-name> [reason]`' },
 permissionMessage: { type: 'string', default: 'You need Move Members permission to move everyone.' },
 botPermissionMessage: { type: 'string', default: 'I need Move Members permission to move everyone.' },
 sourceMessage: { type: 'string', default: 'I could not find the source voice channel. Join a voice channel or add a Source Channel ID.' },
 targetMessage: { type: 'string', default: 'I could not find the target voice channel. Add a Target Channel ID in the node or command.' },
 emptyMessage: { type: 'string', default: 'There are no movable members in **{sourceChannel}**.' },
 sameChannelMessage: { type: 'string', default: 'Source and target voice channels must be different.' },
 partialMessage: { type: 'string', default: 'Moved **{movedCount}** users, but **{failedCount}** users could not be moved.' },
 errorMessage: { type: 'string', default: 'Failed to move users: {error}' },
 },

 async execute(node, message, ctx) {
 if (!message || !message.guild || message.author?.bot) return false;
 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const commands = [
 commandWithPrefix(data.command, prefix),
 ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
 ];
 const matched = matchCommand(message.content, commands);
 if (!matched) return false;

 const baseVars = varsFor(message, null, null, data.reason || 'No reason provided', matched.cmd);
 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.MoveMembers)) {
 await message.reply(applyTemplate(data.botPermissionMessage || 'I need Move Members permission to move everyone.', baseVars)).catch(() => {});
 return true;
 }
 if (!message.member?.permissions.has(PermissionFlagsBits.MoveMembers)) {
 await message.reply(applyTemplate(data.permissionMessage || 'You need Move Members permission to move everyone.', baseVars)).catch(() => {});
 return true;
 }

 const sourceChannel = await resolveSourceChannel(message, data);
 if (!sourceChannel) {
 await message.reply(applyTemplate(data.sourceMessage || 'I could not find the source voice channel. Join a voice channel or add a Source Channel ID.', baseVars)).catch(() => {});
 return true;
 }

 const tokenInfo = firstChannelToken(matched.rawArgs);
 const targetChannel = await resolveVoiceChannel(message, tokenInfo, data.targetChannelId);
 if (!targetChannel) {
 await message.reply(applyTemplate(data.targetMessage || 'I could not find the target voice channel. Add a Target Channel ID in the node or command.', varsFor(message, sourceChannel, null, data.reason || 'No reason provided', matched.cmd))).catch(() => {});
 return true;
 }
 if (sourceChannel.id === targetChannel.id) {
 await message.reply(applyTemplate(data.sameChannelMessage || 'Source and target voice channels must be different.', varsFor(message, sourceChannel, targetChannel, data.reason || 'No reason provided', matched.cmd))).catch(() => {});
 return true;
 }

 const reasonText = reasonFrom(matched.rawArgs, tokenInfo, data.reason || 'No reason provided');
 const movableMembers = [...sourceChannel.members.values()].filter((member) => !member.user?.bot || member.id !== message.guild.members.me?.id);
 if (!movableMembers.length) {
 await message.reply(applyTemplate(data.emptyMessage || 'There are no movable members in **{sourceChannel}**.', varsFor(message, sourceChannel, targetChannel, reasonText, matched.cmd))).catch(() => {});
 return true;
 }

 let movedCount = 0;
 let failedCount = 0;
 try {
 for (const member of movableMembers) {
 try {
 await member.voice.setChannel(targetChannel, reasonText);
 movedCount += 1;
 } catch {
 failedCount += 1;
 }
 }
 } catch (err) {
 await message.reply(applyTemplate(data.errorMessage || 'Failed to move users: {error}', varsFor(message, sourceChannel, targetChannel, reasonText, matched.cmd, { error: err.message, movedCount, failedCount }))).catch(() => {});
 return true;
 }

 const vars = varsFor(message, sourceChannel, targetChannel, reasonText, matched.cmd, {
 movedCount,
 failedCount,
 totalCount: movableMembers.length,
 });
 const template = failedCount > 0
 ? data.partialMessage || 'Moved **{movedCount}** users, but **{failedCount}** users could not be moved.'
 : data.successMessage || 'Moved **{movedCount}** users from **{sourceChannel}** to **{targetChannel}**.\nReason: {reason}';
 const text = applyTemplate(template, vars);
 try {
 if (ctx?.sendEmbed) await ctx.sendEmbed(message, data, text);
 else await message.channel.send(text);
 } catch {
 await message.channel.send(text).catch(() => {});
 }
 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = String(node.data?.command || 'vmoveall').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `// Voice Move All command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 message.channel.send("Voice Move All runs through the Kiodium plugin runtime and moves everyone between voice channels.");
}`;
 },
 },
 },
};
