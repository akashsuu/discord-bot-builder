'use strict';

const { Client, GatewayIntentBits } = require('discord.js');
const { substitute } = require('./variables');

let client  = null;
let running = false;

// ─── Default event for each event node type (fallback when data.event missing) ──
const NODE_EVENT_DEFAULT = {
  event_channel: 'channelCreate',
  event_client:  'ready',
  event_emoji:   'emojiCreate',
  event_guild:   'guildCreate',
  event_member:  'guildMemberAdd',
  event_role:    'roleCreate',
};

// ─── Discord event → node type map ────────────────────────────────────────────
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

// ─── Build a discord.js embed object from node data ───────────────────────────
function buildEmbed(data, text) {
  const embed = {};
  if (text) embed.description = text;

  if (data.embedTitle) embed.title = data.embedTitle;

  if (data.embedColor) {
    const num = parseInt(data.embedColor.replace('#', ''), 16);
    if (!isNaN(num)) embed.color = num;
  }

  if (data.logoUrl || data.logoName) {
    embed.author = {
      name:     data.logoName || '​',
      icon_url: data.logoUrl  || undefined,
    };
  }

  if (data.imageUrl) embed.image = { url: data.imageUrl };
  if (data.embedFooter) embed.footer = { text: data.embedFooter };

  return embed;
}

// ─── Context passed to every plugin execute() as 3rd argument ─────────────────
// eventType: the Discord event name, e.g. 'messageCreate', 'channelCreate'
// eventData: the primary Discord object for this event
function makePluginCtx(eventType, eventData) {
  return {
    sendEmbed: async (message, data, text) => {
      // message is passed explicitly by plugins for backward compat
      const chan = message?.channel;
      if (!chan) return;
      if (data.embedEnabled) {
        const embed = buildEmbed(data, text);
        await chan.send({ embeds: [embed] });
      } else if (text) {
        await chan.send(text);
      }
    },
    buildEmbed,
    eventType,
    eventData,
  };
}

// ─── Graph traversal helpers ───────────────────────────────────────────────────
function getOutputNodes(nodeId, nodes, edges, handleId) {
  return edges
    .filter((e) => e.source === nodeId && (handleId == null || e.sourceHandle === handleId))
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter(Boolean);
}

// ─── Execute a single node ─────────────────────────────────────────────────────
// eventObj: the raw Discord object for the triggering event
// eventType: Discord event name (e.g. 'messageCreate', 'channelCreate')
async function executeNode(node, nodes, edges, eventObj, plugins, log, eventType) {
  log(`[Engine] ${node.type} → id:${node.id}`);

  // Plugin nodes take priority
  const plugin = plugins[node.type];
  if (plugin && typeof plugin.execute === 'function') {
    const cont = await plugin.execute(node, eventObj, makePluginCtx(eventType, eventObj));
    if (cont) {
      for (const next of getOutputNodes(node.id, nodes, edges)) {
        await executeNode(next, nodes, edges, eventObj, plugins, log, eventType);
      }
    }
    return;
  }

  switch (node.type) {
    // ── Trigger / pass-through nodes ──
    case 'event_message':
    case 'event_channel':
    case 'event_client':
    case 'event_emoji':
    case 'event_guild':
    case 'event_member':
    case 'event_role': {
      for (const next of getOutputNodes(node.id, nodes, edges)) {
        await executeNode(next, nodes, edges, eventObj, plugins, log, eventType);
      }
      break;
    }

    case 'custom_command': {
      const cmd     = (node.data.command || '').trim();
      const content = eventObj?.content || '';
      if (!cmd || !content.startsWith(cmd)) return;

      if (node.data.reply) {
        const text = eventObj ? substitute(node.data.reply, eventObj) : (node.data.reply || '');
        if (node.data.embedEnabled) {
          const embed = buildEmbed(node.data, text);
          await eventObj.channel.send({ embeds: [embed] });
        } else {
          await eventObj.channel.send(text);
        }
      }
      for (const next of getOutputNodes(node.id, nodes, edges)) {
        await executeNode(next, nodes, edges, eventObj, plugins, log, eventType);
      }
      break;
    }

    case 'send_message': {
      const text = eventObj ? substitute(node.data.text || '', eventObj) : (node.data.text || '');
      const chan  = eventObj?.channel;
      if (chan) {
        if (node.data.embedEnabled) {
          const embed = buildEmbed(node.data, text);
          await chan.send({ embeds: [embed] });
        } else if (text) {
          await chan.send(text);
        }
      }
      for (const next of getOutputNodes(node.id, nodes, edges)) {
        await executeNode(next, nodes, edges, eventObj, plugins, log, eventType);
      }
      break;
    }

    case 'condition_branch': {
      const val     = node.data.value || '';
      const content = eventObj?.content || '';
      let result = false;
      switch (node.data.condition) {
        case 'starts_with': result = content.startsWith(val); break;
        case 'contains':    result = content.includes(val);   break;
        case 'equals':      result = content === val;          break;
        default:            result = false;
      }
      const branch = result ? 'true' : 'false';
      for (const next of getOutputNodes(node.id, nodes, edges, branch)) {
        await executeNode(next, nodes, edges, eventObj, plugins, log, eventType);
      }
      break;
    }

    default:
      log(`[Engine] Unknown node type: "${node.type}" — skipping`);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────
async function start(projectData, plugins = {}, log = console.log, onInfo = () => {}) {
  if (running) {
    log('[Bot] Already running — stop first.');
    return;
  }

  const { nodes = [], edges = [], token } = projectData;

  if (!token || !token.trim()) {
    throw new Error('Bot token is missing. Add it via the Token button.');
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,          // member join/leave/update (privileged)
      GatewayIntentBits.GuildEmojisAndStickers, // emoji create/delete/update
    ],
  });

  // ── Built-in message handler ──────────────────────────────────────────────
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const eventNodes = nodes.filter((n) => n.type === 'event_message');
    for (const evNode of eventNodes) {
      try {
        await executeNode(evNode, nodes, edges, message, plugins, log, 'messageCreate');
      } catch (err) {
        log(`[Error] ${err.message}`);
      }
    }
  });

  // ── Register listeners for all other event node types ────────────────────
  for (const [discordEvent, nodeType] of Object.entries(DISCORD_EVENT_TO_NODE)) {
    client.on(discordEvent, async (...args) => {
      // For *Update events pass the new value (args[1]); otherwise pass args[0]
      const eventData = discordEvent.endsWith('Update') ? (args[1] ?? args[0]) : args[0];

      const defaultEvent = NODE_EVENT_DEFAULT[nodeType];
      const matchingNodes = nodes.filter(
        (n) => n.type === nodeType && (n.data.event || defaultEvent) === discordEvent
      );
      for (const evNode of matchingNodes) {
        try {
          await executeNode(evNode, nodes, edges, eventData, plugins, log, discordEvent);
        } catch (err) {
          log(`[Error] ${err.message}`);
        }
      }
    });
  }

  client.once('ready', () => {
    running = true;
    const msgCount = nodes.filter((n) => n.type === 'event_message').length;
    const evCount  = nodes.filter((n) => n.type.startsWith('event_') && n.type !== 'event_message').length;
    log(`[Bot] Logged in as ${client.user.tag}`);
    log(`[Bot] Watching ${msgCount} message event(s), ${evCount} other event node(s)`);

    onInfo({
      username:  client.user.username,
      tag:       client.user.tag,
      avatarURL: client.user.displayAvatarURL({ size: 64, extension: 'png' }),
    });
  });

  client.on('error', (err) => log(`[Bot Error] ${err.message}`));
  client.on('warn',  (w)   => log(`[Bot Warn]  ${w}`));

  await client.login(token.trim());
}

async function stop() {
  if (client) {
    await client.destroy();
    client = null;
  }
  running = false;
}

module.exports = { start, stop };
