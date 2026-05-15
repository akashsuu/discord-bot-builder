'use strict';

module.exports = {
 nodes: {
 channel_logger: {
 async execute(node, eventData, ctx) {
 const channel = eventData;
 if (!channel || !channel.guild) return false;

 const logChannel = channel.guild.systemChannel;
 if (!logChannel) return false;

 const template = node.data.output || '📢 Channel **{channel}** was modified!';
 const text = template.replace(/\{channel\}/g, channel.name || 'unknown');

 if (node.data.embedEnabled) {
 const embed = ctx.buildEmbed(node.data, text);
 await logChannel.send({ embeds: [embed] });
 } else {
 await logChannel.send(text);
 }
 return true;
 },

 generateCode(node) {
 const tpl = (node.data.output || '📢 Channel **{channel}** was modified!')
 .replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 return `
// ── Channel Logger ───────────────────────────────────
const _logChan = channel.guild?.systemChannel;
if (_logChan) {
 const _msg = \`${tpl}\`.replace(/\\{channel\\}/g, channel.name || 'unknown');
 _logChan.send(_msg);
}
`;
 },
 },
 },
};
