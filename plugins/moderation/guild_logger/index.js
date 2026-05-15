'use strict';

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function buildVars(guild, eventType) {
 const now = new Date();
 return {
 event: eventType || 'unknown',
 guild: guild?.name || 'Unknown',
 guildId: guild?.id || '0',
 memberCount: String(guild?.memberCount - 0),
 ownerId: guild?.ownerId || '0',
 date: now.toISOString().slice(0, 10),
 time: now.toTimeString().slice(0, 8),
 };
}

function getTemplateForEvent(nodeData, eventType) {
 if (eventType === 'guildCreate') return nodeData?.outputJoin || 'Joined guild **{guild}** ({guildId}). Members: {memberCount}';
 if (eventType === 'guildDelete') return nodeData?.outputLeave || 'Left guild **{guild}** ({guildId}).';
 if (eventType === 'guildUpdate') return nodeData?.outputUpdate || 'Guild updated: **{guild}** ({guildId}).';
 if (eventType === 'guildAvailable') return nodeData?.outputAvailable || 'Guild is available again: **{guild}** ({guildId}).';
 return nodeData?.output || 'Guild event: {event} in **{guild}** ({guildId})';
}

module.exports = {
 meta: {
 name: 'Guild Logger',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Logs guild events to the system channel.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_guild_logger: {
 label: 'Guild Logger',
 icon: 'GL',
 color: '#1F4B7A',
 description: 'Logs guild join/leave/update/available events to the guild system channel.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 output: {
 type: 'string',
 default: 'Guild event: {event} in **{guild}** ({guildId})',
 required: false
 },
 outputJoin: {
 type: 'string',
 default: 'Joined guild **{guild}** ({guildId}). Members: {memberCount}',
 required: false
 },
 outputLeave: {
 type: 'string',
 default: 'Left guild **{guild}** ({guildId}).',
 required: false
 },
 outputUpdate: {
 type: 'string',
 default: 'Guild updated: **{guild}** ({guildId}).',
 required: false
 },
 outputAvailable: {
 type: 'string',
 default: 'Guild is available again: **{guild}** ({guildId}).',
 required: false
 },
 },

 async execute(ctx) {
 const { node, eventData, eventType } = ctx;
 const guild = eventData;
 if (!guild) return false;

 const logChannel = guild.systemChannel;
 if (!logChannel) return false;

 const tpl = getTemplateForEvent(node.data, eventType);
 const text = applyTemplate(tpl, buildVars(guild, eventType));

 try {
 if (ctx.sendEmbed) await ctx.sendEmbed({ channel: logChannel }, node.data, text);
 else await logChannel.send(text);
 } catch {
 await logChannel.send(text).catch(() => {});
 }

 return true;
 },

 generateCode(node) {
 const output = (node.data?.output || 'Guild event: {event} in **{guild}** ({guildId})')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');
 const outputJoin = (node.data?.outputJoin || 'Joined guild **{guild}** ({guildId}). Members: {memberCount}')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');
 const outputLeave = (node.data?.outputLeave || 'Left guild **{guild}** ({guildId}).')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');
 const outputUpdate = (node.data?.outputUpdate || 'Guild updated: **{guild}** ({guildId}).')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');
 const outputAvailable = (node.data?.outputAvailable || 'Guild is available again: **{guild}** ({guildId}).')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');

 return `
// Guild Logger
{
 const _gl_guild = guild;
 const _gl_chan = _gl_guild?.systemChannel;
 if (_gl_chan) {
 const _gl_event = typeof eventType !== "undefined" ? eventType : "unknown";
 const _gl_tpl =
 _gl_event === "guildCreate" ? \`${outputJoin}\` :
 _gl_event === "guildDelete" ? \`${outputLeave}\` :
 _gl_event === "guildUpdate" ? \`${outputUpdate}\` :
 _gl_event === "guildAvailable" ? \`${outputAvailable}\` :
 \`${output}\`;
 const _gl_vars = {
 event: _gl_event,
 guild: _gl_guild?.name || "Unknown",
 guildId: _gl_guild?.id || "0",
 memberCount: String(_gl_guild?.memberCount - 0),
 ownerId: _gl_guild?.ownerId || "0"
 };
 const _gl_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _gl_vars[k] - m);
 _gl_chan.send(_gl_apply(_gl_tpl)).catch(() => {});
 }
}
`;
 },
 },
 },
};
