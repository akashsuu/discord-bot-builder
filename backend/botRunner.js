'use strict';

const { Client, GatewayIntentBits } = require('discord.js');
const { substitute }  = require('./variables');
const engine          = require('./engine');
const pluginLoader    = require('./pluginLoader');
const rootLogger      = require('./engine/logger');
const log             = rootLogger.child('BotRunner');

let client  = null;
let running = false;

// ── Discord event → built-in event node type ──────────────────────────────────
const NODE_EVENT_DEFAULT = {
  event_channel: 'channelCreate',
  event_client:  'ready',
  event_emoji:   'emojiCreate',
  event_guild:   'guildCreate',
  event_member:  'guildMemberAdd',
  event_role:    'roleCreate',
};

const DISCORD_EVENT_TO_NODE = {
  channelCreate:      'event_channel',
  channelDelete:      'event_channel',
  channelUpdate:      'event_channel',
  channelPinsUpdate:  'event_channel',
  ready:              'event_client',
  warn:               'event_client',
  emojiCreate:        'event_emoji',
  emojiDelete:        'event_emoji',
  emojiUpdate:        'event_emoji',
  guildCreate:        'event_guild',
  guildDelete:        'event_guild',
  guildUpdate:        'event_guild',
  guildAvailable:     'event_guild',
  guildMemberAdd:     'event_member',
  guildMemberRemove:  'event_member',
  guildMemberUpdate:  'event_member',
  roleCreate:         'event_role',
  roleDelete:         'event_role',
  roleUpdate:         'event_role',
};

// ── Embed builder (shared with plugins via builtinHelpers) ────────────────────
function buildEmbed(data, text) {
  const embed = {};
  if (text)           embed.description = text;
  if (data.embedTitle) embed.title       = data.embedTitle;

  if (data.embedColor) {
    const num = parseInt(data.embedColor.replace('#', ''), 16);
    if (!isNaN(num)) embed.color = num;
  }
  if (data.logoUrl || data.logoName) {
    embed.author = { name: data.logoName || '​', icon_url: data.logoUrl || undefined };
  }
  if (data.imageUrl)    embed.image  = { url: data.imageUrl };
  if (data.embedFooter) embed.footer = { text: data.embedFooter };
  return embed;
}

// ── Persistent cross-event cooldown store ─────────────────────────────────────
// WHY module-level: cooldowns must survive across individual message events.
// key format: `${guildId}:${userId}:${command}`
const _cooldowns = new Map();

// ── Static helpers (shared across ALL events — no mutable state here) ─────────
function makeStaticHelpers(prefix) {
  return {
    prefix,
    substitute,
    buildEmbed,
    sendEmbed: async (message, data, text) => {
      const chan = message?.channel;
      if (!chan) return;
      if (data.embedEnabled) {
        await chan.send({ embeds: [buildEmbed(data, text)] });
      } else if (text) {
        await chan.send(text);
      }
    },
  };
}

// ── Per-event flow helpers ─────────────────────────────────────────────────────
// WHY per-event: the flow plugin system (command → user_list → permission_gate →
// action) needs shared mutable state that persists across every node in ONE
// graph execution run but resets for the next message.
//
// Reference types (Set, Map, Array, plain object) are spread into each node's
// ctx by executionEngine. Because they are references, mutations made by
// plugin A (e.g. ctx.allowedUsers.add(id)) are visible in plugin B's ctx
// without any further wiring.
//
// Primitive values (command string, targetMember) live in ctx.flow — a shared
// object reference — so plugins write ctx.flow.command = '...' rather than
// ctx.command = '...' (which would only mutate the local ctx copy).
function makeEventHelpers(staticHelpers) {
  const flow = {
    command:      null,
    targetMember: null,
    targetUser:   null,
    reason:       null,
  };
  return {
    ...staticHelpers,
    allowedUsers: new Set(),   // ctx.allowedUsers.add(id) — shared Set
    allowedRoles: new Set(),   // ctx.allowedRoles.add(id) — shared Set
    cooldowns:    _cooldowns,  // ctx.cooldowns.get/set    — shared persistent Map
    args:         [],          // ctx.args.push(...)       — shared Array
    flow,                      // ctx.flow.command = '...' — shared plain object
  };
}

// ── Public API ────────────────────────────────────────────────────────────────
async function start(projectData, _legacyPlugins = {}, ipcLog = null, onInfo = () => {}) {
  if (running) {
    log.warn('Already running — stop first.');
    return;
  }

  const { nodes = [], edges = [], token, prefix: rawPrefix = '' } = projectData;
  const prefix = rawPrefix.trim();

  if (!token?.trim()) {
    throw new Error('Bot token is missing. Add it via the Token button.');
  }

  // Forward engine log entries to the Electron IPC log panel
  let unsubLog = null;
  if (ipcLog) {
    unsubLog = engine.onEngineLog((entry) => {
      ipcLog(`[${entry.level}] ${entry.message}`);
    });
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildEmojisAndStickers,
    ],
  });

  // Give the plugin loader a reference to the live client so safeAPI can be
  // created properly for any plugins loaded after login.
  pluginLoader.setClient(client);

  const helpers = makeBuiltinHelpers(prefix);

  // ── messageCreate ───────────────────────────────────────────────────────────
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const eventNodes = nodes.filter((n) => n.type === 'event_message');
    for (const evNode of eventNodes) {
      await engine.executeGraph(evNode, nodes, edges, message, 'messageCreate', prefix, helpers);
    }
  });

  // ── All other Discord events ────────────────────────────────────────────────
  for (const [discordEvent, nodeType] of Object.entries(DISCORD_EVENT_TO_NODE)) {
    client.on(discordEvent, async (...args) => {
      const eventData = discordEvent.endsWith('Update') ? (args[1] ?? args[0]) : args[0];
      const defaultEv = NODE_EVENT_DEFAULT[nodeType];
      const matching  = nodes.filter(
        (n) => n.type === nodeType && (n.data?.event || defaultEv) === discordEvent
      );
      for (const evNode of matching) {
        await engine.executeGraph(evNode, nodes, edges, eventData, discordEvent, prefix, helpers);
      }
    });
  }

  // ── Ready ───────────────────────────────────────────────────────────────────
  client.once('ready', () => {
    running = true;
    const msgCount = nodes.filter((n) => n.type === 'event_message').length;
    const evCount  = nodes.filter((n) => n.type.startsWith('event_') && n.type !== 'event_message').length;
    log.info(`Logged in as ${client.user.tag}`);
    log.info(`Watching ${msgCount} message event(s), ${evCount} other event node(s)`);
    log.info(`${engine.getPluginCount()} plugin(s) — ${engine.getNodeCount()} node type(s)`);

    onInfo({
      username:  client.user.username,
      tag:       client.user.tag,
      avatarURL: client.user.displayAvatarURL({ size: 64, extension: 'png' }),
    });
  });

  client.on('error', (err) => log.error(`Discord error: ${err.message}`));
  client.on('warn',  (w)   => log.warn(`Discord warn: ${w}`));

  await client.login(token.trim());
}

async function stop() {
  if (client) {
    await client.destroy();
    client = null;
  }
  running = false;
  log.info('Bot stopped.');
}

module.exports = { start, stop };
