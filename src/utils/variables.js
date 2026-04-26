/**
 * Centralized template variable definitions for the UI.
 * Mirrors backend/variables.js — both must stay in sync when adding new vars.
 */
export const VARIABLES = [
  { name: 'user',    demo: 'Akashsuu',          desc: "Message sender's username" },
  { name: 'tag',     demo: 'Akashsuu#0000',     desc: "Message sender's full tag" },
  { name: 'id',      demo: '123456789012345678', desc: "Message sender's Discord user ID" },
  { name: 'args',    demo: 'world',              desc: 'All text after the command word' },
  { name: 'channel', demo: 'general',            desc: 'Channel name' },
  { name: 'server',  demo: 'My Server',          desc: 'Server / guild name' },
  { name: 'command', demo: '!hello',             desc: 'The command trigger' },
  { name: 'target',  demo: 'OwO#8456',           desc: 'Mentioned / target user tag (moderation)' },
  { name: 'reason',  demo: 'No reason provided', desc: 'Action reason (moderation)' },
  { name: 'latency', demo: '42',                 desc: 'Bot API latency in ms (ping)' },
  { name: 'date',    demo: '2026-04-26',         desc: 'Current date (YYYY-MM-DD)' },
  { name: 'time',    demo: '12:00:00',           desc: 'Current time (HH:MM:SS)' },
];

/**
 * Substitute all {variable} tokens with demo/preview values.
 * nodeData is optional — used for node-specific values like {command} and {reason}.
 */
export function demoSub(text, nodeData) {
  const d = nodeData || {};
  return (text || '')
    .replace(/\{user\}/g,    'Akashsuu')
    .replace(/\{tag\}/g,     'Akashsuu#0000')
    .replace(/\{id\}/g,      '123456789012345678')
    .replace(/\{args\}/g,    'world')
    .replace(/\{channel\}/g, 'general')
    .replace(/\{server\}/g,  'My Server')
    .replace(/\{command\}/g, d.command  || '!command')
    .replace(/\{target\}/g,  'OwO#8456')
    .replace(/\{reason\}/g,  d.reason   || 'No reason provided')
    .replace(/\{latency\}/g, '42')
    .replace(/\{date\}/g,    '2026-04-26')
    .replace(/\{time\}/g,    '12:00:00');
}

/**
 * Build a formatted hint string for a node's variable hint row.
 * Pass an array of variable names to show a subset, or omit for all.
 *
 * Example:  varHint(['user','args','channel'])
 *   →  "{user}  {args}  {channel}"
 */
export function varHint(names) {
  const list = names || VARIABLES.map((v) => v.name);
  return list.map((n) => `{${n}}`).join('  ');
}

/**
 * Built-in command node variables (for Custom Command / Send Message nodes).
 */
export const BUILTIN_VARS = ['user', 'tag', 'id', 'args', 'channel', 'server', 'date', 'time'];

/**
 * Plugin node variables (superset — includes moderation + latency).
 */
export const PLUGIN_VARS = ['target', 'reason', 'latency', 'user', 'tag', 'command', 'channel', 'server'];
