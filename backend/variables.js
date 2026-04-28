'use strict';

/**
 * All supported template variables.
 * name    — token used in text, e.g. "user"  → {user}
 * demo    — sample value shown in UI previews
 * desc    — human-readable description
 * runtime — how to resolve it at runtime (informational; used by substitute())
 */
const VARIABLES = [
  { name: 'user',    demo: 'Akashsuu',          desc: "Message sender's username" },
  { name: 'tag',     demo: 'Akashsuu#0000',     desc: "Message sender's full tag (name#0000)" },
  { name: 'id',      demo: '123456789012345678', desc: "Message sender's Discord user ID" },
  { name: 'args',    demo: 'world',              desc: 'All text after the command word' },
  { name: 'channel', demo: 'general',            desc: 'Name of the channel the message was sent in' },
  { name: 'server',  demo: 'My Server',          desc: 'Name of the Discord server (guild)' },
  { name: 'command', demo: '!hello',             desc: 'The command trigger (e.g. !ping)' },
  { name: 'target',  demo: 'OwO#8456',           desc: 'Mentioned / target user tag — used by moderation plugins' },
  { name: 'reason',  demo: 'No reason provided', desc: 'Action reason — used by moderation plugins' },
  { name: 'latency', demo: '42',                 desc: 'Bot API latency in ms — used by ping plugin' },
  { name: 'date',    demo: '2026-04-26',         desc: 'Current date (YYYY-MM-DD)' },
  { name: 'time',    demo: '12:00:00',           desc: 'Current time (HH:MM:SS)' },
];

// ─── Runtime substitution (used by botRunner.js) ───────────────────────────
/**
 * Replace all {variable} tokens in `text` with live values.
 * @param {string} text
 * @param {import('discord.js').Message} message
 * @param {Object} [extra]  — { command, target, reason, latency }
 */
function substitute(text, message, extra = {}) {
  if (!message) return text || '';
  const args = (message.content || '').split(' ').slice(1).join(' ');
  const now  = new Date();

  let result = text || '';
  result = result
    .replace(/\{user\}/g,    message.author?.username || '')
    .replace(/\{tag\}/g,     message.author?.tag      || '')
    .replace(/\{id\}/g,      message.author?.id       || '')
    .replace(/\{args\}/g,    args)
    .replace(/\{channel\}/g, message.channel?.name    || 'unknown')
    .replace(/\{server\}/g,  message.guild?.name      || 'unknown')
    .replace(/\{command\}/g, extra.command             || '')
    .replace(/\{date\}/g,    now.toISOString().slice(0, 10))
    .replace(/\{time\}/g,    now.toTimeString().slice(0, 8));

  if (extra.target  != null) result = result.replace(/\{target\}/g,  String(extra.target));
  if (extra.reason  != null) result = result.replace(/\{reason\}/g,  String(extra.reason));
  if (extra.latency != null) result = result.replace(/\{latency\}/g, String(extra.latency));

  return result;
}

// ─── Code-export substitution (used by codeExporter.js) ────────────────────
/**
 * Convert a user-typed template string into a JS template literal.
 * e.g. "Hello {user}!" → "`Hello ${message.author.username}!`"
 */
function buildTemplateLiteral(text) {
  const now = new Date();
  const escaped = (text || '')
    .replace(/\\/g,    '\\\\')
    .replace(/`/g,     '\\`')
    .replace(/\$\{/g,  '\\${')
    .replace(/\{user\}/g,    '${message.author.username}')
    .replace(/\{tag\}/g,     '${message.author.tag}')
    .replace(/\{id\}/g,      '${message.author.id}')
    .replace(/\{args\}/g,    '${message.content.split(" ").slice(1).join(" ")}')
    .replace(/\{channel\}/g, '${message.channel.name}')
    .replace(/\{server\}/g,  '${message.guild?.name || "unknown"}')
    .replace(/\{command\}/g, '${cmd}')
    .replace(/\{date\}/g,    `\${new Date().toISOString().slice(0,10)}`)
    .replace(/\{time\}/g,    `\${new Date().toTimeString().slice(0,8)}`);
  return '`' + escaped + '`';
}

module.exports = { VARIABLES, substitute, buildTemplateLiteral };
