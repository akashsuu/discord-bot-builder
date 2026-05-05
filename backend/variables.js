'use strict';

const VARIABLES = [
  // ── Sender ────────────────────────────────────────────────────────────────
  { name: 'user',          demo: 'Akashsuu',          desc: "Sender's username" },
  { name: 'tag',           demo: 'Akashsuu#0000',     desc: "Sender's full tag (name#discriminator)" },
  { name: 'id',            demo: '123456789012345678', desc: "Sender's Discord user ID" },
  { name: 'mention',       demo: '@Akashsuu',         desc: "Sender's @mention" },
  // ── Target (moderation) ───────────────────────────────────────────────────
  { name: 'target',        demo: 'OwO#8456',          desc: "Target user's full tag" },
  { name: 'targetName',    demo: 'OwO',               desc: "Target user's username (no discriminator)" },
  { name: 'targetId',      demo: '987654321098765432', desc: "Target user's Discord ID" },
  { name: 'targetMention', demo: '@OwO',              desc: "Target user's @mention" },
  // ── Command ───────────────────────────────────────────────────────────────
  { name: 'command',       demo: '!kick',             desc: 'The full command string that triggered this node' },
  { name: 'args',          demo: 'hello world',       desc: 'All text typed after the command word' },
  { name: 'reason',        demo: 'No reason provided',desc: 'Action reason (moderation nodes)' },
  // ── Server / channel ─────────────────────────────────────────────────────
  { name: 'server',        demo: 'My Server',         desc: 'Server (guild) name' },
  { name: 'channel',       demo: 'general',           desc: 'Channel name where message was sent' },
  { name: 'memberCount',   demo: '1,234',             desc: 'Total member count of the server' },
  // ── Utility ──────────────────────────────────────────────────────────────
  { name: 'latency',       demo: '42',                desc: 'Bot API latency in ms (ping plugin)' },
  { name: 'date',          demo: '2026-05-05',        desc: 'Current date (YYYY-MM-DD)' },
  { name: 'time',          demo: '12:00:00',          desc: 'Current time (HH:MM:SS UTC)' },
];

// ─── Runtime substitution ────────────────────────────────────────────────────
// Replace every {token} in `text` with live Discord values.
// `extra` carries node-specific values (command, target, reason, latency, etc.)
function substitute(text, message, extra = {}) {
  if (!message) return text || '';

  const now  = new Date();
  const args = (message.content || '').split(' ').slice(1).join(' ');

  let r = String(text || '');

  // ── Sender ───────────────────────────────────────────────────────────────
  r = r
    .replace(/\{user\}/g,    message.author?.username  || '')
    .replace(/\{tag\}/g,     message.author?.tag       || '')
    .replace(/\{id\}/g,      message.author?.id        || '')
    .replace(/\{mention\}/g, `<@${message.author?.id   || ''}>`)
    // ── Command ──────────────────────────────────────────────────────────
    .replace(/\{args\}/g,    args)
    .replace(/\{command\}/g, extra.command             || '')
    // ── Server / channel ─────────────────────────────────────────────────
    .replace(/\{server\}/g,  message.guild?.name       || 'unknown')
    .replace(/\{channel\}/g, message.channel?.name     || 'unknown')
    .replace(/\{memberCount\}/g, String(message.guild?.memberCount ?? 0))
    // ── Time ─────────────────────────────────────────────────────────────
    .replace(/\{date\}/g,    now.toISOString().slice(0, 10))
    .replace(/\{time\}/g,    now.toTimeString().slice(0, 8));

  // ── Optionals (moderation / ping) ─────────────────────────────────────────
  if (extra.target        != null) r = r.replace(/\{target\}/g,        String(extra.target));
  if (extra.targetName    != null) r = r.replace(/\{targetName\}/g,    String(extra.targetName));
  if (extra.targetId      != null) {
    r = r.replace(/\{targetId\}/g,      String(extra.targetId));
    r = r.replace(/\{targetMention\}/g, `<@${extra.targetId}>`);
  }
  if (extra.reason        != null) r = r.replace(/\{reason\}/g,        String(extra.reason));
  if (extra.latency       != null) r = r.replace(/\{latency\}/g,       String(extra.latency));

  return r;
}

// ─── Code-export template literal builder ────────────────────────────────────
// Converts a user template string into a JS template literal for the exported bot.js.
// e.g.  "Hello {user}!" → "`Hello ${message.author.username}!`"
function buildTemplateLiteral(text) {
  const escaped = (text || '')
    .replace(/\\/g,   '\\\\')
    .replace(/`/g,    '\\`')
    .replace(/\$\{/g, '\\${')
    // Sender
    .replace(/\{user\}/g,          '${message.author?.username || ""}')
    .replace(/\{tag\}/g,           '${message.author?.tag      || ""}')
    .replace(/\{id\}/g,            '${message.author?.id       || ""}')
    .replace(/\{mention\}/g,       '${`<@${message.author?.id}>`}')
    // Command
    .replace(/\{args\}/g,          '${message.content.split(" ").slice(1).join(" ")}')
    .replace(/\{command\}/g,       '${cmd || ""}')
    // Server / channel
    .replace(/\{server\}/g,        '${message.guild?.name    || "unknown"}')
    .replace(/\{channel\}/g,       '${message.channel?.name  || "unknown"}')
    .replace(/\{memberCount\}/g,   '${message.guild?.memberCount ?? 0}')
    // Target (set by plugin — falls back to literal if not in scope)
    .replace(/\{target\}/g,        '${_target?.user?.tag           || "Unknown"}')
    .replace(/\{targetName\}/g,    '${_target?.user?.username      || "Unknown"}')
    .replace(/\{targetId\}/g,      '${_target?.user?.id            || "0"}')
    .replace(/\{targetMention\}/g, '${`<@${_target?.user?.id}>`}')
    .replace(/\{reason\}/g,        '${_reason || "No reason provided"}')
    .replace(/\{latency\}/g,       '${_lat ?? 0}')
    // Time
    .replace(/\{date\}/g,          '${new Date().toISOString().slice(0,10)}')
    .replace(/\{time\}/g,          '${new Date().toTimeString().slice(0,8)}');

  return '`' + escaped + '`';
}

module.exports = { VARIABLES, substitute, buildTemplateLiteral };
