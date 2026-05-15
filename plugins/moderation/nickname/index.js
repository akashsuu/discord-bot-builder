'use strict';

const { PermissionFlagsBits } = require('discord.js');

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

function buildVars(message, target, nickname) {
 return {
 mention: `<@${message.author?.id || '0'}>`,
 user: message.author?.username || 'Unknown',
 target: target.user?.tag || target.user?.username || 'Unknown',
 targetMention: `<@${target.user?.id || '0'}>`,
 nickname: nickname || target.displayName || target.user?.username || 'Unknown',
 server: message.guild?.name || 'Unknown'
 };
}

module.exports = {
 meta: {
 name: 'Nickname',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Changes a mentioned user nickname.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_nickname: {
 label: 'Nickname',
 icon: 'NICK',
 color: '#0F766E',
 description: 'Prefix command to set/reset nickname. Usage: nickname @user <new name> or nickname @user reset',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'nickname', required: true },
 allowReset: { type: 'boolean', default: true, required: false },
 output: {
 type: 'string',
 default: '{mention} changed nickname of {targetMention} to **{nickname}**.',
 required: false
 },
 resetOutput: {
 type: 'string',
 default: '{mention} reset nickname of {targetMention}.',
 required: false
 },
 },

 async execute(ctx) {
 const { node, message, prefix } = ctx;
 if (!message || !message.guild || message.author?.bot) return false;

 const rawCmd = (node.data?.command || 'nickname').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
 await message.reply('I need Manage Nicknames permission.').catch(() => {});
 return false;
 }
 if (!message.member?.permissions.has(PermissionFlagsBits.ManageNicknames)) {
 await message.reply('You need Manage Nicknames permission.').catch(() => {});
 return false;
 }

 const target = message.mentions.members?.first() || null;
 if (!target) {
 await message.reply(`Usage: \`${cmd} @user <new nickname>\` or \`${cmd} @user reset\``).catch(() => {});
 return false;
 }

 if (target.id === message.client.user.id) {
 await message.reply('I cannot change my own nickname with this command.').catch(() => {});
 return false;
 }
 if (!target.manageable) {
 await message.reply('I cannot change that user nickname (role may be higher than mine).').catch(() => {});
 return false;
 }

 const afterCmd = message.content.slice(cmd.length).trim();
 const nickRaw = afterCmd.replace(/<@!?\d+>/, '').trim();
 if (!nickRaw) {
 await message.reply(`Usage: \`${cmd} @user <new nickname>\` or \`${cmd} @user reset\``).catch(() => {});
 return false;
 }

 const isReset = /^(reset|clear|remove|null)$/i.test(nickRaw);
 if (isReset && node.data?.allowReset === false) {
 await message.reply('Nickname reset is disabled in this node.').catch(() => {});
 return false;
 }

 const newNick = isReset ? null : nickRaw.slice(0, 32);

 try {
 await target.setNickname(newNick, `Nickname changed by ${message.author.tag}`);
 } catch (err) {
 await message.reply(`Failed to change nickname: ${err.message}`).catch(() => {});
 return false;
 }

 const vars = buildVars(message, target, newNick);
 const tpl = isReset
 ? (node.data?.resetOutput || '{mention} reset nickname of {targetMention}.')
 : (node.data?.output || '{mention} changed nickname of {targetMention} to **{nickname}**.');
 const text = applyTemplate(tpl, vars);

 try {
 if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, text);
 else await message.channel.send(text);
 } catch {
 await message.channel.send(text).catch(() => {});
 }

 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = (node.data?.command || 'nickname').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const allowReset = node.data?.allowReset !== false;
 const output = (node.data?.output || '{mention} changed nickname of {targetMention} to **{nickname}**.')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');
 const resetOutput = (node.data?.resetOutput || '{mention} reset nickname of {targetMention}.')
 .replace(/\\/g, '\\\\')
 .replace(/`/g, '\\`');

 return `
// Nickname
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 const _nn_target = message.mentions.members?.first();
 if (!_nn_target) {
 message.reply(\`Usage: \\\`${cmd} @user <new nickname>\\\` or \\\`${cmd} @user reset\\\`\`).catch(() => {});
 } else {
 const _nn_after = message.content.slice("${cmd}".length).trim();
 const _nn_raw = _nn_after.replace(/<@!?\\d+>/, "").trim();
 const _nn_reset = /^(reset|clear|remove|null)$/i.test(_nn_raw);
 const _nn_new = _nn_reset ? null : _nn_raw.slice(0, 32);
 if (!_nn_raw) {
 message.reply(\`Usage: \\\`${cmd} @user <new nickname>\\\` or \\\`${cmd} @user reset\\\`\`).catch(() => {});
 } else if (${allowReset ? 'false' : '_nn_reset'}) {
 message.reply("Nickname reset is disabled in this node.").catch(() => {});
 } else {
 _nn_target.setNickname(_nn_new, \`Nickname changed by \${message.author.tag}\`).then(() => {
 const _nn_vars = {
 mention: \`<@\${message.author?.id}>\`,
 targetMention: \`<@\${_nn_target.user?.id}>\`,
 nickname: _nn_new || _nn_target.displayName || _nn_target.user?.username
 };
 const _nn_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _nn_vars[k] - m);
 message.channel.send(_nn_apply(_nn_reset ? \`${resetOutput}\` : \`${output}\`)).catch(() => {});
 }).catch((e) => message.reply(\`Failed to change nickname: \${e.message}\`).catch(() => {}));
 }
 }
}
`;
 },
 },
 },
};
