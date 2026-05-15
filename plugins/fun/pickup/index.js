'use strict';

const DEFAULT_PICKUP_API = 'https://rizzapi.vercel.app/random';
const TIMEOUT_MS = 10_000;

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (m, k) =>
 Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== null && vars[k] !== undefined ? String(vars[k]) : m
 );
}

async function fetchPickupLine(apiUrl, timeoutMs) {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), timeoutMs);
 try {
 const res = await fetch(apiUrl, {
 signal: controller.signal,
 headers: { Accept: 'application/json' },
 });
 if (!res.ok) throw new Error(`API returned ${res.status}`);
 const json = await res.json();
 const line =
 String(json?.text || '').trim() ||
 String(json?.line || '').trim() ||
 String(json?.pickup || '').trim() ||
 String(json?.rizz || '').trim();
 if (!line) throw new Error('No pickup line in API response');
 return {
 line,
 category: String(json?.category || json?.type || 'random'),
 };
 } finally {
 clearTimeout(timer);
 }
}

module.exports = {
 meta: {
 name: 'Pickup Line',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Fetches a random pickup line and sends it as message or embed.',
 engineVersion: '>=1.0.0',
 },
 nodes: {
 fun_pickup: {
 label: 'Pickup Line',
 icon: 'RZZ',
 color: '#F97316',
 description: 'Fetches a random pickup line from API and sends it in chat.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],
 configSchema: {
 command: { type: 'string', default: 'pickup', required: true },
 apiUrl: { type: 'string', default: DEFAULT_PICKUP_API, required: false },
 embedEnabled: { type: 'boolean', default: true, required: false },
 embedColor: { type: 'string', default: '#F97316', required: false },
 titleTemplate: { type: 'string', default: '{requester} wants rizz!', required: false },
 descriptionTemplate: { type: 'string', default: '{line}', required: false },
 plainTextTemplate: { type: 'string', default: '{line}', required: false },
 footerTemplate: { type: 'string', default: 'Category: {category}', required: false },
 errorMessage: { type: 'string', default: '❌ Could not fetch a pickup line. Try again later.', required: false },
 },
 async execute(node, message, ctx) {
 if (!message || message.author?.bot) return false;

 const prefix = ctx?.prefix || '';
 const rawCmd = (node.data?.command || 'pickup').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 if (message.content.trim().toLowerCase() !== cmd.toLowerCase()) return false;

 let result;
 try {
 result = await fetchPickupLine((node.data?.apiUrl || DEFAULT_PICKUP_API).trim(), TIMEOUT_MS);
 } catch {
 try { await message.channel.send(node.data?.errorMessage || '❌ Could not fetch a pickup line. Try again later.'); } catch {}
 return false;
 }

 const vars = {
 requester: message.author.username,
 line: result.line,
 category: result.category,
 };

 if (!ctx.vars || typeof ctx.vars !== 'object') ctx.vars = {};
 ctx.vars.pickupData = { ...vars };

 const embedEnabled = node.data?.embedEnabled !== false;
 const color = parseInt((node.data?.embedColor || '#F97316').replace('#', ''), 16) || 0xF97316;
 const title = applyTemplate(node.data?.titleTemplate || '{requester} wants rizz!', vars);
 const desc = applyTemplate(node.data?.descriptionTemplate || '{line}', vars);
 const plain = applyTemplate(node.data?.plainTextTemplate || '{line}', vars);
 const footer = applyTemplate(node.data?.footerTemplate || 'Category: {category}', vars);

 try {
 if (embedEnabled) {
 await message.channel.send({
 embeds: [{
 color,
 author: { name: title },
 description: desc,
 footer: { text: footer },
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
 const rawCmd = (node.data?.command || 'pickup').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const embedEnabled = node.data?.embedEnabled !== false;
 const color = parseInt((node.data?.embedColor || '#F97316').replace('#', ''), 16) || 0xF97316;
 const apiUrl = (node.data?.apiUrl || DEFAULT_PICKUP_API).replace(/"/g, '\\"');
 const titleTemplate = (node.data?.titleTemplate || '{requester} wants rizz!').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const descriptionTemplate = (node.data?.descriptionTemplate || '{line}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const plainTextTemplate = (node.data?.plainTextTemplate || '{line}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const footerTemplate = (node.data?.footerTemplate || 'Category: {category}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 return `
if (message.content.trim().toLowerCase() === "${cmd.toLowerCase()}" && !message.author.bot) {
 const _pickup_ctrl = new AbortController();
 setTimeout(() => _pickup_ctrl.abort(), 10000);
 fetch("${apiUrl}", { signal: _pickup_ctrl.signal, headers: { Accept: "application/json" } })
 .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
 .then(json => {
 const _pickup_line =
 String(json?.text || "").trim() ||
 String(json?.line || "").trim() ||
 String(json?.pickup || "").trim() ||
 String(json?.rizz || "").trim();
 if (!_pickup_line) throw new Error("No line");
 const _pickup_vars = {
 requester: message.author.username,
 line: _pickup_line,
 category: String(json?.category || json?.type || "random"),
 };
 const _pickup_apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_pickup_vars[k] - m));
 const _pickup_title = _pickup_apply(\`${titleTemplate}\`);
 const _pickup_desc = _pickup_apply(\`${descriptionTemplate}\`);
 const _pickup_plain = _pickup_apply(\`${plainTextTemplate}\`);
 const _pickup_footer = _pickup_apply(\`${footerTemplate}\`);
 ${embedEnabled ? `
 message.channel.send({ embeds: [{ color: ${color}, author: { name: _pickup_title }, description: _pickup_desc, footer: { text: _pickup_footer }, timestamp: new Date().toISOString() }] }).catch(() => message.channel.send(_pickup_plain).catch(() => {}));
 ` : `
 message.channel.send(_pickup_plain).catch(() => {});
 `}
 })
 .catch(() => message.channel.send("❌ Could not fetch a pickup line.").catch(() => {}));
}`;
 },
 },
 },
};
