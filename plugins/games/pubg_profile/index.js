'use strict';

const { EmbedBuilder } = require('discord.js');

const DEFAULT_DESCRIPTION = '**Account**\nName: `{pubg_name}`\nAccount ID: `{account_id}`\nPlatform: `{platform}`\nShard: `{shard}`\nRecent Matches: `{recent_matches}`\n\n**Lifetime Stats ({game_mode})**\nRounds: `{rounds}`\nWins: `{wins}`\nTop 10s: `{top10s}`\nKills: `{kills}`\nDeaths: `{deaths}`\nK/D: `{kd}`\nDamage: `{damage}`\nLongest Kill: `{longest_kill}`\n\n**Links**\nProfile: {profile_link}';

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'pubg').trim() || 'pubg';
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
  const parsed = parseInt(String(hex || '#F2A900').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0xF2A900 : parsed;
}

async function getJson(url, apiKey) {
  if (typeof fetch !== 'function') throw new Error('Fetch API is unavailable in this runtime.');
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/vnd.api+json',
    },
  });
  if (response.status === 204 || response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
  }
  return response.json();
}

function n(value) {
  return Number(value || 0);
}

function fmt(value) {
  return n(value).toLocaleString('en-US');
}

function decimal(value, digits = 2) {
  return n(value).toFixed(digits);
}

function statValue(stats, names) {
  for (const name of names) {
    if (stats && stats[name] !== undefined && stats[name] !== null) return stats[name];
  }
  return 0;
}

function profileUrl(name) {
  return `https://pubglookup.com/players/${encodeURIComponent(name)}`;
}

async function fetchPubgProfile(query, data) {
  const apiKey = String(data.apiKey || '').trim();
  if (!apiKey) {
    const err = new Error('Missing PUBG API key.');
    err.code = 'MISSING_KEY';
    throw err;
  }

  const platform = String(data.platform || 'steam').trim() || 'steam';
  const gameMode = String(data.gameMode || 'squad-fpp').trim() || 'squad-fpp';
  const name = String(query || '').trim();
  const playerJson = await getJson(`https://api.pubg.com/shards/${encodeURIComponent(platform)}/players?filter[playerNames]=${encodeURIComponent(name)}`, apiKey);
  const player = Array.isArray(playerJson?.data) ? playerJson.data[0] : playerJson?.data;
  if (!player?.id) return null;

  let stats = {};
  try {
    const statsJson = await getJson(`https://api.pubg.com/shards/${encodeURIComponent(platform)}/seasons/lifetime/gameMode/${encodeURIComponent(gameMode)}/players?filter[playerIds]=${encodeURIComponent(player.id)}`, apiKey);
    const first = Array.isArray(statsJson?.data) ? statsJson.data[0] : statsJson?.data;
    stats = first?.attributes?.gameModeStats?.[gameMode] || first?.attributes?.stats || first?.attributes || {};
  } catch (_) {
    stats = {};
  }

  const attrs = player.attributes || {};
  const matches = player.relationships?.matches?.data || [];
  const kills = statValue(stats, ['kills', 'totalKills']);
  const losses = statValue(stats, ['losses']);
  const deaths = statValue(stats, ['deaths']) || losses;
  const damage = statValue(stats, ['damageDealt', 'damage']);
  const rounds = statValue(stats, ['roundsPlayed', 'rounds']);
  const longestKill = statValue(stats, ['longestKill']);

  return {
    id: player.id,
    name: attrs.name || name,
    shard: attrs.shardId || platform,
    platform,
    gameMode,
    recentMatches: matches.length,
    rounds,
    wins: statValue(stats, ['wins']),
    top10s: statValue(stats, ['top10s', 'top10']),
    kills,
    deaths,
    kd: deaths ? kills / deaths : kills,
    damage,
    longestKill,
    profileUrl: profileUrl(attrs.name || name),
    imageUrl: 'https://wstatic-prod.pubg.com/web/live/main_073eb13/img/pubg_logo.png',
  };
}

function varsFor(message, data, profile = {}, extra = {}) {
  return {
    user: message.author?.username || 'Unknown',
    user_tag: message.author?.tag || `${message.author?.username || 'Unknown'}#0001`,
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    query: extra.query || profile.name || '',
    pubg_name: profile.name || extra.query || 'Player',
    account_id: profile.id || 'Unavailable',
    platform: String(profile.platform || data.platform || 'steam').toUpperCase(),
    shard: profile.shard || data.platform || 'steam',
    game_mode: profile.gameMode || data.gameMode || 'squad-fpp',
    recent_matches: fmt(profile.recentMatches),
    rounds: fmt(profile.rounds),
    wins: fmt(profile.wins),
    top10s: fmt(profile.top10s),
    kills: fmt(profile.kills),
    deaths: fmt(profile.deaths),
    kd: decimal(profile.kd),
    damage: fmt(profile.damage),
    longest_kill: `${decimal(profile.longestKill, 1)}m`,
    image_url: profile.imageUrl || '',
    profile_url: profile.profileUrl || '',
    profile_link: profile.profileUrl ? `[${data.profileLinkLabel || 'Open Profile'}](${profile.profileUrl})` : 'Unavailable',
    command: commandWithPrefix(data.command || 'pubg', extra.prefix || '!'),
    error: extra.error || '',
  };
}

module.exports = {
  meta: {
    name: 'PUBG Profile',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Shows a PUBG profile with platform, matches, and lifetime stats.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    game_pubg_profile: {
      label: 'PUBG Profile',
      icon: 'PUBG',
      color: '#F2A900',
      description: 'Prefix PUBG profile command using the official PUBG API.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'pubg', required: true },
        aliases: { type: 'string', default: 'pubgprofile,bgprofile,battlegrounds', required: false },
        apiKey: { type: 'string', default: '', required: false },
        platform: { type: 'string', default: 'steam', required: false },
        gameMode: { type: 'string', default: 'squad-fpp', required: false },
        titleTemplate: { type: 'string', default: 'PUBG profile for {pubg_name}', required: false },
        descriptionTemplate: { type: 'string', default: DEFAULT_DESCRIPTION, required: false },
        missingKeyMessage: { type: 'string', default: 'Set a PUBG API key in this node before using `{command}`.', required: false },
        notFoundMessage: { type: 'string', default: 'No PUBG profile found for `{query}` on `{platform}`.', required: false },
        errorMessage: { type: 'string', default: 'Could not load PUBG profile: {error}', required: false },
        profileLinkLabel: { type: 'string', default: 'Open Profile', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;
        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command || 'pubg', prefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
        ];
        const matched = matchCommand(message.content, commands);
        if (!matched) return false;

        const query = matched.args.trim();
        if (!query) {
          await message.channel.send(`Use \`${commandWithPrefix(data.command || 'pubg', prefix)} <player name>\`.`);
          return true;
        }

        let profile;
        try {
          profile = await fetchPubgProfile(query, data);
        } catch (err) {
          const template = err.code === 'MISSING_KEY'
            ? data.missingKeyMessage || 'Set a PUBG API key in this node before using `{command}`.'
            : data.errorMessage || 'Could not load PUBG profile: {error}';
          await message.channel.send(applyTemplate(template, varsFor(message, data, {}, { query, prefix, error: err.message })));
          return true;
        }

        if (!profile) {
          await message.channel.send(applyTemplate(data.notFoundMessage || 'No PUBG profile found for `{query}` on `{platform}`.', varsFor(message, data, {}, { query, prefix })));
          return true;
        }

        const vars = varsFor(message, data, profile, { query, prefix });
        const embed = new EmbedBuilder()
          .setColor(hexToInt(data.embedColor || '#F2A900'))
          .setTitle(applyTemplate(data.titleTemplate || 'PUBG profile for {pubg_name}', vars))
          .setDescription(applyTemplate(data.descriptionTemplate || DEFAULT_DESCRIPTION, vars));
        if (profile.imageUrl) embed.setThumbnail(profile.imageUrl);
        await message.channel.send({ embeds: [embed] });
        return true;
      },

      generateCode(node, prefix = '!') {
        const rawCmd = String(node.data?.command || 'pubg').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `// PUBG Profile command\nif (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()} ")) {\n  message.channel.send("PUBG Profile runs through the builder plugin runtime.");\n}`;
      },
    },
  },
};
