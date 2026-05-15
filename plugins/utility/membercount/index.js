'use strict';

const { EmbedBuilder } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'membercount').trim() || 'membercount';
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
 const parsed = parseInt(String(hex || '#22C55E').replace('#', ''), 16);
 return Number.isNaN(parsed) ? 0x22C55E : parsed;
}

function fmt(value) {
 return Number(value || 0).toLocaleString('en-US');
}

async function getCounts(guild) {
 let fresh = guild;
 try { fresh = await guild.fetch(); }
 catch { fresh = guild; }

 const total = fresh.memberCount ?? guild.memberCount ?? guild.members?.cache?.size ?? 0;
 let botCount = guild.members?.cache?.filter?.((member) => member.user?.bot).size - 0;
 let cacheSize = guild.members?.cache?.size ?? 0;

 if (cacheSize < total && guild.members?.fetch) {
 try {
 await guild.members.fetch();
 botCount = guild.members.cache.filter((member) => member.user?.bot).size;
 cacheSize = guild.members.cache.size;
 } catch {
 // Use cached bot count if full member fetch is unavailable.
 }
 }

 const humanCount = Math.max(0, total - botCount);
 return { total, humanCount, botCount, cacheSize };
}

function varsFor(message, counts) {
 return {
 user: message.author?.username || 'Unknown',
 tag: message.author?.tag || message.author?.username || 'Unknown',
 id: message.author?.id || '',
 mention: message.author?.id ? `<@${message.author.id}>` : '@user',
 server: message.guild?.name || 'Server',
 serverId: message.guild?.id || '',
 memberCount: fmt(counts.total),
 members: fmt(counts.total),
 humanCount: fmt(counts.humanCount),
 botCount: fmt(counts.botCount),
 cachedCount: fmt(counts.cacheSize),
 channel: message.channel?.name || '',
 };
}

module.exports = {
 meta: {
 name: 'Member Count',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Shows the total member count for the server.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 util_membercount: {
 label: 'Member Count',
 icon: 'MC',
 color: '#22C55E',
 description: 'Prefix command that shows total, human, and bot member counts.',
 inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'membercount', required: true },
 aliases: { type: 'string', default: 'mc,members', required: false },
 titleTemplate: { type: 'string', default: '{server} Members', required: false },
 descriptionTemplate: { type: 'string', default: '**Total Members:** {memberCount}\n**Humans:** {humanCount}\n**Bots:** {botCount}', required: false },
 plainTextTemplate: { type: 'string', default: '{server} has {memberCount} members.', required: false },
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

 const counts = await getCounts(message.guild);
 const vars = varsFor(message, counts);
 const title = applyTemplate(data.titleTemplate || '{server} Members', vars);
 const description = applyTemplate(
 data.descriptionTemplate || '**Total Members:** {memberCount}\n**Humans:** {humanCount}\n**Bots:** {botCount}',
 vars
 );

 if (data.embedEnabled === false) {
 const text = applyTemplate(data.plainTextTemplate || '{server} has {memberCount} members.', vars);
 await message.channel.send(text);
 return true;
 }

 const embed = new EmbedBuilder()
 .setColor(hexToInt(data.embedColor || '#22C55E'))
 .setTitle(title)
 .setDescription(description);

 if (data.logoName || data.logoUrl) {
 embed.setAuthor({ name: applyTemplate(data.logoName || 'Member Count', vars), iconURL: data.logoUrl || undefined });
 }
 if (data.imageUrl) embed.setImage(data.imageUrl);
 if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, vars) });

 await message.channel.send({ embeds: [embed] });
 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = String(node.data?.command || 'membercount').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `
// Member Count command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 const _rest = message.content.slice("${cmd}".length);
 if (!_rest || /^\\s/.test(_rest)) {
 message.channel.send(\`\${message.guild.name} has \${message.guild.memberCount.toLocaleString()} members.\`);
 }
}`;
 },
 },
 },
};
