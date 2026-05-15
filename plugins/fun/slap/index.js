'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SLAP_API = 'https://nekos.best/api/v2/slap';
const TIMEOUT_MS = 10_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

async function fetchSlapGif(apiUrl, timeoutMs) {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), timeoutMs);
 try {
 const res = await fetch(apiUrl, { signal: controller.signal });
 if (!res.ok) throw new Error(`API returned ${res.status}`);
 const json = await res.json();
 const result = json?.results?.[0];
 if (!result?.url) throw new Error('No GIF URL in API response');
 return result;
 } finally {
 clearTimeout(timer);
 }
}

function buildSlapEmbed(author, targetName, gifUrl, color, isSelf) {
 const description = isSelf
 ? `**${author}** slapped themselves... that's gotta hurt. 😂`
 : `**${author}** slapped **${targetName}**! 💥`;

 const title = isSelf
 ? `${author} slapped themselves!`
 : `${author} slapped ${targetName}!`;

 return {
 color,
 description,
 author: { name: title },
 image: { url: gifUrl },
 footer: { text: 'Powered by nekos.best' },
 timestamp: new Date().toISOString(),
 };
}

// ── Plugin ────────────────────────────────────────────────────────────────────

module.exports = {
 meta: {
 name: 'Anime Slap',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Fun slap command. Fetches an anime GIF from nekos.best and sends a rich embed.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 fun_slap: {
 label: 'Anime Slap',
 icon: '👋',
 color: '#7B2FBE',
 description: 'Fetches an anime slap GIF from nekos.best and sends a purple embed showing who slapped whom.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 command: { type: 'string', default: 'slap', required: true, description: 'Command word (without prefix)' },
 embedColor: { type: 'string', default: '#7B2FBE', required: false, description: 'Embed accent color (hex)' },
 noTargetMessage: { type: 'string', default: '❌ You need to mention someone to slap! Usage: `{command} @user`', required: false },
 errorMessage: { type: 'string', default: '❌ Could not fetch a slap GIF. Try again later.', required: false },
 },

 async execute(node, message, ctx) {
 if (!message || message.author?.bot) return false;
 if (!message.guild) return false;

 // ── 1. Match command ──────────────────────────────────────────────────
 const prefix = ctx?.prefix || '';
 const rawCmd = (node.data?.command || 'slap').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;

 if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

 // ── 2. Resolve target ─────────────────────────────────────────────────
 const targetUser =
 ctx.flow?.targetUser ||
 ctx.flow?.targetMember?.user ||
 message.mentions.users?.first() ||
 null;

 if (!targetUser) {
 const noTargetMsg = applyTemplate(
 node.data?.noTargetMessage || '❌ You need to mention someone to slap! Usage: `{command} @user`',
 { command: cmd }
 );
 try { await message.reply(noTargetMsg); } catch { /* swallow */ }
 return false;
 }

 const isSelf = targetUser.id === message.author.id;

 // ── 3. Fetch GIF ──────────────────────────────────────────────────────
 const apiUrl = (node.data?.apiUrl || DEFAULT_SLAP_API).trim();
 let gifUrl;
 try {
 const result = await fetchSlapGif(apiUrl, TIMEOUT_MS);
 gifUrl = result.url;
 } catch {
 const errMsg = node.data?.errorMessage || '❌ Could not fetch a slap GIF. Try again later.';
 try { await message.channel.send(errMsg); } catch { /* swallow */ }
 return false;
 }

 // ── 4. Store in ctx.vars for downstream nodes ─────────────────────────
 if (!ctx.vars || typeof ctx.vars !== 'object') ctx.vars = {};
 ctx.vars.slapData = { url: gifUrl, author: message.author.username, target: targetUser.username };

 // ── 5. Build and send embed ───────────────────────────────────────────
 const color = parseInt((node.data?.embedColor || '#7B2FBE').replace('#', ''), 16) || 0x7B2FBE;
 const embed = buildSlapEmbed(message.author.username, targetUser.username, gifUrl, color, isSelf);

 try {
 await message.channel.send({ embeds: [embed] });
 } catch {
 // Fallback to plain text
 const fallback = isSelf
 ? `**${message.author.username}** slapped themselves! ${gifUrl}`
 : `**${message.author.username}** slapped **${targetUser.username}**! ${gifUrl}`;
 try { await message.channel.send(fallback); } catch { /* swallow */ }
 }

 return true;
 },

 generateCode(node, prefix = '') {
 const rawCmd = (node.data?.command || 'slap').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const color = parseInt((node.data?.embedColor || '#7B2FBE').replace('#', ''), 16) || 0x7B2FBE;
 const apiUrl = (node.data?.apiUrl || DEFAULT_SLAP_API).replace(/"/g, '\\"');

 return `
// ── Anime Slap: ${cmd} ${'─'.repeat(Math.max(0, 40 - cmd.length))}
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}") && !message.author.bot) {
 const _slap_target = message.mentions.users.first();
 if (!_slap_target) {
 message.reply(\`❌ Mention someone to slap! Usage: \\\`${cmd} @user\\\`\`).catch(() => {});
 } else {
 const _slap_isSelf = _slap_target.id === message.author.id;
 const _slap_ctrl = new AbortController();
 setTimeout(() => _slap_ctrl.abort(), 10000);
 fetch("${apiUrl}", { signal: _slap_ctrl.signal })
 .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
 .then(json => {
 const _slap_gif = json?.results?.[0]?.url;
 if (!_slap_gif) throw new Error("No GIF");
 const _slap_author = message.author.username;
 const _slap_name = _slap_target.username;
 const _slap_desc = _slap_isSelf
 ? \`**\${_slap_author}** slapped themselves... that's gotta hurt. 😂\`
 : \`**\${_slap_author}** slapped **\${_slap_name}**! 💥\`;
 message.channel.send({
 embeds: [{
 color: ${color},
 description: _slap_desc,
 author: { name: _slap_isSelf ? \`\${_slap_author} slapped themselves!\` : \`\${_slap_author} slapped \${_slap_name}!\` },
 image: { url: _slap_gif },
 footer: { text: "Powered by nekos.best" },
 timestamp: new Date().toISOString(),
 }]
 }).catch(() => {});
 })
 .catch(() => message.channel.send("❌ Could not fetch a slap GIF.").catch(() => {}));
 }
}`;
 },
 },
 },
};
