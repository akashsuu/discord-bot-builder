'use strict';

const { EmbedBuilder, version: discordJsVersion } = require('discord.js');

const DEFAULT_DESCRIPTION = '**Identity**\nBot: `{bot_name}`\nBot ID: `{bot_id}`\nOwner: {owner}\nCreated: `{created_at}`\n\n**Stats**\nCommands: `{command_count}`\nPing: `{ping}`\nUptime: `{uptime}`\nServers: `{server_count}`\nUsers: `{user_count}`\nChannels: `{channel_count}`\n\n**System**\nDiscord.js: `{discordjs_version}`\nNode.js: `{node_version}`\nMemory: `{memory}`\nPrefix: `{prefix}`\n\n**Links**\nInvite: {invite_link}\nSupport: {support_link}';

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'botinfo').trim() || 'botinfo';
 const effectivePrefix = String(prefix || '!');
 return raw.startsWith(effectivePrefix) ? raw : `${effectivePrefix}${raw}`;
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
 if (!rest || /^\s/.test(rest)) return { args: rest.trim() };
 }
 return null;
}

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key] - '') : match
 );
}

function hexToInt(hex) {
 const parsed = parseInt(String(hex || '#5865F2').replace('#', ''), 16);
 return Number.isNaN(parsed) ? 0x5865F2 : parsed;
}

function fmt(value) {
 return Number(value || 0).toLocaleString('en-US');
}

function dateText(dateLike) {
 const date = dateLike instanceof Date ? dateLike : new Date(dateLike || 0);
 if (!date || Number.isNaN(date.getTime())) return 'Unavailable';
 return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function duration(ms) {
 const seconds = Math.floor(Number(ms || 0) / 1000);
 const days = Math.floor(seconds / 86400);
 const hours = Math.floor((seconds % 86400) / 3600);
 const minutes = Math.floor((seconds % 3600) / 60);
 if (days) return `${days}d ${hours}h ${minutes}m`;
 if (hours) return `${hours}h ${minutes}m`;
 return `${minutes}m`;
}

function memoryText() {
 const used = process?.memoryUsage?.().heapUsed || 0;
 return used ? `${Math.round(used / 1024 / 1024).toLocaleString('en-US')} MB` : 'Unavailable';
}

function link(label, url) {
 const clean = String(url || '').trim();
 return /^https?:\/\//i.test(clean) ? `[${label}](${clean})` : 'Unavailable';
}

async function commandCount(client, data, guild) {
 const manual = Number(data.manualCommandCount || 0);
 const cachedGlobal = client?.application?.commands?.cache?.size || 0;
 const cachedGuild = guild?.commands?.cache?.size || 0;
 if (cachedGlobal || cachedGuild) return cachedGlobal + cachedGuild;
 try {
 const fetchedGlobal = await client?.application?.commands?.fetch?.();
 const fetchedGuild = await guild?.commands?.fetch?.();
 const total = (fetchedGlobal?.size || 0) + (fetchedGuild?.size || 0);
 return total || manual;
 } catch (_) {
 return manual;
 }
}

async function botVars(message, data, prefix) {
 const client = message.client || {};
 const bot = client.user;
 const app = client.application;
 const ownerId = String(data.ownerId || app?.owner?.id || '').trim();
 const owner = ownerId ? `<@${ownerId}>` : (data.ownerName || 'Bot Owner');
 const guilds = client.guilds?.cache;
 const users = client.users?.cache;
 const channels = client.channels?.cache;
 const commands = await commandCount(client, data, message.guild);
 const avatar = bot?.displayAvatarURL?.({ size: 1024, extension: 'png' }) || bot?.avatarURL?.() || '';
 const banner = data.bannerUrl || bot?.bannerURL?.({ size: 1024, extension: 'png' }) || '';

 return {
 user: message.author?.username || 'Unknown',
 user_tag: message.author?.tag || message.author?.username || 'Unknown',
 mention: message.author?.id ? `<@${message.author.id}>` : '@user',
 server: message.guild?.name || 'Server',
 prefix: prefix || '!',
 command: data.command || 'botinfo',
 bot_name: bot?.username || client.user?.tag || 'Bot',
 bot_tag: bot?.tag || bot?.username || 'Bot',
 bot_id: bot?.id || 'Unavailable',
 owner,
 owner_id: ownerId || 'Unavailable',
 created_at: bot?.createdAt ? dateText(bot.createdAt) : 'Unavailable',
 command_count: fmt(commands),
 ping: Number.isFinite(client.ws?.ping) ? `${Math.round(client.ws.ping)}ms` : 'Unavailable',
 uptime: duration(client.uptime || 0),
 server_count: fmt(guilds?.size || 0),
 user_count: fmt(users?.size || guilds?.reduce?.((sum, guild) => sum + (guild.memberCount || 0), 0) || 0),
 channel_count: fmt(channels?.size || 0),
 discordjs_version: discordJsVersion || 'Unavailable',
 node_version: process?.version || 'Unavailable',
 memory: memoryText(),
 avatar_url: avatar,
 banner_url: banner,
 invite_url: data.inviteUrl || '',
 support_url: data.supportUrl || '',
 invite_link: link(data.profileLinkLabel || 'Open Invite', data.inviteUrl),
 support_link: link(data.supportLinkLabel || 'Support Server', data.supportUrl),
 };
}

module.exports = {
 meta: {
 name: 'Bot Info',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Shows bot details including avatar, banner, commands, ping, owner, uptime, servers, and users.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 info_botinfo: {
 label: 'Bot Info',
 icon: 'BI',
 color: '#5865F2',
 description: 'Prefix command that shows bot information and runtime stats.',
 inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'botinfo', required: true },
 aliases: { type: 'string', default: 'bot,aboutbot,bi', required: false },
 ownerId: { type: 'string', default: '', required: false },
 ownerName: { type: 'string', default: 'Bot Owner', required: false },
 manualCommandCount: { type: 'string', default: '0', required: false },
 bannerUrl: { type: 'string', default: '', required: false },
 inviteUrl: { type: 'string', default: '', required: false },
 supportUrl: { type: 'string', default: '', required: false },
 titleTemplate: { type: 'string', default: '{bot_name} Bot Info', required: false },
 descriptionTemplate: { type: 'string', default: DEFAULT_DESCRIPTION, required: false },
 footerTemplate: { type: 'string', default: 'Requested by {user}', required: false },
 notBotMessage: { type: 'string', default: 'Bot information is unavailable right now.', required: false },
 profileLinkLabel: { type: 'string', default: 'Open Invite', required: false },
 supportLinkLabel: { type: 'string', default: 'Support Server', required: false },
 },

 async execute(node, message, ctx) {
 if (!message || message.author?.bot || !message.guild) return false;
 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const commands = [
 commandWithPrefix(data.command || 'botinfo', prefix),
 ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
 ];
 const matched = matchCommand(message.content, commands);
 if (!matched) return false;
 if (!message.client?.user) {
 await message.channel.send(data.notBotMessage || 'Bot information is unavailable right now.');
 return true;
 }

 const vars = await botVars(message, data, prefix);
 const embed = new EmbedBuilder()
 .setColor(hexToInt(data.embedColor || '#5865F2'))
 .setTitle(applyTemplate(data.titleTemplate || '{bot_name} Bot Info', vars))
 .setDescription(applyTemplate(data.descriptionTemplate || DEFAULT_DESCRIPTION, vars));
 if (vars.avatar_url) embed.setThumbnail(vars.avatar_url);
 if (vars.banner_url) embed.setImage(vars.banner_url);
 if (data.footerTemplate) embed.setFooter({ text: applyTemplate(data.footerTemplate, vars) });
 await message.channel.send({ embeds: [embed] });
 return true;
 },

 generateCode(node, prefix = '!') {
 const rawCmd = String(node.data?.command || 'botinfo').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `// Bot Info command\nif (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {\n message.channel.send({ embeds: [{ title: client.user.username + " Bot Info", description: "Ping: " + client.ws.ping + "ms" }] });\n}`;
 },
 },
 },
};
