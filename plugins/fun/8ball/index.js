'use strict';

function applyTemplate(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (m, k) =>
 Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== null && vars[k] !== undefined ? String(vars[k]) : m
 );
}

function escapeRegExp(input) {
 return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseResponses(raw) {
 if (!raw || typeof raw !== 'string') return [];
 return raw
 .split('\n')
 .map((s) => s.trim())
 .filter(Boolean);
}

module.exports = {
 meta: {
 name: '8Ball',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Answers questions like a magic 8-ball.',
 engineVersion: '>=1.0.0',
 },
 nodes: {
 fun_8ball: {
 label: '8Ball',
 icon: '8B',
 color: '#6366F1',
 description: 'Usage: 8ball <question>',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],
 configSchema: {
 command: { type: 'string', default: '8ball', required: true },
 embedEnabled: { type: 'boolean', default: true, required: false },
 embedColor: { type: 'string', default: '#6366F1', required: false },
 titleTemplate: { type: 'string', default: '🎱 8Ball Answer', required: false },
 descriptionTemplate: { type: 'string', default: 'Question: {question}\nAnswer: **{answer}**', required: false },
 plainTextTemplate: { type: 'string', default: '🎱 {answer}', required: false },
 usageMessage: { type: 'string', default: '❌ Usage: `{command} <question>`', required: false },
 responses: {
 type: 'string',
 default: [
 'Yes.',
 'No.',
 'Maybe.',
 'Definitely.',
 'Absolutely not.',
 'Ask again later.',
 'Without a doubt.',
 'Very doubtful.',
 'It is certain.',
 'My sources say no.'
 ].join('\n'),
 required: false,
 },
 },
 async execute(node, message, ctx) {
 if (!message || message.author?.bot) return false;

 const prefix = ctx?.prefix || '';
 const rawCmd = (node.data?.command || '8ball').trim();
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;

 const content = String(message.content || '').trim();
 const match = content.match(new RegExp(`^${escapeRegExp(cmd)}(?:\\s+(.+))?$`, 'i'));
 if (!match) return false;

 const question = String(match[1] || '').trim();
 if (!question) {
 const usage = String(node.data?.usageMessage || '❌ Usage: `{command} <question>`').replace('{command}', cmd);
 try { await message.reply(usage); } catch {}
 return false;
 }

 const customResponses = parseResponses(node.data?.responses);
 const responses = customResponses.length ? customResponses : ['Yes.', 'No.', 'Maybe.'];
 const answer = responses[Math.floor(Math.random() * responses.length)];
 const vars = { requester: message.author.username, question, answer };

 if (!ctx.vars || typeof ctx.vars !== 'object') ctx.vars = {};
 ctx.vars.eightBallData = { ...vars };

 const embedEnabled = node.data?.embedEnabled !== false;
 const color = parseInt((node.data?.embedColor || '#6366F1').replace('#', ''), 16) || 0x6366F1;
 const title = applyTemplate(node.data?.titleTemplate || '🎱 8Ball Answer', vars);
 const desc = applyTemplate(node.data?.descriptionTemplate || 'Question: {question}\nAnswer: **{answer}**', vars);
 const plain = applyTemplate(node.data?.plainTextTemplate || '🎱 {answer}', vars);

 try {
 if (embedEnabled) {
 await message.channel.send({
 embeds: [{
 color,
 author: { name: title },
 description: desc,
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
 const rawCmd = (node.data?.command || '8ball').replace(/"/g, '\\"');
 const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
 const embedEnabled = node.data?.embedEnabled !== false;
 const color = parseInt((node.data?.embedColor || '#6366F1').replace('#', ''), 16) || 0x6366F1;
 const titleTemplate = (node.data?.titleTemplate || '🎱 8Ball Answer').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const descriptionTemplate = (node.data?.descriptionTemplate || 'Question: {question}\\nAnswer: **{answer}**').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const plainTextTemplate = (node.data?.plainTextTemplate || '🎱 {answer}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
 const responses = parseResponses(node.data?.responses).map((s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"'));
 const responsesArrayLiteral = responses.length
 ? '[' + responses.map((s) => `"${s}"`).join(', ') + ']'
 : '["Yes.","No.","Maybe."]';

 return `
{
 const _8b_cmd = "${cmd}";
 const _8b_content = String(message.content || "").trim();
 if (_8b_content.toLowerCase().startsWith(_8b_cmd.toLowerCase()) && !message.author.bot) {
 const _8b_question = String(_8b_content.slice(_8b_cmd.length) || "").trim();
 if (!_8b_question) {
 message.reply("❌ Usage: \\\`${cmd} <question>\\\`").catch(() => {});
 } else {
 const _8b_list = ${responsesArrayLiteral};
 const _8b_answer = _8b_list[Math.floor(Math.random() * _8b_list.length)];
 const _8b_vars = { requester: message.author.username, question: _8b_question, answer: _8b_answer };
 const _8b_apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_8b_vars[k] - m));
 const _8b_title = _8b_apply(\`${titleTemplate}\`);
 const _8b_desc = _8b_apply(\`${descriptionTemplate}\`);
 const _8b_plain = _8b_apply(\`${plainTextTemplate}\`);
 ${embedEnabled ? `
 message.channel.send({ embeds: [{ color: ${color}, author: { name: _8b_title }, description: _8b_desc, timestamp: new Date().toISOString() }] }).catch(() => message.channel.send(_8b_plain).catch(() => {}));
 ` : `
 message.channel.send(_8b_plain).catch(() => {});
 `}
 }
 }
}
`;
 },
 },
 },
};
