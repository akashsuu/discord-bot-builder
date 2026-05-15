'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'avatar').trim() || 'avatar';
 const effectivePrefix = String(prefix || '!');
 return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function splitAliases(value) {
 return String(value || '')
 .split(',')
 .map((part) => part.trim())
 .filter(Boolean);
}

function matchCommand(content, commands) {
 const text = String(content || '').trim();
 for (const command of commands) {
 const cmd = String(command || '').trim();
 if (!cmd) continue;
 if (!text.toLowerCase().startsWith(cmd.toLowerCase())) continue;
 const rest = text.slice(cmd.length);
 if (!rest || /^\s/.test(rest)) return { command: cmd, args: rest.trim() };
 }
 return null;
}

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function hexToInt(hex) {
 const parsed = parseInt(String(hex || '#3B82F6').replace('#', ''), 16);
 return Number.isNaN(parsed) ? 0x3B82F6 : parsed;
}

function avatarUrlFor(user) {
 return user?.displayAvatarURL?.({ size: 4096, extension: 'png', forceStatic: false }) || user?.avatarURL?.() || null;
}

function guildIconUrl(guild) {
 return guild?.iconURL?.({ size: 4096, extension: 'png', forceStatic: false }) || null;
}

async function resolveTargetUser(message, args) {
 const mentioned = message.mentions?.users?.first?.() || message.mentions?.users?.values?.().next?.().value;
 if (mentioned) return mentioned;

 const id = String(args || '').match(/\d{15,25}/)?.[0];
 if (id && message.client?.users?.fetch) {
 try { return await message.client.users.fetch(id); }
 catch { return message.author; }
 }
 return message.author;
}

function createButtons(data, avatarUrl, serverUrl, isServerMode) {
 const buttons = [];
 if (data.showDownloadButton !== false && avatarUrl) {
 buttons.push(
 new ButtonBuilder()
 .setStyle(ButtonStyle.Link)
 .setLabel(data.downloadButtonLabel || 'Download')
 .setURL(avatarUrl)
 );
 }
 if (data.showOpenButton !== false && avatarUrl) {
 buttons.push(
 new ButtonBuilder()
 .setStyle(ButtonStyle.Link)
 .setLabel(data.openButtonLabel || 'Open Avatar')
 .setURL(avatarUrl)
 );
 }
 if (!isServerMode && data.showServerButton !== false && serverUrl) {
 buttons.push(
 new ButtonBuilder()
 .setStyle(ButtonStyle.Link)
 .setLabel(data.serverButtonLabel || 'Server Icon')
 .setURL(serverUrl)
 );
 }
 return buttons.length ? [new ActionRowBuilder().addComponents(buttons.slice(0, 5))] : [];
}

module.exports = {
 meta: {
 name: 'Avatar',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Shows user avatars or the server icon with interactive download/open buttons.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 util_avatar: {
 label: 'Avatar',
 icon: 'AV',
 color: '#3B82F6',
 description: 'Prefix command for user/server avatar previews. Supports aliases like av.',
 inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'avatar', required: true },
 aliases: { type: 'string', default: 'av', required: false },
 titleTemplate: { type: 'string', default: "{targetName}'s Avatar", required: false },
 serverTitleTemplate: { type: 'string', default: "{server}'s Server Icon", required: false },
 descriptionTemplate: { type: 'string', default: 'Requested by {mention}', required: false },
 noAvatarMessage: { type: 'string', default: 'No avatar/icon found.', required: false },
 },

 async execute(node, message, ctx) {
 if (!message || message.author?.bot || !message.guild) return false;

 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const commands = [
 commandWithPrefix(data.command, prefix),
 ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
 ];
 const matched = matchCommand(message.content, commands);
 if (!matched) return false;

 const args = matched.args || '';
 const isServerMode = /^(server|guild)\b/i.test(args);
 const target = isServerMode ? null : await resolveTargetUser(message, args);
 const avatarUrl = isServerMode ? guildIconUrl(message.guild) : avatarUrlFor(target);
 const serverUrl = guildIconUrl(message.guild);

 if (!avatarUrl) {
 const fallback = applyTemplate(data.noAvatarMessage || 'No avatar/icon found.', {
 user: message.author.username,
 mention: `<@${message.author.id}>`,
 server: message.guild.name,
 });
 await message.channel.send(fallback);
 return true;
 }

 const vars = {
 user: message.author.username,
 tag: message.author.tag || message.author.username,
 id: message.author.id,
 mention: `<@${message.author.id}>`,
 targetName: isServerMode ? message.guild.name : target.username,
 targetTag: isServerMode ? message.guild.name : (target.tag || target.username),
 targetId: isServerMode ? message.guild.id : target.id,
 targetMention: isServerMode ? message.guild.name : `<@${target.id}>`,
 avatarUrl,
 server: message.guild.name,
 serverId: message.guild.id,
 channel: message.channel?.name || '',
 };

 const title = applyTemplate(
 isServerMode ? (data.serverTitleTemplate || "{server}'s Server Icon") : (data.titleTemplate || "{targetName}'s Avatar"),
 vars
 );
 const description = applyTemplate(data.descriptionTemplate || 'Requested by {mention}', vars);
 const embed = new EmbedBuilder()
 .setColor(hexToInt(data.embedColor || '#3B82F6'))
 .setTitle(title)
 .setDescription(description)
 .setImage(avatarUrl);

 if (data.logoName || data.logoUrl) {
 embed.setAuthor({ name: applyTemplate(data.logoName || 'Avatar', vars), iconURL: data.logoUrl || undefined });
 }
 if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, vars) });

 await message.channel.send({
 embeds: data.embedEnabled === false ? [] : [embed],
 content: data.embedEnabled === false ? `${title}\n${description}\n${avatarUrl}` : undefined,
 components: createButtons(data, avatarUrl, serverUrl, isServerMode),
 });

 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = String(node.data?.command || 'avatar').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `
// Avatar command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 const _rest = message.content.slice("${cmd}".length);
 if (!_rest || /^\\s/.test(_rest)) {
 const _user = message.mentions.users.first() || message.author;
 const _url = _user.displayAvatarURL({ size: 4096, extension: "png", forceStatic: false });
 message.channel.send({ content: _url });
 }
}`;
 },
 },
 },
};
