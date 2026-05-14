'use strict';

const { EmbedBuilder } = require('discord.js');

const DEFAULT_DESCRIPTION = '**Steam**\nSteamID: `{steam_id}`\nVisibility: `{visibility}`\nStatus: `{persona_state}`\nProfile: {profile_link}\n\n**Counter-Strike**\nPlaytime: `{playtime}`\nKills: `{kills}`\nDeaths: `{deaths}`\nK/D: `{kd}`\nWins: `{wins}`\nMVPs: `{mvps}`\nAccuracy: `{accuracy}`\nHeadshots: `{headshots}`';

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'cs').trim() || 'cs';
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
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key] ?? '') : match
  );
}

function hexToInt(hex) {
  const parsed = parseInt(String(hex || '#F59E0B').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0xF59E0B : parsed;
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

function cleanSteamId(raw) {
  const match = String(raw || '').match(/\b7656119\d{10}\b/);
  return match ? match[0] : '';
}

function xmlValue(xml, tag) {
  const match = String(xml || '').match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

function statMap(stats = []) {
  const map = new Map();
  for (const stat of stats) map.set(stat.name, Number(stat.value || 0));
  return map;
}

function num(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function ratio(a, b) {
  const n = Number(a || 0);
  const d = Number(b || 0);
  if (!d) return n ? n.toFixed(2) : '0.00';
  return (n / d).toFixed(2);
}

function percent(a, b) {
  const n = Number(a || 0);
  const d = Number(b || 0);
  if (!d) return '0%';
  return `${((n / d) * 100).toFixed(1)}%`;
}

function minutesToHours(minutes) {
  const mins = Number(minutes || 0);
  if (!mins) return 'Unavailable';
  return `${Math.round(mins / 60).toLocaleString('en-US')} hours`;
}

function personaStateText(value) {
  const states = ['Offline', 'Online', 'Busy', 'Away', 'Snooze', 'Looking to trade', 'Looking to play'];
  return states[Number(value || 0)] || 'Unknown';
}

function visibilityText(value) {
  return Number(value) === 3 ? 'Public' : 'Private';
}

async function fetchSteamXmlProfile(steamId) {
  const xml = await getText(`https://steamcommunity.com/profiles/${encodeURIComponent(steamId)}/?xml=1`);
  if (!xml) return null;
  const id = xmlValue(xml, 'steamID64') || steamId;
  if (!id) return null;
  return {
    steamId: id,
    name: xmlValue(xml, 'steamID') || 'Steam User',
    profileUrl: xmlValue(xml, 'profileURL') || `https://steamcommunity.com/profiles/${id}`,
    avatarUrl: xmlValue(xml, 'avatarFull') || xmlValue(xml, 'avatarMedium') || xmlValue(xml, 'avatarIcon') || '',
    visibility: xmlValue(xml, 'privacyState') || 'Unavailable',
    personaState: xmlValue(xml, 'onlineState') || 'Unavailable',
    playtime: 'Unavailable',
    kills: '0',
    deaths: '0',
    kd: '0.00',
    wins: '0',
    mvps: '0',
    accuracy: '0%',
    headshots: '0',
  };
}

async function fetchCounterStrikeProfile(steamId, data) {
  const apiKey = String(data.apiKey || '').trim();
  if (!apiKey) {
    return fetchSteamXmlProfile(steamId);
  }
  const appId = String(data.appId || '730').trim() || '730';
  const key = encodeURIComponent(apiKey);
  const id = encodeURIComponent(steamId);

  const summaryJson = await getJson(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${id}`);
  const statsJson = await getJson(`https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?appid=${encodeURIComponent(appId)}&key=${key}&steamid=${id}`).catch(() => null);
  const gamesJson = await getJson(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${id}&include_appinfo=1&appids_filter[0]=${encodeURIComponent(appId)}`).catch(() => null);

  const player = summaryJson?.response?.players?.[0] || {};
  const stats = statMap(statsJson?.playerstats?.stats || []);
  const xmlProfile = !player.steamid ? await fetchSteamXmlProfile(steamId).catch(() => null) : null;
  if (!player.steamid && !stats.size && !xmlProfile) return null;

  const kills = stats.get('total_kills') || 0;
  const deaths = stats.get('total_deaths') || 0;
  const shotsHit = stats.get('total_shots_hit') || 0;
  const shotsFired = stats.get('total_shots_fired') || 0;
  const game = gamesJson?.response?.games?.find((g) => String(g.appid) === appId) || {};

  return {
    steamId,
    name: player.personaname || xmlProfile?.name || 'Steam User',
    profileUrl: player.profileurl || xmlProfile?.profileUrl || `https://steamcommunity.com/profiles/${steamId}`,
    avatarUrl: player.avatarfull || player.avatarmedium || player.avatar || xmlProfile?.avatarUrl || '',
    visibility: player.communityvisibilitystate !== undefined ? visibilityText(player.communityvisibilitystate) : (xmlProfile?.visibility || 'Unavailable'),
    personaState: player.personastate !== undefined ? personaStateText(player.personastate) : (xmlProfile?.personaState || 'Unavailable'),
    playtime: minutesToHours(game.playtime_forever),
    kills: num(kills),
    deaths: num(deaths),
    kd: ratio(kills, deaths),
    wins: num(stats.get('total_wins') || stats.get('total_matches_won') || 0),
    mvps: num(stats.get('total_mvps') || 0),
    accuracy: percent(shotsHit, shotsFired),
    headshots: num(stats.get('total_kills_headshot') || 0),
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
    playtime: profile.playtime || 'Unavailable',
    kills: profile.kills || '0',
    deaths: profile.deaths || '0',
    kd: profile.kd || '0.00',
    wins: profile.wins || '0',
    mvps: profile.mvps || '0',
    accuracy: profile.accuracy || '0%',
    headshots: profile.headshots || '0',
    avatar_url: profile.avatarUrl || '',
    profile_url: profile.profileUrl || '',
    profile_link: profile.profileUrl ? `[${data.profileLinkLabel || 'Open Steam'}](${profile.profileUrl})` : 'Unavailable',
    command: commandWithPrefix(data.command || 'cs', extra.prefix || '!'),
    error: extra.error || '',
  };
}

module.exports = {
  meta: {
    name: 'Counter-Strike Profile',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Shows a Counter-Strike profile with Steam avatar and stats.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    game_counter_strike_profile: {
      label: 'Counter-Strike Profile',
      icon: 'CS',
      color: '#F59E0B',
      description: 'Prefix Counter-Strike profile command using Steam Web API.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'cs', required: true },
        aliases: { type: 'string', default: 'cstrike,csprofile,counterstrike', required: false },
        apiKey: { type: 'string', default: '', required: false },
        appId: { type: 'string', default: '730', required: false },
        titleTemplate: { type: 'string', default: 'Counter-Strike profile for {steam_name}', required: false },
        descriptionTemplate: { type: 'string', default: DEFAULT_DESCRIPTION, required: false },
        missingKeyMessage: { type: 'string', default: 'Set a Steam Web API key in this node to show Counter-Strike stats. Steam XML profile info can still work without it.', required: false },
        invalidSteamIdMessage: { type: 'string', default: 'Use `{command} <steamid64>` or `{command} https://steamcommunity.com/profiles/STEAM_ID/?xml=1`.', required: false },
        notFoundMessage: { type: 'string', default: 'No Steam profile or Counter-Strike stats found for `{query}`. The profile or game stats may be private.', required: false },
        errorMessage: { type: 'string', default: 'Could not load Counter-Strike profile: {error}', required: false },
        profileLinkLabel: { type: 'string', default: 'Open Steam', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;
        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command || 'cs', prefix),
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
          profile = await fetchCounterStrikeProfile(steamId, data);
        } catch (err) {
          const template = err.code === 'MISSING_KEY'
            ? data.missingKeyMessage || 'Set a Steam Web API key in this node before using `{command}`.'
            : data.errorMessage || 'Could not load Counter-Strike profile: {error}';
          await message.channel.send(applyTemplate(template, varsFor(message, data, {}, { query: steamId, steamId, prefix, error: err.message })));
          return true;
        }

        if (!profile) {
          await message.channel.send(applyTemplate(data.notFoundMessage || 'No Steam profile or Counter-Strike stats found for `{query}`. The profile or game stats may be private.', varsFor(message, data, {}, { query: steamId, steamId, prefix })));
          return true;
        }

        const vars = varsFor(message, data, profile, { query: steamId, steamId, prefix });
        const embed = new EmbedBuilder()
          .setColor(hexToInt(data.embedColor || '#F59E0B'))
          .setTitle(applyTemplate(data.titleTemplate || 'Counter-Strike profile for {steam_name}', vars))
          .setDescription(applyTemplate(data.descriptionTemplate || DEFAULT_DESCRIPTION, vars));
        if (profile.avatarUrl) embed.setThumbnail(profile.avatarUrl);
        await message.channel.send({ embeds: [embed] });
        return true;
      },

      generateCode(node, prefix = '!') {
        const rawCmd = String(node.data?.command || 'cs').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `// Counter-Strike Profile command\nif (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()} ")) {\n  message.channel.send("Counter-Strike Profile runs through the builder plugin runtime.");\n}`;
      },
    },
  },
};
