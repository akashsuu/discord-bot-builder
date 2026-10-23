'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL API COMMAND PLUGIN
// Works with ANY REST API: ChatGPT, Giphy, weather, image generators, etc.
// - Full {template} variable support in URL, headers, and body
// - Dot-notation response extraction (e.g. "choices.0.message.content")
// - Sends typing indicator while waiting for the API
// - Embeds or plain-text reply, configurable per-node
// ─────────────────────────────────────────────────────────────────────────────

// ── Dot-notation deep getter ──────────────────────────────────────────────────
// "choices.0.message.content" → obj.choices[0].message.content
function deepGet(obj, path) {
 if (!path || !path.trim()) return obj;
 const parts = path.trim().split('.');
 let cur = obj;
 for (const part of parts) {
 if (cur === null || cur === undefined) return undefined;
 cur = Array.isArray(cur)
 ? cur[parseInt(part, 10)]
 : cur[part];
 }
 return cur;
}

// ── Template substitution ─────────────────────────────────────────────────────
// Replaces every {token} with the matching value from vars.
// Unknown tokens are left as-is so they don't silently disappear.
function tpl(template, vars) {
 return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
 Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
 ? String(vars[key])
 : match
 );
}

// ── Build the variable map available in all templates ─────────────────────────
function buildVars(message, ctx, extra = {}) {
 const args = ctx.args || [];
 return {
 user: message?.author?.username || '',
 tag: message?.author?.tag || '',
 id: message?.author?.id || '',
 mention: message?.author ? `<@${message.author.id}>` : '',
 server: message?.guild?.name || '',
 serverId: message?.guild?.id || '',
 channel: message?.channel?.name || '',
 channelId: message?.channel?.id || '',
 args: args.join(' '),
 arg0: args[0] || '',
 arg1: args[1] || '',
 arg2: args[2] || '',
 target: ctx.flow?.targetUser?.username || '',
 targetId: ctx.flow?.targetUser?.id || '',
 targetMention: ctx.flow?.targetUser ? `<@${ctx.flow.targetUser.id}>` : '',
 reason: ctx.flow?.reason || '',
 command: ctx.flow?.command || '',
 message: message?.content || '',
 // Spread ctx.vars so results of previous API nodes are available
 ...(ctx.vars || {}),
 // Caller-supplied extras (e.g. { result: '...', error: '...' })
 ...extra,
 };
}

// ── HTTP fetch with AbortController timeout ───────────────────────────────────
async function doFetch(method, url, headers, body, timeoutMs) {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), timeoutMs);
 try {
 const opts = { method, headers, signal: controller.signal };
 if (body && !['GET', 'HEAD'].includes(method)) opts.body = body;
 const res = await fetch(url, opts);
 const ct = res.headers.get('content-type') || '';
 const data = ct.includes('application/json') ? await res.json() : await res.text();
 return { ok: res.ok, status: res.status, statusText: res.statusText, data };
 } finally {
 clearTimeout(timer);
 }
}

function commandWithPrefix(rawCommand, prefix) {
 const raw = String(rawCommand || 'api').trim() || 'api';
 const effectivePrefix = String(prefix || '!');
 return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

// ── Plugin definition ─────────────────────────────────────────────────────────
module.exports = {
 meta: {
 name: 'API Command',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Universal REST API command node. Works with ChatGPT, Giphy, weather, image generators, and any JSON or text API.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 utility_api_command: {
 label: 'API Command',
 icon: '⚡',
 color: '#7C3AED',
 description: 'Calls any REST API when a command is typed. Extracts a value from the JSON response and replies using a template.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [
 { id: 'out', label: 'Success', type: 'flow' },
 { id: 'err', label: 'Error', type: 'flow' },
 ],

 // ── Config schema (for documentation / future UI generation) ────────────
 configSchema: {
 command: { type: 'string', default: 'api', required: true, description: 'Command keyword that triggers this node' },
 method: { type: 'string', default: 'POST', required: true, options: ['GET','POST','PUT','PATCH','DELETE'] },
 url: { type: 'string', default: '', required: true, description: 'API endpoint — supports {template} variables' },
 apiKey: { type: 'string', default: '', description: 'API key / bearer token stored locally in project.json' },
 apiKeyHeader: { type: 'string', default: 'Authorization', description: 'Name of the auth header' },
 apiKeyPrefix: { type: 'string', default: 'Bearer', description: 'Prefix before the key, e.g. "Bearer"' },
 contentType: { type: 'string', default: 'application/json', description: 'Content-Type header for the request body' },
 bodyTemplate: { type: 'string', default: '', description: 'JSON body with {template} tokens — {args} = full user input' },
 responsePath: { type: 'string', default: '', description: 'Dot-notation path into the JSON response, e.g. choices.0.message.content' },
 output: { type: 'string', default: '{result}', description: 'Reply template — use {result} for the extracted value' },
 errorMessage: { type: 'string', default: '❌ {error}', description: 'Sent when the API call fails — {error} = reason' },
 sendTyping: { type: 'string', default: 'true', description: 'Show typing indicator while waiting' },
 timeout: { type: 'number', default: 15000, min: 1000, max: 60000, description: 'Request timeout in milliseconds' },
 },

 // ── execute ─────────────────────────────────────────────────────────────
 async execute(node, message, ctx) {
 if (!message || message.author?.bot) return false;
 ctx = ctx || {};
 const d = node.data || {};

 // ── 1. Command guard ──────────────────────────────────────────────────
 const prefix = ctx?.prefix || '!';
 const content = (message?.content || '').trim();
 const fullCmd = commandWithPrefix(d.command, prefix);

 if (!content.toLowerCase().startsWith(fullCmd.toLowerCase())) return false;
 const commandRest = content.slice(fullCmd.length);
 if (commandRest && !/^\s/.test(commandRest)) return false;

 // Parse args from the remainder of the message
 const rawArgs = commandRest.trim();
 ctx.args = rawArgs ? rawArgs.split(/\s+/) : [];
 if (ctx.flow && typeof ctx.flow === 'object') {
 ctx.flow.command = fullCmd;
 ctx.flow.reason = rawArgs || null;
 }

 // ── 2. Read config ────────────────────────────────────────────────────
 const method = (d.method || 'GET').toUpperCase();
 const rawUrl = d.url || '';
 const apiKey = d.apiKey || '';
 const apiKeyHeader = (d.apiKeyHeader || 'Authorization').trim();
 const apiKeyPrefix = (d.apiKeyPrefix || 'Bearer').trim();
 const contentType = d.contentType || 'application/json';
 const rawBody = d.bodyTemplate || '';
 const responsePath = d.responsePath || '';
 const outputTpl = d.output || '{result}';
 const errorTpl = d.errorMessage || '❌ {error}';
 const parsedTimeout = Number(d.timeout ?? 15000);
 const timeoutMs = Math.min(Math.max(Number.isFinite(parsedTimeout) ? parsedTimeout : 15000, 1000), 60000);
 const sendTyping = d.sendTyping !== false && String(d.sendTyping ?? 'true').toLowerCase() !== 'false';

 if (!rawUrl.trim()) {
 await message?.channel?.send('⚠️ API Command: no URL configured.');
 return false;
 }

 // ── 3. Typing indicator ───────────────────────────────────────────────
 if (sendTyping && message?.channel) {
 try { await message.channel.sendTyping(); } catch { /* ignore */ }
 }

 // ── 4. Build template vars & resolve URL / body ───────────────────────
 const vars = buildVars(message, ctx);
 const url = tpl(rawUrl, vars);
 const body = tpl(rawBody, vars);

 // ── 5. Build headers ──────────────────────────────────────────────────
 const headers = { 'Content-Type': contentType };
 if (apiKey) {
 const prefix_ = apiKeyPrefix ? `${apiKeyPrefix} ` : '';
 headers[apiKeyHeader] = `${prefix_}${apiKey}`;
 }

 // ── 6. Ensure ctx.vars exists ─────────────────────────────────────────
 if (!ctx.vars || typeof ctx.vars !== 'object') ctx.vars = {};

 // ── 7. Execute the request ────────────────────────────────────────────
 try {
 const { ok, status, statusText, data } = await doFetch(method, url, headers, body, timeoutMs);

 // Store full response in ctx.vars for downstream chaining
 ctx.vars.apiResponse = data;
 ctx.vars.apiResponseStatus = status;
 ctx.vars.apiResponseOk = ok;

 if (!ok) {
 throw new Error(`HTTP ${status} ${statusText}`);
 }

 // ── 8. Extract response value ─────────────────────────────────────
 let extracted = deepGet(data, responsePath);

 // If the extracted value is an object/array, stringify it neatly
 if (extracted !== null && extracted !== undefined && typeof extracted === 'object') {
 extracted = JSON.stringify(extracted, null, 2);
 }
 const result = extracted !== null && extracted !== undefined ? String(extracted) : JSON.stringify(data);

 ctx.vars.apiResult = result;

 // ── 9. Reply ───────────────────────────────────────────────────────
 const replyVars = buildVars(message, ctx, { result });
 const text = tpl(outputTpl, replyVars);

 if (d.embedEnabled && ctx?.sendEmbed) {
 await ctx.sendEmbed(message, d, text);
 } else {
 await message.channel.send(text || result);
 }

 return true;

 } catch (err) {
 ctx.vars.apiError = err.message;

 if (errorTpl && message?.channel) {
 const errVars = buildVars(message, ctx, { error: err.message });
 const errText = tpl(errorTpl, errVars);
 try { await message.channel.send(errText); } catch { /* swallow */ }
 }
 return false;
 }
 },

 // ── generateCode ────────────────────────────────────────────────────────
 generateCode(node) {
 const d = node.data || {};
 const method = (d.method || 'GET').toUpperCase();
 const url = (d.url || '').replace(/`/g, '\\`');
 const apiKey = d.apiKey || '';
 const hdrName = (d.apiKeyHeader || 'Authorization').trim();
 const hdrPrefix = d.apiKeyPrefix ? `${d.apiKeyPrefix} ` : '';
 const ct = d.contentType || 'application/json';
 const rawBody = (d.bodyTemplate || '').replace(/`/g, '\\`');
 const path_ = (d.responsePath || '').replace(/`/g, '\\`');
 const outputTpl = (d.output || '{result}').replace(/`/g, '\\`');
 const errTpl = (d.errorMessage || '❌ {error}').replace(/`/g, '\\`');
 const parsedTimeout = Number(d.timeout ?? 15000);
 const timeout = Math.min(Math.max(Number.isFinite(parsedTimeout) ? parsedTimeout : 15000, 1000), 60000);
 const rawCommand = String(d.command || 'api').trim() || 'api';
 const command = rawCommand.replace(/`/g, '\\`');
 const commandVar = rawCommand.replace(/[^A-Za-z0-9_$]/g, '_') || 'api';
 const noBody = ['GET', 'HEAD'].includes(method);

 return `
// ── API Command: ${command} → ${method} ${url.slice(0, 40)}${url.length > 40 ? '…' : ''} ──
const _apiCommand_${commandVar} = String("${command}").startsWith(_prefix) ? "${command}" : \`\${_prefix}${command}\`;
if (message.content.trim().toLowerCase().startsWith(_apiCommand_${commandVar}.toLowerCase())) {
 const _apiRest_${commandVar} = message.content.trim().slice(_apiCommand_${commandVar}.length);
 if (_apiRest_${commandVar} && !/^\\s/.test(_apiRest_${commandVar})) return;
 const _apiArgs_${commandVar} = _apiRest_${commandVar}.trim();
 try {
 if (message.channel.sendTyping) await message.channel.sendTyping();
 const _apiHeaders_${commandVar} = { 'Content-Type': '${ct}'${apiKey ? `, '${hdrName}': '${hdrPrefix}${apiKey}'` : ''} };
 const _apiVars_${commandVar} = {
 user: message.author.username, id: message.author.id,
 args: _apiArgs_${commandVar}, arg0: _apiArgs_${commandVar}.split(' ')[0] || '',
 server: message.guild?.name || '', channel: message.channel.name || '',
 };
 const _apiTpl_${commandVar} = (s, v) =>
 String(s || '').replace(/\\{(\\w+)\\}/g, (m, k) => v[k] !== undefined ? String(v[k]) : m);
 const _apiUrl_${commandVar} = _apiTpl_${commandVar}(\`${url}\`, _apiVars_${commandVar});
 ${noBody ? '' : `const _apiBody_${commandVar} = _apiTpl_${commandVar}(\`${rawBody}\`, _apiVars_${commandVar});`}
 const _apiCtrl_${commandVar} = new AbortController();
 setTimeout(() => _apiCtrl_${commandVar}.abort(), ${timeout});
 const _apiRes_${commandVar} = await fetch(_apiUrl_${commandVar}, {
 method: '${method}',
 headers: _apiHeaders_${commandVar},
 ${noBody ? '' : `body: _apiBody_${commandVar},`}
 signal: _apiCtrl_${commandVar}.signal,
 });
 const _apiCt_${commandVar} = _apiRes_${commandVar}.headers.get('content-type') || '';
 const _apiData_${commandVar} = _apiCt_${commandVar}.includes('application/json')
 ? await _apiRes_${commandVar}.json() : await _apiRes_${commandVar}.text();
 const _apiGet_${commandVar} = (obj, path) => {
 if (!path) return obj;
 return path.split('.').reduce((o, k) => o == null ? o : (Array.isArray(o) ? o[+k] : o[k]), obj);
 };
 let _apiResult_${commandVar} = _apiGet_${commandVar}(_apiData_${commandVar}, \`${path_}\`);
 if (_apiResult_${commandVar} !== null && typeof _apiResult_${commandVar} === 'object') _apiResult_${commandVar} = JSON.stringify(_apiResult_${commandVar}, null, 2);
 const _apiFinal_${commandVar} = _apiResult_${commandVar} ?? JSON.stringify(_apiData_${commandVar});
 const _apiReply_${commandVar} = _apiTpl_${commandVar}(\`${outputTpl}\`, { ..._apiVars_${commandVar}, result: String(_apiFinal_${commandVar}) });
 await message.channel.send(_apiReply_${commandVar});
 } catch (_apiErr_${commandVar}) {
 await message.channel.send(_apiTpl_${commandVar}(\`${errTpl}\`, { error: _apiErr_${commandVar}.message }));
 }
}`;
 },
 },
 },
};
