'use strict';

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'botleave').trim() || 'botleave';
 const effectivePrefix = String(prefix || '!');
 return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function splitAliases(value) {
 return String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
}

function findMatchedCommand(content, commands) {
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

function hexToInt(hex) {
 const parsed = parseInt(String(hex || '#DC2626').replace('#', ''), 16);
 return Number.isNaN(parsed) ? 0xDC2626 : parsed;
}

function formatTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
 );
}

module.exports = {
 meta: {
 name: 'Bot Leave',
 version: '1.0.0',
 author: 'Kiodium',
 description: 'Make the bot leave the current Discord server with an admin prefix command.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 admin_botleave: {
 label: 'Bot Leave',
 icon: 'EXIT',
 color: '#DC2626',
 description: 'Admin command that makes the bot leave the current server.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'botleave', required: true },
 aliases: { type: 'string', default: 'leave,leaveserver,botexit' },
 embedEnabled: { type: 'boolean', default: true },
 embedColor: { type: 'string', default: '#DC2626' },
 titleTemplate: { type: 'string', default: 'Leaving Server' },
 descriptionTemplate: { type: 'string', default: '{botName} is leaving **{server}** now.' },
 plainTextTemplate: { type: 'string', default: '{botName} is leaving {server} now.' },
 confirmRequired: { type: 'boolean', default: true },
 confirmKeyword: { type: 'string', default: 'CONFIRM' },
 confirmMessage: { type: 'string', default: 'Type `{command} CONFIRM` to make me leave this server.' },
 permissionMessage: { type: 'string', default: 'You need Administrator permission to make the bot leave this server.' },
 ownerOnlyMessage: { type: 'string', default: 'Only the bot owner can use this command when owner-only mode is enabled.' },
 errorMessage: { type: 'string', default: 'Could not leave server: {error}' },
 delayMs: { type: 'number', default: 1200 },
 },

 async execute(node, message, ctx) {
 if (!message || message.author?.bot || !message.guild) return false;
 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const commands = [
 commandWithPrefix(data.command, prefix),
 ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
 ];
 const matched = findMatchedCommand(message.content, commands);
 if (!matched) return false;

 if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
 await message.reply(data.permissionMessage || 'You need Administrator permission to make the bot leave this server.').catch(() => {});
 return true;
 }

 const confirmKeyword = String(data.confirmKeyword || 'CONFIRM').trim();
 if (data.confirmRequired !== false && matched.args.toUpperCase() !== confirmKeyword.toUpperCase()) {
 await message.reply(formatTemplate(data.confirmMessage || 'Type `{command} CONFIRM` to make me leave this server.', {
 command: matched.command,
 confirmKeyword,
 })).catch(() => {});
 return true;
 }

 const vars = {
 botName: message.client?.user?.username || 'Bot',
 botTag: message.client?.user?.tag || 'Bot#0000',
 user: message.author.username,
 mention: `<@${message.author.id}>`,
 server: message.guild.name,
 serverId: message.guild.id,
 channel: message.channel.name,
 };

 try {
 if (data.embedEnabled === false) {
 await message.channel.send(formatTemplate(data.plainTextTemplate || '{botName} is leaving {server} now.', vars));
 } else {
 const embed = new EmbedBuilder()
 .setColor(hexToInt(data.embedColor))
 .setTitle(formatTemplate(data.titleTemplate || 'Leaving Server', vars).slice(0, 256))
 .setDescription(formatTemplate(data.descriptionTemplate || '{botName} is leaving **{server}** now.', vars).slice(0, 4096))
 .setTimestamp();
 await message.channel.send({ embeds: [embed] });
 }

 const guild = message.guild;
 const delay = Math.max(250, Number(data.delayMs || 1200));
 setTimeout(() => {
 guild.leave().catch(() => {});
 }, delay);
 } catch (err) {
 await message.reply(formatTemplate(data.errorMessage || 'Could not leave server: {error}', { ...vars, error: err.message })).catch(() => {});
 }

 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = String(node.data?.command || 'botleave').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `// Bot leave command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply("Administrator permission required.");
 await message.channel.send("Leaving this server now.");
 await message.guild.leave();
}`;
 },
 },
 },
};
