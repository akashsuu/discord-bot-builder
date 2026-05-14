'use strict';

const { EmbedBuilder } = require('discord.js');

const DEFAULT_DESCRIPTION = '**Account**\nDisplay Name: `{epic_name}`\nAccount ID: `{account_id}`\nCountry: `{country}`\nPrivacy: `{privacy}`\nCreator Code: `{creator_code}`\n\n**Linked Platforms**\n{linked_platforms}\n\n**Games**\n{games}\n\n**Links**\nProfile: {profile_link}';

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'epicgames').trim() || 'epicgames';
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
  const parsed = parseInt(String(hex || '#313338').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0x313338 : parsed;
}

function profileUrl(name) {
  return `https://store.epicgames.com/u/${encodeURIComponent(name || '')}`;
}

function normalizePlatforms(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  const cleaned = list.map((item) => String(item || '').trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(', ') : 'Unavailable';
}

function readManualProfiles(value) {
  const map = new Map();
  for (const line of String(value || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [rawKey, rawData = ''] = trimmed.split('=');
    const key = String(rawKey || '').trim().toLowerCase();
    const [displayName, accountId, country, platforms, privacy, creatorCode, games] = rawData.split('|').map((part) => String(part || '').trim());
    if (!key) continue;
    map.set(key, {
      name: displayName || rawKey.trim(),
      accountId: accountId || 'Unavailable',
      country: country || 'Unavailable',
      platforms: normalizePlatforms(platforms),
      privacy: privacy || 'Unavailable',
      creatorCode: creatorCode || 'Unavailable',
      games: games || 'Unavailable',
      profileUrl: profileUrl(displayName || rawKey.trim()),
    });
  }
  return map;
}

function pick(obj, paths, fallback = '') {
  for (const path of paths) {
    const value = path.split('.').reduce((current, part) => current?.[part], obj);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

async function fetchJson(url, data) {
  if (typeof fetch !== 'function') throw new Error('Fetch API is unavailable in this runtime.');
  const headers = { Accept: 'application/json' };
  const apiKey = String(data.apiKey || '').trim();
  const apiKeyHeader = String(data.apiKeyHeader || 'Authorization').trim();
  if (apiKey && apiKeyHeader) headers[apiKeyHeader] = apiKeyHeader.toLowerCase() === 'authorization' && !/^bearer\s+/i.test(apiKey) ? `Bearer ${apiKey}` : apiKey;
  const response = await fetch(url, { headers });
  if (response.status === 204 || response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
  }
  return response.json();
}

async function fetchLookupProfile(query, data) {
  const template = String(data.lookupUrlTemplate || '').trim();
  if (!template) return null;
  const url = template.replace(/\{query\}/g, encodeURIComponent(query)).replace(/\{name\}/g, encodeURIComponent(query));
  const json = await fetchJson(url, data);
  const root = json?.data || json?.account || json?.result || json;
  if (!root) return null;
  const name = pick(root, ['displayName', 'display_name', 'name', 'account.displayName'], query);
  const accountId = pick(root, ['accountId', 'account_id', 'id', 'account.id'], 'Unavailable');
  return {
    name,
    accountId,
    country: pick(root, ['country', 'countryCode', 'country_code'], 'Unavailable'),
    platforms: normalizePlatforms(pick(root, ['platforms', 'linkedPlatforms', 'externalAuths'], 'Unavailable')),
    privacy: pick(root, ['privacy', 'privacyState', 'visibility'], 'Unavailable'),
    creatorCode: pick(root, ['creatorCode', 'creator_code', 'supportACreatorCode'], 'Unavailable'),
    games: normalizePlatforms(pick(root, ['games', 'ownedGames', 'library'], 'Unavailable')),
    profileUrl: pick(root, ['profileUrl', 'profile_url', 'url'], profileUrl(name)),
  };
}

async function fetchEpicGamesProfile(query, data) {
  const manual = readManualProfiles(data.profileMap).get(String(query || '').trim().toLowerCase());
  if (manual) return manual;
  return fetchLookupProfile(query, data);
}

function varsFor(message, data, profile = {}, extra = {}) {
  return {
    user: message.author?.username || 'Unknown',
    user_tag: message.author?.tag || `${message.author?.username || 'Unknown'}#0001`,
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    query: extra.query || '',
    epic_name: profile.name || extra.query || 'Epic User',
    account_id: profile.accountId || 'Unavailable',
    country: profile.country || 'Unavailable',
    linked_platforms: profile.platforms || 'Unavailable',
    privacy: profile.privacy || 'Unavailable',
    creator_code: profile.creatorCode || 'Unavailable',
    games: profile.games || 'Unavailable',
    profile_url: profile.profileUrl || '',
    profile_link: profile.profileUrl ? `[${data.profileLinkLabel || 'Open Epic'}](${profile.profileUrl})` : 'Unavailable',
    command: commandWithPrefix(data.command || 'epicgames', extra.prefix || '!'),
    error: extra.error || '',
  };
}

module.exports = {
  meta: {
    name: 'Epic Games Profile',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Shows an Epic Games profile from a manual map or optional lookup endpoint.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    game_epicgames_profile: {
      label: 'Epic Games Profile',
      icon: 'EG',
      color: '#313338',
      description: 'Prefix Epic Games profile command with editable account data.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'epicgames', required: true },
        aliases: { type: 'string', default: 'epic,egs,epicprofile', required: false },
        lookupUrlTemplate: { type: 'string', default: '', required: false },
        apiKey: { type: 'string', default: '', required: false },
        apiKeyHeader: { type: 'string', default: 'Authorization', required: false },
        profileMap: { type: 'string', default: 'Akash=Akashsuu|epic-00000000000000000000000000000000|India|PC, PlayStation|Public|AKASH|Fortnite, Rocket League\nHunter=GhostHunter|epic-11111111111111111111111111111111|United States|PC, Xbox|Friends Only|HUNTER|Fall Guys, Rocket League', required: false },
        titleTemplate: { type: 'string', default: 'Epic Games profile for {epic_name}', required: false },
        descriptionTemplate: { type: 'string', default: DEFAULT_DESCRIPTION, required: false },
        notFoundMessage: { type: 'string', default: 'No Epic Games profile saved or found for `{query}`. Add it in the Epic Games Profile node map.', required: false },
        errorMessage: { type: 'string', default: 'Could not load Epic Games profile: {error}', required: false },
        profileLinkLabel: { type: 'string', default: 'Open Epic', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;
        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command || 'epicgames', prefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
        ];
        const matched = matchCommand(message.content, commands);
        if (!matched) return false;

        const query = matched.args.trim();
        if (!query) {
          await message.channel.send(`Use \`${commandWithPrefix(data.command || 'epicgames', prefix)} <display name>\`.`);
          return true;
        }

        let profile;
        try {
          profile = await fetchEpicGamesProfile(query, data);
        } catch (err) {
          await message.channel.send(applyTemplate(data.errorMessage || 'Could not load Epic Games profile: {error}', varsFor(message, data, {}, { query, prefix, error: err.message })));
          return true;
        }

        if (!profile) {
          await message.channel.send(applyTemplate(data.notFoundMessage || 'No Epic Games profile saved or found for `{query}`. Add it in the Epic Games Profile node map.', varsFor(message, data, {}, { query, prefix })));
          return true;
        }

        const vars = varsFor(message, data, profile, { query, prefix });
        const embed = new EmbedBuilder()
          .setColor(hexToInt(data.embedColor || '#313338'))
          .setTitle(applyTemplate(data.titleTemplate || 'Epic Games profile for {epic_name}', vars))
          .setDescription(applyTemplate(data.descriptionTemplate || DEFAULT_DESCRIPTION, vars));
        await message.channel.send({ embeds: [embed] });
        return true;
      },

      generateCode(node, prefix = '!') {
        const rawCmd = String(node.data?.command || 'epicgames').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `// Epic Games Profile command\nif (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()} ")) {\n  message.channel.send("Epic Games Profile runs through the builder plugin runtime.");\n}`;
      },
    },
  },
};
