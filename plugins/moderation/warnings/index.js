'use strict';

const warningsStore = globalThis.__warningsStore - (globalThis.__warningsStore = new Map());

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function getGuildWarnings(guildId) {
 if (!warningsStore.has(guildId)) warningsStore.set(guildId, new Map());
 return warningsStore.get(guildId);
}

function getUserWarnings(guildId, userId) {
 const guildMap = getGuildWarnings(guildId);
 if (!guildMap.has(userId)) guildMap.set(userId, []);
 return guildMap.get(userId);
}

function parseTarget(message, token) {
 if (message.mentions.members?.first()) return message.mentions.members.first();
 const id = String(token || '').replace(/[<@!>]/g, '');
 if (!/^\d{17,20}$/.test(id)) return null;
 return message.guild.members.cache.get(id) || { id, user: { id, username: id, tag: id } };
}

module.exports = {
 meta: {
 name: 'Warnings',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Shows warning counts from in-memory warning records.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_warnings: {
 label: 'Warnings',
 icon: 'WRN',
 color: '#0EA5E9',
 description: 'Prefix command to check warnings. Usage: warnings @user',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'warnings', required: true },
 output: { type: 'string', default: '{targetMention} warning count: **{count}**.', required: false },
 },

 async execute(ctx) {
 const { node, message, prefix } = ctx;
 if (!message || !message.guild || message.author?.bot) return false;

 const rawCmd = (node.data?.command || 'warnings').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

 const afterCmd = message.content.slice(cmd.length).trim();
 const parts = afterCmd.split(/\s+/).filter(Boolean);
 const target = parseTarget(message, parts[0]);
 if (!target?.id) {
 await message.reply(`Usage: \`${cmd} @user\``).catch(() => {});
 return false;
 }

 const records = getUserWarnings(message.guild.id, target.id);
 const vars = {
 targetMention: `<@${target.id}>`,
 target: target.user?.tag || target.user?.username || target.id,
 targetId: target.id,
 count: String(records.length)
 };
 const text = applyTemplate(node.data?.output || '{targetMention} warning count: **{count}**.', vars);

 await message.channel.send(text).catch(() => {});
 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = (node.data?.command || 'warnings').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const output = (node.data?.output || '{targetMention} warning count: **{count}**.')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');

 return `
// Warnings
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 const _ws = globalThis.__warningsStore -= new Map();
 const _wg = _ws.get(message.guild.id) || new Map();
 _ws.set(message.guild.id, _wg);
 const _after = message.content.slice("${cmd}".length).trim();
 const _first = (_after.split(/\\s+/).filter(Boolean)[0] || "");
 const _id = (_first.replace(/[<@!>]/g, "") || message.mentions.members?.first()?.id || "");
 if (!/^\\d{17,20}$/.test(_id)) {
 message.reply(\`Usage: \\\`${cmd} @user\\\`\`).catch(() => {});
 } else {
 const _arr = _wg.get(_id) || [];
 const _v = { targetMention: \`<@\${_id}>\`, count: String(_arr.length) };
 const _ap = (t) => t.replace(/\\{(\\w+)\\}/g, (m, k) => _v[k] - m);
 message.channel.send(_ap(\`${output}\`)).catch(() => {});
 }
}
`;
 },
 },
 },
};
