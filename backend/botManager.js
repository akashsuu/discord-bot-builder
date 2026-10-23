'use strict';

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

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { substitute } = require('./variables');
const engine = require('./engine');
const pluginLoader = require('./pluginLoader');
const rootLogger = require('./engine/logger');
const { handleInteraction } = require('./engine/interactionHandler');
const { createSafeAPI } = require('./engine/safeAPI');
const configManager = require('./engine/configManager');

const log = rootLogger.child('BotManager');

const NODE_EVENT_DEFAULT = {
  event_channel: 'channelCreate',
  event_client: 'ready',
  event_emoji: 'emojiCreate',
  event_guild: 'guildCreate',
  event_member: 'guildMemberAdd',
  event_role: 'roleCreate',
};

const DISCORD_EVENT_TO_NODE = {
  channelCreate: 'event_channel',
  channelDelete: 'event_channel',
  channelUpdate: 'event_channel',
  channelPinsUpdate: 'event_channel',
  ready: 'event_client',
  warn: 'event_client',
  emojiCreate: 'event_emoji',
  emojiDelete: 'event_emoji',
  emojiUpdate: 'event_emoji',
  guildCreate: 'event_guild',
  guildDelete: 'event_guild',
  guildUpdate: 'event_guild',
  guildAvailable: 'event_guild',
  guildMemberAdd: 'event_member',
  guildMemberRemove: 'event_member',
  guildMemberUpdate: 'event_member',
  roleCreate: 'event_role',
  roleDelete: 'event_role',
  roleUpdate: 'event_role',
};

function projectNeedsMessageContentIntent(nodes) {
  return (nodes || []).some((node) => node.type === 'event_message' || node.type === 'custom_command');
}

function projectNeedsGuildMembersIntent(nodes) {
  return (nodes || []).some((node) => node.type === 'event_member' || node.type === 'moderation_antinuke');
}

function projectNeedsAntinukeIntents(nodes) {
  return (nodes || []).some((node) => node.type === 'moderation_antinuke');
}

function buildClientIntents(nodes) {
  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildVoiceStates,
  ];
  if (projectNeedsMessageContentIntent(nodes)) intents.push(GatewayIntentBits.MessageContent);
  if (projectNeedsGuildMembersIntent(nodes)) intents.push(GatewayIntentBits.GuildMembers);
  if (projectNeedsAntinukeIntents(nodes)) {
    intents.push(
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildWebhooks,
      GatewayIntentBits.GuildIntegrations
    );
  }
  return intents;
}

function isDisallowedIntentsError(err) {
  const message = String(err?.message || '').toLowerCase();
  return message.includes('disallowed intents') || err?.code === 4014;
}

function disallowedIntentsHelp(nodes) {
  const required = [];
  if (projectNeedsMessageContentIntent(nodes)) required.push('Message Content Intent');
  if (projectNeedsGuildMembersIntent(nodes)) required.push('Server Members Intent');
  const list = required.length ? required.join(' and ') : 'the privileged intents used by this bot';
  return `Used disallowed intents. Open Discord Developer Portal > Applications > your bot > Bot > Privileged Gateway Intents, enable ${list}, then save changes and run again.`;
}

function buildEmbed(data, text) {
  const embed = {};
  if (text) embed.description = text;
  if (data?.embedTitle) embed.title = data.embedTitle;
  if (data?.embedColor) {
    const num = parseInt(data.embedColor.replace('#', ''), 16);
    if (!isNaN(num)) embed.color = num;
  }
  if (data?.logoUrl || data?.logoName) {
    embed.author = { name: data.logoName || '\u200b', icon_url: data.logoUrl || undefined };
  }
  if (data?.imageUrl) embed.image = { url: data.imageUrl };
  if (data?.embedFooter) embed.footer = { text: data.embedFooter };
  return embed;
}

class BotInstance {
  constructor(projectId, projectData, manager) {
    this.projectId = projectId;
    this.projectData = projectData;
    this.manager = manager;
    this.client = null;
    this.status = 'stopped'; // 'stopped' | 'starting' | 'online' | 'error'
    this.info = null; // { username, tag, avatarURL }
    this.logs = [];
    this.cooldowns = new Map();
    this.startedAt = null;
  }

  addLog(text) {
    const logItem = {
      id: Date.now() + Math.random(),
      text,
      time: new Date().toLocaleTimeString(),
    };
    this.logs.push(logItem);
    if (this.logs.length > 500) this.logs.shift();
    this.manager.broadcast(this.projectId, {
      type: 'bot:log',
      projectId: this.projectId,
      log: text,
      logItem,
    });
  }

  emitStatus(running, statusStr) {
    this.status = statusStr;
    if (!running) this.info = null;
    this.manager.broadcast(this.projectId, {
      type: 'bot:status',
      projectId: this.projectId,
      status: { running, status: statusStr },
    });
  }

  emitInfo(info) {
    this.info = info;
    this.manager.broadcast(this.projectId, {
      type: 'bot:info',
      projectId: this.projectId,
      info,
    });
  }

  makeStaticHelpers(defaultPrefix) {
    const guildPrefixes = new Map();
    const getPrefix = (guildId = 'global') =>
      guildPrefixes.get(guildId || 'global') || guildPrefixes.get('global') || defaultPrefix;
    const setPrefix = (nextPrefix, guildId = 'global') => {
      const clean = String(nextPrefix || '').trim() || defaultPrefix;
      guildPrefixes.set(guildId || 'global', clean);
      return clean;
    };
    return {
      prefix: defaultPrefix,
      defaultPrefix,
      getPrefix,
      setPrefix,
      substitute,
      buildEmbed,
      sendEmbed: async (message, data, text) => {
        const chan = message?.channel;
        if (!chan) return;
        const wantsEmbed = data?.embedEnabled !== false && data?.embedEnabled !== 'false';
        if (wantsEmbed) {
          await chan.send({ embeds: [buildEmbed(data, text)] });
        } else if (text) {
          await chan.send(text);
        }
      },
    };
  }

  makeEventHelpers(staticHelpers) {
    const flow = {
      command: null,
      targetMember: null,
      targetUser: null,
      reason: null,
    };
    return {
      ...staticHelpers,
      allowedUsers: new Set(),
      allowedRoles: new Set(),
      cooldowns: this.cooldowns,
      args: [],
      flow,
    };
  }

  async start() {
    const { nodes = [], edges = [], token, prefix: rawPrefix = '!' } = this.projectData;
    const prefix = String(rawPrefix || '!').trim() || '!';

    if (!token?.trim()) {
      throw new Error('Bot token is missing. Please set your bot token.');
    }

    this.emitStatus(false, 'starting');
    this.addLog(`[System] Initializing bot "${this.projectData.name || this.projectId}"...`);

    const intents = buildClientIntents(nodes);
    this.client = new Client({
      intents,
      partials: [Partials.Channel],
    });

    const staticHelpers = this.makeStaticHelpers(prefix);

    // Interaction handler (buttons/dropdowns)
    this.client.on('interactionCreate', (interaction) => {
      handleInteraction(interaction).catch((err) => {
        log.error(`Interaction error in project ${this.projectId}: ${err.message}`);
      });
    });

    // Run plugin initializers for nodes
    for (const node of nodes) {
      const entry = engine.getNode(node.type);
      if (entry?.definition && typeof entry.definition.initProject === 'function') {
        try {
          await entry.definition.initProject({
            node,
            client: this.client,
            prefix,
            ...staticHelpers,
          });
        } catch (err) {
          this.addLog(`[Error] Plugin "${node.type}" init: ${err.message}`);
        }
      }
    }

    // messageCreate
    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      const eventNodes = nodes.filter((n) => n.type === 'event_message');
      for (const evNode of eventNodes) {
        const effectivePrefix = staticHelpers.getPrefix(message.guild?.id);
        const helpers = this.makeEventHelpers({ ...staticHelpers, prefix: effectivePrefix });
        await engine.executeGraph(evNode, nodes, edges, message, 'messageCreate', effectivePrefix, helpers);
      }
    });

    // Other Discord events
    for (const [discordEvent, nodeType] of Object.entries(DISCORD_EVENT_TO_NODE)) {
      this.client.on(discordEvent, async (...args) => {
        const eventData = discordEvent.endsWith('Update') ? (args[1] || args[0]) : args[0];
        const defaultEv = NODE_EVENT_DEFAULT[nodeType];
        const matching = nodes.filter(
          (n) => n.type === nodeType && (n.data?.event || defaultEv) === discordEvent
        );
        for (const evNode of matching) {
          const effectivePrefix = staticHelpers.getPrefix(eventData?.guild?.id);
          const helpers = this.makeEventHelpers({ ...staticHelpers, prefix: effectivePrefix });
          await engine.executeGraph(evNode, nodes, edges, eventData, discordEvent, effectivePrefix, helpers);
        }
      });
    }

    // ready
    this.client.once('ready', () => {
      this.status = 'online';
      this.startedAt = Date.now();
      const msgCount = nodes.filter((n) => n.type === 'event_message').length;
      const evCount = nodes.filter((n) => n.type.startsWith('event_') && n.type !== 'event_message').length;

      const botInfo = {
        username: this.client.user.username,
        tag: this.client.user.tag,
        avatarURL: this.client.user.displayAvatarURL({ size: 64, extension: 'png' }),
      };

      this.addLog(`[System] Logged in as ${this.client.user.tag}`);
      this.addLog(`[System] Watching ${msgCount} message event(s), ${evCount} other event node(s)`);
      this.emitInfo(botInfo);
      this.emitStatus(true, 'online');
    });

    this.client.on('error', (err) => {
      this.addLog(`[Error] Discord error: ${err.message}`);
    });

    this.client.on('warn', (w) => {
      this.addLog(`[Warn] Discord warning: ${w}`);
    });

    try {
      await this.client.login(token.trim());
    } catch (err) {
      const message = isDisallowedIntentsError(err) ? disallowedIntentsHelp(nodes) : err.message;
      this.addLog(`[Error] Login failed: ${message}`);
      if (this.client) {
        await this.client.destroy().catch(() => {});
        this.client = null;
      }
      this.emitStatus(false, 'error');
      throw new Error(message);
    }
  }

  async stop() {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (e) {
        log.warn(`Destroy client error for ${this.projectId}: ${e.message}`);
      }
      this.client = null;
    }
    this.emitStatus(false, 'stopped');
    this.addLog('[System] Bot stopped.');
  }
}

class BotManager {
  constructor() {
    this.bots = new Map(); // projectId -> BotInstance
    this.subscribers = new Map(); // projectId -> Set<ws>
  }

  broadcast(projectId, data) {
    const clients = this.subscribers.get(projectId);
    if (!clients || clients.size === 0) return;
    const json = JSON.stringify(data);
    for (const ws of clients) {
      if (ws.readyState === 1 /* OPEN */) {
        try {
          ws.send(json);
        } catch {
          // ignore broken pipe
        }
      }
    }
  }

  subscribe(projectId, ws) {
    if (!this.subscribers.has(projectId)) {
      this.subscribers.set(projectId, new Set());
    }
    this.subscribers.get(projectId).add(ws);

    // Send current status immediately upon subscription
    const bot = this.bots.get(projectId);
    const running = bot?.status === 'online';
    ws.send(
      JSON.stringify({
        type: 'bot:status',
        projectId,
        status: { running, status: bot?.status || 'stopped' },
      })
    );
    if (bot?.info) {
      ws.send(
        JSON.stringify({
          type: 'bot:info',
          projectId,
          info: bot.info,
        })
      );
    }
    if (bot?.logs?.length) {
      ws.send(
        JSON.stringify({
          type: 'bot:logs_history',
          projectId,
          logs: bot.logs,
        })
      );
    }
  }

  unsubscribe(projectId, ws) {
    const set = this.subscribers.get(projectId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) this.subscribers.delete(projectId);
    }
  }

  removeSocket(ws) {
    for (const [projectId, set] of this.subscribers.entries()) {
      set.delete(ws);
      if (set.size === 0) this.subscribers.delete(projectId);
    }
  }

  async startBot(projectId, projectData) {
    let instance = this.bots.get(projectId);
    if (instance) {
      if (instance.status === 'online' || instance.status === 'starting') {
        await instance.stop();
      }
    }
    instance = new BotInstance(projectId, projectData, this);
    this.bots.set(projectId, instance);
    await instance.start();
    return { success: true };
  }

  async stopBot(projectId) {
    const instance = this.bots.get(projectId);
    if (!instance) return { success: true };
    await instance.stop();
    return { success: true };
  }

  getStatus(projectId) {
    const instance = this.bots.get(projectId);
    const running = instance?.status === 'online';
    return {
      running,
      status: instance?.status || 'stopped',
      info: instance?.info || null,
      logs: instance?.logs || [],
    };
  }

  async stopAll() {
    log.info('Stopping all running bots...');
    const promises = [];
    for (const [id, bot] of this.bots.entries()) {
      promises.push(bot.stop().catch(() => {}));
    }
    await Promise.all(promises);
    this.bots.clear();
  }
}

const botManager = new BotManager();

module.exports = botManager;
