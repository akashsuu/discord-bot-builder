'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'invite').trim() || 'invite';
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
 if (!rest || /^\s/.test(rest)) return true;
 }
 return false;
}

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function hexToInt(hex) {
 const parsed = parseInt(String(hex || '#5865F2').replace('#', ''), 16);
 return Number.isNaN(parsed) ? 0x5865F2 : parsed;
}

function isUrl(value) {
 return /^https?:\/\//i.test(String(value || '').trim());
}

function buildInviteUrl(data, client) {
 if (isUrl(data.customInviteUrl)) return String(data.customInviteUrl).trim();
 const clientId = String(data.clientId || client?.user?.id || '').replace(/\D/g, '');
 if (!clientId) return 'https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands';
 const permissions = encodeURIComponent(String(data.permissions || '8').trim());
 const scopes = encodeURIComponent(String(data.scopes || 'bot applications.commands').trim());
 return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}`;
}

function varsFor(message, data, inviteUrl) {
 const botUser = message.client?.user;
 return {
 user: message.author?.username || 'Unknown',
 tag: message.author?.tag || message.author?.username || 'Unknown',
 id: message.author?.id || '',
 mention: message.author?.id ? `<@${message.author.id}>` : '@user',
 botName: botUser?.username || 'YourBot',
 botId: botUser?.id || data.clientId || 'YOUR_CLIENT_ID',
 inviteUrl,
 server: message.guild?.name || 'Server',
 channel: message.channel?.name || '',
 };
}

function buildButtons(data, inviteUrl) {
 const buttons = [
 new ButtonBuilder()
 .setStyle(ButtonStyle.Link)
 .setLabel(data.inviteButtonLabel || 'Invite Bot')
 .setURL(inviteUrl),
 ];
 if (data.showSupportButton !== false && isUrl(data.supportUrl)) {
 buttons.push(
 new ButtonBuilder()
 .setStyle(ButtonStyle.Link)
 .setLabel(data.supportButtonLabel || 'Support Server')
 .setURL(String(data.supportUrl).trim())
 );
 }
 return [new ActionRowBuilder().addComponents(buttons.slice(0, 5))];
}

module.exports = {
 meta: {
 name: 'Invite',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Get invite links for the bot.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 util_invite: {
 label: 'Invite',
 icon: 'INV',
 color: '#5865F2',
 description: 'Prefix command that sends the bot invite link with editable embed text and link buttons.',
 inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'invite', required: true },
 aliases: { type: 'string', default: 'i,in,inv', required: false },
 customInviteUrl: { type: 'string', default: '', required: false },
 clientId: { type: 'string', default: '', required: false },
 titleTemplate: { type: 'string', default: 'Invite {botName}', required: false },
 descriptionTemplate: { type: 'string', default: 'Use the button below to invite **{botName}** to your server.', required: false },
 },

 async execute(node, message, ctx) {
 if (!message || message.author?.bot) return false;

 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const commands = [
 commandWithPrefix(data.command, prefix),
 ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
 ];
 if (!matchCommand(message.content, commands)) return false;

 const inviteUrl = buildInviteUrl(data, message.client);
 const vars = varsFor(message, data, inviteUrl);
 const title = applyTemplate(data.titleTemplate || 'Invite {botName}', vars);
 const description = applyTemplate(data.descriptionTemplate || 'Use the button below to invite **{botName}** to your server.', vars);

 if (data.embedEnabled === false) {
 await message.channel.send({
 content: applyTemplate(data.plainTextTemplate || 'Invite {botName}: {inviteUrl}', vars),
 components: buildButtons(data, inviteUrl),
 });
 return true;
 }

 const embed = new EmbedBuilder()
 .setColor(hexToInt(data.embedColor || '#5865F2'))
 .setTitle(title)
 .setDescription(description);

 if (data.logoName || data.logoUrl) {
 embed.setAuthor({ name: applyTemplate(data.logoName || vars.botName, vars), iconURL: data.logoUrl || undefined });
 }
 if (data.imageUrl) embed.setImage(data.imageUrl);
 if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, vars) });

 await message.channel.send({
 embeds: [embed],
 components: buildButtons(data, inviteUrl),
 });
 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = String(node.data?.command || 'invite').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `
// Invite command
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 const _rest = message.content.slice("${cmd}".length);
 if (!_rest || /^\\s/.test(_rest)) {
 const _id = client.user.id;
 message.channel.send(\`https://discord.com/oauth2/authorize?client_id=\${_id}&permissions=8&scope=bot%20applications.commands\`);
 }
}`;
 },
 },
 },
};
