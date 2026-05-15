'use strict';

const { EmbedBuilder } = require('discord.js');

const DEFAULT_DESCRIPTION = '**UUID**\n`{mc_uuid}`\n\n**Textures**\nSkin: {skin_link}\n\n**Information**\nUsername Changes: `{name_change_count}`\nEdition: `{edition}`\nDiscord: {user_tag}\n\n**Name History**\n{name_history}';

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'mprofile').trim() || 'mprofile';
 const effectivePrefix = String(prefix || '!');
 return raw.startsWith(effectivePrefix) ? raw : `${effectivePrefix}${raw}`;
}

function splitAliases(value) {
 return String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
}

function matchCommand(content, commands) {
 const text = String(content || '').trim();
 for (const command of commands) {
 const cmd = String(command || '').trim();
 if (!cmd) continue;
 if (!text.toLowerCase().startsWith(cmd.toLowerCase())) continue;
 const rest = text.slice(cmd.length);
 if (!rest || /^\s/.test(rest)) return { args: rest.trim() };
 }
 return null;
}

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key] - '') : match
 );
}

function hexToInt(hex) {
 const parsed = parseInt(String(hex || '#22C55E').replace('#', ''), 16);
 return Number.isNaN(parsed) ? 0x22C55E : parsed;
}

function dashedUuid(uuid) {
 const clean = String(uuid || '').replace(/-/g, '');
 if (clean.length !== 32) return uuid || '';
 return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

function compactUuid(uuid) {
 return String(uuid || '').replace(/-/g, '');
}

async function getJson(url, options = {}) {
 if (typeof fetch !== 'function') throw new Error('Fetch API is unavailable in this runtime.');
 const response = await fetch(url, options);
 if (response.status === 204 || response.status === 404) return null;
 if (!response.ok) throw new Error(`HTTP ${response.status}`);
 return response.json();
}

function decodeTextures(profile) {
 const raw = profile?.properties?.find?.((item) => item.name === 'textures')?.value;
 if (!raw) return {};
 try {
 const decoded = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
 return decoded.textures || {};
 } catch {
 return {};
 }
}

async function fetchNameHistory(username, uuid) {
 try {
 const data = await getJson(`https://api.ashcon.app/mojang/v2/user/${encodeURIComponent(uuid || username)}`);
 const history = Array.isArray(data?.username_history) ? data.username_history : [];
 return history.map((entry, index) => ({
 name: entry.username || entry.name || username,
 changedAt: entry.changed_at || entry.changedToAt || '',
 index: history.length - index,
 }));
 } catch {
 return [];
 }
}

function formatNameHistory(history, currentName) {
 if (!history.length) return `1. \`${currentName}\` - Current username.`;
 return history.slice(0, 6).map((entry, index) => {
 const label = entry.changedAt ? new Date(entry.changedAt).toLocaleDateString() : (index === history.length - 1 ? 'First username.' : 'Unknown date');
 return `${history.length - index}. \`${entry.name}\` - ${label}`;
 }).join('\n');
}

async function fetchJavaProfile(username) {
 const user = await getJson(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`);
 if (!user?.id) return null;
 const uuid = dashedUuid(user.id);
 const session = await getJson(`https://sessionserver.mojang.com/session/minecraft/profile/${compactUuid(uuid)}`);
 const textures = decodeTextures(session);
 const history = await fetchNameHistory(user.name, uuid);
 const skinUrl = textures.SKIN?.url || `https://crafatar.com/skins/${compactUuid(uuid)}`;
 return {
 edition: 'Java',
 name: user.name,
 uuid,
 skinUrl,
 renderUrl: `https://minotar.net/armor/body/${encodeURIComponent(user.name)}/100.png`,
 avatarUrl: `https://minotar.net/avatar/${encodeURIComponent(user.name)}/100.png`,
 nameHistory: formatNameHistory(history, user.name),
 nameChangeCount: String(Math.max(0, history.length - 1)),
 };
}

async function fetchBedrockProfile(gamertag) {
 const xuidData = await getJson(`https://api.geysermc.org/v2/xbox/xuid/${encodeURIComponent(gamertag)}`);
 const xuid = xuidData?.xuid || xuidData?.id || xuidData;
 if (!xuid) return null;
 let skin = null;
 try {
 skin = await getJson(`https://api.geysermc.org/v2/skin/${encodeURIComponent(String(xuid))}`);
 } catch {
 skin = null;
 }
 const texture = skin?.texture_id || skin?.hash || String(xuid);
 return {
 edition: 'Bedrock',
 name: gamertag,
 uuid: String(xuid),
 skinUrl: skin?.value ? `https://api.geysermc.org/v2/skin/${encodeURIComponent(String(xuid))}` : 'Unavailable',
 renderUrl: `https://mc-heads.net/body/${encodeURIComponent(texture)}/right.png`,
 avatarUrl: `https://mc-heads.net/avatar/${encodeURIComponent(texture)}/100.png`,
 nameHistory: `1. \`${gamertag}\` - Bedrock gamertag.`,
 nameChangeCount: '0',
 };
}

async function resolveProfile(query, edition) {
 const clean = String(query || '').trim();
 if (!clean) return null;
 const requested = String(edition || 'auto').toLowerCase();
 if (requested === 'java') return fetchJavaProfile(clean);
 if (requested === 'bedrock') return fetchBedrockProfile(clean);
 return (await fetchJavaProfile(clean).catch(() => null)) || (await fetchBedrockProfile(clean).catch(() => null));
}

function varsFor(message, data, profile = {}, extra = {}) {
 return {
 user: message.author?.username || 'Unknown',
 user_tag: message.author?.tag || `${message.author?.username || 'Unknown'}#0001`,
 mention: message.author?.id ? `<@${message.author.id}>` : '@user',
 query: extra.query || profile.name || '',
 edition: profile.edition || 'Java',
 mc_name: profile.name || extra.query || 'Google_it',
 mc_uuid: profile.uuid || '0362e2fb-bdda-4b49-8608-e0fc8af35cde',
 skin_url: profile.skinUrl || '',
 skin_link: profile.skinUrl && profile.skinUrl !== 'Unavailable' ? `[${data.skinLinkLabel || 'Open Skin'}](${profile.skinUrl})` : 'Unavailable',
 render_url: profile.renderUrl || '',
 avatar_url: profile.avatarUrl || '',
 name_history: profile.nameHistory || '1. `Google_it` - First username.',
 name_change_count: profile.nameChangeCount || '0',
 error: extra.error || '',
 };
}

module.exports = {
 meta: {
 name: 'Minecraft Profile',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Shows Java or Bedrock Minecraft profile information with skin render.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 game_minecraft_profile: {
 label: 'Minecraft Profile',
 icon: 'MC',
 color: '#22C55E',
 description: 'Prefix Minecraft profile command for Java and Bedrock players.',
 inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'mprofile', required: true },
 aliases: { type: 'string', default: 'profile,mcprofile,minecraftprofile', required: false },
 defaultEdition: { type: 'string', default: 'auto', required: false },
 titleTemplate: { type: 'string', default: 'Minecraft profile for {mc_name}', required: false },
 descriptionTemplate: { type: 'string', default: DEFAULT_DESCRIPTION, required: false },
 notFoundMessage: { type: 'string', default: 'No Minecraft profile found for `{query}`.', required: false },
 errorMessage: { type: 'string', default: 'Could not load Minecraft profile: {error}', required: false },
 skinLinkLabel: { type: 'string', default: 'Open Skin', required: false },
 },

 async execute(node, message, ctx) {
 if (!message || message.author?.bot || !message.guild) return false;
 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const commands = [
 commandWithPrefix(data.command || 'mprofile', prefix),
 ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
 ];
 const matched = matchCommand(message.content, commands);
 if (!matched) return false;

 const parts = matched.args.split(/\s+/).filter(Boolean);
 let edition = data.defaultEdition || 'auto';
 if (['java', 'bedrock'].includes(String(parts[0] || '').toLowerCase())) {
 edition = parts.shift().toLowerCase();
 }
 const query = parts.join(' ');
 if (!query) {
 await message.channel.send(`Use \`${commandWithPrefix(data.command || 'mprofile', prefix)} <java|bedrock> <username>\`.`);
 return true;
 }

 let profile;
 try {
 profile = await resolveProfile(query, edition);
 } catch (err) {
 await message.channel.send(applyTemplate(data.errorMessage || 'Could not load Minecraft profile: {error}', varsFor(message, data, {}, { query, error: err.message })));
 return true;
 }
 if (!profile) {
 await message.channel.send(applyTemplate(data.notFoundMessage || 'No Minecraft profile found for `{query}`.', varsFor(message, data, {}, { query })));
 return true;
 }

 const vars = varsFor(message, data, profile, { query });
 const embed = new EmbedBuilder()
 .setColor(hexToInt(data.embedColor || '#22C55E'))
 .setTitle(applyTemplate(data.titleTemplate || 'Minecraft profile for {mc_name}', vars))
 .setDescription(applyTemplate(data.descriptionTemplate || DEFAULT_DESCRIPTION, vars));
 if (profile.renderUrl) embed.setThumbnail(profile.renderUrl);
 await message.channel.send({ embeds: [embed] });
 return true;
 },

 generateCode(node, prefix = '!') {
 const rawCmd = String(node.data?.command || 'mprofile').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `// Minecraft Profile command\nif (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()} ")) {\n message.channel.send("Minecraft Profile runs through the builder plugin runtime.");\n}`;
 },
 },
 },
};
