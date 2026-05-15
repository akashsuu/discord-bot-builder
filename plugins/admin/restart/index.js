'use strict';

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'restart').trim() || 'restart';
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

function hexToInt(hex) {
 const parsed = parseInt(String(hex || '#F97316').replace('#', ''), 16);
 return Number.isNaN(parsed) ? 0xF97316 : parsed;
}

function formatTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
 );
}

module.exports = {
 meta: {
 name: 'Restart',
 version: '1.0.0',
 author: 'Kiodium',
 description: 'Restart the running bot from Discord with an admin prefix command.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 admin_restart: {
 label: 'Restart',
 icon: 'RST',
 color: '#F97316',
 description: 'Admin command to restart the bot without opening the app.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'restart', required: true },
 aliases: { type: 'string', default: 'reboot,restartbot' },
 embedEnabled: { type: 'boolean', default: true },
 embedColor: { type: 'string', default: '#F97316' },
 titleTemplate: { type: 'string', default: 'Restarting Bot' },
 descriptionTemplate: { type: 'string', default: '{botName} is restarting now. I will reconnect in a moment.' },
 plainTextTemplate: { type: 'string', default: '{botName} is restarting now.' },
 successMessage: { type: 'string', default: 'Restart command accepted.' },
 permissionMessage: { type: 'string', default: 'You need Manage Server permission to restart the bot.' },
 unavailableMessage: { type: 'string', default: 'Restart is not available in this runtime.' },
 errorMessage: { type: 'string', default: 'Could not restart bot: {error}' },
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
 await message.reply(data.permissionMessage || 'You need Manage Server permission to restart the bot.').catch(() => {});
 return true;
 }

 const restartBot = globalThis.__kiodiumRestartBot;
 if (typeof restartBot !== 'function') {
 await message.reply(data.unavailableMessage || 'Restart is not available in this runtime.').catch(() => {});
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
 await message.channel.send(formatTemplate(data.plainTextTemplate || '{botName} is restarting now.', vars));
 } else {
 const embed = new EmbedBuilder()
 .setColor(hexToInt(data.embedColor))
 .setTitle(formatTemplate(data.titleTemplate || 'Restarting Bot', vars).slice(0, 256))
 .setDescription(formatTemplate(data.descriptionTemplate || '{botName} is restarting now. I will reconnect in a moment.', vars).slice(0, 4096))
 .setTimestamp();
 await message.channel.send({ embeds: [embed] });
 }

 const delay = Math.max(250, Number(data.delayMs || 1200));
 setTimeout(() => {
 Promise.resolve(restartBot()).catch(() => {});
 }, delay);
 } catch (err) {
 await message.reply(formatTemplate(data.errorMessage || 'Could not restart bot: {error}', { ...vars, error: err.message })).catch(() => {});
 }

 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = String(node.data?.command || 'restart').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `// Restart command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 message.channel.send("Restart runs through the Kiodium runtime and restarts the active bot from Discord.");
}`;
 },
 },
 },
};
