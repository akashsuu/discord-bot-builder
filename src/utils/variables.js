/**
 * Centralized template variable definitions.
 * Mirrors backend/variables.js — keep both in sync when adding new vars.
 */
export const VARIABLES = [
  // ── Sender ───────────────────────────────────────────────────────────────
  { name: 'user',          demo: 'Akashsuu',           desc: "Sender's username" },
  { name: 'tag',           demo: 'Akashsuu#0000',      desc: "Sender's full tag (name#discriminator)" },
  { name: 'id',            demo: '123456789012345678',  desc: "Sender's Discord user ID" },
  { name: 'mention',       demo: '@Akashsuu',          desc: "Sender's @mention" },
  // ── Target (moderation) ──────────────────────────────────────────────────
  { name: 'target',        demo: 'OwO#8456',           desc: "Target user's full tag" },
  { name: 'targetName',    demo: 'OwO',                desc: "Target user's username (no discriminator)" },
  { name: 'targetId',      demo: '987654321098765432',  desc: "Target user's Discord ID" },
  { name: 'targetMention', demo: '@OwO',               desc: "Target user's @mention" },
  // ── Command ───────────────────────────────────────────────────────────────
  { name: 'command',       demo: '!kick',              desc: 'Full command string that triggered this node' },
  { name: 'args',          demo: 'hello world',        desc: 'All text typed after the command word' },
  { name: 'reason',        demo: 'No reason provided', desc: 'Action reason (moderation nodes)' },
  // ── Server / channel ──────────────────────────────────────────────────────
  { name: 'server',        demo: 'My Server',          desc: 'Server (guild) name' },
  { name: 'channel',       demo: 'general',            desc: 'Channel name where message was sent' },
  { name: 'memberCount',   demo: '1,234',              desc: 'Total member count of the server' },
  // ── Utility ───────────────────────────────────────────────────────────────
  { name: 'latency',       demo: '42',                 desc: 'Bot API latency in ms (ping plugin)' },
  { name: 'date',          demo: '2026-05-05',         desc: 'Current date (YYYY-MM-DD)' },
  { name: 'time',          demo: '12:00:00',           desc: 'Current time (HH:MM:SS UTC)' },
];

/**
 * Replace all {token} placeholders in `text` with demo/preview values.
 * nodeData is optional — used for node-specific live values like {command} and {reason}.
 */
export function demoSub(text, nodeData) {
  const d = nodeData || {};
  return (text || '')
    // Sender
    .replace(/\{user\}/g,          'Akashsuu')
    .replace(/\{tag\}/g,           'Akashsuu#0000')
    .replace(/\{id\}/g,            '123456789012345678')
    .replace(/\{mention\}/g,       '@Akashsuu')
    // Target
    .replace(/\{target\}/g,        'OwO#8456')
    .replace(/\{targetName\}/g,    'OwO')
    .replace(/\{targetId\}/g,      '987654321098765432')
    .replace(/\{targetMention\}/g, '@OwO')
    // Command
    .replace(/\{command\}/g,       d.command || '!command')
    .replace(/\{args\}/g,          'hello world')
    .replace(/\{reason\}/g,        d.reason  || 'No reason provided')
    // Server / channel
    .replace(/\{server\}/g,        'My Server')
    .replace(/\{channel\}/g,       'general')
    .replace(/\{memberCount\}/g,   '1,234')
    // Utility
    .replace(/\{latency\}/g,       '42')
    .replace(/\{date\}/g,          '2026-05-05')
    .replace(/\{time\}/g,          '12:00:00')
    // Page menu
    .replace(/\{page\}/g,       d.page       ?? '1')
    .replace(/\{totalPages\}/g, d.totalPages ?? '1')
    .replace(/\{selected\}/g,   d.selected   ?? '')
    .replace(/\{button\}/g,     d.button     ?? '');
}

/** Variable names available in standard command / message nodes */
export const BUILTIN_VARS = ['user', 'tag', 'id', 'mention', 'args', 'server', 'channel', 'memberCount', 'date', 'time'];

/** Variable names available in plugin nodes (superset — includes moderation + latency) */
export const PLUGIN_VARS  = ['user', 'tag', 'mention', 'target', 'targetName', 'targetId', 'targetMention', 'reason', 'command', 'args', 'server', 'channel', 'memberCount', 'latency', 'date', 'time'];

/**
 * Build a compact variable-hint string.
 * varHint(['user','target','reason']) → "{user}  {target}  {reason}"
 */
export function varHint(names) {
  const list = names || VARIABLES.map((v) => v.name);
  return list.map((n) => `{${n}}`).join('  ');
}
