'use strict';

module.exports = {
 nodes: {
 ping_command: {
 async execute(node, message, ctx) {
 const prefix = ctx?.prefix || '';
 const rawCmd = (node.data.command || 'ping').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 if (message.content.trim().toLowerCase() !== cmd.toLowerCase()) return false;

 const latency = Date.now() - message.createdTimestamp;
 const template = node.data.output || '🏓 Pong! Latency: {latency}ms';
 const text = template
 .replace(/\{latency\}/g, latency)
 .replace(/\{command\}/g, cmd)
 .replace(/\{user\}/g, message.author.username);

 if (ctx && ctx.sendEmbed) {
 await ctx.sendEmbed(message, node.data, text);
 } else {
 await message.channel.send(text);
 }
 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = (node.data.command || 'ping').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const tpl = (node.data.output || '🏓 Pong! Latency: {latency}ms')
 .replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 return `
// ── Ping Command ──────────────────────────────────
if (message.content.trim().toLowerCase() === "${cmd}".toLowerCase()) {
 const _lat = Date.now() - message.createdTimestamp;
 const _msg = \`${tpl}\`
 .replace(/\\{latency\\}/g, _lat)
 .replace(/\\{command\\}/g, "${cmd}")
 .replace(/\\{user\\}/g, message.author.username);
 message.channel.send(_msg);
}
`;
 },
 },
 },
};
