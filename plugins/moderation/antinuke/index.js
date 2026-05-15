'use strict';

const {
 ActionRowBuilder,
 AuditLogEvent,
 ButtonBuilder,
 ButtonStyle,
 ChannelType,
 EmbedBuilder,
 PermissionFlagsBits,
} = require('discord.js');

const guildState = new Map();
const attachedClients = new WeakSet();

const FEATURE_DEFS = [
 ['antiBan', 'Anti Ban'],
 ['antiUnban', 'Anti Unban'],
 ['antiKick', 'Anti Kick'],
 ['antiBotAdd', 'Anti Bot Add'],
 ['antiChannelCreate', 'Anti Channel Create'],
 ['antiChannelDelete', 'Anti Channel Delete'],
 ['antiChannelUpdate', 'Anti Channel Update'],
 ['antiRoleCreate', 'Anti Role Create'],
 ['antiRoleDelete', 'Anti Role Delete'],
 ['antiRoleUpdate', 'Anti Role Update'],
 ['antiMemberUpdate', 'Anti Member Update'],
 ['antiEmojiStickerCreate', 'Anti Emoji/Sticker Create'],
 ['antiEmojiStickerDelete', 'Anti Emoji/Sticker Delete'],
 ['antiEmojiStickerUpdate', 'Anti Emoji/Sticker Update'],
 ['antiEveryoneHerePing', 'Anti Everyone/Here Ping'],
 ['antiRolePing', 'Anti Role Ping'],
 ['antiIntegration', 'Anti Integration'],
 ['antiGuildUpdate', 'Anti Guild Update'],
 ['antiWebhookCreate', 'Anti Webhook Create'],
 ['antiWebhookDelete', 'Anti Webhook Delete'],
 ['antiWebhookUpdate', 'Anti Webhook Update'],
 ['antiLinkRole', 'Anti Link Role'],
 ['antiInviteRole', 'Anti Invite Role'],
 ['autoRecovery', 'Auto Recovery'],
];

const AUDIT_MAP = {
 guildBanAdd: ['antiBan', AuditLogEvent.MemberBanAdd, 'ban'],
 guildBanRemove: ['antiUnban', AuditLogEvent.MemberBanRemove, 'unban'],
 channelCreate: ['antiChannelCreate', AuditLogEvent.ChannelCreate, 'channel create'],
 channelDelete: ['antiChannelDelete', AuditLogEvent.ChannelDelete, 'channel delete'],
 channelUpdate: ['antiChannelUpdate', AuditLogEvent.ChannelUpdate, 'channel update'],
 roleCreate: ['antiRoleCreate', AuditLogEvent.RoleCreate, 'role create'],
 roleDelete: ['antiRoleDelete', AuditLogEvent.RoleDelete, 'role delete'],
 roleUpdate: ['antiRoleUpdate', AuditLogEvent.RoleUpdate, 'role update'],
 guildMemberUpdate: ['antiMemberUpdate', AuditLogEvent.MemberUpdate, 'member update'],
 emojiCreate: ['antiEmojiStickerCreate', AuditLogEvent.EmojiCreate, 'emoji create'],
 emojiDelete: ['antiEmojiStickerDelete', AuditLogEvent.EmojiDelete, 'emoji delete'],
 emojiUpdate: ['antiEmojiStickerUpdate', AuditLogEvent.EmojiUpdate, 'emoji update'],
 stickerCreate: ['antiEmojiStickerCreate', AuditLogEvent.StickerCreate, 'sticker create'],
 stickerDelete: ['antiEmojiStickerDelete', AuditLogEvent.StickerDelete, 'sticker delete'],
 stickerUpdate: ['antiEmojiStickerUpdate', AuditLogEvent.StickerUpdate, 'sticker update'],
 guildUpdate: ['antiGuildUpdate', AuditLogEvent.GuildUpdate, 'guild update'],
 webhookUpdate: ['antiWebhookUpdate', AuditLogEvent.WebhookUpdate, 'webhook update'],
 integrationCreate: ['antiIntegration', AuditLogEvent.IntegrationCreate, 'integration create'],
 integrationDelete: ['antiIntegration', AuditLogEvent.IntegrationDelete, 'integration delete'],
 integrationUpdate: ['antiIntegration', AuditLogEvent.IntegrationUpdate, 'integration update'],
};

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'antinuke').trim() || 'antinuke';
 const effectivePrefix = String(prefix || '!');
 return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function splitCsv(value) {
 return String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
}

function matchCommand(content, commands) {
 const text = String(content || '').trim();
 for (const command of commands) {
 const cmd = String(command || '').trim();
 if (!cmd) continue;
 if (!text.toLowerCase().startsWith(cmd.toLowerCase())) continue;
 const rest = text.slice(cmd.length);
 if (!rest || /^\s/.test(rest)) return { cmd, rawArgs: rest.trim() };
 }
 return null;
}

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
 );
}

function colorOf(data) {
 const parsed = parseInt(String(data.embedColor || '#3B82F6').replace('#', ''), 16);
 return Number.isFinite(parsed) ? parsed : 0x3B82F6;
}

function getState(guildId, data) {
 const current = guildState.get(guildId);
 if (current) return current;
 const state = { enabled: data.enabledByDefault === true };
 guildState.set(guildId, state);
 return state;
}

function varsFor(guild, data, extra = {}) {
 return {
 server: guild?.name || 'Server',
 serverId: guild?.id || '',
 status: getState(guild?.id || 'global', data).enabled ? (data.enabledText || 'Enabled') : (data.disabledText || 'Disabled'),
 punishment: data.punishment || 'remove_roles',
 action: '',
 executor: 'Unknown',
 executorId: '0',
 executorMention: '@Unknown',
 error: '',
 ...extra,
 };
}

function featuresText(data) {
 const tick = data.tickText || '✓';
 const cross = data.crossText || '✕';
 const lines = FEATURE_DEFS.map(([key, label]) => `${label}: ${data[key] === false ? cross : tick}`);
 return `${lines.slice(0, 21).join('\n')}\n\n${lines.slice(21).join('\n')}`;
}

function panelEmbed(guild, data) {
 const vars = varsFor(guild, data);
 return new EmbedBuilder()
 .setColor(colorOf(data))
 .setTitle(applyTemplate(data.panelTitle || 'Configure Antinuke', vars))
 .setDescription([
 applyTemplate(data.panelDescription || 'Prevent harmful activities with active monitoring.', vars),
 '',
 applyTemplate(data.statusLine || 'Current Status: {status}', vars),
 ].join('\n'))
 .setFooter({ text: applyTemplate(data.featuresFooter || 'Powered by Kiodium Development', vars) });
}

function featuresEmbed(guild, data) {
 const vars = varsFor(guild, data);
 return new EmbedBuilder()
 .setColor(colorOf(data))
 .setTitle(applyTemplate(data.featuresTitle || 'Antinuke Features Enabled', vars))
 .setDescription(featuresText(data))
 .setFooter({ text: applyTemplate(data.featuresFooter || 'Powered by Kiodium Development', vars) });
}

function panelRows(data, nonce) {
 return [
 new ActionRowBuilder().addComponents(
 new ButtonBuilder().setCustomId(`antinuke:${nonce}:enable`).setLabel(String(data.enableButtonLabel || 'Enable').slice(0, 80)).setStyle(ButtonStyle.Success),
 new ButtonBuilder().setCustomId(`antinuke:${nonce}:disable`).setLabel(String(data.disableButtonLabel || 'Disable').slice(0, 80)).setStyle(ButtonStyle.Danger),
 new ButtonBuilder().setCustomId(`antinuke:${nonce}:features`).setLabel(String(data.featuresButtonLabel || 'Features').slice(0, 80)).setStyle(ButtonStyle.Primary)
 ),
 ];
}

function backRows(data, nonce) {
 return [
 new ActionRowBuilder().addComponents(
 new ButtonBuilder().setCustomId(`antinuke:${nonce}:back`).setLabel(String(data.backButtonLabel || 'Back').slice(0, 80)).setStyle(ButtonStyle.Secondary)
 ),
 ];
}

function isWhitelisted(member, data) {
 if (!member) return true;
 if (member.id === member.guild?.ownerId) return true;
 if (member.id === member.client?.user?.id) return true;
 const users = new Set(splitCsv(data.whitelistUserIds));
 if (users.has(member.id)) return true;
 const roles = new Set(splitCsv(data.whitelistRoleIds));
 return member.roles?.cache?.some((role) => roles.has(role.id)) || false;
}

async function fetchExecutor(guild, auditType, targetId) {
 if (!guild?.members?.me?.permissions?.has(PermissionFlagsBits.ViewAuditLog)) return null;
 const logs = await guild.fetchAuditLogs({ type: auditType, limit: 5 }).catch(() => null);
 const entry = logs?.entries?.find((item) => {
 const fresh = Date.now() - item.createdTimestamp < 15000;
 const matchesTarget = !targetId || item.target?.id === targetId;
 return fresh && matchesTarget;
 }) || logs?.entries?.first();
 return entry?.executor || null;
}

async function punish(guild, user, data, reason) {
 const member = await guild.members.fetch(user.id).catch(() => null);
 if (!member || isWhitelisted(member, data)) return 'skipped';
 const action = String(data.punishment || 'remove_roles').toLowerCase();
 if (action === 'ban' && guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers) && member.bannable) {
 await member.ban({ reason }).catch(() => {});
 return 'ban';
 }
 if (action === 'kick' && guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers) && member.kickable) {
 await member.kick(reason).catch(() => {});
 return 'kick';
 }
 const roles = member.roles.cache.filter((role) => role.id !== guild.id && role.editable);
 if (roles.size) await member.roles.remove([...roles.keys()], reason).catch(() => {});
 return 'remove_roles';
}

async function sendLog(guild, data, text) {
 const channelId = String(data.logChannelId || '').trim();
 const channel = channelId ? await guild.channels.fetch(channelId).catch(() => null) : null;
 if (!channel?.send) return;
 await channel.send({
 embeds: [new EmbedBuilder().setColor(colorOf(data)).setTitle('Antinuke Action').setDescription(text)],
 }).catch(() => {});
}

async function recover(eventName, payload) {
 const item = Array.isArray(payload) ? payload[0] : payload;
 if (!item) return;
 if (eventName === 'channelDelete' && typeof item.clone === 'function') {
 const clone = await item.clone({ reason: 'Antinuke auto recovery' }).catch(() => null);
 if (clone?.setPosition) await clone.setPosition(item.rawPosition - item.position).catch(() => {});
 }
 if (eventName === 'roleDelete' && item.guild?.roles?.create) {
 await item.guild.roles.create({
 name: item.name,
 color: item.color,
 hoist: item.hoist,
 mentionable: item.mentionable,
 permissions: item.permissions,
 reason: 'Antinuke auto recovery',
 }).catch(() => {});
 }
}

async function handleGuard(eventName, data, args) {
 if (eventName === 'webhookUpdate') {
 const channel = args[0];
 const guild = channel?.guild;
 if (!guild?.id || !getState(guild.id, data).enabled) return;
 const webhookChecks = [
 ['antiWebhookCreate', AuditLogEvent.WebhookCreate, 'webhook create'],
 ['antiWebhookDelete', AuditLogEvent.WebhookDelete, 'webhook delete'],
 ['antiWebhookUpdate', AuditLogEvent.WebhookUpdate, 'webhook update'],
 ];
 for (const [featureKey, auditType, actionName] of webhookChecks) {
 if (data[featureKey] === false) continue;
 const executor = await fetchExecutor(guild, auditType);
 if (!executor) continue;
 const member = await guild.members.fetch(executor.id).catch(() => null);
 if (isWhitelisted(member, data)) continue;
 const punishment = await punish(guild, executor, data, `Antinuke blocked ${actionName}`);
 const vars = varsFor(guild, data, {
 action: actionName,
 executor: executor.tag || executor.username,
 executorId: executor.id,
 executorMention: `<@${executor.id}>`,
 punishment,
 });
 await sendLog(guild, data, applyTemplate(data.blockedMessage || 'Antinuke blocked {action} by {executorMention}. Punishment: {punishment}.', vars));
 break;
 }
 return;
 }
 const [featureKey, auditType, actionName] = AUDIT_MAP[eventName] || [];
 if (!featureKey || data[featureKey] === false) return;
 const target = eventName.endsWith('Update') ? (args[1] || args[0]) : args[0];
 const guild = target?.guild || target;
 if (!guild?.id) return;
 if (!getState(guild.id, data).enabled) return;
 const targetId = target?.id;
 const executor = await fetchExecutor(guild, auditType, targetId);
 if (!executor) return;
 const member = await guild.members.fetch(executor.id).catch(() => null);
 if (isWhitelisted(member, data)) return;
 const reason = `Antinuke blocked ${actionName}`;
 const punishment = await punish(guild, executor, data, reason);
 if (data.autoRecovery !== false) await recover(eventName, args);
 const vars = varsFor(guild, data, {
 action: actionName,
 executor: executor.tag || executor.username,
 executorId: executor.id,
 executorMention: `<@${executor.id}>`,
 punishment,
 });
 await sendLog(guild, data, applyTemplate(data.blockedMessage || 'Antinuke blocked {action} by {executorMention}. Punishment: {punishment}.', vars));
}

async function handleKick(oldMember, data) {
 const guild = oldMember?.guild;
 if (!guild?.id || data.antiKick === false || !getState(guild.id, data).enabled) return;
 const executor = await fetchExecutor(guild, AuditLogEvent.MemberKick, oldMember.id);
 if (!executor) return;
 const member = await guild.members.fetch(executor.id).catch(() => null);
 if (isWhitelisted(member, data)) return;
 const punishment = await punish(guild, executor, data, 'Antinuke blocked kick');
 const vars = varsFor(guild, data, {
 action: 'kick',
 executor: executor.tag || executor.username,
 executorId: executor.id,
 executorMention: `<@${executor.id}>`,
 punishment,
 });
 await sendLog(guild, data, applyTemplate(data.blockedMessage || 'Antinuke blocked {action} by {executorMention}. Punishment: {punishment}.', vars));
}

async function handleMessage(message, data) {
 if (!message?.guild || message.author?.bot) return;
 if (!getState(message.guild.id, data).enabled) return;
 if (isWhitelisted(message.member, data)) return;
 const everyonePing = data.antiEveryoneHerePing !== false && (message.mentions.everyone || /@(everyone|here)\b/i.test(message.content || ''));
 const rolePing = data.antiRolePing !== false && message.mentions.roles?.size > 0;
 const invite = data.antiInviteRole !== false && /(discord\.gg\/|discord\.com\/invite\/)/i.test(message.content || '');
 const link = data.antiLinkRole !== false && /https?:\/\/\S+/i.test(message.content || '');
 if (!everyonePing && !rolePing && !invite && !link) return;
 if (data.deleteTriggerMessage !== false) await message.delete().catch(() => {});
 const action = everyonePing ? 'everyone/here ping' : rolePing ? 'role ping' : invite ? 'invite link' : 'link';
 const punishment = await punish(message.guild, message.author, data, `Antinuke blocked ${action}`);
 const vars = varsFor(message.guild, data, {
 action,
 executor: message.author.tag || message.author.username,
 executorId: message.author.id,
 executorMention: `<@${message.author.id}>`,
 punishment,
 });
 await sendLog(message.guild, data, applyTemplate(data.blockedMessage || 'Antinuke blocked {action} by {executorMention}. Punishment: {punishment}.', vars));
}

function attachRuntime(client, getNodes) {
 if (!client || attachedClients.has(client)) return;
 attachedClients.add(client);
 for (const eventName of Object.keys(AUDIT_MAP)) {
 client.on(eventName, async (...args) => {
 for (const node of getNodes()) await handleGuard(eventName, node.data || {}, args);
 });
 }
 client.on('guildMemberRemove', async (member) => {
 for (const node of getNodes()) await handleKick(member, node.data || {});
 });
 client.on('guildMemberAdd', async (member) => {
 if (!member.user?.bot) return;
 for (const node of getNodes()) {
 const data = node.data || {};
 if (data.antiBotAdd === false || !getState(member.guild.id, data).enabled) continue;
 const executor = await fetchExecutor(member.guild, AuditLogEvent.BotAdd, member.id);
 if (!executor) continue;
 const executorMember = await member.guild.members.fetch(executor.id).catch(() => null);
 if (isWhitelisted(executorMember, data)) continue;
 const punishment = await punish(member.guild, executor, data, 'Antinuke blocked bot add');
 await member.kick('Antinuke blocked bot add').catch(() => {});
 await sendLog(member.guild, data, applyTemplate(data.blockedMessage || 'Antinuke blocked {action} by {executorMention}. Punishment: {punishment}.', varsFor(member.guild, data, {
 action: 'bot add',
 executor: executor.tag || executor.username,
 executorId: executor.id,
 executorMention: `<@${executor.id}>`,
 punishment,
 })));
 }
 });
 client.on('messageCreate', async (message) => {
 for (const node of getNodes()) await handleMessage(message, node.data || {});
 });
}

const runtimeNodes = new Map();
let runtimeClient = null;

module.exports = {
 meta: {
 name: 'Anti Nuke',
 version: '1.0.0',
 author: 'Kiodium',
 description: 'Protect the server from raid and nuke actions.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 moderation_antinuke: {
 label: 'Anti Nuke',
 icon: 'AN',
 color: '#3B82F6',
 description: 'Configure and run antinuke protection.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'antinuke', required: true },
 aliases: { type: 'string', default: 'an,antinukeconfig' },
 embedEnabled: { type: 'boolean', default: true },
 embedColor: { type: 'string', default: '#3B82F6' },
 enabledByDefault: { type: 'boolean', default: false },
 punishment: { type: 'string', default: 'remove_roles' },
 deleteTriggerMessage: { type: 'boolean', default: true },
 autoRecovery: { type: 'boolean', default: true },
 logChannelId: { type: 'string', default: '' },
 whitelistUserIds: { type: 'string', default: '' },
 whitelistRoleIds: { type: 'string', default: '' },
 tickText: { type: 'string', default: '✓' },
 crossText: { type: 'string', default: '✕' },
 panelTitle: { type: 'string', default: 'Configure Antinuke' },
 panelDescription: { type: 'string', default: 'Prevent harmful activities with active monitoring.' },
 statusLine: { type: 'string', default: 'Current Status: {status}' },
 featuresTitle: { type: 'string', default: 'Antinuke Features Enabled' },
 featuresFooter: { type: 'string', default: 'Powered by Kiodium Development' },
 enabledText: { type: 'string', default: 'Enabled' },
 disabledText: { type: 'string', default: 'Disabled' },
 enableButtonLabel: { type: 'string', default: 'Enable' },
 disableButtonLabel: { type: 'string', default: 'Disable' },
 featuresButtonLabel: { type: 'string', default: 'Features' },
 backButtonLabel: { type: 'string', default: 'Back' },
 enabledMessage: { type: 'string', default: 'Antinuke is now enabled.' },
 disabledMessage: { type: 'string', default: 'Antinuke is now disabled.' },
 permissionMessage: { type: 'string', default: 'You need Administrator permission to configure antinuke.' },
 botPermissionMessage: { type: 'string', default: 'I need Administrator permission to protect this server.' },
 blockedMessage: { type: 'string', default: 'Antinuke blocked {action} by {executorMention}. Punishment: {punishment}.' },
 errorMessage: { type: 'string', default: 'Antinuke error: {error}' },
 antiBan: { type: 'boolean', default: true },
 antiUnban: { type: 'boolean', default: true },
 antiKick: { type: 'boolean', default: true },
 antiBotAdd: { type: 'boolean', default: true },
 antiChannelCreate: { type: 'boolean', default: true },
 antiChannelDelete: { type: 'boolean', default: true },
 antiChannelUpdate: { type: 'boolean', default: true },
 antiRoleCreate: { type: 'boolean', default: true },
 antiRoleDelete: { type: 'boolean', default: true },
 antiRoleUpdate: { type: 'boolean', default: true },
 antiMemberUpdate: { type: 'boolean', default: true },
 antiEmojiStickerCreate: { type: 'boolean', default: true },
 antiEmojiStickerDelete: { type: 'boolean', default: true },
 antiEmojiStickerUpdate: { type: 'boolean', default: true },
 antiEveryoneHerePing: { type: 'boolean', default: true },
 antiRolePing: { type: 'boolean', default: true },
 antiIntegration: { type: 'boolean', default: true },
 antiGuildUpdate: { type: 'boolean', default: true },
 antiWebhookCreate: { type: 'boolean', default: true },
 antiWebhookDelete: { type: 'boolean', default: true },
 antiWebhookUpdate: { type: 'boolean', default: true },
 antiLinkRole: { type: 'boolean', default: true },
 antiInviteRole: { type: 'boolean', default: true },
 },

 async initProject({ node, client }) {
 if (runtimeClient !== client) {
 runtimeNodes.clear();
 runtimeClient = client;
 }
 runtimeNodes.set(node.id, node);
 attachRuntime(client, () => [...runtimeNodes.values()]);
 },

 async execute(node, message, ctx) {
 if (!message || !message.guild || message.author?.bot) return false;
 const data = node.data || {};
 runtimeNodes.set(node.id, node);
 const prefix = ctx?.prefix || '!';
 const commands = [
 commandWithPrefix(data.command, prefix),
 ...splitCsv(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
 ];
 const matched = matchCommand(message.content, commands);
 if (!matched) return false;

 if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
 await message.reply(applyTemplate(data.permissionMessage || 'You need Administrator permission to configure antinuke.', varsFor(message.guild, data))).catch(() => {});
 return true;
 }
 if (!message.guild.members.me?.permissions.has(PermissionFlagsBits.Administrator)) {
 await message.reply(applyTemplate(data.botPermissionMessage || 'I need Administrator permission to protect this server.', varsFor(message.guild, data))).catch(() => {});
 return true;
 }

 const state = getState(message.guild.id, data);
 const arg = matched.rawArgs.toLowerCase();
 if (arg === 'enable') {
 state.enabled = true;
 await message.reply(applyTemplate(data.enabledMessage || 'Antinuke is now enabled.', varsFor(message.guild, data))).catch(() => {});
 return true;
 }
 if (arg === 'disable') {
 state.enabled = false;
 await message.reply(applyTemplate(data.disabledMessage || 'Antinuke is now disabled.', varsFor(message.guild, data))).catch(() => {});
 return true;
 }
 if (arg === 'features') {
 await message.channel.send({ embeds: [featuresEmbed(message.guild, data)] }).catch(() => {});
 return true;
 }

 const nonce = `${message.id}:${node.id}`;
 const sent = await message.channel.send({
 embeds: [panelEmbed(message.guild, data)],
 components: panelRows(data, nonce),
 }).catch(() => null);
 if (!sent?.createMessageComponentCollector) return true;
 const collector = sent.createMessageComponentCollector({ time: 300000 });
 collector.on('collect', async (interaction) => {
 if (interaction.user.id !== message.author.id) {
 await interaction.reply({ content: 'Only the command author can use this panel.', ephemeral: true }).catch(() => {});
 return;
 }
 const action = interaction.customId.split(':').pop();
 if (action === 'enable') state.enabled = true;
 if (action === 'disable') state.enabled = false;
 if (action === 'features') {
 await interaction.update({ embeds: [featuresEmbed(message.guild, data)], components: backRows(data, nonce) }).catch(() => {});
 return;
 }
 await interaction.update({ embeds: [panelEmbed(message.guild, data)], components: panelRows(data, nonce) }).catch(() => {});
 });
 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = String(node.data?.command || 'antinuke').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `// Anti Nuke command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 message.channel.send("Anti Nuke runs through the Kiodium plugin runtime with event monitoring.");
}`;
 },
 },
 },
};
