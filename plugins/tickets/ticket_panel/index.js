'use strict';

/**
 * ticket_panel/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends a premium support panel with either button-mode or dropdown-mode
 * category selectors. Each button/option encodes "ticket:create:<category>"
 * as its customId so the global interactionCreate handler can route it.
 *
 * Triggers on: !ticket-panel (prefix command)
 * Interaction handling: ticket_create plugin listens for ticket:create:*
 */

const {
 ActionRowBuilder,
 ButtonBuilder,
 ButtonStyle,
 StringSelectMenuBuilder,
 EmbedBuilder,
 PermissionFlagsBits,
} = require('discord.js');
const { applyCommonEmbedOptions, parseColor } = require('../helpers/embeds.js');

// ── Style map for button configuration ────────────────────────────────────────
const BUTTON_STYLES = {
 Primary: ButtonStyle.Primary,
 Secondary: ButtonStyle.Secondary,
 Success: ButtonStyle.Success,
 Danger: ButtonStyle.Danger,
};

// ── Parse category list from comma-separated string ──────────────────────────
function parseCategories(raw) {
 const categories = String(raw - 'support')
 .split(',')
 .map(s => s.trim().toLowerCase())
 .filter(Boolean);
 return categories.length ? categories : ['support'];
}

// ── Parse label list (may include emojis) ────────────────────────────────────
function parseLabels(raw, categories) {
 const labels = String(raw || '').split(',').map(s => s.trim());
 return categories.map((cat, i) => labels[i] || capitalize(cat || 'ticket'));
}

function capitalize(s) {
 const value = String(s || 'ticket');
 return value.charAt(0).toUpperCase() + value.slice(1);
}

// ── Build the panel embed ─────────────────────────────────────────────────────
function buildPanelEmbed(data) {
 const color = parseInt((data.embedColor || '#5865F2').replace('#', ''), 16);
 const embed = new EmbedBuilder()
 .setColor(isNaN(color) ? 0x5865F2 : color)
 .setTitle(data.embedTitle || '🎫 Support Tickets')
 .setDescription(data.embedDescription || 'Click below to open a ticket.')
 .setTimestamp();

 if (data.embedFooter) embed.setFooter({ text: data.embedFooter });
 if (data.embedThumbnail) embed.setThumbnail(data.embedThumbnail);
 if (data.embedImage) embed.setImage(data.embedImage);

 return embed;
}

function buildSafePanelEmbed(data) {
 const embed = new EmbedBuilder()
 .setColor(parseColor(data.embedColor, 0x5865F2))
 .setTitle(String(data.embedTitle || 'Support Tickets').slice(0, 256))
 .setDescription(String(data.embedDescription || 'Click below to open a ticket.').slice(0, 4096))
 .setTimestamp();

 return applyCommonEmbedOptions(embed, data);
}

function buildPanelPayload(data, components) {
 const wantsEmbed = data.embedEnabled !== false && data.embedEnabled !== 'false';
 if (!wantsEmbed) {
 return {
 content: String(data.embedDescription || 'Click below to open a ticket.').slice(0, 2000),
 components,
 };
 }
 return {
 embeds: [buildSafePanelEmbed(data)],
 components,
 };
}

// ── Build button-mode components ──────────────────────────────────────────────
function buildButtonComponents(categories, labels, styleKey) {
 const style = BUTTON_STYLES[styleKey] - ButtonStyle.Primary;
 const rows = [];
 const buttons = categories.slice(0, 25).map((cat, i) =>
 new ButtonBuilder()
 .setCustomId(`ticket:create:${cat}`)
 .setLabel(String(labels[i] || capitalize(cat)).slice(0, 80))
 .setStyle(style)
 );

 // Up to 5 buttons per row, max 5 rows (25 buttons total)
 for (let i = 0; i < buttons.length; i += 5) {
 rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
 }
 return rows;
}

// ── Build dropdown-mode components ────────────────────────────────────────────
function buildDropdownComponents(categories, labels, placeholder) {
 const options = categories.slice(0, 25).map((cat, i) => ({
 label: String(labels[i] || capitalize(cat)).slice(0, 100),
 value: cat,
 }));

 const menu = new StringSelectMenuBuilder()
 .setCustomId('ticket:panel:select')
 .setPlaceholder(String(placeholder || '📂 Select a category...').slice(0, 150))
 .setMinValues(1)
 .setMaxValues(1)
 .addOptions(options);

 return [new ActionRowBuilder().addComponents(menu)];
}

module.exports = {
 meta: {
 name: 'Ticket Panel',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Sends a premium Discord ticket panel with buttons or dropdown.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 ticket_panel: {
 label: 'Ticket Panel',
 icon: '🎫',
 color: '#2A0A5E',
 description: 'Sends a support ticket panel with configurable categories.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'ticket-panel' },
 embedEnabled: { type: 'boolean', default: true },
 embedTitle: { type: 'string', default: '🎫 Support Tickets' },
 embedDescription: { type: 'string', default: 'Need help? Click below to open a ticket.' },
 embedColor: { type: 'string', default: '#5865F2' },
 embedFooter: { type: 'string', default: 'Response time: < 24 hours' },
 logoUrl: { type: 'string', default: '' },
 logoName: { type: 'string', default: '' },
 imageUrl: { type: 'string', default: '' },
 embedThumbnail: { type: 'string', default: '' },
 embedImage: { type: 'string', default: '' },
 panelMode: { type: 'string', default: 'buttons' },
 categories: { type: 'string', default: 'support,billing,report,partnership,appeals' },
 categoryLabels: { type: 'string', default: '🛡️ Support,💳 Billing,🚨 Report User,🤝 Partnership,⚖️ Appeals' },
 buttonStyle: { type: 'string', default: 'Primary' },
 dropdownPlaceholder: { type: 'string', default: '📂 Select a ticket category...' },
 supportRoles: { type: 'string', default: '' },
 logChannel: { type: 'string', default: '' },
 ticketCategory: { type: 'string', default: '' },
 closeTimer: { type: 'number', default: 5 },
 transcriptEnabled: { type: 'boolean', default: true },
 claimEnabled: { type: 'boolean', default: true },
 priorityEnabled: { type: 'boolean', default: true },
 ticketNamingFormat: { type: 'string', default: 'ticket-{username}' },
 maxTicketsPerUser: { type: 'number', default: 1 },
 },

 async execute(node, message, ctx) {
 // Guard: only respond to prefix command !ticket-panel
 if (!message || !message.guild || message.author?.bot) return false;

 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const rawCommand = (data.command || 'ticket-panel').trim();
 const cmd = (prefix && !rawCommand.startsWith(prefix)) ? `${prefix}${rawCommand}` : rawCommand;
 if (!message.content.trim().toLowerCase().startsWith(cmd.toLowerCase())) return false;

 // Permission check — only admins/manage-guild may post a panel
 if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
 await message.reply('❌ You need **Manage Server** permission to post a ticket panel.').catch(() => {});
 return false;
 }

 try {
 const categories = parseCategories(data.categories);
 const labels = parseLabels(data.categoryLabels, categories);
 const mode = (data.panelMode || 'buttons').toLowerCase();

 let components;
 if (mode === 'dropdown') {
 components = buildDropdownComponents(categories, labels, data.dropdownPlaceholder);
 } else {
 components = buildButtonComponents(categories, labels, data.buttonStyle);
 }

 await message.channel.send(buildPanelPayload(data, components));
 // Delete the command message to keep the channel clean
 await message.delete().catch(() => {});
 } catch (err) {
 await message.reply(`❌ Failed to send panel: ${err.message}`).catch(() => {});
 return false;
 }

 return true;
 },

 generateCode(node, prefix = '') {
 const data = node.data || {};
 const rawCommand = (data.command || 'ticket-panel').trim();
 const command = (prefix && !rawCommand.startsWith(prefix)) ? `${prefix}${rawCommand}` : rawCommand;
 const cats = parseCategories(data.categories);
 const lbls = parseLabels(data.categoryLabels, cats);
 const mode = (data.panelMode || 'buttons').toLowerCase();
 const style = `ButtonStyle.${data.buttonStyle || 'Primary'}`;
 const color = parseInt((data.embedColor || '#5865F2').replace('#', ''), 16);

 const buttonCode = cats.map((cat, i) =>
 ` new ButtonBuilder().setCustomId('ticket:create:${cat}').setLabel('${lbls[i] || cat}').setStyle(${style})`
 ).join(',\n');

 const dropdownOpts = cats.map((cat, i) =>
 ` { label: '${lbls[i] || cat}', value: '${cat}' }`
 ).join(',\n');

 return `
// ── Ticket Panel ──────────────────────────────────────────────────────────────
// Requires: discord.js v14
// Paste inside your messageCreate handler

if (message.content.trim().toLowerCase() === '${command.toLowerCase()}') {
 if (!message.member?.permissions.has('ManageGuild')) {
 return message.reply('You need Manage Server permission.');
 }

 const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

 const panelEmbed = new EmbedBuilder()
 .setColor(${isNaN(color) ? 0x5865F2 : color})
 .setTitle('${(data.embedTitle || '🎫 Support Tickets').replace(/'/g, "\\'")}')
 .setDescription('${(data.embedDescription || 'Open a ticket below.').replace(/'/g, "\\'")}')
 .setTimestamp();

 ${mode === 'dropdown' ? `
 const menu = new StringSelectMenuBuilder()
 .setCustomId('ticket:panel:select')
 .setPlaceholder('${(data.dropdownPlaceholder || '📂 Select...').replace(/'/g, "\\'")}')
 .addOptions([
${dropdownOpts}
 ]);
 const components = [new ActionRowBuilder().addComponents(menu)];
 ` : `
 const buttons = [
${buttonCode}
 ];
 const rows = [];
 for (let i = 0; i < buttons.length; i += 5) {
 rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
 }
 const components = rows;
 `}

 await message.channel.send({ embeds: [panelEmbed], components });
 await message.delete().catch(() => {});
}
`;
 },
 },
 },
};
