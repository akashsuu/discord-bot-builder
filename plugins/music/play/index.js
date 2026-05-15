'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const WebSocket = require('ws');

const managersByClient = new WeakMap();

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'play').trim() || 'play';
  const effectivePrefix = String(prefix || '!');
  return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function splitAliases(value) {
  return String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
}

function splitCsv(value) {
  return String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
}

function uniqueValues(values) {
  return values.filter((value, index, list) => value && list.indexOf(value) === index);
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
  const fullUrl = String(data.lavalinkUrl || '').trim();
  if (fullUrl) return fullUrl.replace(/\/+$/, '');
  const protocol = data.lavalinkSecure === true ? 'https' : 'http';
  const host = String(data.lavalinkHost || 'localhost').trim();
  const port = String(data.lavalinkPort || '2333').trim();
  return `${protocol}://${host}${port ? `:${port}` : ''}`;
}

function lavalinkWsUrl(data) {
  const base = lavalinkBase(data);
  return `${base.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:')}/v4/websocket`;
}

function youtubeThumbnail(identifier) {
  const value = String(identifier || '').trim();
  const match = value.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/);
  const videoId = match?.[1] || (/^[a-zA-Z0-9_-]{11}$/.test(value) ? value : '');
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';
}

function getTrackArtwork(info) {
  return info.artworkUrl
    || info.thumbnail
    || info.image
    || info.pluginInfo?.artworkUrl
    || info.pluginInfo?.thumbnail
    || youtubeThumbnail(info.uri || info.identifier)
    || '';
}

function describeLavalinkError(err, data) {
  const base = lavalinkBase(data);
  const message = err?.cause?.message || err?.message || 'fetch failed';
  if (/WRONG_VERSION_NUMBER|SSL routines|tls_record/i.test(message)) {
    return `SSL protocol mismatch for ${base}. Your Lavalink server is probably plain HTTP. Use http:// in Lavalink URL or turn Secure Lavalink off.`;
  }
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN/i.test(message)) {
    return `Cannot connect to ${base}`;
  }
  return message;
}

function hasTrackShape(value) {
  if (!value || typeof value !== 'object') return false;
  return typeof value.encoded === 'string'
    || typeof value.encodedTrack === 'string'
    || typeof value.track === 'string'
    || typeof value.track?.encoded === 'string'
    || typeof value.track?.track === 'string'
    || Boolean(value.info?.title || value.info?.identifier || value.info?.uri);
}

function pickTrackEntry(json, depth = 0) {
  if (!json || depth > 5) return null;
  if (typeof json === 'string') return json;
  if (Array.isArray(json)) return json.map((item) => pickTrackEntry(item, depth + 1)).find(Boolean) || null;
  if (hasTrackShape(json)) return json;
  if (Array.isArray(json.data?.tracks)) return pickTrackEntry(json.data.tracks, depth + 1);
  if (Array.isArray(json.tracks)) return pickTrackEntry(json.tracks, depth + 1);
  if (Array.isArray(json.data)) return pickTrackEntry(json.data, depth + 1);
  if (json.data?.track) return pickTrackEntry(json.data.track, depth + 1);
  if (json.track) return pickTrackEntry(json.track, depth + 1);
  if (json.data) return pickTrackEntry(json.data, depth + 1);
  return null;
}

function getTrackInfo(entry) {
  return entry?.info || entry?.track?.info || entry?.data?.info || entry?.track?.data?.info || entry || null;
}

function getEncodedTrack(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  if (typeof entry.encoded === 'string') return entry.encoded;
  if (typeof entry.encodedTrack === 'string') return entry.encodedTrack;
  if (typeof entry.track === 'string') return entry.track;
  if (typeof entry.track?.encoded === 'string') return entry.track.encoded;
  if (typeof entry.track?.track === 'string') return entry.track.track;
  if (typeof entry.track?.encodedTrack === 'string') return entry.track.encodedTrack;
  if (typeof entry.data?.encoded === 'string') return entry.data.encoded;
  if (typeof entry.data?.encodedTrack === 'string') return entry.data.encodedTrack;
  if (typeof entry.data?.track === 'string') return entry.data.track;
  if (typeof entry.data?.track?.encoded === 'string') return entry.data.track.encoded;
  if (typeof entry.data?.track?.track === 'string') return entry.data.track.track;
  return '';
}

function getPlayableIdentifier(entry, info) {
  return info?.uri
    || entry?.identifier
    || entry?.uri
    || entry?.track?.identifier
    || entry?.track?.uri
    || entry?.track?.info?.uri
    || entry?.track?.info?.identifier
    || entry?.data?.identifier
    || entry?.data?.uri
    || '';
}

async function requestLoadTrack(data, identifier, apiPath) {
  const url = `${lavalinkBase(data)}${apiPath}?identifier=${encodeURIComponent(identifier)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: data.lavalinkPassword || 'youshallnotpass',
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function parseLoadTrackResponse(data, query, identifier, apiPath) {
  const json = await requestLoadTrack(data, identifier, apiPath);
  const first = pickTrackEntry(json);
  const info = getTrackInfo(first);
  if (!info) return null;
  return {
    encoded: getEncodedTrack(first),
    identifier: getPlayableIdentifier(first, info),
    searchIdentifier: identifier,
    title: info.title || query,
    author: info.author || info.artist || 'Unknown Artist',
    duration: formatDuration(info.length || info.duration),
    posterUrl: getTrackArtwork(info),
    uri: info.uri || info.identifier || '',
  };
}

async function loadTrackFromIdentifier(data, query, identifier) {
  const modern = await parseLoadTrackResponse(data, query, identifier, '/v4/loadtracks');
  if (modern?.encoded || modern?.identifier) return modern;

  try {
    const legacy = await parseLoadTrackResponse(data, query, identifier, '/loadtracks');
    if (legacy?.encoded || legacy?.identifier) return legacy;
  } catch {
    // Some Lavalink v4 servers disable the legacy endpoint.
  }

  return modern;
}

function volumeFor(data) {
  const volume = Number.parseInt(data.volume || '100', 10);
  if (!Number.isFinite(volume)) return 100;
  return Math.min(1000, Math.max(0, volume));
}

async function loadTrackCandidates(data, query) {
  if (typeof fetch !== 'function') throw new Error('Fetch API is unavailable in this runtime.');
  const isUrl = /^https?:\/\//i.test(query);
  if (isUrl) {
    const direct = await loadTrackFromIdentifier(data, query, query);
    return direct ? [direct] : [];
  }

  const prefixes = uniqueValues([
    data.youtubeSearchPrefix || 'ytsearch:',
    ...splitCsv(data.fallbackSearchPrefixes || 'ytsearch:,ytmsearch:,scsearch:'),
  ]);

  const candidates = [];
  for (const prefix of prefixes) {
    const result = await loadTrackFromIdentifier(data, query, `${prefix}${query}`);
    if (result?.encoded || result?.identifier) candidates.push(result);
  }
  return candidates;
}

async function loadTrack(data, query) {
  return (await loadTrackCandidates(data, query))[0] || null;
}

class LavalinkRuntime {
  constructor(client, data) {
    this.client = client;
    this.base = lavalinkBase(data);
    this.wsUrl = lavalinkWsUrl(data);
    this.password = data.lavalinkPassword || 'youshallnotpass';
    this.ws = null;
    this.sessionId = '';
    this.connecting = null;
    this.voiceData = new Map();
    this.voiceWaiters = new Map();
    this.players = new Map();
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN && this.sessionId) return Promise.resolve();
    if (this.connecting) return this.connecting;

    this.connecting = new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl, {
        headers: {
          Authorization: this.password,
          'User-Id': this.client.user?.id || '',
          'Client-Name': 'kiodium/1.0.0',
        },
      });
      this.ws = ws;

      const timeout = setTimeout(() => {
        reject(new Error(`Lavalink websocket timeout at ${this.wsUrl}`));
        ws.close();
      }, 12000);

      ws.on('message', (raw) => {
        let payload;
        try {
          payload = JSON.parse(String(raw));
        } catch {
          return;
        }

        if (payload.op === 'ready') {
          this.sessionId = payload.sessionId;
          clearTimeout(timeout);
          this.connecting = null;
          resolve();
          return;
        }
        this.handleLavalinkMessage(payload);
      });

      ws.on('close', () => {
        this.ws = null;
        this.sessionId = '';
        this.connecting = null;
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        this.connecting = null;
        reject(err);
      });
    });

    return this.connecting;
  }

  handleLavalinkMessage(payload) {
    if (payload.op !== 'event' && payload.op !== 'playerUpdate') return;
    const guildId = payload.guildId || payload.guild_id;
    if (!guildId) return;
    const player = this.players.get(guildId);
    if (!player) return;

    if (payload.op === 'playerUpdate') {
      player.state = payload.state || {};
      this.players.set(guildId, player);
      return;
    }

    if (payload.type === 'TrackStartEvent') {
      player.started = true;
      this.players.set(guildId, player);
      return;
    }

    if (payload.type === 'TrackEndEvent') {
      player.ended = true;
      this.players.set(guildId, player);
      return;
    }

    const parts = [
      payload.exception?.message,
      payload.exception?.cause,
      payload.exception?.severity ? `severity: ${payload.exception.severity}` : '',
      payload.reason,
      payload.type,
    ].filter(Boolean);
    const detail = uniqueValues(parts).join(' | ') || 'Unknown Lavalink playback error';
    player.lastError = detail;
    this.players.set(guildId, player);
    if (player.reportErrors !== false) {
      player.textChannel?.send?.(`Lavalink playback error: ${detail}`).catch(() => {});
    }
  }

  handleRaw(packet) {
    const data = packet?.d;
    if (!data?.guild_id) return;
    const guildId = data.guild_id;
    const current = this.voiceData.get(guildId) || {};

    if (packet.t === 'VOICE_STATE_UPDATE' && data.user_id === this.client.user?.id) {
      current.state = data;
    } else if (packet.t === 'VOICE_SERVER_UPDATE') {
      current.server = data;
    } else {
      return;
    }

    this.voiceData.set(guildId, current);
    if (current.state?.session_id && current.server?.token && current.server?.endpoint) {
      const waiters = this.voiceWaiters.get(guildId) || [];
      this.voiceWaiters.delete(guildId);
      waiters.forEach(({ resolve, timeout }) => {
        clearTimeout(timeout);
        resolve(current);
      });
    }
  }

  waitForVoiceData(guildId) {
    const current = this.voiceData.get(guildId);
    if (current?.state?.session_id && current?.server?.token && current?.server?.endpoint) {
      return Promise.resolve(current);
    }

    return new Promise((resolve, reject) => {
      const waiters = this.voiceWaiters.get(guildId) || [];
      const timeout = setTimeout(() => {
        const next = (this.voiceWaiters.get(guildId) || []).filter((waiter) => waiter.resolve !== resolve);
        if (next.length) this.voiceWaiters.set(guildId, next);
        else this.voiceWaiters.delete(guildId);
        reject(new Error('Timed out waiting for Discord voice connection data.'));
      }, 12000);
      waiters.push({ resolve, timeout });
      this.voiceWaiters.set(guildId, waiters);
    });
  }

  async patchPlayer(guildId, body) {
    await this.connect();
    const response = await fetch(`${this.base}/v4/sessions/${this.sessionId}/players/${guildId}`, {
      method: 'PATCH',
      headers: {
        Authorization: this.password,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Lavalink player HTTP ${response.status}${text ? `: ${text.slice(0, 160)}` : ''}`);
    }
    return response.json().catch(() => null);
  }

  async deletePlayer(guildId) {
    if (!this.sessionId) return;
    await fetch(`${this.base}/v4/sessions/${this.sessionId}/players/${guildId}`, {
      method: 'DELETE',
      headers: { Authorization: this.password },
    }).catch(() => {});
    this.players.delete(guildId);
  }

  async getVoicePayload(voiceChannel) {
    await this.connect();
    await sendDiscordVoiceState(this.client, voiceChannel.guild, voiceChannel.id);

    const data = await this.waitForVoiceData(voiceChannel.guild.id);
    return {
      token: data.server.token,
      endpoint: data.server.endpoint,
      sessionId: data.state.session_id,
      channelId: voiceChannel.id,
    };
  }

  async getPlayer(guildId) {
    if (!this.sessionId) return null;
    const response = await fetch(`${this.base}/v4/sessions/${this.sessionId}/players/${guildId}`, {
      headers: { Authorization: this.password },
    });
    if (!response.ok) return null;
    return response.json().catch(() => null);
  }

  async verifyPlayer(guildId) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const player = this.players.get(guildId);
    if (player?.lastError) throw new Error(player.lastError);

    const remote = await this.getPlayer(guildId);
    if (!remote) throw new Error('Lavalink did not create a player for this server.');
    if (!remote.track) throw new Error('Lavalink player has no active track. The source returned a track but playback did not start.');
    if (remote.state && remote.state.connected === false) {
      throw new Error('Lavalink player is not connected to Discord voice. Check bot voice permissions and Lavalink network access.');
    }
    return remote;
  }

  async play(voiceChannel, track, data, textChannel) {
    const playable = track.encoded
      ? { encoded: track.encoded }
      : track.identifier
        ? { identifier: track.identifier }
        : null;
    if (!playable) throw new Error('Lavalink returned metadata but no playable encoded track or direct URL. Your Lavalink source plugin is not returning playable tracks.');
    if (voiceChannel.joinable === false) throw new Error('Bot cannot join your voice channel. Check Connect permission.');
    if (voiceChannel.speakable === false) throw new Error('Bot cannot speak in your voice channel. Check Speak permission.');
    const voice = await this.getVoicePayload(voiceChannel);
    this.players.set(voiceChannel.guild.id, { paused: false, track, textChannel, reportErrors: false, lastError: null });
    const player = await this.patchPlayer(voiceChannel.guild.id, {
      voice,
      track: playable,
      volume: volumeFor(data),
      paused: false,
    });
    const activePlayer = player || await this.getPlayer(voiceChannel.guild.id);
    if (activePlayer?.paused) {
      await this.patchPlayer(voiceChannel.guild.id, { paused: false });
    }
    await this.verifyPlayer(voiceChannel.guild.id);
    this.players.set(voiceChannel.guild.id, { paused: false, track, textChannel, reportErrors: true, lastError: null });
  }

  async pause(guildId) {
    const player = this.players.get(guildId) || { paused: false };
    player.paused = !player.paused;
    const updated = await this.patchPlayer(guildId, { paused: player.paused });
    if (typeof updated?.paused === 'boolean') player.paused = updated.paused;
    this.players.set(guildId, player);
    return player.paused;
  }

  async stop(guild) {
    await this.deletePlayer(guild.id);
    await sendDiscordVoiceState(this.client, guild, null).catch(() => {});
  }
}

async function sendDiscordVoiceState(client, guild, channelId) {
  const payload = {
    op: 4,
    d: {
      guild_id: guild.id,
      channel_id: channelId,
      self_mute: false,
      self_deaf: true,
    },
  };

  if (guild.shard?.send) return guild.shard.send(payload);
  const shard = client.ws?.shards?.get?.(guild.shardId ?? 0);
  if (shard?.send) return shard.send(payload);
  throw new Error('Could not send Discord voice state update.');
}

function managerKey(data) {
  return `${lavalinkBase(data)}|${data.lavalinkPassword || 'youshallnotpass'}`;
}

function getManager(client, data) {
  let map = managersByClient.get(client);
  if (!map) {
    map = new Map();
    managersByClient.set(client, map);
    client.on('raw', (packet) => {
      for (const manager of map.values()) manager.handleRaw(packet);
    });
  }

  const key = managerKey(data);
  let manager = map.get(key);
  if (!manager) {
    manager = new LavalinkRuntime(client, data);
    map.set(key, manager);
  }
  return manager;
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
    posterUrl: track.posterUrl || '',
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

function playerRows(data, nonce, disabled = false, paused = false) {
  const id = (action) => `musicplay:${action}:${nonce}`;
  const button = (action, label, style = ButtonStyle.Secondary) =>
    new ButtonBuilder().setCustomId(id(action)).setLabel(label).setStyle(style).setDisabled(disabled);
  return [
    new ActionRowBuilder().addComponents(
      button('shuffle', data.shuffleButtonLabel || 'Shuffle'),
      button('previous', data.previousButtonLabel || 'Previous'),
      button('pause', paused ? (data.resumeButtonLabel || 'Resume') : (data.pauseButtonLabel || 'Pause'), ButtonStyle.Primary),
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
        lavalinkUrl: { type: 'string', default: '', required: false },
        lavalinkHost: { type: 'string', default: 'localhost', required: false },
        lavalinkPort: { type: 'string', default: '2333', required: false },
        lavalinkPassword: { type: 'string', default: 'youshallnotpass', required: false },
        lavalinkSecure: { type: 'boolean', default: false, required: false },
        youtubeSearchPrefix: { type: 'string', default: 'ytsearch:', required: false },
        fallbackSearchPrefixes: { type: 'string', default: 'ytsearch:,ytmsearch:,scsearch:', required: false },
        volume: { type: 'string', default: '100', required: false },
        resumeButtonLabel: { type: 'string', default: 'Resume', required: false },
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

        let candidates;
        try {
          candidates = await loadTrackCandidates(data, matched.args);
        } catch (err) {
          await message.channel.send(applyTemplate(data.lavalinkErrorMessage || 'Music playback failed. Details: {error}', varsFor(message, data, {}, { prefix, query: matched.args, error: describeLavalinkError(err, data) })));
          return true;
        }
        if (!candidates.length) {
          await message.channel.send(applyTemplate(data.noResultsMessage || 'No tracks found for `{query}`.', varsFor(message, data, {}, { prefix, query: matched.args })));
          return true;
        }

        const manager = getManager(message.client, data);
        let track = null;
        let lastError = null;
        for (const candidate of candidates) {
          try {
            await manager.play(voiceChannel, candidate, data, message.channel);
            track = candidate;
            break;
          } catch (err) {
            lastError = err;
            await manager.deletePlayer(message.guild.id);
          }
        }
        if (!track) {
          await message.channel.send(applyTemplate(data.lavalinkErrorMessage || 'Music playback failed. Details: {error}', varsFor(message, data, candidates[0], { prefix, query: matched.args, error: describeLavalinkError(lastError, data) })));
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
        let paused = false;
        collector?.on('collect', async (interaction) => {
          if (interaction.user?.id !== message.author.id) {
            await safeReply(interaction, 'Only the requester can use these music buttons.');
            return;
          }
          const [, action] = String(interaction.customId || '').split(':');
          if (action === 'disconnect') {
            await manager.stop(message.guild);
            await interaction.update({ embeds: [buildCompletedEmbed(data, vars)], components: playerRows(data, nonce, true), content: '' });
            collector.stop('disconnect');
            return;
          }
          if (action === 'pause') {
            paused = await manager.pause(message.guild.id);
            await interaction.update({
              content: applyTemplate(data.queuedMessage || 'Added **{title}** to the queue.', vars),
              embeds: [buildNowPlayingEmbed(data, vars)],
              components: playerRows(data, nonce, false, paused),
            });
            return;
          }
          if (action === 'skip') {
            await manager.deletePlayer(message.guild.id);
            await interaction.update({ embeds: [buildCompletedEmbed(data, vars)], components: playerRows(data, nonce, true), content: '' });
            collector.stop('skip');
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
