'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'play').trim() || 'play';
  const effectivePrefix = String(prefix || '!');
  return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
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
    if (!rest || /^\s/.test(rest)) return { args: rest.trim(), command: cmd };
  }
  return null;
}

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function hexToInt(hex) {
  const parsed = parseInt(String(hex || '#2B2D31').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0x2B2D31 : parsed;
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function lavalinkBase(data) {
  const protocol = data.lavalinkSecure === true ? 'https' : 'http';
  const host = String(data.lavalinkHost || 'localhost').trim();
  const port = String(data.lavalinkPort || '2333').trim();
  return `${protocol}://${host}${port ? `:${port}` : ''}`;
}

async function loadTrack(data, query) {
  if (typeof fetch !== 'function') throw new Error('Fetch API is unavailable in this runtime.');
  const isUrl = /^https?:\/\//i.test(query);
  const identifier = isUrl ? query : `${data.youtubeSearchPrefix || 'ytsearch:'}${query}`;
  const url = `${lavalinkBase(data)}/v4/loadtracks?identifier=${encodeURIComponent(identifier)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: data.lavalinkPassword || 'youshallnotpass',
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = await response.json();
  const first = Array.isArray(json.data) ? json.data[0] : json.data;
  const info = first?.info || first?.track?.info || first;
  if (!info) return null;
  return {
    title: info.title || query,
    author: info.author || info.artist || 'Unknown Artist',
    duration: formatDuration(info.length || info.duration),
    posterUrl: info.artworkUrl || info.thumbnail || data.defaultPosterUrl || data.imageUrl || '',
    uri: info.uri || info.identifier || '',
  };
}

function varsFor(message, data, track = {}, extra = {}) {
  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || message.author?.username || 'Unknown',
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    server: message.guild?.name || 'Server',
    channel: message.channel?.name || '',
    command: commandWithPrefix(data.command || 'play', extra.prefix || '!'),
    query: extra.query || '',
    title: track.title || 'E-GIRLS ARE RUINING MY LIFE!',
    author: track.author || 'CORPSE, Savage Ga$p',
    duration: track.duration || '1:45',
    posterUrl: track.posterUrl || data.defaultPosterUrl || data.imageUrl || '',
    error: extra.error || '',
  };
}

async function getVoiceChannel(message) {
  if (message.member?.voice?.channel) return message.member.voice.channel;
  if (!message.guild?.members?.fetch || !message.author?.id) return null;

  try {
    const member = await message.guild.members.fetch(message.author.id);
    return member?.voice?.channel || null;
  } catch {
    return null;
  }
}

function playerRows(data, nonce, disabled = false) {
  const id = (action) => `musicplay:${action}:${nonce}`;
  const button = (action, label, style = ButtonStyle.Secondary) =>
    new ButtonBuilder().setCustomId(id(action)).setLabel(label).setStyle(style).setDisabled(disabled);
  return [
    new ActionRowBuilder().addComponents(
      button('shuffle', data.shuffleButtonLabel || 'Shuffle'),
      button('previous', data.previousButtonLabel || 'Previous'),
      button('pause', data.pauseButtonLabel || 'Pause', ButtonStyle.Primary),
      button('skip', data.skipButtonLabel || 'Skip'),
      button('queue', data.queueButtonLabel || 'Queue')
    ),
    new ActionRowBuilder().addComponents(
      button('autoplay', data.autoplayButtonLabel || 'Start Autoplay', ButtonStyle.Primary),
      button('restart', data.restartButtonLabel || 'Restart Queue'),
      button('disconnect', data.disconnectButtonLabel || 'Disconnect bot', ButtonStyle.Danger)
    ),
    new ActionRowBuilder().addComponents(
      button('playlists', data.playlistsButtonLabel || 'Playlists'),
      button('browse', data.browseButtonLabel || 'Browse'),
      button('settings', data.settingsButtonLabel || 'Settings')
    ),
  ];
}

function buildNowPlayingEmbed(data, vars) {
  const embed = new EmbedBuilder()
    .setColor(hexToInt(data.embedColor || '#2B2D31'))
    .setTitle(applyTemplate(data.nowPlayingTitle || '{title}', vars))
    .setDescription([
      applyTemplate(data.artistTemplate || '{author}', vars),
      applyTemplate(data.durationTemplate || '{duration}', vars),
    ].join('\n'));
  if (vars.posterUrl) embed.setImage(vars.posterUrl);
  if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, vars) });
  return embed;
}

function buildCompletedEmbed(data, vars) {
  return new EmbedBuilder()
    .setColor(hexToInt(data.embedColor || '#2B2D31'))
    .setDescription(applyTemplate(data.completedMessage || 'Use `{command}` to add more songs to the queue', vars));
}

async function safeReply(interaction, content) {
  try {
    if (interaction.replied || interaction.deferred) await interaction.followUp({ content, ephemeral: true });
    else await interaction.reply({ content, ephemeral: true });
  } catch {
    // Expired interactions are ignored.
  }
}

module.exports = {
  meta: {
    name: 'Music Play',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Play a song using Lavalink / YouTube search with player controls.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    music_play: {
      label: 'Music Play',
      icon: 'PLY',
      color: '#5865F2',
      description: 'Prefix play command with Lavalink REST lookup, poster preview, and player control buttons.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'play', required: true },
        aliases: { type: 'string', default: 'p', required: false },
        lavalinkHost: { type: 'string', default: 'localhost', required: false },
        lavalinkPort: { type: 'string', default: '2333', required: false },
        lavalinkPassword: { type: 'string', default: 'youshallnotpass', required: false },
        lavalinkSecure: { type: 'boolean', default: false, required: false },
        youtubeSearchPrefix: { type: 'string', default: 'ytsearch:', required: false },
        defaultPosterUrl: { type: 'string', default: '', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;
        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command, prefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
        ];
        const matched = matchCommand(message.content, commands);
        if (!matched) return false;

        if (!matched.args) {
          await message.channel.send(applyTemplate(data.missingQueryMessage || 'Use `{command} <song name or url>` to play music.', varsFor(message, data, {}, { prefix })));
          return true;
        }

        const voiceChannel = await getVoiceChannel(message);
        if (!voiceChannel) {
          await message.channel.send(applyTemplate(data.missingVoiceMessage || 'Join a voice channel first.', varsFor(message, data, {}, { prefix, query: matched.args })));
          return true;
        }

        let track;
        try {
          track = await loadTrack(data, matched.args);
        } catch (err) {
          await message.channel.send(applyTemplate(data.lavalinkErrorMessage || 'Could not reach Lavalink: {error}', varsFor(message, data, {}, { prefix, query: matched.args, error: err.message })));
          return true;
        }
        if (!track) {
          await message.channel.send(applyTemplate(data.noResultsMessage || 'No tracks found for `{query}`.', varsFor(message, data, {}, { prefix, query: matched.args })));
          return true;
        }

        const nonce = message.id || Date.now();
        const vars = varsFor(message, data, track, { prefix, query: matched.args });
        const panel = await message.channel.send({
          content: applyTemplate(data.queuedMessage || 'Added **{title}** to the queue.', vars),
          embeds: [buildNowPlayingEmbed(data, vars)],
          components: playerRows(data, nonce),
        });

        const collector = panel.createMessageComponentCollector?.({ time: 30 * 60 * 1000 });
        collector?.on('collect', async (interaction) => {
          if (interaction.user?.id !== message.author.id) {
            await safeReply(interaction, 'Only the requester can use these music buttons.');
            return;
          }
          const [, action] = String(interaction.customId || '').split(':');
          if (action === 'disconnect') {
            await interaction.update({ embeds: [buildCompletedEmbed(data, vars)], components: playerRows(data, nonce, true), content: '' });
            collector.stop('disconnect');
            return;
          }
          await safeReply(interaction, `Music control: ${action}`);
        });

        return true;
      },

      generateCode(node, prefix = '!') {
        const rawCmd = String(node.data?.command || 'play').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `
// Music Play command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _query = message.content.slice("${cmd}".length).trim();
  if (!_query) return message.channel.send("Use ${cmd} <song name or url>.");
  message.channel.send("Music Play requires Lavalink runtime setup. Configure the Music Play node in the builder.");
}`;
      },
    },
  },
};
