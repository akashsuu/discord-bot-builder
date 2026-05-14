'use strict';

const { EmbedBuilder } = require('discord.js');

const DEFAULT_DESCRIPTION = '**Account**\nName: `{fortnite_name}`\nAccount ID: `{account_id}`\nPlatform: `{platform}`\nWindow: `{time_window}`\n\n**Battle Royale**\nWins: `{wins}`\nKills: `{kills}`\nMatches: `{matches}`\nK/D: `{kd}`\nWin Rate: `{win_rate}`\nScore: `{score}`\n\n**Links**\nProfile: {profile_link}';

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'fortnite').trim() || 'fortnite';
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
  const parsed = parseInt(String(hex || '#8B5CF6').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0x8B5CF6 : parsed;
}

async function getJson(url, options = {}) {
  if (typeof fetch !== 'function') throw new Error('Fetch API is unavailable in this runtime.');
  const response = await fetch(url, options);
  if (response.status === 204 || response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
  }
  return response.json();
}

function readStat(stats, names) {
  for (const name of names) {
    const value = stats?.all?.overall?.[name] ?? stats?.overall?.[name] ?? stats?.[name];
    if (value !== undefined && value !== null) return value;
  }
  return 0;
}

async function fetchFortniteProfile(query, data) {
  const apiKey = String(data.apiKey || '').trim();
  if (!apiKey) {
    const err = new Error('Missing Fortnite API key.');
    err.code = 'MISSING_KEY';
    throw err;
  }
  const params = new URLSearchParams({
    name: query,
    accountType: String(data.accountType || 'epic'),
    timeWindow: String(data.timeWindow || 'lifetime'),
  });
  const json = await getJson(`https://fortnite-api.com/v2/stats/br/v2?${params.toString()}`, {
    headers: { Authorization: apiKey },
  });
  const account = json?.data?.account || {};
  const stats = json?.data?.stats || {};
  if (!account.name && !account.id && !stats) return null;
  const wins = readStat(stats, ['wins']);
  const kills = readStat(stats, ['kills']);
  const matches = readStat(stats, ['matches', 'matchesPlayed']);
  return {
    name: account.name || query,
    id: account.id || 'Unavailable',
    platform: String(data.accountType || 'epic').toUpperCase(),
    timeWindow: String(data.timeWindow || 'lifetime'),
    wins: Number(wins || 0).toLocaleString('en-US'),
    kills: Number(kills || 0).toLocaleString('en-US'),
    matches: Number(matches || 0).toLocaleString('en-US'),
    kd: String(readStat(stats, ['kd', 'k/d']) || '0'),
    winRate: `${readStat(stats, ['winRate', 'winrate']) || 0}%`,
    score: Number(readStat(stats, ['score']) || 0).toLocaleString('en-US'),
    imageUrl: `https://fortnite-api.com/images/cosmetics/br/cid_028_athena_commando_f/icon.png`,
    profileUrl: `https://fortnitetracker.com/profile/all/${encodeURIComponent(account.name || query)}`,
  };
}

function varsFor(message, data, profile = {}, extra = {}) {
  return {
    user: message.author?.username || 'Unknown',
    user_tag: message.author?.tag || `${message.author?.username || 'Unknown'}#0001`,
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    query: extra.query || profile.name || '',
    fortnite_name: profile.name || extra.query || 'Player',
    account_id: profile.id || 'Unavailable',
    platform: profile.platform || String(data.accountType || 'epic').toUpperCase(),
    time_window: profile.timeWindow || String(data.timeWindow || 'lifetime'),
    wins: profile.wins || '0',
    kills: profile.kills || '0',
    matches: profile.matches || '0',
    kd: profile.kd || '0',
    win_rate: profile.winRate || '0%',
    score: profile.score || '0',
    image_url: profile.imageUrl || '',
    profile_url: profile.profileUrl || '',
    profile_link: profile.profileUrl ? `[${data.profileLinkLabel || 'Open Profile'}](${profile.profileUrl})` : 'Unavailable',
    command: commandWithPrefix(data.command || 'fortnite', extra.prefix || '!'),
    error: extra.error || '',
  };
}

module.exports = {
  meta: {
    name: 'Fortnite Profile',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Shows a Fortnite Battle Royale profile and stats with an optional API key.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    game_fortnite_profile: {
      label: 'Fortnite Profile',
      icon: 'FN',
      color: '#8B5CF6',
      description: 'Prefix Fortnite profile command with Battle Royale stats.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'fortnite', required: true },
        aliases: { type: 'string', default: 'fprofile,fnprofile,fortniteprofile', required: false },
        apiKey: { type: 'string', default: '', required: false },
        accountType: { type: 'string', default: 'epic', required: false },
        timeWindow: { type: 'string', default: 'lifetime', required: false },
        titleTemplate: { type: 'string', default: 'Fortnite profile for {fortnite_name}', required: false },
        descriptionTemplate: { type: 'string', default: DEFAULT_DESCRIPTION, required: false },
        missingKeyMessage: { type: 'string', default: 'Set a Fortnite API key in this node before using `{command}`.', required: false },
        notFoundMessage: { type: 'string', default: 'No Fortnite profile found for `{query}`. The account may be private or the platform may be wrong.', required: false },
        errorMessage: { type: 'string', default: 'Could not load Fortnite profile: {error}', required: false },
        profileLinkLabel: { type: 'string', default: 'Open Profile', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;
        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command || 'fortnite', prefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
        ];
        const matched = matchCommand(message.content, commands);
        if (!matched) return false;

        const query = matched.args.trim();
        if (!query) {
          await message.channel.send(`Use \`${commandWithPrefix(data.command || 'fortnite', prefix)} <epic username>\`.`);
          return true;
        }

        let profile;
        try {
          profile = await fetchFortniteProfile(query, data);
        } catch (err) {
          const template = err.code === 'MISSING_KEY'
            ? data.missingKeyMessage || 'Set a Fortnite API key in this node before using `{command}`.'
            : data.errorMessage || 'Could not load Fortnite profile: {error}';
          await message.channel.send(applyTemplate(template, varsFor(message, data, {}, { query, prefix, error: err.message })));
          return true;
        }
        if (!profile) {
          await message.channel.send(applyTemplate(data.notFoundMessage || 'No Fortnite profile found for `{query}`. The account may be private or the platform may be wrong.', varsFor(message, data, {}, { query, prefix })));
          return true;
        }

        const vars = varsFor(message, data, profile, { query, prefix });
        const embed = new EmbedBuilder()
          .setColor(hexToInt(data.embedColor || '#8B5CF6'))
          .setTitle(applyTemplate(data.titleTemplate || 'Fortnite profile for {fortnite_name}', vars))
          .setDescription(applyTemplate(data.descriptionTemplate || DEFAULT_DESCRIPTION, vars));
        if (profile.imageUrl) embed.setThumbnail(profile.imageUrl);
        await message.channel.send({ embeds: [embed] });
        return true;
      },

      generateCode(node, prefix = '!') {
        const rawCmd = String(node.data?.command || 'fortnite').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `// Fortnite Profile command\nif (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()} ")) {\n  message.channel.send("Fortnite Profile runs through the builder plugin runtime.");\n}`;
      },
    },
  },
};
