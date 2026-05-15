'use strict';

const { EmbedBuilder } = require('discord.js');

const DEFAULT_DESCRIPTION = '**User ID**\n`{roblox_id}`\n\n**Profile**\nUsername: `{roblox_name}`\nDisplay Name: `{display_name}`\nCreated: `{created_at}`\nVerified: `{verified}`\nBanned: `{banned}`\n\n**Social**\nFriends: `{friends}`\nFollowing: `{following}`\nFollowers: `{followers}`\n\n**About**\n{description}\n\n**Links**\nProfile: {profile_link}';

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'rprofile').trim() || 'rprofile';
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
 const parsed = parseInt(String(hex || '#E11D48').replace('#', ''), 16);
 return Number.isNaN(parsed) ? 0xE11D48 : parsed;
}

async function getJson(url, options = {}) {
 if (typeof fetch !== 'function') throw new Error('Fetch API is unavailable in this runtime.');
 const response = await fetch(url, options);
 if (response.status === 204 || response.status === 404) return null;
 if (!response.ok) throw new Error(`HTTP ${response.status}`);
 return response.json();
}

async function resolveRobloxUser(query) {
 const clean = String(query || '').trim();
 if (!clean) return null;

 if (/^\d+$/.test(clean)) {
 return getJson(`https://users.roblox.com/v1/users/${encodeURIComponent(clean)}`);
 }

 const lookup = await getJson('https://users.roblox.com/v1/usernames/users', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ usernames: [clean], excludeBannedUsers: false }),
 });
 const match = Array.isArray(lookup?.data) ? lookup.data[0] : null;
 if (!match?.id) return null;
 return getJson(`https://users.roblox.com/v1/users/${encodeURIComponent(match.id)}`);
}

async function getAvatarUrl(userId) {
 const json = await getJson(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${encodeURIComponent(userId)}&size=420x420&format=Png&isCircular=false`);
 const first = Array.isArray(json?.data) ? json.data[0] : null;
 return first?.imageUrl || '';
}

async function getCount(url) {
 const json = await getJson(url);
 return Number(json?.count || 0).toLocaleString();
}

async function getSocialCounts(userId) {
 const safe = async (url) => getCount(url).catch(() => '0');
 const [friends, following, followers] = await Promise.all([
 safe(`https://friends.roblox.com/v1/users/${encodeURIComponent(userId)}/friends/count`),
 safe(`https://friends.roblox.com/v1/users/${encodeURIComponent(userId)}/followings/count`),
 safe(`https://friends.roblox.com/v1/users/${encodeURIComponent(userId)}/followers/count`),
 ]);
 return { friends, following, followers };
}

function formatCreated(value) {
 if (!value) return 'Unknown';
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return 'Unknown';
 const dateText = date.toLocaleDateString('en-US', {
 month: 'long',
 day: 'numeric',
 year: 'numeric',
 });
 const now = new Date();
 let years = now.getFullYear() - date.getFullYear();
 const hadAnniversary = now.getMonth() > date.getMonth()
 || (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
 if (!hadAnniversary) years -= 1;
 if (years <= 0) return `${dateText} (less than 1 year ago)`;
 return `${dateText} (${years} ${years === 1 ? 'year' : 'years'} ago)`;
}

async function fetchRobloxProfile(query) {
 const user = await resolveRobloxUser(query);
 if (!user?.id) return null;
 const [avatarUrl, social] = await Promise.all([
 getAvatarUrl(user.id).catch(() => ''),
 getSocialCounts(user.id),
 ]);
 return {
 id: String(user.id),
 name: user.name || query,
 displayName: user.displayName || user.name || query,
 description: user.description || 'No profile description.',
 createdAt: formatCreated(user.created),
 verified: user.hasVerifiedBadge ? 'Yes' : 'No',
 banned: user.isBanned ? 'Yes' : 'No',
 friends: social.friends,
 following: social.following,
 followers: social.followers,
 avatarUrl,
 profileUrl: `https://www.roblox.com/users/${user.id}/profile`,
 };
}

function varsFor(message, data, profile = {}, extra = {}) {
 return {
 user: message.author?.username || 'Unknown',
 user_tag: message.author?.tag || `${message.author?.username || 'Unknown'}#0001`,
 mention: message.author?.id ? `<@${message.author.id}>` : '@user',
 query: extra.query || profile.name || '',
 roblox_id: profile.id || '1',
 roblox_name: profile.name || extra.query || 'Roblox',
 display_name: profile.displayName || profile.name || 'Roblox',
 description: profile.description || 'No profile description.',
 created_at: profile.createdAt || 'Feb 27, 2006',
 verified: profile.verified || 'No',
 banned: profile.banned || 'No',
 friends: profile.friends || '0',
 following: profile.following || '0',
 followers: profile.followers || '0',
 avatar_url: profile.avatarUrl || '',
 profile_url: profile.profileUrl || '',
 profile_link: profile.profileUrl ? `[${data.profileLinkLabel || 'Open Profile'}](${profile.profileUrl})` : 'Unavailable',
 error: extra.error || '',
 };
}

module.exports = {
 meta: {
 name: 'Roblox Profile',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Shows a Roblox profile with avatar image and public account details.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 game_roblox_profile: {
 label: 'Roblox Profile',
 icon: 'RB',
 color: '#E11D48',
 description: 'Prefix Roblox profile command with avatar render and profile details.',
 inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'rprofile', required: true },
 aliases: { type: 'string', default: 'robloxprofile,rbprofile,roblox', required: false },
 titleTemplate: { type: 'string', default: 'Roblox profile for {roblox_name}', required: false },
 descriptionTemplate: { type: 'string', default: DEFAULT_DESCRIPTION, required: false },
 notFoundMessage: { type: 'string', default: 'No Roblox profile found for `{query}`.', required: false },
 errorMessage: { type: 'string', default: 'Could not load Roblox profile: {error}', required: false },
 profileLinkLabel: { type: 'string', default: 'Open Profile', required: false },
 },

 async execute(node, message, ctx) {
 if (!message || message.author?.bot || !message.guild) return false;
 const data = node.data || {};
 const prefix = ctx?.prefix || '!';
 const commands = [
 commandWithPrefix(data.command || 'rprofile', prefix),
 ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
 ];
 const matched = matchCommand(message.content, commands);
 if (!matched) return false;

 const query = matched.args.trim();
 if (!query) {
 await message.channel.send(`Use \`${commandWithPrefix(data.command || 'rprofile', prefix)} <username or user id>\`.`);
 return true;
 }

 let profile;
 try {
 profile = await fetchRobloxProfile(query);
 } catch (err) {
 await message.channel.send(applyTemplate(data.errorMessage || 'Could not load Roblox profile: {error}', varsFor(message, data, {}, { query, error: err.message })));
 return true;
 }
 if (!profile) {
 await message.channel.send(applyTemplate(data.notFoundMessage || 'No Roblox profile found for `{query}`.', varsFor(message, data, {}, { query })));
 return true;
 }

 const vars = varsFor(message, data, profile, { query });
 const embed = new EmbedBuilder()
 .setColor(hexToInt(data.embedColor || '#E11D48'))
 .setTitle(applyTemplate(data.titleTemplate || 'Roblox profile for {roblox_name}', vars))
 .setDescription(applyTemplate(data.descriptionTemplate || DEFAULT_DESCRIPTION, vars));
 if (profile.avatarUrl) embed.setThumbnail(profile.avatarUrl);
 await message.channel.send({ embeds: [embed] });
 return true;
 },

 generateCode(node, prefix = '!') {
 const rawCmd = String(node.data?.command || 'rprofile').replace(/"/g, '\\"');
 const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
 return `// Roblox Profile command\nif (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()} ")) {\n message.channel.send("Roblox Profile runs through the builder plugin runtime.");\n}`;
 },
 },
 },
};
