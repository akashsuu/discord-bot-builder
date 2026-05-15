'use strict';

const DEFAULT_QUOTES_API = 'https://api.quotable.io/random';
const TIMEOUT_MS = 10_000;

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (m, k) =>
 Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== null && vars[k] !== undefined ? String(vars[k]) : m
 );
}

async function fetchQuote(apiUrl, timeoutMs) {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), timeoutMs);
 try {
 const res = await fetch(apiUrl, {
 signal: controller.signal,
 headers: { Accept: 'application/json' },
 });
 if (!res.ok) throw new Error(`API returned ${res.status}`);
 const json = await res.json();
 const content = String(json?.content || '').trim();
 if (!content) throw new Error('No quote content in API response');
 return {
 content,
 author: String(json?.author || 'Unknown'),
 tags: Array.isArray(json?.tags) ? json.tags : [],
 };
 } finally {
 clearTimeout(timer);
 }
}

module.exports = {
 meta: {
 name: 'Random Quotes',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Fetches a random quote and sends it as message or embed.',
 engineVersion: '>=1.0.0',
 },
 nodes: {
 fun_quotes: {
 label: 'Random Quotes',
 icon: 'QTE',
 color: '#A855F7',
 description: 'Fetches a random quote from API and sends it in chat.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],
 configSchema: {
 command: { type: 'string', default: 'quotes', required: true },
 apiUrl: { type: 'string', default: DEFAULT_QUOTES_API, required: false },
 embedEnabled: { type: 'boolean', default: true, required: false },
 embedColor: { type: 'string', default: '#A855F7', required: false },
 titleTemplate: { type: 'string', default: '{requester} asked for a quote!', required: false },
 descriptionTemplate: { type: 'string', default: '"{quote}"', required: false },
 plainTextTemplate: { type: 'string', default: '"{quote}" — {author}', required: false },
 footerTemplate: { type: 'string', default: 'By: {author}', required: false },
 errorMessage: { type: 'string', default: '❌ Could not fetch a quote. Try again later.', required: false },
 },
 async execute(node, message, ctx) {
 if (!message || message.author?.bot) return false;

 const prefix = ctx?.prefix || '';
 const rawCmd = (node.data?.command || 'quotes').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 if (message.content.trim().toLowerCase() !== cmd.toLowerCase()) return false;

 let q;
 try {
 q = await fetchQuote((node.data?.apiUrl || DEFAULT_QUOTES_API).trim(), TIMEOUT_MS);
 } catch {
 try { await message.channel.send(node.data?.errorMessage || '❌ Could not fetch a quote. Try again later.'); } catch {}
 return false;
 }

 const vars = {
 requester: message.author.username,
 quote: q.content,
 author: q.author,
 tags: q.tags.join(', '),
 };

 if (!ctx.vars || typeof ctx.vars !== 'object') ctx.vars = {};
 ctx.vars.quoteData = { ...vars };

 const embedEnabled = node.data?.embedEnabled !== false;
 const color = parseInt((node.data?.embedColor || '#A855F7').replace('#', ''), 16) || 0xA855F7;
 const title = applyTemplate(node.data?.titleTemplate || '{requester} asked for a quote!', vars);
 const desc = applyTemplate(node.data?.descriptionTemplate || '"{quote}"', vars);
 const plain = applyTemplate(node.data?.plainTextTemplate || '"{quote}" — {author}', vars);
 const footer = applyTemplate(node.data?.footerTemplate || 'By: {author}', vars);

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
 const rawCmd = (node.data?.command || 'quotes').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const embedEnabled = node.data?.embedEnabled !== false;
 const color = parseInt((node.data?.embedColor || '#A855F7').replace('#', ''), 16) || 0xA855F7;
 const apiUrl = (node.data?.apiUrl || DEFAULT_QUOTES_API).replace(/"/g, '\\"');
 const titleTemplate = (node.data?.titleTemplate || '{requester} asked for a quote!').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const descriptionTemplate = (node.data?.descriptionTemplate || '"{quote}"').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const plainTextTemplate = (node.data?.plainTextTemplate || '"{quote}" — {author}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const footerTemplate = (node.data?.footerTemplate || 'By: {author}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 return `
if (message.content.trim().toLowerCase() === "${cmd.toLowerCase()}" && !message.author.bot) {
 const _quote_ctrl = new AbortController();
 setTimeout(() => _quote_ctrl.abort(), 10000);
 fetch("${apiUrl}", { signal: _quote_ctrl.signal, headers: { Accept: "application/json" } })
 .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
 .then(json => {
 const _quote_text = String(json?.content || "").trim();
 if (!_quote_text) throw new Error("No quote");
 const _quote_vars = {
 requester: message.author.username,
 quote: _quote_text,
 author: String(json?.author || "Unknown"),
 tags: Array.isArray(json?.tags) ? json.tags.join(", ") : "",
 };
 const _quote_apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_quote_vars[k] - m));
 const _quote_title = _quote_apply(\`${titleTemplate}\`);
 const _quote_desc = _quote_apply(\`${descriptionTemplate}\`);
 const _quote_plain = _quote_apply(\`${plainTextTemplate}\`);
 const _quote_footer = _quote_apply(\`${footerTemplate}\`);
 ${embedEnabled ? `
 message.channel.send({ embeds: [{ color: ${color}, author: { name: _quote_title }, description: _quote_desc, footer: { text: _quote_footer }, timestamp: new Date().toISOString() }] }).catch(() => message.channel.send(_quote_plain).catch(() => {}));
 ` : `
 message.channel.send(_quote_plain).catch(() => {});
 `}
 })
 .catch(() => message.channel.send("❌ Could not fetch a quote.").catch(() => {}));
}`;
 },
 },
 },
};
