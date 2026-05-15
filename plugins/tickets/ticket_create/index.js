'use strict';

/**
 * ticket_create/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles the interactionCreate event for ticket panel buttons AND the dropdown.
 *
 * CustomId patterns handled:
 * ticket:create:<category> — button
 * ticket:panel:select — dropdown (value = category)
 *
 * Flow:
 * 1. Defer reply ephemerally
 * 2. Duplicate-ticket guard
 * 3. Create channel with permission overwrites
 * 4. Send welcome embed with Claim + Close buttons
 * 5. Persist ticket data
 * 6. Send log embed
 */

const path = require('path');
const {
 ChannelType,
 ActionRowBuilder,
 ButtonBuilder,
 ButtonStyle,
 EmbedBuilder,
 PermissionFlagsBits,
} = require('discord.js');

const ticketHelper = require(path.join(__dirname, '..', 'helpers', 'tickets.js'));
const permHelper = require(path.join(__dirname, '..', 'helpers', 'permissions.js'));
const logHelper = require(path.join(__dirname, '..', 'helpers', 'logger.js'));
const { applyCommonEmbedOptions } = require(path.join(__dirname, '..', 'helpers', 'embeds.js'));

// ── Template processor ────────────────────────────────────────────────────────
function applyTemplate(str, vars) {
 return String(str || '').replace(/\{(\w+)\}/g, (m, k) =>
 Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m
 );
}

// ── Channel name generator ────────────────────────────────────────────────────
function buildChannelName(format, username, ticketId, category) {
 const fmt = String(format || 'ticket-{username}');
 const name = applyTemplate(fmt, {
 username: username.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20),
 ticketId,
 category: category.toLowerCase(),
 });
 return name.slice(0, 100).replace(/--+/g, '-');
}

// ── Welcome embed builder ─────────────────────────────────────────────────────
function buildWelcomeEmbed(data, ticket, member) {
 const vars = {
 user: member.user.username,
 mention: `<@${member.user.id}>`,
 category: ticket.category,
 ticketId: ticket.ticketId,
 priority: ticket.priority,
 };
 const color = parseInt((data.embedColor || '#5865F2').replace('#', ''), 16);

 const embed = new EmbedBuilder()
 .setColor(isNaN(color) ? 0x5865F2 : color)
 .setTitle(applyTemplate(data.welcomeTitle || '🎫 Ticket Opened', vars))
 .setDescription(applyTemplate(
 data.welcomeDescription ||
 'Hello {user}! A staff member will assist you shortly.',
 vars
 ))
 .setThumbnail(member.user.displayAvatarURL({ size: 64 }))
 .addFields(
 { name: '👤 Owner', value: `<@${member.user.id}>`, inline: true },
 { name: '📂 Category', value: ticket.category, inline: true },
 { name: '⚡ Priority', value: ticket.priority, inline: true },
 )
 .setFooter({ text: applyTemplate(data.embedFooter || 'Ticket • {ticketId}', vars) })
 .setTimestamp();
 return applyCommonEmbedOptions(embed, { ...data, embedFooter: data.embedFooter || 'Ticket • {ticketId}' }, vars);
}

// ── Action buttons for the welcome message ────────────────────────────────────
function buildActionRow(claimEnabled, ticketId) {
 const buttons = [
 new ButtonBuilder()
 .setCustomId(`ticket:close:${ticketId}`)
 .setLabel('🔒 Close Ticket')
 .setStyle(ButtonStyle.Danger),
 ];

 if (claimEnabled) {
 buttons.unshift(
 new ButtonBuilder()
 .setCustomId(`ticket:claim:${ticketId}`)
 .setLabel('✋ Claim')
 .setStyle(ButtonStyle.Success)
 );
 }

 return new ActionRowBuilder().addComponents(buttons);
}

module.exports = {
 meta: {
 name: 'Ticket Create',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Creates a ticket channel when user interacts with the panel.',
 engineVersion: '>=1.0.0',
 },

 /**
 * onLoad — register the global interactionCreate handler.
 * WHY onLoad: The ticket:create:* interactions come from panel messages
 * posted at any time, not from a specific graph execution. We need a
 * persistent event listener attached once at startup.
 */
 onLoad(safeAPI) {
 // safeAPI may be null if no client connected yet — guard is in the listener
 if (!safeAPI?.client) return;
 this._attachInteractionHandler(safeAPI.client);
 },

 _nodeData: null, // populated by execute() call so onLoad can access node.data
 _client: null,

 _attachInteractionHandler(client) {
 if (this._attached) return;
 this._attached = true;

 client.on('interactionCreate', async (interaction) => {
 // ── Button: ticket:create:<category> ────────────────────────────────
 if (interaction.isButton() && interaction.customId.startsWith('ticket:create:')) {
 const category = interaction.customId.split(':')[2];
 await this._handleCreate(interaction, category);
 return;
 }

 // ── Dropdown: ticket:panel:select ────────────────────────────────────
 if (interaction.isStringSelectMenu() && interaction.customId === 'ticket:panel:select') {
 const category = interaction.values[0];
 await this._handleCreate(interaction, category);
 }
 });
 },

 async _handleCreate(interaction, category) {
 const data = this._nodeData || {};

 try {
 await interaction.deferReply({ ephemeral: true });
 } catch { return; }

 const { guild, member, user } = interaction;
 if (!guild) {
 return interaction.editReply({ content: '❌ Cannot create tickets in DMs.' }).catch(() => {});
 }

 // ── Duplicate guard ──────────────────────────────────────────────────────
 const maxPerUser = Number(data.maxTicketsPerUser - 1);
 const existing = ticketHelper.getTicketByOwner(guild.id, user.id, maxPerUser > 1 ? category : null);
 if (existing) {
 const chan = guild.channels.cache.get(existing.channelId);
 const ref = chan ? `<#${chan.id}>` : `\`${existing.ticketId}\``;
 return interaction.editReply({
 content: `❌ You already have an open ticket: ${ref}`,
 }).catch(() => {});
 }

 // ── Bot permission check ─────────────────────────────────────────────────
 if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
 return interaction.editReply({ content: '❌ I need **Manage Channels** permission.' }).catch(() => {});
 }

 // ── Generate ticket ID + channel name ────────────────────────────────────
 const allTickets = ticketHelper.loadTickets();
 const ticketNum = ticketHelper.getNextTicketNumber(allTickets);
 const ticketId = `ticket-${ticketNum}`;
 const chanName = buildChannelName(
 data.ticketNamingFormat, user.username, ticketId, category
 );

 // ── Build permission overwrites ──────────────────────────────────────────
 const supportRoleIds = permHelper.parseSupportRoles(data);
 const overwrites = permHelper.buildPermissionOverwrites(guild, user, supportRoleIds);

 // ── Resolve parent category ──────────────────────────────────────────────
 const parentId = data.ticketCategory
 ? guild.channels.cache.get(data.ticketCategory)?.id
 : undefined;

 // ── Create channel ───────────────────────────────────────────────────────
 let channel;
 try {
 channel = await guild.channels.create({
 name: chanName,
 type: ChannelType.GuildText,
 parent: parentId,
 permissionOverwrites: overwrites,
 topic: `Ticket for ${user.tag} | OwnerID: ${user.id} | Category: ${category} | ID: ${ticketId}`,
 });
 } catch (err) {
 return interaction.editReply({
 content: `❌ Failed to create channel: ${err.message}`,
 }).catch(() => {});
 }

 // ── Persist ticket ───────────────────────────────────────────────────────
 const ticket = ticketHelper.createTicket(channel.id, {
 guildId: guild.id,
 ownerId: user.id,
 category,
 ticketId,
 priority: 'normal',
 });

 // ── Send welcome embed ───────────────────────────────────────────────────
 try {
 const embed = buildWelcomeEmbed(data, ticket, member);
 const actions = buildActionRow(data.claimEnabled !== false, ticketId);

 await channel.send({
 content: `<@${user.id}> ${supportRoleIds.map(r => `<@&${r}>`).join(' ')}`,
 embeds: [embed],
 components: [actions],
 });
 } catch { /* non-fatal */ }

 // ── Log creation ────────────────────────────────────────────────────────
 if (interaction.client) {
 await logHelper.sendLog(
 interaction.client,
 data.logChannel,
 'created',
 {
 '👤 User': `<@${user.id}>`,
 '📌 Channel': `<#${channel.id}>`,
 },
 ticket
 );
 }

 await interaction.editReply({
 content: `✅ Your ticket has been created: <#${channel.id}>`,
 }).catch(() => {});
 },

 nodes: {
 ticket_create: {
 label: 'Ticket Create',
 icon: '➕',
 color: '#1A5276',
 description: 'Handles ticket creation from panel interactions.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 welcomeTitle: { type: 'string', default: '🎫 Ticket Opened' },
 welcomeDescription: { type: 'string', default: 'Hello {user}! A staff member will assist you shortly.' },
 embedColor: { type: 'string', default: '#5865F2' },
 embedFooter: { type: 'string', default: 'Ticket • {ticketId}' },
 logoUrl: { type: 'string', default: '' },
 logoName: { type: 'string', default: '' },
 imageUrl: { type: 'string', default: '' },
 ticketNamingFormat: { type: 'string', default: 'ticket-{username}' },
 ticketCategory: { type: 'string', default: '' },
 supportRoles: { type: 'string', default: '' },
 logChannel: { type: 'string', default: '' },
 claimEnabled: { type: 'boolean', default: true },
 maxTicketsPerUser: { type: 'number', default: 1 },
 },

 async execute(node, message, ctx) {
 // Persist node.data so the interaction handler can read it
 const plugin = module.exports;
 plugin._nodeData = node.data || {};

 // Wire client reference if not done via onLoad
 if (message?.client && !plugin._attached) {
 plugin._attachInteractionHandler(message.client);
 }

 return true; // pass-through
 },

 generateCode(node) {
 const data = node.data || {};
 return `
// ── Ticket Create Interaction Handler ─────────────────────────────────────────
// Add inside your client.on('interactionCreate', ...) handler

if (
 (interaction.isButton() && interaction.customId.startsWith('ticket:create:')) ||
 (interaction.isStringSelectMenu() && interaction.customId === 'ticket:panel:select')
) {
 const category = interaction.isButton()
 ? interaction.customId.split(':')[2]
 : interaction.values[0];

 await interaction.deferReply({ ephemeral: true });

 // TODO: duplicate-ticket guard, channel creation, welcome embed
 // See full plugin source: plugins/tickets/ticket_create/index.js
 console.log('[Ticket] Creating ticket for category:', category);
}
`;
 },
 },
 },
};
