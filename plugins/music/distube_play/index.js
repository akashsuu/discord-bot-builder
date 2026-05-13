'use strict';

function ensureWebGlobals() {
  if (typeof globalThis.File === 'undefined') {
    try {
      const { File, Blob } = require('node:buffer');
      if (typeof globalThis.Blob === 'undefined' && Blob) globalThis.Blob = Blob;
      if (File) globalThis.File = File;
    } catch {
      globalThis.File = class File {
        constructor(parts, name, options = {}) {
          this.parts = parts;
          this.name = String(name || '');
          this.type = options.type || '';
          this.lastModified = options.lastModified || Date.now();
        }
      };
    }
  }
}

ensureWebGlobals();

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

let distube = null;
let distubeLoadError = null;
let ffmpegPath = null;
let youtubePluginLoadError = null;

function loadDistube() {
  try {
    ensureWebGlobals();
    return require('distube');
  } catch (err) {
    distubeLoadError = err;
    return null;
  }
}

function loadFfmpegPath() {
  if (ffmpegPath !== null) return ffmpegPath;
  try {
    ffmpegPath = require('ffmpeg-static') || '';
  } catch {
    ffmpegPath = '';
  }
  return ffmpegPath;
}

function loadDistubePlugins() {
  const plugins = [];
  try {
    const loaded = require('@distube/youtube');
    const YouTubePlugin = loaded.YouTubePlugin || loaded.default;
    if (YouTubePlugin) plugins.push(new YouTubePlugin());
  } catch (err) {
    youtubePluginLoadError = err;
  }
  return plugins;
}

function commandWithPrefix(raw, prefix) {
  const cmd = String(raw || 'play').trim() || 'play';
  const effectivePrefix = String(prefix || '!');
  return cmd.startsWith(effectivePrefix) ? cmd : `${effectivePrefix}${cmd}`;
}

function splitAliases(value) {
  return String(value || '')
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchCommand(content, commands) {
  const text = String(content || '').trim();
  for (const command of commands) {
    const normalized = String(command || '').trim();
    if (!normalized) continue;
    if (text.toLowerCase() === normalized.toLowerCase()) return { args: '' };
    if (text.toLowerCase().startsWith(`${normalized.toLowerCase()} `)) {
      return { args: text.slice(normalized.length).trim() };
    }
  }
  return null;
}

function applyTemplate(template, vars = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

function hexToInt(hex) {
  const parsed = parseInt(String(hex || '#8E44AD').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0x8E44AD : parsed;
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

function varsFor(message, data, extra = {}) {
  return {
    user: message.author?.username || 'Unknown',
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    command: commandWithPrefix(data.command || 'play', extra.prefix || '!'),
    query: extra.query || '',
    title: extra.title || extra.query || 'Unknown track',
    channel: extra.channel || '',
    error: extra.error || '',
  };
}

function buildEmbed(data, vars) {
  return new EmbedBuilder()
    .setColor(hexToInt(data.embedColor || '#8E44AD'))
    .setTitle(applyTemplate(data.embedTitle || 'Music Player', vars))
    .setDescription(applyTemplate(data.embedDescription || 'Queued **{query}** in **{channel}**.', vars));
}

function playerRows(nonce, data, disabled = false, paused = false) {
  const id = (action) => `distube:${action}:${nonce}`;
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(id('pause'))
        .setLabel(paused ? (data.resumeButtonLabel || 'Resume') : (data.pauseButtonLabel || 'Pause'))
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(id('skip'))
        .setLabel(data.skipButtonLabel || 'Skip')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(id('stop'))
        .setLabel(data.stopButtonLabel || 'Stop')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    ),
  ];
}

function formatDependencyError() {
  const base = distubeLoadError?.code === 'MODULE_NOT_FOUND'
    ? 'Distube is not installed. Run `npm install` in the project folder, then restart the app.'
    : `Distube failed to load: ${distubeLoadError?.message || 'unknown error'}`;
  return `${base} Required packages are listed in package.json.`;
}

function createDistube(client) {
  if (distube) return distube;

  const loaded = loadDistube();
  if (!loaded?.DisTube) throw new Error(formatDependencyError());

  distube = new loaded.DisTube(client, {
    emitNewSongOnly: true,
    plugins: loadDistubePlugins(),
    ffmpeg: {
      path: loadFfmpegPath() || 'ffmpeg',
    },
  });

  if (youtubePluginLoadError) {
    setTimeout(() => {
      console.warn(`Distube YouTube plugin failed to load: ${youtubePluginLoadError.message}`);
    }, 0);
  }

  distube.on('playSong', (queue, song) => {
    queue.textChannel?.send(`Now playing: **${song.name}** (${song.formattedDuration})`).catch(() => {});
  });

  distube.on('addSong', (queue, song) => {
    queue.textChannel?.send(`Added to queue: **${song.name}**`).catch(() => {});
  });

  distube.on('error', (channel, error) => {
    const target = channel?.send ? channel : channel?.textChannel;
    target?.send?.(`Distube error: ${error?.message || String(error)}`).catch(() => {});
  });

  distube.on('debug', (message) => {
    console.log(`[Distube] ${message}`);
  });

  distube.on('ffmpegDebug', (message) => {
    console.log(`[Distube:ffmpeg] ${message}`);
  });

  return distube;
}

module.exports = {
  meta: {
    name: 'Distube Play',
    version: '1.0.1',
    author: 'discord-bot-builder',
    description: 'Play music from YouTube using Distube voice playback.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    music_distube_play: {
      label: 'Distube Play',
      icon: 'DTS',
      color: '#8E44AD',
      description: 'Play a song using Distube with voice channel controls.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'play', required: true },
        aliases: { type: 'string', default: 'p', required: false },
        embedColor: { type: 'string', default: '#8E44AD', required: false },
        embedTitle: { type: 'string', default: 'Music Player', required: false },
        embedDescription: { type: 'string', default: 'Queued **{query}** in **{channel}**.', required: false },
        missingQueryMessage: { type: 'string', default: 'Use `{command} <song name or url>` to play music.', required: false },
        missingVoiceMessage: { type: 'string', default: 'Join a voice channel first.', required: false },
        queuedMessage: { type: 'string', default: 'Added **{query}** to the queue.', required: false },
        errorMessage: { type: 'string', default: 'Music playback failed: {error}', required: false },
        pauseButtonLabel: { type: 'string', default: 'Pause', required: false },
        resumeButtonLabel: { type: 'string', default: 'Resume', required: false },
        skipButtonLabel: { type: 'string', default: 'Skip', required: false },
        stopButtonLabel: { type: 'string', default: 'Stop', required: false },
      },

      initProject({ client }) {
        if (!client) return;
        try {
          createDistube(client);
        } catch {
          // The execute path reports the dependency error in Discord when the command is used.
        }
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;

        const data = node.data || {};
        const prefix = String(ctx?.prefix || '!');
        const commands = [
          commandWithPrefix(data.command || 'play', prefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
        ].filter(Boolean);

        const matched = matchCommand(message.content, commands);
        if (!matched) return false;

        const vars = (extra = {}) => varsFor(message, data, { prefix, query: matched.args, ...extra });
        if (!matched.args) {
          await message.channel.send(applyTemplate(data.missingQueryMessage || 'Use `{command} <song name or url>` to play music.', vars()));
          return true;
        }

        const voiceChannel = await getVoiceChannel(message);
        if (!voiceChannel) {
          await message.channel.send(applyTemplate(data.missingVoiceMessage || 'Join a voice channel first.', vars()));
          return true;
        }
        if (voiceChannel.joinable === false) {
          await message.channel.send(applyTemplate(data.errorMessage || 'Music playback failed: {error}', vars({ error: 'Bot cannot join your voice channel. Check Connect permission.' })));
          return true;
        }
        if (voiceChannel.speakable === false) {
          await message.channel.send(applyTemplate(data.errorMessage || 'Music playback failed: {error}', vars({ error: 'Bot cannot speak in your voice channel. Check Speak permission.' })));
          return true;
        }

        let player;
        try {
          player = createDistube(message.client);
        } catch (err) {
          await message.channel.send(applyTemplate(data.errorMessage || 'Music playback failed: {error}', vars({ error: err.message })));
          return true;
        }

        try {
          await player.play(voiceChannel, matched.args, {
            message,
            textChannel: message.channel,
            member: message.member,
          });
        } catch (err) {
          await message.channel.send(applyTemplate(data.errorMessage || 'Music playback failed: {error}', vars({ error: err?.message || String(err) })));
          return true;
        }

        const nonce = message.id || Date.now();
        const panel = await message.channel.send({
          content: applyTemplate(data.queuedMessage || 'Added **{query}** to the queue.', vars({ channel: voiceChannel.name })),
          embeds: [buildEmbed(data, vars({ channel: voiceChannel.name }))],
          components: playerRows(nonce, data),
        });

        const collector = panel.createMessageComponentCollector?.({ time: 30 * 60 * 1000 });
        let paused = false;
        collector?.on('collect', async (interaction) => {
          if (interaction.user?.id !== message.author.id) {
            await interaction.reply({ content: 'Only the requester can use these music buttons.', ephemeral: true }).catch(() => {});
            return;
          }

          const [, action, incomingNonce] = String(interaction.customId || '').split(':');
          if (incomingNonce !== String(nonce)) return;

          try {
            const queue = player.getQueue(message.guild.id);
            if (!queue) {
              await interaction.update({ components: playerRows(nonce, data, true, paused) });
              return;
            }

            if (action === 'pause') {
              if (paused) {
                queue.resume();
                paused = false;
              } else {
                queue.pause();
                paused = true;
              }
              await interaction.update({ components: playerRows(nonce, data, false, paused) });
              return;
            }

            if (action === 'skip') {
              await queue.skip();
              await interaction.reply({ content: 'Skipped.', ephemeral: true }).catch(() => {});
              return;
            }

            if (action === 'stop') {
              queue.stop();
              await interaction.update({ components: playerRows(nonce, data, true, paused) });
            }
          } catch (err) {
            await interaction.reply({ content: err?.message || String(err), ephemeral: true }).catch(() => {});
          }
        });

        return true;
      },

      generateCode(node, prefix = '!') {
        const rawCmd = String(node.data?.command || 'play').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `// Distube Play command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const query = message.content.slice("${cmd}".length).trim();
  if (!query) return message.channel.send("Use ${cmd} <song name or url>.");
  message.channel.send("Distube Play requires Distube dependencies installed and runtime voice setup.");
}`;
      },
    },
  },
};
