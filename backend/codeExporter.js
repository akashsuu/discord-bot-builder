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
    const raw = plugin.generateCode(node, prefix);
    raw.split('\n').forEach((l) => lines.push(pad + l));
    return lines.join('\n');
  }

  switch (node.type) {
    case 'custom_command': {
      const rawCmd = (node.data.command || '').trim();
      const fullCmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
      const cmd = JSON.stringify(fullCmd);
      lines.push(`${pad}if (message.content.startsWith(${cmd}) && (!message.content.charAt(${fullCmd.length}) || /\\s/.test(message.content.charAt(${fullCmd.length})))) {`);

      if (node.data.apiEnabled) {
        lines.push(...buildCustomCommandApi(node.data, fullCmd, pad + INDENT));
      } else if (node.data.reply) {
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
        lines.push(buildNode(t, nodes, edges, plugins, depth + 1, prefix));
      }

      const falseNodes = getOutputNodes(node.id, nodes, edges, 'false');
      if (falseNodes.length > 0) {
        lines.push(`${pad}} else {`);
        for (const f of falseNodes) {
          lines.push(buildNode(f, nodes, edges, plugins, depth + 1, prefix));
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

function buildCustomCommandApi(data, fullCmd, pad) {
  const lines = [];
  const method = String(data.apiMethod || 'GET').toUpperCase();
  const noBody = ['GET', 'HEAD'].includes(method);
  const timeout = Math.max(1000, Number(data.apiTimeout || 15000));

  lines.push(`${pad}const _ccRawArgs = message.content.slice(${JSON.stringify(fullCmd)}.length).trim();`);
  lines.push(`${pad}const _ccParts = _ccRawArgs ? _ccRawArgs.split(/\\s+/).filter(Boolean) : [];`);
  lines.push(`${pad}const _ccVars = {`);
  lines.push(`${pad}  user: message.author?.username || "", username: message.author?.username || "", tag: message.author?.tag || "",`);
  lines.push(`${pad}  id: message.author?.id || "", user_id: message.author?.id || "", userId: message.author?.id || "",`);
  lines.push(`${pad}  mention: message.author?.id ? \`<@\${message.author.id}>\` : "",`);
  lines.push(`${pad}  server: message.guild?.name || "", guild: message.guild?.name || "", serverId: message.guild?.id || "", server_id: message.guild?.id || "",`);
  lines.push(`${pad}  channel: message.channel?.name || "", channelId: message.channel?.id || "", channel_id: message.channel?.id || "",`);
  lines.push(`${pad}  channelMention: message.channel?.id ? \`<#\${message.channel.id}>\` : "",`);
  lines.push(`${pad}  memberCount: String(message.guild?.memberCount ?? ""), member_count: String(message.guild?.memberCount ?? ""),`);
  lines.push(`${pad}  command: ${JSON.stringify(fullCmd)}, args: _ccRawArgs, arg0: _ccParts[0] || "", arg1: _ccParts[1] || "", arg2: _ccParts[2] || "",`);
  lines.push(`${pad}  message: message.content || "", date: new Date().toISOString().slice(0, 10), time: new Date().toTimeString().slice(0, 8),`);
  lines.push(`${pad}};`);
  lines.push(`${pad}const _ccTpl = (s, v) => String(s || "").replace(/\\{([A-Za-z_][A-Za-z0-9_]*)\\}/g, (m, k) => v[k] == null ? m : String(v[k]));`);
  lines.push(`${pad}const _ccGet = (obj, p) => !p ? obj : String(p).split(".").reduce((cur, key) => cur == null ? undefined : (Array.isArray(cur) ? cur[Number(key)] : cur[key]), obj);`);
  lines.push(`${pad}const _ccHeaders = {};`);
  lines.push(`${pad}for (const _line of _ccTpl(${JSON.stringify(data.apiHeaders || '')}, _ccVars).split(/\\r?\\n/)) {`);
  lines.push(`${pad}  const _idx = _line.indexOf(":");`);
  lines.push(`${pad}  if (_idx > 0) _ccHeaders[_line.slice(0, _idx).trim()] = _line.slice(_idx + 1).trim();`);
  lines.push(`${pad}}`);
  if (!noBody) {
    lines.push(`${pad}if (!_ccHeaders["Content-Type"] && !_ccHeaders["content-type"]) _ccHeaders["Content-Type"] = "application/json";`);
  }
  lines.push(`${pad}const _ccController = new AbortController();`);
  lines.push(`${pad}const _ccTimer = setTimeout(() => _ccController.abort(), ${timeout});`);
  lines.push(`${pad}try {`);
  lines.push(`${pad}  if (message.channel?.sendTyping) await message.channel.sendTyping().catch(() => {});`);
  lines.push(`${pad}  const _ccUrl = _ccTpl(${JSON.stringify(data.apiUrl || '')}, _ccVars);`);
  lines.push(`${pad}  const _ccOptions = { method: ${JSON.stringify(method)}, headers: _ccHeaders, signal: _ccController.signal };`);
  if (!noBody) lines.push(`${pad}  _ccOptions.body = _ccTpl(${JSON.stringify(data.apiBody || '')}, _ccVars);`);
  lines.push(`${pad}  const _ccRes = await fetch(_ccUrl, _ccOptions);`);
  lines.push(`${pad}  const _ccType = _ccRes.headers.get("content-type") || "";`);
  lines.push(`${pad}  const _ccData = _ccType.includes("application/json") ? await _ccRes.json() : await _ccRes.text();`);
  lines.push(`${pad}  let _ccResult = _ccGet(_ccData, ${JSON.stringify(data.apiResultPath || '')});`);
  lines.push(`${pad}  if (_ccResult && typeof _ccResult === "object") _ccResult = JSON.stringify(_ccResult, null, 2);`);
  lines.push(`${pad}  _ccResult = String(_ccResult ?? (typeof _ccData === "string" ? _ccData : JSON.stringify(_ccData)));`);
  lines.push(`${pad}  if (!_ccRes.ok) throw new Error(\`HTTP \${_ccRes.status} \${_ccRes.statusText}\`);`);
  lines.push(`${pad}  const _ccText = _ccTpl(${JSON.stringify(data.apiReply || data.reply || '{apiResult}')}, { ..._ccVars, result: _ccResult, apiResult: _ccResult, apiStatus: String(_ccRes.status), apiStatusText: _ccRes.statusText, apiOk: String(_ccRes.ok), apiJson: typeof _ccData === "string" ? _ccData : JSON.stringify(_ccData, null, 2) });`);
  if (data.embedEnabled) {
    const colorNum = data.embedColor ? parseInt(String(data.embedColor).replace('#', ''), 16) : NaN;
    lines.push(`${pad}  await message.channel.send({ embeds: [{`);
    lines.push(`${pad}    description: String(_ccText || '').slice(0, 4096),`);
    if (data.embedTitle) lines.push(`${pad}    title: ${JSON.stringify(data.embedTitle)},`);
    if (!Number.isNaN(colorNum)) lines.push(`${pad}    color: ${colorNum},`);
    if (data.imageUrl && data.imagePosition === 'thumbnail') lines.push(`${pad}    thumbnail: { url: ${JSON.stringify(data.imageUrl)} },`);
    else if (data.imageUrl) lines.push(`${pad}    image: { url: ${JSON.stringify(data.imageUrl)} },`);
    if (data.embedFooter) lines.push(`${pad}    footer: { text: ${JSON.stringify(data.embedFooter)} },`);
    lines.push(`${pad}  }] });`);
  } else {
    lines.push(`${pad}  await message.channel.send(String(_ccText || '').slice(0, 2000));`);
  }
  lines.push(`${pad}} catch (_ccErr) {`);
  lines.push(`${pad}  const _ccText = _ccTpl(${JSON.stringify(data.apiErrorMessage || 'API error: {apiError}')}, { ..._ccVars, apiError: _ccErr.message, error: _ccErr.message, apiOk: "false" });`);
  lines.push(`${pad}  if (_ccText) await message.channel.send(String(_ccText).slice(0, 2000)).catch(() => {});`);
  lines.push(`${pad}} finally {`);
  lines.push(`${pad}  clearTimeout(_ccTimer);`);
  lines.push(`${pad}}`);
  return lines;
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
  const { nodes = [], edges = [], token = 'YOUR_BOT_TOKEN', name = 'Bot', prefix: rawPrefix = '!' } = projectData;
  const prefix = String(rawPrefix ?? '!').trim() || '!';

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
// Generated by Kiodium — ${name}
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
