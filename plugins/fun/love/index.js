'use strict';

const DEFAULT_LOVE_API = 'https://nekos.best/api/v2/love';
const TIMEOUT_MS = 10_000;

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== null && vars[k] !== undefined ? String(vars[k]) : m
  );
}

async function fetchLoveGif(apiUrl, timeoutMs) {
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
    name: 'Anime Love',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Fun love command. Fetches an anime GIF from nekos.best and sends a rich embed.',
    engineVersion: '>=1.0.0',
  },
  nodes: {
    fun_love: {
      label: 'Anime Love',
      icon: 'LUV',
      color: '#EF4444',
      description: 'Fetches an anime love GIF from nekos.best and sends a styled message/embed.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],
      configSchema: {
        command: { type: 'string', default: 'love', required: true },
        apiUrl: { type: 'string', default: DEFAULT_LOVE_API, required: false },
        embedEnabled: { type: 'boolean', default: true, required: false },
        embedColor: { type: 'string', default: '#EF4444', required: false },
        titleTemplate: { type: 'string', default: '{author} sent love to {target}!', required: false },
        descriptionTemplate: { type: 'string', default: '**{author}** is showing love to **{target}**!', required: false },
        plainTextTemplate: { type: 'string', default: '**{author}** is showing love to **{target}**! {gif}', required: false },
        noTargetMessage: { type: 'string', default: '❌ You need to mention someone to love! Usage: `{command} @user`', required: false },
        errorMessage: { type: 'string', default: '❌ Could not fetch a love GIF. Try again later.', required: false },
      },
      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;
        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data?.command || 'love').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        const targetUser = ctx.flow?.targetUser || ctx.flow?.targetMember?.user || message.mentions.users?.first() || null;
        if (!targetUser) {
          try { await message.reply(applyTemplate(node.data?.noTargetMessage || '❌ You need to mention someone to love! Usage: `{command} @user`', { command: cmd })); } catch {}
          return false;
        }

        let gifUrl = '';
        let animeName = '';
        try {
          const result = await fetchLoveGif((node.data?.apiUrl || DEFAULT_LOVE_API).trim(), TIMEOUT_MS);
          gifUrl = result.url;
          animeName = result.anime_name || result.animeName || '';
        } catch {
          try { await message.channel.send(node.data?.errorMessage || '❌ Could not fetch a love GIF. Try again later.'); } catch {}
          return false;
        }

        const vars = { author: message.author.username, target: targetUser.username, gif: gifUrl, anime: animeName || 'Unknown' };
        const embedEnabled = node.data?.embedEnabled !== false;
        const color = parseInt((node.data?.embedColor || '#EF4444').replace('#', ''), 16) || 0xEF4444;
        const title = applyTemplate(node.data?.titleTemplate || '{author} sent love to {target}!', vars);
        const desc = applyTemplate(node.data?.descriptionTemplate || '**{author}** is showing love to **{target}**!', vars);
        const plain = applyTemplate(node.data?.plainTextTemplate || '**{author}** is showing love to **{target}**! {gif}', vars);

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
        const rawCmd = (node.data?.command || 'love').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const embedEnabled = node.data?.embedEnabled !== false;
        const color = parseInt((node.data?.embedColor || '#EF4444').replace('#', ''), 16) || 0xEF4444;
        const apiUrl = (node.data?.apiUrl || DEFAULT_LOVE_API).replace(/"/g, '\\"');
        const titleTemplate = (node.data?.titleTemplate || '{author} sent love to {target}!').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const descriptionTemplate = (node.data?.descriptionTemplate || '**{author}** is showing love to **{target}**!').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const plainTextTemplate = (node.data?.plainTextTemplate || '**{author}** is showing love to **{target}**! {gif}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}") && !message.author.bot) {
  const _love_target = message.mentions.users.first();
  if (!_love_target) {
    message.reply(\`❌ Mention someone to love! Usage: \\\`${cmd} @user\\\`\`).catch(() => {});
  } else {
    const _love_ctrl = new AbortController();
    setTimeout(() => _love_ctrl.abort(), 10000);
    fetch("${apiUrl}", { signal: _love_ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(json => {
        const _love_gif = json?.results?.[0]?.url;
        if (!_love_gif) throw new Error("No GIF");
        const _love_anime = json?.results?.[0]?.anime_name || "Unknown";
        const _love_vars = { author: message.author.username, target: _love_target.username, gif: _love_gif, anime: _love_anime };
        const _love_apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_love_vars[k] ?? m));
        const _love_title = _love_apply(\`${titleTemplate}\`);
        const _love_desc = _love_apply(\`${descriptionTemplate}\`);
        const _love_plain = _love_apply(\`${plainTextTemplate}\`);
        ${embedEnabled ? `
        message.channel.send({ embeds: [{ color: ${color}, author: { name: _love_title }, description: _love_desc, image: { url: _love_gif }, footer: { text: \`Anime: \${_love_anime}\` }, timestamp: new Date().toISOString() }] }).catch(() => message.channel.send(_love_plain).catch(() => {}));
        ` : `
        message.channel.send(_love_plain).catch(() => {});
        `}
      })
      .catch(() => message.channel.send("❌ Could not fetch a love GIF.").catch(() => {}));
  }
}`;
      },
    },
  },
};
