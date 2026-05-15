'use strict';

const { EmbedBuilder } = require('discord.js');

const DEFAULT_DESCRIPTION = '**Account**\nName: `{valorant_name}`\nTag: `{valorant_tag}`\nRegion: `{region}`\nPlatform: `{platform}`\nLevel: `{account_level}`\n\n**Competitive**\nCurrent Rank: `{current_rank}`\nRR: `{rr}`\nELO: `{elo}`\nLast Change: `{last_change}`\nPeak Rank: `{peak_rank}`\nLeaderboard: `{leaderboard_rank}`\n\n**Links**\nProfile: {profile_link}';

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'valorant').trim() || 'valorant';
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
 const parsed = parseInt(String(hex || '#FF4655').replace('#', ''), 16);
 return Number.isNaN(parsed) ? 0xFF4655 : parsed;
}

function parseRiotId(raw) {
 const text = String(raw || '').trim();
 const hashIndex = text.lastIndexOf('#');
 if (hashIndex > 0 && hashIndex < text.length - 1) {
 return { name: text.slice(0, hashIndex).trim(), tag: text.slice(hashIndex + 1).trim(), query: text };
 }
 const parts = text.split(/\s+/).filter(Boolean);
 if (parts.length >= 2) {
 const tag = parts.pop();
 return { name: parts.join(' '), tag, query: text };
 }
 return null;
}

async function getJson(url, apiKey) {
 if (typeof fetch !== 'function') throw new Error('Fetch API is unavailable in this runtime.');
 const headers = { Accept: 'application/json' };
 if (apiKey) headers.Authorization = apiKey;
 const response = await fetch(url, { headers });
 if (response.status === 204 || response.status === 404) return null;
 if (!response.ok) {
 const text = await response.text().catch(() => '');
 throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
 }
 return response.json();
}

function readCard(accountData) {
 const card = accountData?.card || {};
 return card.wide || card.large || card.small || '';
}

function profileUrl(name, tag) {
 return `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(`${name}#${tag}`)}/overview`;
}

async function fetchValorantProfile(riotId, data) {
 const apiKey = String(data.apiKey || '').trim();
 if (!apiKey) {
 const err = new Error('Missing HenrikDev Valorant API key.');
 err.code = 'MISSING_KEY';
 throw err;
 }

 const region = String(data.region || 'ap').toLowerCase();
 const platform = String(data.platform || 'pc').toLowerCase();
 const encodedName = encodeURIComponent(riotId.name);
 const encodedTag = encodeURIComponent(riotId.tag);

 const accountJson = await getJson(`https://api.henrikdev.xyz/valorant/v2/account/${encodedName}/${encodedTag}`, apiKey);
 const mmrJson = await getJson(`https://api.henrikdev.xyz/valorant/v3/mmr/${region}/${platform}/${encodedName}/${encodedTag}`, apiKey);

 const account = accountJson?.data || {};
 const mmr = mmrJson?.data || {};
 const mmrAccount = mmr.account || {};
 const current = mmr.current || {};
 const peak = mmr.peak || {};
 const currentTier = current.tier || {};
 const peakTier = peak.tier || {};
 const leaderboard = current.leaderboard_placement || {};

 if (!account.name && !mmrAccount.name) return null;

 const name = account.name || mmrAccount.name || riotId.name;
 const tag = account.tag || mmrAccount.tag || riotId.tag;
 return {
 name,
 tag,
 puuid: account.puuid || mmrAccount.puuid || 'Unavailable',
 region: region.toUpperCase(),
 platform: platform.toUpperCase(),
 accountLevel: account.account_level - account.accountLevel - 'Unavailable',
 currentRank: currentTier.name || 'Unrated',
 rr: current.rr - '0',
 elo: current.elo - '0',
 lastChange: current.last_change - '0',
 peakRank: peakTier.name || 'Unavailable',
 leaderboardRank: leaderboard.rank ? `#${Number(leaderboard.rank).toLocaleString('en-US')}` : 'Unranked',
 cardUrl: readCard(account),
 profileUrl: profileUrl(name, tag),
 };
}

function varsFor(message, data, profile = {}, extra = {}) {
 return {
 user: message.author?.username || 'Unknown',
 user_tag: message.author?.tag || `${message.author?.username || 'Unknown'}#0001`,
 mention: message.author?.id ? `<@${message.author.id}>` : '@user',
 query: extra.query || '',
 valorant_name: profile.name || extra.name || 'Player',
 valorant_tag: profile.tag || extra.tag || 'TAG',
 puuid: profile.puuid || 'Unavailable',
 region: profile.region || String(data.region || 'ap').toUpperCase(),
 platform: profile.platform || String(data.platform || 'pc').toUpperCase(),
 account_level: profile.accountLevel || 'Unavailable',
 current_rank: profile.currentRank || 'Unrated',
 rr: profile.rr - '0',
 elo: profile.elo - '0',
 last_change: profile.lastChange - '0',
 peak_rank: profile.peakRank || 'Unavailable',
 leaderboard_rank: profile.leaderboardRank || 'Unranked',
 card_url: profile.cardUrl || '',
 profile_url: profile.profileUrl || '',
 profile_link: profile.profileUrl ? `[${data.profileLinkLabel || 'Open Profile'}](${profile.profileUrl})` : 'Unavailable',
 command: commandWithPrefix(data.command || 'valorant', extra.prefix || '!'),
 error: extra.error || '',
 };
}

module.exports = {
 meta: {
 name: 'Valorant Profile',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Shows a Valorant profile with rank, RR, peak rank, and player card.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 game_valorant_profile: {
 label: 'Valorant Profile',
 icon: 'VAL',
 color: '#FF4655',
 description: 'Prefix Valorant profile command with rank details.',
 inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'valorant', required: true },
 aliases: { type: 'string', default: 'vprofile,valprofile,valorantprofile', required: false },
 apiKey: { type: 'string', default: '', required: false },
 region: { type: 'string', default: 'ap', required: false },
 platform: { type: 'string', default: 'pc', required: false },
 titleTemplate: { type: 'string', default: 'Valorant profile for {valorant_name}#{valorant_tag}', required: false },
 descriptionTemplate: { type: 'string', default: DEFAULT_DESCRIPTION, required: false },
 missingKeyMessage: { type: 'string', default: 'Set a HenrikDev Valorant API key in this node before using `{command}`.', required: false },
 invalidNameMessage: { type: 'string', default: 'Use `{command} Name#TAG` to check a Valorant profile.', required: false },
 notFoundMessage: { type: 'string', default: 'No Valorant profile found for `{query}`. Check the Riot ID, tag, region, or privacy settings.', required: false },
 errorMessage: { type: 'string', default: 'Could not load Valorant profile: {error}', required: false },
 profileLinkLabel: { type: 'string', default: 'Open Profile', required: false },
 },

 async execute(node, message, ctx) {
 if (!message || message.author?.bot || !message.guild) return false;
 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const commands = [
 commandWithPrefix(data.command || 'valorant', prefix),
 ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
 ];
 const matched = matchCommand(message.content, commands);
 if (!matched) return false;

 const riotId = parseRiotId(matched.args);
 if (!riotId?.name || !riotId?.tag) {
 await message.channel.send(applyTemplate(data.invalidNameMessage || 'Use `{command} Name#TAG` to check a Valorant profile.', varsFor(message, data, {}, { prefix })));
 return true;
 }

 let profile;
 try {
 profile = await fetchValorantProfile(riotId, data);
 } catch (err) {
 const template = err.code === 'MISSING_KEY'
 ? data.missingKeyMessage || 'Set a HenrikDev Valorant API key in this node before using `{command}`.'
 : data.errorMessage || 'Could not load Valorant profile: {error}';
 await message.channel.send(applyTemplate(template, varsFor(message, data, {}, { query: riotId.query, name: riotId.name, tag: riotId.tag, prefix, error: err.message })));
 return true;
 }

 if (!profile) {
 await message.channel.send(applyTemplate(data.notFoundMessage || 'No Valorant profile found for `{query}`. Check the Riot ID, tag, region, or privacy settings.', varsFor(message, data, {}, { query: riotId.query, name: riotId.name, tag: riotId.tag, prefix })));
 return true;
 }

 const vars = varsFor(message, data, profile, { query: riotId.query, prefix });
 const embed = new EmbedBuilder()
 .setColor(hexToInt(data.embedColor || '#FF4655'))
 .setTitle(applyTemplate(data.titleTemplate || 'Valorant profile for {valorant_name}#{valorant_tag}', vars))
 .setDescription(applyTemplate(data.descriptionTemplate || DEFAULT_DESCRIPTION, vars));
 if (profile.cardUrl) embed.setThumbnail(profile.cardUrl);
 await message.channel.send({ embeds: [embed] });
 return true;
 },

 generateCode(node, prefix = '!') {
 const rawCmd = String(node.data?.command || 'valorant').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `// Valorant Profile command\nif (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()} ")) {\n message.channel.send("Valorant Profile runs through the builder plugin runtime.");\n}`;
 },
 },
 },
};
