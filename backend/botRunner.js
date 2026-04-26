'use strict';

const { Client, GatewayIntentBits } = require('discord.js');

let client = null;
let running = false;

// ─── Variable substitution ─────────────────────────────────────────────────
function substitute(text, message) {
  const args = message.content.split(' ').slice(1).join(' ');
  return text
    .replace(/\{user\}/g, message.author.username)
    .replace(/\{args\}/g, args)
    .replace(/\{tag\}/g, message.author.tag)
    .replace(/\{channel\}/g, message.channel.name || 'unknown');
}

// ─── Build a discord.js embed object from node data ───────────────────────
function buildEmbed(data, text) {
  const embed = {};
  if (text) embed.description = text;

  if (data.embedTitle) embed.title = data.embedTitle;

  if (data.embedColor) {
    const num = parseInt(data.embedColor.replace('#', ''), 16);
    if (!isNaN(num)) embed.color = num;
  }

  // Top-left author block: logo icon + name
  if (data.logoUrl || data.logoName) {
    embed.author = {
      name:     data.logoName || '​',
      icon_url: data.logoUrl  || undefined,
    };
  }

  // Bottom rectangle image
  if (data.imageUrl) {
    embed.image = { url: data.imageUrl };
  }

  if (data.embedFooter) embed.footer = { text: data.embedFooter };

  return embed;
}

// ─── Context passed to every plugin execute() as 3rd argument ─────────────
function makePluginCtx() {
  return {
    // Sends a plain or embed message depending on node.data.embedEnabled
    sendEmbed: async (message, data, text) => {
      if (data.embedEnabled) {
        const embed = buildEmbed(data, text);
        await message.channel.send({ embeds: [embed] });
      } else {
        if (text) await message.channel.send(text);
      }
    },
    buildEmbed,
  };
}

// ─── Graph traversal helpers ───────────────────────────────────────────────
function getOutputNodes(nodeId, nodes, edges, handleId) {
  return edges
    .filter((e) => e.source === nodeId && (handleId == null || e.sourceHandle === handleId))
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter(Boolean);
}

// ─── Execute a single node, returns true to continue graph, false to stop ──
async function executeNode(node, nodes, edges, message, plugins, log) {
  log(`[Engine] ${node.type} → id:${node.id}`);

  // Plugin nodes take priority
  const plugin = plugins[node.type];
  if (plugin && typeof plugin.execute === 'function') {
    const cont = await plugin.execute(node, message);
    if (cont) {
      for (const next of getOutputNodes(node.id, nodes, edges)) {
        await executeNode(next, nodes, edges, message, plugins, log);
      }
    }
    return;
  }

  switch (node.type) {
    case 'event_message': {
      for (const next of getOutputNodes(node.id, nodes, edges)) {
        await executeNode(next, nodes, edges, message, plugins, log);
      }
      break;
    }

    case 'custom_command': {
      const cmd = (node.data.command || '').trim();
      if (!cmd || !message.content.startsWith(cmd)) return; // stop path

      if (node.data.reply) {
        const text = substitute(node.data.reply, message);
        if (node.data.embedEnabled) {
          const embed = buildEmbed(node.data, text);
          await message.channel.send({ embeds: [embed] });
        } else {
          await message.channel.send(text);
        }
      }
      for (const next of getOutputNodes(node.id, nodes, edges)) {
        await executeNode(next, nodes, edges, message, plugins, log);
      }
      break;
    }

    case 'send_message': {
      const text = substitute(node.data.text || '', message);
      if (node.data.embedEnabled) {
        const embed = buildEmbed(node.data, text);
        await message.channel.send({ embeds: [embed] });
      } else if (text) {
        await message.channel.send(text);
      }
      for (const next of getOutputNodes(node.id, nodes, edges)) {
        await executeNode(next, nodes, edges, message, plugins, log);
      }
      break;
    }

    case 'condition_branch': {
      const val = node.data.value || '';
      let result = false;
      switch (node.data.condition) {
        case 'starts_with': result = message.content.startsWith(val); break;
        case 'contains':    result = message.content.includes(val);   break;
        case 'equals':      result = message.content === val;          break;
        default:            result = false;
      }
      const branch = result ? 'true' : 'false';
      for (const next of getOutputNodes(node.id, nodes, edges, branch)) {
        await executeNode(next, nodes, edges, message, plugins, log);
      }
      break;
    }

    default:
      log(`[Engine] Unknown node type: "${node.type}" — skipping`);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────
async function start(projectData, plugins = {}, log = console.log) {
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
    ],
  });

  client.once('ready', () => {
    running = true;
    log(`[Bot] Logged in as ${client.user.tag}`);
    log(`[Bot] Watching ${nodes.filter((n) => n.type === 'event_message').length} event node(s)`);
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const eventNodes = nodes.filter((n) => n.type === 'event_message');
    for (const evNode of eventNodes) {
      try {
        await executeNode(evNode, nodes, edges, message, plugins, log);
      } catch (err) {
        log(`[Error] ${err.message}`);
      }
    }
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
