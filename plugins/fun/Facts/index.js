'use strict';

const DEFAULT_FACTS_API = 'https://uselessfacts.jsph.pl/api/v2/facts/random';
const TIMEOUT_MS = 10_000;

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (m, k) =>
 Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== null && vars[k] !== undefined ? String(vars[k]) : m
 );
}

async function fetchFact(apiUrl, timeoutMs) {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), timeoutMs);
 try {
 const res = await fetch(apiUrl, {
 signal: controller.signal,
 headers: { Accept: 'application/json' },
 });
 if (!res.ok) throw new Error(`API returned ${res.status}`);
 const json = await res.json();
 const text = String(json?.text || '').trim();
 if (!text) throw new Error('No fact in API response');
 return {
 text,
 source: String(json?.source || 'Useless Facts'),
 sourceUrl: String(json?.source_url || ''),
 };
 } finally {
 clearTimeout(timer);
 }
}

module.exports = {
 meta: {
 name: 'Random Facts',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Fetches a random fact and sends it as message or embed.',
 engineVersion: '>=1.0.0',
 },
 nodes: {
 fun_facts: {
 label: 'Random Facts',
 icon: 'FCT',
 color: '#06B6D4',
 description: 'Fetches a random fact from API and sends it in chat.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],
 configSchema: {
 command: { type: 'string', default: 'facts', required: true },
 apiUrl: { type: 'string', default: DEFAULT_FACTS_API, required: false },
 embedEnabled: { type: 'boolean', default: true, required: false },
 embedColor: { type: 'string', default: '#06B6D4', required: false },
 titleTemplate: { type: 'string', default: '{author} asked for a fact!', required: false },
 descriptionTemplate: { type: 'string', default: '{fact}', required: false },
 plainTextTemplate: { type: 'string', default: '{fact}', required: false },
 footerTemplate: { type: 'string', default: 'Source: {source}', required: false },
 errorMessage: { type: 'string', default: '❌ Could not fetch a fact. Try again later.', required: false },
 },
 async execute(node, message, ctx) {
 if (!message || message.author?.bot) return false;

 const prefix = ctx?.prefix || '';
 const rawCmd = (node.data?.command || 'facts').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 if (message.content.trim().toLowerCase() !== cmd.toLowerCase()) return false;

 let fact;
 try {
 fact = await fetchFact((node.data?.apiUrl || DEFAULT_FACTS_API).trim(), TIMEOUT_MS);
 } catch {
 try { await message.channel.send(node.data?.errorMessage || '❌ Could not fetch a fact. Try again later.'); } catch {}
 return false;
 }

 const vars = {
 author: message.author.username,
 fact: fact.text,
 source: fact.source,
 sourceUrl: fact.sourceUrl,
 };

 if (!ctx.vars || typeof ctx.vars !== 'object') ctx.vars = {};
 ctx.vars.factData = { ...vars };

 const embedEnabled = node.data?.embedEnabled !== false;
 const color = parseInt((node.data?.embedColor || '#06B6D4').replace('#', ''), 16) || 0x06B6D4;
 const title = applyTemplate(node.data?.titleTemplate || '{author} asked for a fact!', vars);
 const desc = applyTemplate(node.data?.descriptionTemplate || '{fact}', vars);
 const plain = applyTemplate(node.data?.plainTextTemplate || '{fact}', vars);
 const footer = applyTemplate(node.data?.footerTemplate || 'Source: {source}', vars);

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
 const rawCmd = (node.data?.command || 'facts').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const embedEnabled = node.data?.embedEnabled !== false;
 const color = parseInt((node.data?.embedColor || '#06B6D4').replace('#', ''), 16) || 0x06B6D4;
 const apiUrl = (node.data?.apiUrl || DEFAULT_FACTS_API).replace(/"/g, '\\"');
 const titleTemplate = (node.data?.titleTemplate || '{author} asked for a fact!').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const descriptionTemplate = (node.data?.descriptionTemplate || '{fact}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const plainTextTemplate = (node.data?.plainTextTemplate || '{fact}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const footerTemplate = (node.data?.footerTemplate || 'Source: {source}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 return `
if (message.content.trim().toLowerCase() === "${cmd.toLowerCase()}" && !message.author.bot) {
 const _fact_ctrl = new AbortController();
 setTimeout(() => _fact_ctrl.abort(), 10000);
 fetch("${apiUrl}", { signal: _fact_ctrl.signal, headers: { Accept: "application/json" } })
 .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
 .then(json => {
 const _fact_text = String(json?.text || "").trim();
 if (!_fact_text) throw new Error("No fact");
 const _fact_vars = {
 author: message.author.username,
 fact: _fact_text,
 source: String(json?.source || "Useless Facts"),
 sourceUrl: String(json?.source_url || ""),
 };
 const _fact_apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_fact_vars[k] - m));
 const _fact_title = _fact_apply(\`${titleTemplate}\`);
 const _fact_desc = _fact_apply(\`${descriptionTemplate}\`);
 const _fact_plain = _fact_apply(\`${plainTextTemplate}\`);
 const _fact_footer = _fact_apply(\`${footerTemplate}\`);
 ${embedEnabled ? `
 message.channel.send({ embeds: [{ color: ${color}, author: { name: _fact_title }, description: _fact_desc, footer: { text: _fact_footer }, timestamp: new Date().toISOString() }] }).catch(() => message.channel.send(_fact_plain).catch(() => {}));
 ` : `
 message.channel.send(_fact_plain).catch(() => {});
 `}
 })
 .catch(() => message.channel.send("❌ Could not fetch a fact.").catch(() => {}));
}`;
 },
 },
 },
};
