'use strict';

const { ChannelType, PermissionFlagsBits } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'voiceunban').trim() || 'voiceunban';
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

async function resolveMember(message, rawArgs) {
 const mentioned = message.mentions.members?.first();
 if (mentioned) return mentioned;
 const first = String(rawArgs || '').split(/\s+/).find(Boolean);
 const id = first?.replace(/[<@!>]/g, '');
 if (!id || !/^\d{15,22}$/.test(id)) return null;
 return message.guild.members.fetch(id).catch(() => null);
}

function stripTarget(rawArgs) {
 return String(rawArgs || '')
 .replace(/<@!?\d+>/, '')
 .replace(/^\s*\d{15,22}/, '')
 .trim();
}

async function resolveVoiceChannel(message, data, target, remainder) {
 const commandChannelId = String(remainder || '').split(/\s+/).find((part) => /^\d{15,22}$/.test(part));
 const configuredId = String(data.channelId || '').trim();
 const channelId = commandChannelId || configuredId;
 if (channelId) {
 const fetched = await message.guild.channels.fetch(channelId).catch(() => null);
 if (fetched?.type === ChannelType.GuildVoice || fetched?.type === ChannelType.GuildStageVoice) return fetched;
 return null;
 }
 if (target?.voice?.channel) return target.voice.channel;
 if (message.member?.voice?.channel) return message.member.voice.channel;
 return null;
}

function reasonFrom(rawArgs, channelId, fallback) {
 let text = stripTarget(rawArgs);
 if (channelId) text = text.replace(new RegExp(`^${channelId}\\s*`), '').trim();
 return text || fallback || 'No reason provided';
}

function varsFor(message, target, voiceChannel, reason, command, extra = {}) {
 return {
 user: message.author?.username || 'Unknown',
 tag: message.author?.tag || 'Unknown#0000',
 id: message.author?.id || '0',
 mention: `<@${message.author?.id || '0'}>`,
 target: target?.user?.tag || target?.user?.username || 'Unknown',
 targetName: target?.user?.username || 'Unknown',
 targetId: target?.user?.id || '0',
 targetMention: `<@${target?.user?.id || '0'}>`,
 voiceChannel: voiceChannel?.name || 'Unknown',
 voiceChannelId: voiceChannel?.id || '0',
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
 name: 'Voice Unban',
 version: '1.0.0',
 author: 'Kiodium',
 description: 'Unban a user from a voice channel.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_voiceunban: {
 label: 'Voice Unban',
 icon: 'VCU',
 color: '#22C55E',
 description: 'Prefix command to remove a user voice-channel ban.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'voiceunban', required: true },
 aliases: { type: 'string', default: 'vcunban,vunban' },
 embedEnabled: { type: 'boolean', default: true },
 embedColor: { type: 'string', default: '#22C55E' },
 channelId: { type: 'string', default: '' },
 reason: { type: 'string', default: 'No reason provided' },
 successMessage: { type: 'string', default: '{targetMention} was unbanned from **{voiceChannel}** by {mention}.\nReason: {reason}' },
 usageMessage: { type: 'string', default: 'Usage: `{command} @user [voiceChannelId] [reason]`' },
 permissionMessage: { type: 'string', default: 'You need Manage Channels permission to voice unban users.' },
 botPermissionMessage: { type: 'string', default: 'I need Manage Channels permission to voice unban users.' },
 channelMessage: { type: 'string', default: 'I could not find the voice channel. Add a Voice Channel ID in the node or command.' },
 selfMessage: { type: 'string', default: 'You cannot voice unban yourself.' },
 errorMessage: { type: 'string', default: 'Failed to voice unban: {error}' },
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

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
 await message.reply(applyTemplate(data.botPermissionMessage || 'I need Manage Channels permission to voice unban users.', baseVars)).catch(() => {});
 return true;
 }
 if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
 await message.reply(applyTemplate(data.permissionMessage || 'You need Manage Channels permission to voice unban users.', baseVars)).catch(() => {});
 return true;
 }

 const target = await resolveMember(message, matched.rawArgs);
 if (!target) {
 await message.reply(applyTemplate(data.usageMessage || 'Usage: `{command} @user [voiceChannelId] [reason]`', baseVars)).catch(() => {});
 return true;
 }
 if (target.id === message.author.id) {
 await message.reply(applyTemplate(data.selfMessage || 'You cannot voice unban yourself.', varsFor(message, target, null, data.reason || 'No reason provided', matched.cmd))).catch(() => {});
 return true;
 }

 const remainder = stripTarget(matched.rawArgs);
 const voiceChannel = await resolveVoiceChannel(message, data, target, remainder);
 if (!voiceChannel) {
 await message.reply(applyTemplate(data.channelMessage || 'I could not find the voice channel. Add a Voice Channel ID in the node or command.', varsFor(message, target, null, data.reason || 'No reason provided', matched.cmd))).catch(() => {});
 return true;
 }

 const commandChannelId = String(remainder || '').split(/\s+/).find((part) => /^\d{15,22}$/.test(part));
 const reasonText = reasonFrom(matched.rawArgs, commandChannelId, data.reason || 'No reason provided');
 const vars = varsFor(message, target, voiceChannel, reasonText, matched.cmd);

 try {
 await voiceChannel.permissionOverwrites.edit(target.id, { Connect: null }, { reason: reasonText });
 } catch (err) {
 await message.reply(applyTemplate(data.errorMessage || 'Failed to voice unban: {error}', { ...vars, error: err.message })).catch(() => {});
 return true;
 }

 const text = applyTemplate(data.successMessage || '{targetMention} was unbanned from **{voiceChannel}** by {mention}.\nReason: {reason}', vars);
 try {
 if (ctx?.sendEmbed) await ctx.sendEmbed(message, data, text);
 else await message.channel.send(text);
 } catch {
 await message.channel.send(text).catch(() => {});
 }
 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = String(node.data?.command || 'voiceunban').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `// Voice Unban command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 message.channel.send("Voice Unban runs through the Kiodium plugin runtime and clears the target Connect deny in a voice channel.");
}`;
 },
 },
 },
};
