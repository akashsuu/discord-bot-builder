'use strict';

const {
 ActionRowBuilder,
 ButtonBuilder,
 ButtonStyle,
 EmbedBuilder,
 ModalBuilder,
 TextInputBuilder,
 TextInputStyle,
} = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'createembed').trim() || 'createembed';
 const effectivePrefix = String(prefix || '!');
 return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function splitAliases(value) {
 return String(value || '')
 .split(',')
 .map((part) => part.trim())
 .filter(Boolean);
}

function matchCommand(content, commands) {
 const text = String(content || '').trim();
 for (const command of commands) {
 const cmd = String(command || '').trim();
 if (!cmd) continue;
 if (!text.toLowerCase().startsWith(cmd.toLowerCase())) continue;
 const rest = text.slice(cmd.length);
 if (!rest || /^\s/.test(rest)) return true;
 }
 return false;
}

function hexToInt(hex) {
 const parsed = parseInt(String(hex || '#5865F2').replace('#', ''), 16);
 return Number.isNaN(parsed) ? 0x5865F2 : parsed;
}

function cleanUrl(value) {
 const url = String(value || '').trim();
 return /^https?:\/\//i.test(url) ? url : '';
}

function initialState(data) {
 return {
 authorText: data.defaultAuthorText || '',
 authorIcon: data.defaultAuthorIcon || '',
 title: data.defaultTitle || 'Embed Title',
 description: data.defaultDescription || 'Embed description goes here.',
 thumbnail: data.defaultThumbnail || '',
 image: data.defaultImage || '',
 footerText: data.defaultFooterText || '',
 footerIcon: data.defaultFooterIcon || '',
 color: data.defaultColor || data.embedColor || '#5865F2',
 };
}

function buildCustomEmbed(state) {
 const embed = new EmbedBuilder().setColor(hexToInt(state.color));
 if (state.title) embed.setTitle(state.title.slice(0, 256));
 if (state.description) embed.setDescription(state.description.slice(0, 4096));
 if (state.authorText || cleanUrl(state.authorIcon)) {
 embed.setAuthor({
 name: (state.authorText || 'Author').slice(0, 256),
 iconURL: cleanUrl(state.authorIcon) || undefined,
 });
 }
 if (cleanUrl(state.thumbnail)) embed.setThumbnail(cleanUrl(state.thumbnail));
 if (cleanUrl(state.image)) embed.setImage(cleanUrl(state.image));
 if (state.footerText || cleanUrl(state.footerIcon)) {
 embed.setFooter({
 text: (state.footerText || 'Footer').slice(0, 2048),
 iconURL: cleanUrl(state.footerIcon) || undefined,
 });
 }
 return embed;
}

function builderContent(data) {
 return data.panelButtonLabel || 'Improve the Embed';
}

const FIELD_META = {
 authorText: { label: 'Author Text', style: TextInputStyle.Short, max: 256 },
 authorIcon: { label: 'Author Icon URL', style: TextInputStyle.Short, max: 500 },
 title: { label: 'Title', style: TextInputStyle.Short, max: 256 },
 description: { label: 'Description', style: TextInputStyle.Paragraph, max: 4000 },
 thumbnail: { label: 'Thumbnail URL', style: TextInputStyle.Short, max: 500 },
 image: { label: 'Image URL', style: TextInputStyle.Short, max: 500 },
 footerText: { label: 'Footer Text', style: TextInputStyle.Short, max: 2048 },
 footerIcon: { label: 'Footer Icon URL', style: TextInputStyle.Short, max: 500 },
 color: { label: 'Color Hex', style: TextInputStyle.Short, max: 16 },
};

function controlRows(data, nonce) {
 const button = (field, label, style = ButtonStyle.Primary) =>
 new ButtonBuilder()
 .setCustomId(`embedbuilder:${field}:${nonce}`)
 .setLabel(label)
 .setStyle(style);

 return [
 new ActionRowBuilder().addComponents(
 button('authorText', data.authorTextButtonLabel || 'Author Text'),
 button('authorIcon', data.authorIconButtonLabel || 'Author Icon'),
 button('title', data.titleButtonLabel || 'Title'),
 button('description', data.descriptionButtonLabel || 'Description'),
 button('thumbnail', data.thumbnailButtonLabel || 'Thumbnail')
 ),
 new ActionRowBuilder().addComponents(
 button('image', data.imageButtonLabel || 'Image'),
 button('footerText', data.footerTextButtonLabel || 'Footer Text'),
 button('footerIcon', data.footerIconButtonLabel || 'Footer Icon'),
 button('color', data.colorButtonLabel || 'Color'),
 button('reset', data.resetButtonLabel || 'Reset Embed', ButtonStyle.Danger)
 ),
 new ActionRowBuilder().addComponents(
 button('send', data.sendButtonLabel || 'Send to Channel', ButtonStyle.Success),
 button('abort', data.abortButtonLabel || 'Abort', ButtonStyle.Danger)
 ),
 ];
}

async function openFieldModal(interaction, field, state, nonce) {
 const meta = FIELD_META[field];
 if (!meta) return;
 const input = new TextInputBuilder()
 .setCustomId('value')
 .setLabel(meta.label)
 .setStyle(meta.style)
 .setMaxLength(meta.max)
 .setRequired(false)
 .setValue(String(state[field] || '').slice(0, meta.max));

 const modal = new ModalBuilder()
 .setCustomId(`embedbuilder_modal:${field}:${nonce}`)
 .setTitle(`Edit ${meta.label}`)
 .addComponents(new ActionRowBuilder().addComponents(input));

 await interaction.showModal(modal);
}

async function safeReply(interaction, content) {
 try {
 if (interaction.replied || interaction.deferred) await interaction.followUp({ content, ephemeral: true });
 else await interaction.reply({ content, ephemeral: true });
 } catch {
 // Best effort. Expired interactions do not need to crash the command.
 }
}

module.exports = {
 meta: {
 name: 'Embed Builder',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Create custom embeds with interactive buttons.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 util_embedbuilder: {
 label: 'Embed Builder',
 icon: 'EMB',
 color: '#5865F2',
 description: 'Interactive custom embed builder with edit, reset, send, and abort buttons.',
 inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'createembed', required: true },
 aliases: { type: 'string', default: 'embedbuilder', required: false },
 panelButtonLabel: { type: 'string', default: 'Improve the Embed', required: false },
 defaultTitle: { type: 'string', default: 'Embed Title', required: false },
 defaultDescription: { type: 'string', default: 'Embed description goes here.', required: false },
 },

 async execute(node, message, ctx) {
 if (!message || message.author?.bot || !message.guild) return false;

 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const commands = [
 commandWithPrefix(data.command, prefix),
 ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
 ];
 if (!matchCommand(message.content, commands)) return false;

 let state = initialState(data);
 const nonce = `${message.id || Date.now()}`;
 const panel = await message.channel.send({
 content: builderContent(data),
 embeds: [buildCustomEmbed(state)],
 components: controlRows(data, nonce),
 });

 const collector = panel.createMessageComponentCollector?.({ time: 15 * 60 * 1000 });
 collector?.on('collect', async (interaction) => {
 if (interaction.user?.id !== message.author.id) {
 await safeReply(interaction, 'Only the command user can edit this embed builder.');
 return;
 }

 const [, action, incomingNonce] = String(interaction.customId || '').split(':');
 if (incomingNonce !== nonce) return;

 if (action === 'send') {
 await message.channel.send({ embeds: [buildCustomEmbed(state)] });
 await safeReply(interaction, data.sentMessage || 'Embed sent to this channel.');
 return;
 }

 if (action === 'abort') {
 collector.stop('aborted');
 await interaction.update({ content: data.abortedMessage || 'Embed builder aborted.', embeds: [], components: [] });
 return;
 }

 if (action === 'reset') {
 state = initialState(data);
 await interaction.update({
 content: builderContent(data),
 embeds: [buildCustomEmbed(state)],
 components: controlRows(data, nonce),
 });
 return;
 }

 await openFieldModal(interaction, action, state, nonce);
 try {
 const submitted = await interaction.awaitModalSubmit({
 time: 2 * 60 * 1000,
 filter: (i) => i.user.id === message.author.id && i.customId === `embedbuilder_modal:${action}:${nonce}`,
 });
 state = { ...state, [action]: submitted.fields.getTextInputValue('value') || '' };
 await submitted.update({
 content: builderContent(data),
 embeds: [buildCustomEmbed(state)],
 components: controlRows(data, nonce),
 });
 } catch {
 // Modal was not submitted.
 }
 });

 collector?.on('end', async (_, reason) => {
 if (reason === 'aborted') return;
 await panel.edit({ components: [] }).catch(() => {});
 });

 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = String(node.data?.command || 'createembed').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `
// Embed Builder command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
 const _rest = message.content.slice("${cmd}".length);
 if (!_rest || /^\\s/.test(_rest)) {
 message.channel.send("Embed builder panel: configure this plugin node in the builder for interactive buttons.");
 }
}`;
 },
 },
 },
};
