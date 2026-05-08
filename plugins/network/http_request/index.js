'use strict';

// ── Helpers ──────────────────────────────────────────────────────────────────

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function buildRequestVars(message, ctx) {
  const args = ctx.args || [];
  return {
    user:          message?.author?.username  || '',
    tag:           message?.author?.tag       || '',
    id:            message?.author?.id        || '',
    mention:       message?.author ? `<@${message.author.id}>` : '',
    server:        message?.guild?.name       || '',
    serverId:      message?.guild?.id         || '',
    channel:       message?.channel?.name     || '',
    channelId:     message?.channel?.id       || '',
    args:          args.join(' '),
    arg0:          args[0] || '',
    arg1:          args[1] || '',
    arg2:          args[2] || '',
    target:        ctx.flow?.targetUser?.username || ctx.flow?.targetMember?.user?.username || '',
    targetId:      ctx.flow?.targetUser?.id   || ctx.flow?.targetMember?.id || '',
    targetMention: ctx.flow?.targetUser ? `<@${ctx.flow.targetUser.id}>` : '',
    reason:        ctx.flow?.reason           || '',
    command:       ctx.flow?.command          || '',
    message:       message?.content           || '',
    // Spread any previously stored ctx.vars so downstream chaining works
    ...(ctx.vars || {}),
  };
}

async function doFetch(method, url, headers, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const opts = { method, headers, signal: controller.signal };
    if (body && !['GET', 'HEAD'].includes(method)) opts.body = body;
    const res = await fetch(url, opts);
    const ct  = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

// ── Plugin ───────────────────────────────────────────────────────────────────

module.exports = {
  meta: {
    name:          'HTTP Request',
    version:       '1.0.0',
    author:        'Akashsuu',
    description:   'Generic HTTP request node. GET/POST/PUT/PATCH/DELETE with template variables in URL, headers, and body. Response stored in ctx.vars.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    network_http_request: {
      label:       'HTTP Request',
      icon:        '🌐',
      color:       '#1A6B3C',
      description: 'Sends an HTTP request. Template variables ({user}, {target}, {args}, …) are resolved before the request is made. Response is stored in ctx.vars[output].',
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [
        { id: 'out', label: 'Success', type: 'flow' },
        { id: 'err', label: 'Error',   type: 'flow' },
      ],

      configSchema: {
        method:       { type: 'string', default: 'GET',         required: true,  options: ['GET','POST','PUT','PATCH','DELETE'], description: 'HTTP method' },
        url:          { type: 'string', default: '',            required: true,  description: 'Request URL — supports {template} variables' },
        headers:      { type: 'string', default: '{}',         required: false, description: 'JSON headers object — supports {template} variables' },
        body:         { type: 'string', default: '',            required: false, description: 'Request body — supports {template} variables' },
        output:       { type: 'string', default: 'apiResponse', required: true,  description: 'ctx.vars key where the response is stored' },
        timeout:      { type: 'number', default: 10000, min: 1000, max: 60000,   description: 'Timeout in milliseconds' },
        errorMessage: { type: 'string', default: '',            required: false, description: 'Message sent on error ({error} = error text). Leave empty to silently fail.' },
      },

      async execute(node, message, ctx) {
        // ── 1. Config ─────────────────────────────────────────────────────────
        const method    = (node.data?.method    || 'GET').toUpperCase();
        const rawUrl    =  node.data?.url        || '';
        const rawHeaders=  node.data?.headers    || '{}';
        const rawBody   =  node.data?.body       || '';
        const outputVar = (node.data?.output     || 'apiResponse').trim();
        const timeoutMs = Number(node.data?.timeout ?? 10000);
        const errorMsg  =  node.data?.errorMessage || '';

        if (!rawUrl.trim()) return false;

        // ── 2. Template resolution ────────────────────────────────────────────
        const vars    = buildRequestVars(message, ctx);
        const url     = applyTemplate(rawUrl, vars);
        const body    = applyTemplate(rawBody, vars);

        let headers = {};
        try {
          headers = JSON.parse(applyTemplate(rawHeaders, vars));
        } catch { /* malformed JSON — proceed with empty headers */ }

        // ── 3. Ensure ctx.vars ────────────────────────────────────────────────
        if (!ctx.vars || typeof ctx.vars !== 'object') ctx.vars = {};

        // ── 4. Execute ────────────────────────────────────────────────────────
        try {
          const { ok, status, data } = await doFetch(method, url, headers, body, timeoutMs);
          ctx.vars[outputVar]            = data;
          ctx.vars[`${outputVar}_status`] = status;
          ctx.vars[`${outputVar}_ok`]     = ok;
          return true;
        } catch (err) {
          ctx.vars[outputVar]            = null;
          ctx.vars[`${outputVar}_error`] = err.message;

          if (errorMsg && message) {
            const text = applyTemplate(errorMsg, { ...vars, error: err.message });
            try {
              if (ctx.sendEmbed) await ctx.sendEmbed(message, node.data, text);
              else               await message.channel.send(text);
            } catch { /* swallow send errors */ }
          }
          return false;
        }
      },

      generateCode(node, prefix = '') {
        const method    = (node.data?.method   || 'GET').toUpperCase();
        const url       = (node.data?.url       || '').replace(/`/g, '\\`');
        const rawHeaders= (node.data?.headers   || '{}').replace(/`/g, '\\`');
        const rawBody   = (node.data?.body      || '').replace(/`/g, '\\`');
        const outputVar = (node.data?.output    || 'apiResponse').replace(/\W/g, '_');
        const timeout   = Number(node.data?.timeout ?? 10000);
        const noBody    = ['GET', 'HEAD'].includes(method);

        return `
// ── HTTP Request: ${method} ${url} ${'─'.repeat(Math.max(0, 30 - url.length))}
{
  const _tpl_${outputVar} = (s, v) =>
    String(s || '').replace(/\\{(\\w+)\\}/g, (m, k) => v[k] !== undefined ? String(v[k]) : m);
  const _vars_${outputVar} = {
    user:    message.author?.username || '',
    tag:     message.author?.tag      || '',
    id:      message.author?.id       || '',
    server:  message.guild?.name      || '',
    args:    (_args || []).join(' '),
    arg0:    (_args || [])[0] || '',
    target:  message.mentions.users.first()?.username || '',
    message: message.content || '',
  };
  const _url_${outputVar}     = _tpl_${outputVar}(\`${url}\`, _vars_${outputVar});
  const _headers_${outputVar} = JSON.parse(_tpl_${outputVar}(\`${rawHeaders}\`, _vars_${outputVar}));
  ${noBody ? '' : `const _body_${outputVar}    = _tpl_${outputVar}(\`${rawBody}\`, _vars_${outputVar});`}
  let ${outputVar} = null;
  try {
    const _ctrl_${outputVar} = new AbortController();
    setTimeout(() => _ctrl_${outputVar}.abort(), ${timeout});
    const _res_${outputVar} = await fetch(_url_${outputVar}, {
      method:  '${method}',
      headers: _headers_${outputVar},
      ${noBody ? '' : `body: _body_${outputVar},`}
      signal:  _ctrl_${outputVar}.signal,
    });
    const _ct_${outputVar} = _res_${outputVar}.headers.get('content-type') || '';
    ${outputVar} = _ct_${outputVar}.includes('application/json')
      ? await _res_${outputVar}.json()
      : await _res_${outputVar}.text();
  } catch (_e_${outputVar}) {
    console.error('[HTTP Request] ${url} failed:', _e_${outputVar}.message);
  }
}`;
      },
    },
  },
};
