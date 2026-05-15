'use strict';

const { EmbedBuilder } = require('discord.js');

const DEFAULT_DESCRIPTION = '**Traveler**\nNickname: `{nickname}`\nUID: `{uid}`\nAdventure Rank: `{level}`\nWorld Level: `{world_level}`\nSignature: {signature}\n\n**Progress**\nAchievements: `{achievements}`\nAbyss: `{abyss}`\nShowcase Characters: `{showcase_count}`\nNamecard ID: `{namecard_id}`\nProfile Icon ID: `{profile_icon_id}`\n\n**Links**\nProfile: {profile_link}';

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'genshin').trim() || 'genshin';
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
 const parsed = parseInt(String(hex || '#67E8F9').replace('#', ''), 16);
 return Number.isNaN(parsed) ? 0x67E8F9 : parsed;
}

function cleanUid(raw) {
 const match = String(raw || '').match(/\b\d{9,10}\b/);
 return match ? match[0] : '';
}

function readNameMap(value) {
 const map = new Map();
 for (const line of String(value || '').split(/\r?\n/)) {
 const trimmed = line.trim();
 if (!trimmed || trimmed.startsWith('#')) continue;
 const separator = trimmed.includes('=') ? '=' : trimmed.includes(':') ? ':' : ',';
 const [rawName, rawUid] = trimmed.split(separator);
 const name = String(rawName || '').trim().toLowerCase();
 const uid = cleanUid(rawUid);
 if (name && uid) map.set(name, uid);
 }
 return map;
}

function resolveUidOrName(raw, data) {
 const query = String(raw || '').trim();
 const uid = cleanUid(query);
 if (uid) return { uid, query, mappedName: '' };
 const mapped = readNameMap(data.nameMap).get(query.toLowerCase());
 return mapped ? { uid: mapped, query, mappedName: query } : { uid: '', query, mappedName: query };
}

function fmt(value) {
 return Number(value || 0).toLocaleString('en-US');
}

function profileUrl(uid) {
 return `https://enka.network/u/${encodeURIComponent(uid)}/`;
}

async function getJson(url, userAgent) {
 if (typeof fetch !== 'function') throw new Error('Fetch API is unavailable in this runtime.');
 const response = await fetch(url, {
 headers: {
 Accept: 'application/json',
 'User-Agent': userAgent || 'DiscordBotBuilder/1.0 contact: owner',
 },
 });
 if (response.status === 404) return null;
 if (response.status === 429) {
 const err = new Error('Rate limited by Enka.Network.');
 err.code = 'RATE_LIMITED';
 throw err;
 }
 if (!response.ok) {
 const text = await response.text().catch(() => '');
 throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
 }
 return response.json();
}

async function fetchGenshinProfile(uid, data) {
 const base = String(data.apiBase || 'https://enka.network/api/uid').replace(/\/+$/, '');
 const json = await getJson(`${base}/${encodeURIComponent(uid)}/`, data.userAgent);
 const info = json?.playerInfo;
 if (!info) return null;
 const abyssFloor = info.towerFloorIndex || 0;
 const abyssChamber = info.towerLevelIndex || 0;
 const avatarList = Array.isArray(json.avatarInfoList) ? json.avatarInfoList : [];
 const profileIconId = info.profilePicture?.avatarId || info.profilePicture?.id || info.profilePicture?.iconPath || 'Unavailable';
 return {
 uid,
 nickname: info.nickname || 'Traveler',
 level: info.level || 0,
 worldLevel: info.worldLevel - 'Unavailable',
 signature: info.signature || 'No signature.',
 achievements: info.finishAchievementNum || 0,
 abyss: abyssFloor && abyssChamber ? `${abyssFloor}-${abyssChamber}` : 'Unavailable',
 showcaseCount: avatarList.length,
 namecardId: info.nameCardId || 'Unavailable',
 profileIconId,
 ttl: json.ttl || 0,
 profileUrl: profileUrl(uid),
 imageUrl: 'https://enka.network/ui/UI_AvatarIcon_PlayerGirl.png',
 };
}

function varsFor(message, data, profile = {}, extra = {}) {
 return {
 user: message.author?.username || 'Unknown',
 user_tag: message.author?.tag || `${message.author?.username || 'Unknown'}#0001`,
 mention: message.author?.id ? `<@${message.author.id}>` : '@user',
 query: extra.query || profile.uid || '',
 uid: profile.uid || extra.uid || 'Unavailable',
 nickname: profile.nickname || 'Traveler',
 input_name: extra.mappedName || profile.nickname || '',
 level: profile.level || '0',
 world_level: profile.worldLevel || 'Unavailable',
 signature: profile.signature || 'No signature.',
 achievements: fmt(profile.achievements),
 abyss: profile.abyss || 'Unavailable',
 showcase_count: fmt(profile.showcaseCount),
 namecard_id: profile.namecardId || 'Unavailable',
 profile_icon_id: profile.profileIconId || 'Unavailable',
 ttl: profile.ttl || '0',
 image_url: profile.imageUrl || '',
 profile_url: profile.profileUrl || '',
 profile_link: profile.profileUrl ? `[${data.profileLinkLabel || 'Open Enka'}](${profile.profileUrl})` : 'Unavailable',
 command: commandWithPrefix(data.command || 'genshin', extra.prefix || '!'),
 error: extra.error || '',
 };
}

module.exports = {
 meta: {
 name: 'Genshin Profile',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Shows a Genshin Impact profile from UID using Enka.Network.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 game_genshin_profile: {
 label: 'Genshin Profile',
 icon: 'GI',
 color: '#67E8F9',
 description: 'Prefix Genshin profile command using UID lookup.',
 inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'genshin', required: true },
 aliases: { type: 'string', default: 'gprofile,genshinprofile,gi', required: false },
 apiBase: { type: 'string', default: 'https://enka.network/api/uid', required: false },
 userAgent: { type: 'string', default: 'DiscordBotBuilder/1.0 contact: owner', required: false },
 nameMap: { type: 'string', default: 'Akash=618285856\nLumine=618285856', required: false },
 titleTemplate: { type: 'string', default: 'Genshin profile for {nickname}', required: false },
 descriptionTemplate: { type: 'string', default: DEFAULT_DESCRIPTION, required: false },
 invalidUidMessage: { type: 'string', default: 'Use `{command} <genshin uid>` to check a Genshin profile.', required: false },
 nameNotMappedMessage: { type: 'string', default: 'No UID saved for `{query}`. Add it in the Genshin Profile node name map like `Name=UID`.', required: false },
 notFoundMessage: { type: 'string', default: 'No Genshin profile found for UID `{query}`. The UID may be wrong or unavailable.', required: false },
 rateLimitMessage: { type: 'string', default: 'Genshin profile lookup is rate limited right now. Try again later.', required: false },
 errorMessage: { type: 'string', default: 'Could not load Genshin profile: {error}', required: false },
 profileLinkLabel: { type: 'string', default: 'Open Enka', required: false },
 },

 async execute(node, message, ctx) {
 if (!message || message.author?.bot || !message.guild) return false;
 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const commands = [
 commandWithPrefix(data.command || 'genshin', prefix),
 ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
 ];
 const matched = matchCommand(message.content, commands);
 if (!matched) return false;

 const resolved = resolveUidOrName(matched.args, data);
 const uid = resolved.uid;
 if (!uid) {
 const template = resolved.query
 ? data.nameNotMappedMessage || 'No UID saved for `{query}`. Add it in the Genshin Profile node name map like `Name=UID`.'
 : data.invalidUidMessage || 'Use `{command} <genshin uid>` to check a Genshin profile.';
 await message.channel.send(applyTemplate(template, varsFor(message, data, {}, { query: resolved.query, prefix })));
 return true;
 }

 let profile;
 try {
 profile = await fetchGenshinProfile(uid, data);
 } catch (err) {
 const template = err.code === 'RATE_LIMITED'
 ? data.rateLimitMessage || 'Genshin profile lookup is rate limited right now. Try again later.'
 : data.errorMessage || 'Could not load Genshin profile: {error}';
 await message.channel.send(applyTemplate(template, varsFor(message, data, {}, { query: resolved.query || uid, uid, mappedName: resolved.mappedName, prefix, error: err.message })));
 return true;
 }

 if (!profile) {
 await message.channel.send(applyTemplate(data.notFoundMessage || 'No Genshin profile found for UID `{query}`. The UID may be wrong or unavailable.', varsFor(message, data, {}, { query: resolved.query || uid, uid, mappedName: resolved.mappedName, prefix })));
 return true;
 }

 const vars = varsFor(message, data, profile, { query: resolved.query || uid, uid, mappedName: resolved.mappedName, prefix });
 const embed = new EmbedBuilder()
 .setColor(hexToInt(data.embedColor || '#67E8F9'))
 .setTitle(applyTemplate(data.titleTemplate || 'Genshin profile for {nickname}', vars))
 .setDescription(applyTemplate(data.descriptionTemplate || DEFAULT_DESCRIPTION, vars));
 if (profile.imageUrl) embed.setThumbnail(profile.imageUrl);
 await message.channel.send({ embeds: [embed] });
 return true;
 },

 generateCode(node, prefix = '!') {
 const rawCmd = String(node.data?.command || 'genshin').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `// Genshin Profile command\nif (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()} ")) {\n message.channel.send("Genshin Profile runs through the builder plugin runtime.");\n}`;
 },
 },
 },
};
