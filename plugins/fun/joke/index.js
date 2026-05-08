'use strict';

const DEFAULT_JOKE_API = 'https://official-joke-api.appspot.com/random_joke';
const TIMEOUT_MS = 10_000;

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

async function fetchJoke(apiUrl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(apiUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const json = await res.json();
    const setup = String(json?.setup || '').trim();
    const punchline = String(json?.punchline || '').trim();
    if (!setup && !punchline) throw new Error('No joke in API response');
    return { setup, punchline, type: String(json?.type || 'general') };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  meta: {
    name: 'Random Joke',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Fetches a random joke from official-joke-api and sends it as message or embed.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    fun_joke: {
      label: 'Random Joke',
      icon: 'JK',
      color: '#F59E0B',
      description: 'Fetches a random joke from API and sends it in chat.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'joke', required: true, description: 'Command word (without prefix)' },
        apiUrl: { type: 'string', default: DEFAULT_JOKE_API, required: false, description: 'Joke API URL' },
        embedEnabled: { type: 'boolean', default: true, required: false, description: 'Send as embed' },
        embedColor: { type: 'string', default: '#F59E0B', required: false, description: 'Embed accent color (hex)' },
        titleTemplate: { type: 'string', default: '{author} asked for a joke!', required: false, description: 'Embed title text' },
        descriptionTemplate: { type: 'string', default: '{setup}\n\n{punchline}', required: false, description: 'Embed description text' },
        plainTextTemplate: { type: 'string', default: '{setup}\n{punchline}', required: false, description: 'Plain message when embed is disabled' },
        footerTemplate: { type: 'string', default: 'Type: {type}', required: false, description: 'Embed footer text' },
        errorMessage: { type: 'string', default: '❌ Could not fetch a joke. Try again later.', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data?.command || 'joke').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (message.content.trim().toLowerCase() !== cmd.toLowerCase()) return false;

        const apiUrl = (node.data?.apiUrl || DEFAULT_JOKE_API).trim();
        let joke;
        try {
          joke = await fetchJoke(apiUrl, TIMEOUT_MS);
        } catch {
          const errMsg = node.data?.errorMessage || '❌ Could not fetch a joke. Try again later.';
          try { await message.channel.send(errMsg); } catch {}
          return false;
        }

        const vars = {
          author: message.author.username,
          setup: joke.setup,
          punchline: joke.punchline,
          type: joke.type,
        };

        if (!ctx.vars || typeof ctx.vars !== 'object') ctx.vars = {};
        ctx.vars.jokeData = { ...vars };

        const embedEnabled = node.data?.embedEnabled !== false;
        const titleText = applyTemplate(node.data?.titleTemplate || '{author} asked for a joke!', vars);
        const descText = applyTemplate(node.data?.descriptionTemplate || '{setup}\n\n{punchline}', vars);
        const plainText = applyTemplate(node.data?.plainTextTemplate || '{setup}\n{punchline}', vars);
        const footerText = applyTemplate(node.data?.footerTemplate || 'Type: {type}', vars);
        const color = parseInt((node.data?.embedColor || '#F59E0B').replace('#', ''), 16) || 0xF59E0B;

        try {
          if (embedEnabled) {
            await message.channel.send({
              embeds: [{
                color,
                author: { name: titleText },
                description: descText,
                footer: { text: footerText },
                timestamp: new Date().toISOString(),
              }]
            });
          } else {
            await message.channel.send(plainText);
          }
        } catch {
          try { await message.channel.send(plainText); } catch {}
        }

        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'joke').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const embedEnabled = node.data?.embedEnabled !== false;
        const color = parseInt((node.data?.embedColor || '#F59E0B').replace('#', ''), 16) || 0xF59E0B;
        const apiUrl = (node.data?.apiUrl || DEFAULT_JOKE_API).replace(/"/g, '\\"');
        const titleTemplate = (node.data?.titleTemplate || '{author} asked for a joke!')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');
        const descriptionTemplate = (node.data?.descriptionTemplate || '{setup}\\n\\n{punchline}')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');
        const plainTextTemplate = (node.data?.plainTextTemplate || '{setup}\\n{punchline}')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');
        const footerTemplate = (node.data?.footerTemplate || 'Type: {type}')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
if (message.content.trim().toLowerCase() === "${cmd.toLowerCase()}" && !message.author.bot) {
  const _joke_ctrl = new AbortController();
  setTimeout(() => _joke_ctrl.abort(), 10000);
  fetch("${apiUrl}", { signal: _joke_ctrl.signal })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(json => {
      const _setup = String(json?.setup || "").trim();
      const _punch = String(json?.punchline || "").trim();
      if (!_setup && !_punch) throw new Error("No joke");
      const _vars = {
        author: message.author.username,
        setup: _setup,
        punchline: _punch,
        type: String(json?.type || "general"),
      };
      const _apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_vars[k] ?? m));
      const _title = _apply(\`${titleTemplate}\`);
      const _desc = _apply(\`${descriptionTemplate}\`);
      const _plain = _apply(\`${plainTextTemplate}\`);
      const _footer = _apply(\`${footerTemplate}\`);
      ${embedEnabled ? `
      message.channel.send({
        embeds: [{
          color: ${color},
          author: { name: _title },
          description: _desc,
          footer: { text: _footer },
          timestamp: new Date().toISOString(),
        }]
      }).catch(() => message.channel.send(_plain).catch(() => {}));
      ` : `
      message.channel.send(_plain).catch(() => {});
      `}
    })
    .catch(() => message.channel.send("❌ Could not fetch a joke.").catch(() => {}));
}`;
      },
    },
  },
};
