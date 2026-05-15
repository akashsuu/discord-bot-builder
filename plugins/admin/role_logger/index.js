'use strict';

module.exports = {
 nodes: {
 role_logger: {
 async execute(node, eventData, ctx) {
 const role = eventData;
 if (!role || !role.guild) return false;

 const channel = role.guild.systemChannel;
 if (!channel) return false;

 const template = node.data.output || '🎭 Role **{role}** was created in {server}!';
 const text = template
 .replace(/\{role\}/g, role.name)
 .replace(/\{server\}/g, role.guild.name)
 .replace(/\{color\}/g, role.hexColor || '#000000');

 if (node.data.embedEnabled) {
 const embed = ctx.buildEmbed(node.data, text);
 await channel.send({ embeds: [embed] });
 } else {
 await channel.send(text);
 }
 return true;
 },

 generateCode(node) {
 const tpl = (node.data.output || '🎭 Role **{role}** was created in {server}!')
 .replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 return `
// ── Role Logger ──────────────────────────────────────
const _rChan = role.guild?.systemChannel;
if (_rChan) {
 const _msg = \`${tpl}\`
 .replace(/\\{role\\}/g, role.name)
 .replace(/\\{server\\}/g, role.guild.name)
 .replace(/\\{color\\}/g, role.hexColor || '#000000');
 _rChan.send(_msg);
}
`;
 },
 },
 },
};
