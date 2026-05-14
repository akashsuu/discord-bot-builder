'use strict';

const { EmbedBuilder } = require('discord.js');

const DEFAULT_DESCRIPTION = '**Steam**\nSteamID: `{steam_id}`\nStatus: `{persona_state}`\nProfile: {profile_link}\n\n**Phasmophobia**\nPlaytime: `{playtime}`\nAchievements: `{achievements}`\nPerfect Games: `{perfect_games}`\nLevel: `{phasmo_level}`\nPrestige: `{prestige}`\nFavorite Map: `{favorite_map}`\nFavorite Ghost: `{favorite_ghost}`\nDifficulty: `{difficulty}`';

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'phasmophobia').trim() || 'phasmophobia';
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
  const parsed = parseInt(String(hex || '#A3E635').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0xA3E635 : parsed;
}

function cleanSteamId(raw) {
  const match = String(raw || '').match(/\b7656119\d{10}\b/);
  return match ? match[0] : '';
}

function xmlValue(xml, tag) {
  const match = String(xml || '').match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, 'i'));
  return match ? match[1].trim() : '';
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

function minutesToHours(minutes) {
  const mins = Number(minutes || 0);
  if (!mins) return 'Unavailable';
  return `${Math.round(mins / 60).toLocaleString('en-US')} hours`;
}

function parseManualStats(value) {
  const map = new Map();
  for (const line of String(value || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [rawKey, rawStats = ''] = trimmed.split('=');
    const key = String(rawKey || '').trim().toLowerCase();
    const [level, prestige, favoriteMap, favoriteGhost, difficulty, perfectGames] = rawStats.split('|').map((part) => String(part || '').trim());
    if (key) map.set(key, { level, prestige, favoriteMap, favoriteGhost, difficulty, perfectGames });
  }
  return map;
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
    personaState: xmlValue(xml, 'onlineState') || 'Unavailable',
  };
}

async function fetchPhasmophobiaProfile(steamId, data) {
  const apiKey = String(data.apiKey || '').trim();
  const appId = String(data.appId || '739630').trim() || '739630';
  const xmlProfile = await fetchSteamXmlProfile(steamId).catch(() => null);
  let apiPlayer = {};
  let game = {};
  let achievements = [];

  if (apiKey) {
    const key = encodeURIComponent(apiKey);
    const id = encodeURIComponent(steamId);
    const summary = await getJson(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${id}`).catch(() => null);
    const games = await getJson(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${id}&include_appinfo=1&appids_filter[0]=${encodeURIComponent(appId)}`).catch(() => null);
    const achievementJson = await getJson(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${key}&steamid=${id}&appid=${encodeURIComponent(appId)}`).catch(() => null);
    apiPlayer = summary?.response?.players?.[0] || {};
    game = games?.response?.games?.find((item) => String(item.appid) === appId) || {};
    achievements = achievementJson?.playerstats?.achievements || [];
  }

  const name = apiPlayer.personaname || xmlProfile?.name || 'Steam User';
  const manual = parseManualStats(data.statMap).get(String(name).toLowerCase()) || parseManualStats(data.statMap).get(steamId.toLowerCase()) || {};
  if (!apiPlayer.steamid && !xmlProfile) return null;
  const unlocked = achievements.filter((item) => Number(item.achieved) === 1).length;
  const total = achievements.length;

  return {
    steamId,
    name,
    profileUrl: apiPlayer.profileurl || xmlProfile?.profileUrl || `https://steamcommunity.com/profiles/${steamId}`,
    avatarUrl: apiPlayer.avatarfull || apiPlayer.avatarmedium || apiPlayer.avatar || xmlProfile?.avatarUrl || '',
    personaState: apiPlayer.personastate !== undefined ? personaStateText(apiPlayer.personastate) : (xmlProfile?.personaState || 'Unavailable'),
    playtime: minutesToHours(game.playtime_forever),
    achievements: total ? `${unlocked}/${total}` : 'Unavailable',
    level: manual.level || 'Set in node',
    prestige: manual.prestige || 'Set in node',
    favoriteMap: manual.favoriteMap || 'Tanglewood Drive',
    favoriteGhost: manual.favoriteGhost || 'Spirit',
    difficulty: manual.difficulty || 'Professional',
    perfectGames: manual.perfectGames || 'Set in node',
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
    persona_state: profile.personaState || 'Unavailable',
    playtime: profile.playtime || 'Unavailable',
    achievements: profile.achievements || 'Unavailable',
    phasmo_level: profile.level || 'Set in node',
    prestige: profile.prestige || 'Set in node',
    favorite_map: profile.favoriteMap || 'Tanglewood Drive',
    favorite_ghost: profile.favoriteGhost || 'Spirit',
    difficulty: profile.difficulty || 'Professional',
    perfect_games: profile.perfectGames || 'Set in node',
    avatar_url: profile.avatarUrl || '',
    profile_url: profile.profileUrl || '',
    profile_link: profile.profileUrl ? `[${data.profileLinkLabel || 'Open Steam'}](${profile.profileUrl})` : 'Unavailable',
    command: commandWithPrefix(data.command || 'phasmophobia', extra.prefix || '!'),
    error: extra.error || '',
  };
}

module.exports = {
  meta: {
    name: 'Phasmophobia Profile',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Shows a Phasmophobia-style profile with Steam info and editable stats.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    game_phasmophobia_profile: {
      label: 'Phasmophobia Profile',
      icon: 'PH',
      color: '#A3E635',
      description: 'Prefix Phasmophobia profile command using Steam profile data.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'phasmophobia', required: true },
        aliases: { type: 'string', default: 'phasmo,phasmoprofile,phprofile', required: false },
        apiKey: { type: 'string', default: '', required: false },
        appId: { type: 'string', default: '739630', required: false },
        statMap: { type: 'string', default: 'Akash=Level 84|Prestige 2|Sunny Meadows|Demon|Professional\nHunter=Level 42|Prestige 1|Tanglewood|Mimic|Intermediate', required: false },
        titleTemplate: { type: 'string', default: 'Phasmophobia profile for {steam_name}', required: false },
        descriptionTemplate: { type: 'string', default: DEFAULT_DESCRIPTION, required: false },
        invalidSteamIdMessage: { type: 'string', default: 'Use `{command} <steamid64>` or `{command} https://steamcommunity.com/profiles/STEAM_ID/?xml=1`.', required: false },
        notFoundMessage: { type: 'string', default: 'No Steam profile found for `{query}`.', required: false },
        errorMessage: { type: 'string', default: 'Could not load Phasmophobia profile: {error}', required: false },
        profileLinkLabel: { type: 'string', default: 'Open Steam', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;
        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command || 'phasmophobia', prefix),
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
          profile = await fetchPhasmophobiaProfile(steamId, data);
        } catch (err) {
          await message.channel.send(applyTemplate(data.errorMessage || 'Could not load Phasmophobia profile: {error}', varsFor(message, data, {}, { query: steamId, steamId, prefix, error: err.message })));
          return true;
        }

        if (!profile) {
          await message.channel.send(applyTemplate(data.notFoundMessage || 'No Steam profile found for `{query}`.', varsFor(message, data, {}, { query: steamId, steamId, prefix })));
          return true;
        }

        const vars = varsFor(message, data, profile, { query: steamId, steamId, prefix });
        const embed = new EmbedBuilder()
          .setColor(hexToInt(data.embedColor || '#A3E635'))
          .setTitle(applyTemplate(data.titleTemplate || 'Phasmophobia profile for {steam_name}', vars))
          .setDescription(applyTemplate(data.descriptionTemplate || DEFAULT_DESCRIPTION, vars));
        if (profile.avatarUrl) embed.setThumbnail(profile.avatarUrl);
        await message.channel.send({ embeds: [embed] });
        return true;
      },

      generateCode(node, prefix = '!') {
        const rawCmd = String(node.data?.command || 'phasmophobia').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `// Phasmophobia Profile command\nif (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()} ")) {\n  message.channel.send("Phasmophobia Profile runs through the builder plugin runtime.");\n}`;
      },
    },
  },
};
