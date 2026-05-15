'use strict';

const DEFAULT_PAT_API = 'https://nekos.best/api/v2/pat';
const TIMEOUT_MS = 10_000;

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (m, k) =>
 Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== null && vars[k] !== undefined ? String(vars[k]) : m
 );
}

async function fetchPatGif(apiUrl, timeoutMs) {
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

module.exports = {
 meta: {
 name: 'Anime Pat',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Fun pat command. Fetches an anime GIF from nekos.best and sends a rich embed.',
 engineVersion: '>=1.0.0',
 },
 nodes: {
 fun_pat: {
 label: 'Anime Pat',
 icon: 'PAT',
 color: '#22C55E',
 description: 'Fetches an anime pat GIF from nekos.best and sends a styled message/embed.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],
 configSchema: {
 command: { type: 'string', default: 'pat', required: true },
 apiUrl: { type: 'string', default: DEFAULT_PAT_API, required: false },
 embedEnabled: { type: 'boolean', default: true, required: false },
 embedColor: { type: 'string', default: '#22C55E', required: false },
 titleTemplate: { type: 'string', default: '{author} patted {target}!', required: false },
 descriptionTemplate: { type: 'string', default: '**{author}** is patting **{target}**!', required: false },
 plainTextTemplate: { type: 'string', default: '**{author}** is patting **{target}**! {gif}', required: false },
 noTargetMessage: { type: 'string', default: '❌ You need to mention someone to pat! Usage: `{command} @user`', required: false },
 errorMessage: { type: 'string', default: '❌ Could not fetch a pat GIF. Try again later.', required: false },
 },
 async execute(node, message, ctx) {
 if (!message || message.author?.bot || !message.guild) return false;
 const prefix = ctx?.prefix || '';
 const rawCmd = (node.data?.command || 'pat').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

 const targetUser = ctx.flow?.targetUser || ctx.flow?.targetMember?.user || message.mentions.users?.first() || null;
 if (!targetUser) {
 try { await message.reply(applyTemplate(node.data?.noTargetMessage || '❌ You need to mention someone to pat! Usage: `{command} @user`', { command: cmd })); } catch {}
 return false;
 }

 let gifUrl = '';
 let animeName = '';
 try {
 const result = await fetchPatGif((node.data?.apiUrl || DEFAULT_PAT_API).trim(), TIMEOUT_MS);
 gifUrl = result.url;
 animeName = result.anime_name || result.animeName || '';
 } catch {
 try { await message.channel.send(node.data?.errorMessage || '❌ Could not fetch a pat GIF. Try again later.'); } catch {}
 return false;
 }

 const vars = { author: message.author.username, target: targetUser.username, gif: gifUrl, anime: animeName || 'Unknown' };
 const embedEnabled = node.data?.embedEnabled !== false;
 const color = parseInt((node.data?.embedColor || '#22C55E').replace('#', ''), 16) || 0x22C55E;
 const title = applyTemplate(node.data?.titleTemplate || '{author} patted {target}!', vars);
 const desc = applyTemplate(node.data?.descriptionTemplate || '**{author}** is patting **{target}**!', vars);
 const plain = applyTemplate(node.data?.plainTextTemplate || '**{author}** is patting **{target}**! {gif}', vars);

 try {
 if (embedEnabled) {
 await message.channel.send({
 embeds: [{
 color,
 author: { name: title },
 description: desc,
 image: { url: gifUrl },
 footer: { text: `Anime: ${animeName || 'Unknown'}` },
 timestamp: new Date().toISOString(),
 }]
 });
 } else {
 await message.channel.send(plain);
 }
 } catch {
 try { await message.channel.send(plain); } catch {}
 }
 return true;
 },
 generateCode(node, prefix = '') {
 const rawCmd = (node.data?.command || 'pat').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const embedEnabled = node.data?.embedEnabled !== false;
 const color = parseInt((node.data?.embedColor || '#22C55E').replace('#', ''), 16) || 0x22C55E;
 const apiUrl = (node.data?.apiUrl || DEFAULT_PAT_API).replace(/"/g, '\\"');
 const titleTemplate = (node.data?.titleTemplate || '{author} patted {target}!').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const descriptionTemplate = (node.data?.descriptionTemplate || '**{author}** is patting **{target}**!').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const plainTextTemplate = (node.data?.plainTextTemplate || '**{author}** is patting **{target}**! {gif}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 return `
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}") && !message.author.bot) {
 const _pat_target = message.mentions.users.first();
 if (!_pat_target) {
 message.reply(\`❌ Mention someone to pat! Usage: \\\`${cmd} @user\\\`\`).catch(() => {});
 } else {
 const _pat_ctrl = new AbortController();
 setTimeout(() => _pat_ctrl.abort(), 10000);
 fetch("${apiUrl}", { signal: _pat_ctrl.signal })
 .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
 .then(json => {
 const _pat_gif = json?.results?.[0]?.url;
 if (!_pat_gif) throw new Error("No GIF");
 const _pat_anime = json?.results?.[0]?.anime_name || "Unknown";
 const _pat_vars = { author: message.author.username, target: _pat_target.username, gif: _pat_gif, anime: _pat_anime };
 const _pat_apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_pat_vars[k] - m));
 const _pat_title = _pat_apply(\`${titleTemplate}\`);
 const _pat_desc = _pat_apply(\`${descriptionTemplate}\`);
 const _pat_plain = _pat_apply(\`${plainTextTemplate}\`);
 ${embedEnabled ? `
 message.channel.send({ embeds: [{ color: ${color}, author: { name: _pat_title }, description: _pat_desc, image: { url: _pat_gif }, footer: { text: \`Anime: \${_pat_anime}\` }, timestamp: new Date().toISOString() }] }).catch(() => message.channel.send(_pat_plain).catch(() => {}));
 ` : `
 message.channel.send(_pat_plain).catch(() => {});
 `}
 })
 .catch(() => message.channel.send("❌ Could not fetch a pat GIF.").catch(() => {}));
 }
}`;
 },
 },
 },
};
