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
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN/i.test(message)) {
    return `Cannot connect to ${base}`;
  }
  return message;
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
    encoded: first?.encoded || first?.track || info.encoded || '',
    title: info.title || query,
    author: info.author || info.artist || 'Unknown Artist',
    duration: formatDuration(info.length || info.duration),
    posterUrl: getTrackArtwork(info),
    uri: info.uri || info.identifier || '',
  };
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
          'Client-Name': 'discord-bot-builder/1.0.0',
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
        }
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

  async join(voiceChannel) {
    await this.connect();
    await sendDiscordVoiceState(this.client, voiceChannel.guild, voiceChannel.id);

    const data = await this.waitForVoiceData(voiceChannel.guild.id);
    await this.patchPlayer(voiceChannel.guild.id, {
      voice: {
        token: data.server.token,
        endpoint: data.server.endpoint,
        sessionId: data.state.session_id,
      },
    });
  }

  async play(voiceChannel, track) {
    if (!track.encoded) throw new Error('Lavalink returned track info but no playable encoded track.');
    if (voiceChannel.joinable === false) throw new Error('Bot cannot join your voice channel. Check Connect permission.');
    if (voiceChannel.speakable === false) throw new Error('Bot cannot speak in your voice channel. Check Speak permission.');
    await this.join(voiceChannel);
    await this.patchPlayer(voiceChannel.guild.id, { encodedTrack: track.encoded });
    this.players.set(voiceChannel.guild.id, { paused: false, track });
  }

  async pause(guildId) {
    const player = this.players.get(guildId) || { paused: false };
    player.paused = !player.paused;
    await this.patchPlayer(guildId, { paused: player.paused });
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
        lavalinkUrl: { type: 'string', default: '', required: false },
        lavalinkHost: { type: 'string', default: 'localhost', required: false },
        lavalinkPort: { type: 'string', default: '2333', required: false },
        lavalinkPassword: { type: 'string', default: 'youshallnotpass', required: false },
        lavalinkSecure: { type: 'boolean', default: false, required: false },
        youtubeSearchPrefix: { type: 'string', default: 'ytsearch:', required: false },
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
          await message.channel.send(applyTemplate(data.lavalinkErrorMessage || 'Could not reach Lavalink. Start your Lavalink server or fix host/port/password. Details: {error}', varsFor(message, data, {}, { prefix, query: matched.args, error: describeLavalinkError(err, data) })));
          return true;
        }
        if (!track) {
          await message.channel.send(applyTemplate(data.noResultsMessage || 'No tracks found for `{query}`.', varsFor(message, data, {}, { prefix, query: matched.args })));
          return true;
        }

        const manager = getManager(message.client, data);
        try {
          await manager.play(voiceChannel, track);
        } catch (err) {
          await message.channel.send(applyTemplate(data.lavalinkErrorMessage || 'Could not reach Lavalink. Start your Lavalink server or fix host/port/password. Details: {error}', varsFor(message, data, track, { prefix, query: matched.args, error: describeLavalinkError(err, data) })));
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
            await manager.stop(message.guild);
            await interaction.update({ embeds: [buildCompletedEmbed(data, vars)], components: playerRows(data, nonce, true), content: '' });
            collector.stop('disconnect');
            return;
          }
          if (action === 'pause') {
            const paused = await manager.pause(message.guild.id);
            await safeReply(interaction, paused ? 'Paused.' : 'Resumed.');
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
