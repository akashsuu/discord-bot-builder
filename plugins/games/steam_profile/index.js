'use strict';

const { EmbedBuilder } = require('discord.js');

const DEFAULT_DESCRIPTION = '**Profile**\nSteamID: `{steam_id}`\nVisibility: `{visibility}`\nStatus: `{persona_state}`\nCountry: `{country}`\nCreated: `{created_at}`\nLast Online: `{last_online}`\n\n**Library**\nGames: `{game_count}`\nTotal Playtime: `{total_playtime}`\nRecently Played: `{recent_games}`\n\n**Links**\nProfile: {profile_link}';

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'steam').trim() || 'steam';
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
 const parsed = parseInt(String(hex || '#66C0F4').replace('#', ''), 16);
 return Number.isNaN(parsed) ? 0x66C0F4 : parsed;
}

function cleanSteamId(raw) {
 const match = String(raw || '').match(/\b7656119\d{10}\b/);
 return match ? match[0] : '';
}

function xmlValue(xml, tag) {
 const match = String(xml || '').match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, 'i'));
 return match ? match[1].trim() : '';
}

function xmlValues(xml, tag) {
 const values = [];
 const re = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, 'gi');
 let match;
 while ((match = re.exec(String(xml || '')))) values.push(match[1].trim());
 return values;
}

async function getText(url) {
 if (typeof fetch !== 'function') throw new Error('Fetch API is unavailable in this runtime.');
 const response = await fetch(url, { headers: { Accept: 'application/xml,text/xml,text/plain' } });
 if (response.status === 204 || response.status === 404) return '';
 if (!response.ok) {
 const text = await response.text().catch(() => '');
 throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
 }
 return response.text();
}

async function getJson(url) {
 if (typeof fetch !== 'function') throw new Error('Fetch API is unavailable in this runtime.');
 const response = await fetch(url, { headers: { Accept: 'application/json' } });
 if (response.status === 204 || response.status === 404) return null;
 if (!response.ok) {
 const text = await response.text().catch(() => '');
 throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
 }
 return response.json();
}

function personaStateText(value) {
 const states = ['Offline', 'Online', 'Busy', 'Away', 'Snooze', 'Looking to trade', 'Looking to play'];
 return states[Number(value || 0)] || 'Unknown';
}

function visibilityText(value) {
 return Number(value) === 3 ? 'Public' : 'Private';
}

function dateText(seconds) {
 const ts = Number(seconds || 0);
 if (!ts) return 'Unavailable';
 return new Date(ts * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function minutesToHours(minutes) {
 const mins = Number(minutes || 0);
 if (!mins) return 'Unavailable';
 return `${Math.round(mins / 60).toLocaleString('en-US')} hours`;
}

function parseHourText(value) {
 const cleaned = String(value || '').replace(/,/g, '').match(/[\d.]+/);
 return cleaned ? Number(cleaned[0]) : 0;
}

function hoursToText(hours) {
 const value = Number(hours || 0);
 if (!value) return 'Unavailable';
 return `${Math.round(value).toLocaleString('en-US')} hours`;
}

function parseXmlGames(xml) {
 const blocks = String(xml || '').match(/<mostPlayedGame>[\s\S]*?<\/mostPlayedGame>/gi) || [];
 const games = blocks.map((block) => ({
 name: xmlValue(block, 'gameName'),
 hours: parseHourText(xmlValue(block, 'hoursOnRecord') || xmlValue(block, 'hoursPlayed')),
 })).filter((game) => game.name);
 const fallbackNames = !games.length ? xmlValues(xml, 'gameName').map((name) => ({ name, hours: 0 })) : [];
 return games.length ? games : fallbackNames;
}

async function fetchSteamXmlProfile(steamId) {
 const xml = await getText(`https://steamcommunity.com/profiles/${encodeURIComponent(steamId)}/?xml=1`);
 if (!xml) return null;
 const id = xmlValue(xml, 'steamID64') || steamId;
 if (!id) return null;
 const xmlGames = parseXmlGames(xml);
 const totalHours = xmlGames.reduce((sum, game) => sum + Number(game.hours || 0), 0);
 return {
 steamId: id,
 name: xmlValue(xml, 'steamID') || 'Steam User',
 profileUrl: xmlValue(xml, 'profileURL') || `https://steamcommunity.com/profiles/${id}`,
 avatarUrl: xmlValue(xml, 'avatarFull') || xmlValue(xml, 'avatarMedium') || xmlValue(xml, 'avatarIcon') || '',
 visibility: xmlValue(xml, 'privacyState') || 'Unavailable',
 personaState: xmlValue(xml, 'onlineState') || 'Unavailable',
 country: xmlValue(xml, 'location') || 'Unavailable',
 createdAt: xmlValue(xml, 'memberSince') || 'Unavailable',
 lastOnline: xmlValue(xml, 'stateMessage') || 'Unavailable',
 gameCount: xmlGames.length ? xmlGames.length.toLocaleString('en-US') : 'Unavailable',
 totalPlaytime: totalHours ? hoursToText(totalHours) : 'Unavailable',
 recentGames: xmlGames.slice(0, 3).map((game) => game.name).join(', ') || 'Unavailable',
 };
}

async function fetchSteamProfile(steamId, data) {
 const apiKey = String(data.apiKey || '').trim();
 const xmlProfile = await fetchSteamXmlProfile(steamId).catch(() => null);
 let apiPlayer = {};
 let ownedGames = [];
 let recentGames = [];
 let ownedResponse = {};

 if (apiKey) {
 const key = encodeURIComponent(apiKey);
 const id = encodeURIComponent(steamId);
 const summary = await getJson(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${id}`).catch(() => null);
 const owned = await getJson(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${id}&include_appinfo=1&include_played_free_games=1`).catch(() => null);
 const recent = await getJson(`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${key}&steamid=${id}`).catch(() => null);
 apiPlayer = summary?.response?.players?.[0] || {};
 ownedResponse = owned?.response || {};
 ownedGames = owned?.response?.games || [];
 recentGames = recent?.response?.games || [];
 }

 if (!apiPlayer.steamid && !xmlProfile) return null;
 const totalMinutes = ownedGames.reduce((sum, game) => sum + Number(game.playtime_forever || 0), 0);
 const recentText = recentGames.slice(0, 3).map((game) => game.name).filter(Boolean).join(', ') || xmlProfile?.recentGames || 'Unavailable';
 const apiGameCount = ownedGames.length || (Number.isFinite(Number(ownedResponse.game_count)) ? Number(ownedResponse.game_count) : 0);

 return {
 steamId,
 name: apiPlayer.personaname || xmlProfile?.name || 'Steam User',
 profileUrl: apiPlayer.profileurl || xmlProfile?.profileUrl || `https://steamcommunity.com/profiles/${steamId}`,
 avatarUrl: apiPlayer.avatarfull || apiPlayer.avatarmedium || apiPlayer.avatar || xmlProfile?.avatarUrl || '',
 visibility: apiPlayer.communityvisibilitystate !== undefined ? visibilityText(apiPlayer.communityvisibilitystate) : (xmlProfile?.visibility || 'Unavailable'),
 personaState: apiPlayer.personastate !== undefined ? personaStateText(apiPlayer.personastate) : (xmlProfile?.personaState || 'Unavailable'),
 country: apiPlayer.loccountrycode || xmlProfile?.country || 'Unavailable',
 createdAt: apiPlayer.timecreated ? dateText(apiPlayer.timecreated) : (xmlProfile?.createdAt || 'Unavailable'),
 lastOnline: apiPlayer.lastlogoff ? dateText(apiPlayer.lastlogoff) : (xmlProfile?.lastOnline || 'Unavailable'),
 gameCount: apiGameCount ? apiGameCount.toLocaleString('en-US') : (xmlProfile?.gameCount || 'Unavailable'),
 totalPlaytime: totalMinutes ? minutesToHours(totalMinutes) : (xmlProfile?.totalPlaytime || 'Unavailable'),
 recentGames: recentText,
 };
}

function varsFor(message, data, profile = {}, extra = {}) {
 return {
 user: message.author?.username || 'Unknown',
 user_tag: message.author?.tag || `${message.author?.username || 'Unknown'}#0001`,
 mention: message.author?.id ? `<@${message.author.id}>` : '@user',
 query: extra.query || profile.steamId || '',
 steam_id: profile.steamId || extra.steamId || 'Unavailable',
 steam_name: profile.name || 'Steam User',
 visibility: profile.visibility || 'Unavailable',
 persona_state: profile.personaState || 'Unavailable',
 country: profile.country || 'Unavailable',
 created_at: profile.createdAt || 'Unavailable',
 last_online: profile.lastOnline || 'Unavailable',
 game_count: profile.gameCount || 'Unavailable',
 total_playtime: profile.totalPlaytime || 'Unavailable',
 recent_games: profile.recentGames || 'Unavailable',
 avatar_url: profile.avatarUrl || '',
 profile_url: profile.profileUrl || '',
 profile_link: profile.profileUrl ? `[${data.profileLinkLabel || 'Open Steam'}](${profile.profileUrl})` : 'Unavailable',
 command: commandWithPrefix(data.command || 'steam', extra.prefix || '!'),
 error: extra.error || '',
 };
}

module.exports = {
 meta: {
 name: 'Steam Profile',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Shows a Steam profile with XML fallback and optional Steam Web API enrichment.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 game_steam_profile: {
 label: 'Steam Profile',
 icon: 'ST',
 color: '#66C0F4',
 description: 'Prefix Steam profile command using Steam profile data.',
 inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'steam', required: true },
 aliases: { type: 'string', default: 'steamprofile,steamuser,st', required: false },
 apiKey: { type: 'string', default: '', required: false },
 titleTemplate: { type: 'string', default: 'Steam profile for {steam_name}', required: false },
 descriptionTemplate: { type: 'string', default: DEFAULT_DESCRIPTION, required: false },
 invalidSteamIdMessage: { type: 'string', default: 'Use `{command} <steamid64>` or `{command} https://steamcommunity.com/profiles/STEAM_ID/?xml=1`.', required: false },
 notFoundMessage: { type: 'string', default: 'No Steam profile found for `{query}`.', required: false },
 errorMessage: { type: 'string', default: 'Could not load Steam profile: {error}', required: false },
 profileLinkLabel: { type: 'string', default: 'Open Steam', required: false },
 },

 async execute(node, message, ctx) {
 if (!message || message.author?.bot || !message.guild) return false;
 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const commands = [
 commandWithPrefix(data.command || 'steam', prefix),
 ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
 ];
 const matched = matchCommand(message.content, commands);
 if (!matched) return false;

 const steamId = cleanSteamId(matched.args);
 if (!steamId) {
 await message.channel.send(applyTemplate(data.invalidSteamIdMessage || 'Use `{command} <steamid64>` or `{command} https://steamcommunity.com/profiles/STEAM_ID/?xml=1`.', varsFor(message, data, {}, { prefix })));
 return true;
 }

 let profile;
 try {
 profile = await fetchSteamProfile(steamId, data);
 } catch (err) {
 await message.channel.send(applyTemplate(data.errorMessage || 'Could not load Steam profile: {error}', varsFor(message, data, {}, { query: steamId, steamId, prefix, error: err.message })));
 return true;
 }

 if (!profile) {
 await message.channel.send(applyTemplate(data.notFoundMessage || 'No Steam profile found for `{query}`.', varsFor(message, data, {}, { query: steamId, steamId, prefix })));
 return true;
 }

 const vars = varsFor(message, data, profile, { query: steamId, steamId, prefix });
 const embed = new EmbedBuilder()
 .setColor(hexToInt(data.embedColor || '#66C0F4'))
 .setTitle(applyTemplate(data.titleTemplate || 'Steam profile for {steam_name}', vars))
 .setDescription(applyTemplate(data.descriptionTemplate || DEFAULT_DESCRIPTION, vars));
 if (profile.avatarUrl) embed.setThumbnail(profile.avatarUrl);
 await message.channel.send({ embeds: [embed] });
 return true;
 },

 generateCode(node, prefix = '!') {
 const rawCmd = String(node.data?.command || 'steam').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `// Steam Profile command\nif (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()} ")) {\n message.channel.send("Steam Profile runs through the builder plugin runtime.");\n}`;
 },
 },
 },
};
