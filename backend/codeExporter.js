'use strict';

const { buildTemplateLiteral } = require('./variables');

const INDENT = '  ';

// ─── Graph helpers ─────────────────────────────────────────────────────────
function getOutputNodes(nodeId, nodes, edges, handleId) {
  return edges
    .filter((e) => e.source === nodeId && (handleId == null || e.sourceHandle === handleId))
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter(Boolean);
}

// ─── Build JS for a subtree rooted at `node` ──────────────────────────────
function buildNode(node, nodes, edges, plugins, depth, prefix) {
  const pad = INDENT.repeat(depth);
  const lines = [];

  // Plugin-provided code generation
  const plugin = plugins[node.type];
  if (plugin && typeof plugin.generateCode === 'function') {
    const raw = plugin.generateCode(node, prefix || '');
    raw.split('\n').forEach((l) => lines.push(pad + l));
    return lines.join('\n');
  }

  switch (node.type) {
    case 'custom_command': {
      const rawCmd = (node.data.command || '').trim();
      const fullCmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
      const cmd = JSON.stringify(fullCmd);
      lines.push(`${pad}if (message.content.startsWith(${cmd})) {`);

      if (node.data.reply) {
        if (node.data.embedEnabled) {
          lines.push(...buildEmbedSend(node.data, node.data.reply, pad + INDENT));
        } else {
          const reply = buildTemplateLiteral(node.data.reply);
          lines.push(`${pad}${INDENT}message.channel.send(${reply});`);
        }
      }

      for (const next of getOutputNodes(node.id, nodes, edges)) {
        lines.push(buildNode(next, nodes, edges, plugins, depth + 1, prefix));
      }
      lines.push(`${pad}}`);
      break;
    }

    case 'send_message': {
      if (node.data.embedEnabled) {
        lines.push(...buildEmbedSend(node.data, node.data.text || '', pad));
      } else {
        const txt = buildTemplateLiteral(node.data.text || '');
        lines.push(`${pad}message.channel.send(${txt});`);
      }
      for (const next of getOutputNodes(node.id, nodes, edges)) {
        lines.push(buildNode(next, nodes, edges, plugins, depth + 1, prefix));
      }
      break;
    }

    case 'condition_branch': {
      const val = JSON.stringify(node.data.value || '');
      let condExpr;
      switch (node.data.condition) {
        case 'starts_with': condExpr = `message.content.startsWith(${val})`; break;
        case 'contains':    condExpr = `message.content.includes(${val})`;    break;
        case 'equals':      condExpr = `message.content === ${val}`;           break;
        default:            condExpr = 'false';
      }

      lines.push(`${pad}if (${condExpr}) {`);
      for (const t of getOutputNodes(node.id, nodes, edges, 'true')) {
        lines.push(buildNode(t, nodes, edges, plugins, depth + 1));
      }

      const falseNodes = getOutputNodes(node.id, nodes, edges, 'false');
      if (falseNodes.length > 0) {
        lines.push(`${pad}} else {`);
        for (const f of falseNodes) {
          lines.push(buildNode(f, nodes, edges, plugins, depth + 1));
        }
      }
      lines.push(`${pad}}`);
      break;
    }

    default:
      lines.push(`${pad}// [${node.type}] — no code generator`);
  }

  return lines.join('\n');
}

// Returns an array of code lines that send an embed
function buildEmbedSend(data, rawText, pad) {
  const lines = [];
  const txt = buildTemplateLiteral(rawText);
  lines.push(`${pad}await message.channel.send({ embeds: [{`);
  lines.push(`${pad}  description: ${txt},`);
  if (data.embedTitle) {
    lines.push(`${pad}  title: ${JSON.stringify(data.embedTitle)},`);
  }
  if (data.embedColor) {
    const colorNum = parseInt(data.embedColor.replace('#', ''), 16);
    if (!isNaN(colorNum)) lines.push(`${pad}  color: ${colorNum},`);
  }
  if (data.imageUrl) {
    if (data.imagePosition === 'thumbnail') {
      lines.push(`${pad}  thumbnail: { url: ${JSON.stringify(data.imageUrl)} },`);
    } else {
      lines.push(`${pad}  image: { url: ${JSON.stringify(data.imageUrl)} },`);
    }
  }
  if (data.embedFooter) {
    lines.push(`${pad}  footer: { text: ${JSON.stringify(data.embedFooter)} },`);
  }
  lines.push(`${pad}}] });`);
  return lines;
}

// ─── Public ────────────────────────────────────────────────────────────────
function generateCode(projectData, plugins = {}) {
  const { nodes = [], edges = [], token = 'YOUR_BOT_TOKEN', name = 'Bot', prefix: rawPrefix = '' } = projectData;
  const prefix = rawPrefix.trim();

  const eventNodes = nodes.filter((n) => n.type === 'event_message');

  const bodyLines = [];
  for (const evNode of eventNodes) {
    for (const next of getOutputNodes(evNode.id, nodes, edges)) {
      bodyLines.push(buildNode(next, nodes, edges, plugins, 2, prefix));
    }
  }

  const body = bodyLines.join('\n') || `${INDENT.repeat(2)}// No nodes connected to event yet`;

  const prefixGuard = prefix
    ? `  if (!message.content.startsWith(${JSON.stringify(prefix)})) return;\n`
    : '';

  return `// ─────────────────────────────────────────────────────────────
// Generated by Discord Bot Builder — ${name}
// Generated: ${new Date().toISOString()}
// ─────────────────────────────────────────────────────────────

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(\`✅ Logged in as \${client.user.tag}\`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
${prefixGuard}
${body}
});

client.login("${token}");
`;
}

module.exports = { generateCode };
