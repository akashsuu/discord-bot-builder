'use strict';

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'shutdown').trim() || 'shutdown';
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
 if (!rest || /^\s/.test(rest)) return true;
 }
 return false;
}

function hexToInt(hex) {
 const parsed = parseInt(String(hex || '#EF4444').replace('#', ''), 16);
 return Number.isNaN(parsed) ? 0xEF4444 : parsed;
}

function formatTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
 );
}

module.exports = {
 meta: {
 name: 'Shutdown',
 version: '1.0.0',
 author: 'Kiodium',
 description: 'Shutdown the running bot from Discord with an admin prefix command.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 admin_shutdown: {
 label: 'Shutdown',
 icon: 'PWR',
 color: '#EF4444',
 description: 'Admin command to shutdown the bot without opening the app.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'shutdown', required: true },
 aliases: { type: 'string', default: 'stopbot,off' },
 embedEnabled: { type: 'boolean', default: true },
 embedColor: { type: 'string', default: '#EF4444' },
 titleTemplate: { type: 'string', default: 'Shutting Down Bot' },
 descriptionTemplate: { type: 'string', default: '{botName} is shutting down now.' },
 plainTextTemplate: { type: 'string', default: '{botName} is shutting down now.' },
 permissionMessage: { type: 'string', default: 'You need Manage Server permission to shutdown the bot.' },
 unavailableMessage: { type: 'string', default: 'Shutdown is not available in this runtime.' },
 errorMessage: { type: 'string', default: 'Could not shutdown bot: {error}' },
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
 if (!matchCommand(message.content, commands)) return false;

 if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
 await message.reply(data.permissionMessage || 'You need Manage Server permission to shutdown the bot.').catch(() => {});
 return true;
 }

 const shutdownBot = globalThis.__kiodiumShutdownBot;
 if (typeof shutdownBot !== 'function') {
 await message.reply(data.unavailableMessage || 'Shutdown is not available in this runtime.').catch(() => {});
 return true;
 }

 const vars = {
 botName: message.client?.user?.username || 'Bot',
 botTag: message.client?.user?.tag || 'Bot#0000',
 user: message.author.username,
 mention: `<@${message.author.id}>`,
 server: message.guild.name,
 channel: message.channel.name,
 };

 try {
 if (data.embedEnabled === false) {
 await message.channel.send(formatTemplate(data.plainTextTemplate || '{botName} is shutting down now.', vars));
 } else {
 const embed = new EmbedBuilder()
 .setColor(hexToInt(data.embedColor))
 .setTitle(formatTemplate(data.titleTemplate || 'Shutting Down Bot', vars).slice(0, 256))
 .setDescription(formatTemplate(data.descriptionTemplate || '{botName} is shutting down now.', vars).slice(0, 4096))
 .setTimestamp();
 await message.channel.send({ embeds: [embed] });
 }

 const delay = Math.max(250, Number(data.delayMs || 1200));
 setTimeout(() => {
 Promise.resolve(shutdownBot()).catch(() => {});
 }, delay);
 } catch (err) {
 await message.reply(formatTemplate(data.errorMessage || 'Could not shutdown bot: {error}', { ...vars, error: err.message })).catch(() => {});
 }

 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = String(node.data?.command || 'shutdown').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `// Shutdown command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 message.channel.send("Shutdown runs through the Kiodium runtime and stops the active bot from Discord.");
}`;
 },
 },
 },
};
