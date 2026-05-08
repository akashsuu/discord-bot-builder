'use strict';

const DEFAULT_KISS_API = 'https://nekos.best/api/v2/kiss';
const TIMEOUT_MS = 10_000;

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

async function fetchKissGif(apiUrl, timeoutMs) {
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

function buildKissEmbed(author, targetName, gifUrl, color, animeName, titleTemplate, descriptionTemplate) {
  const vars = { author, target: targetName, gif: gifUrl, anime: animeName || 'Unknown' };
  return {
    color,
    description: applyTemplate(descriptionTemplate, vars),
    author: { name: applyTemplate(titleTemplate, vars) },
    image: { url: gifUrl },
    footer: { text: `Anime: ${animeName || 'Unknown'}` },
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  meta: {
    name: 'Anime Kiss',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Fun kiss command. Fetches an anime GIF from nekos.best and sends a rich embed.',
    engineVersion: '>=1.0.0',
  },
  nodes: {
    fun_kiss: {
      label: 'Anime Kiss',
      icon: 'KSS',
      color: '#F43F5E',
      description: 'Fetches an anime kiss GIF from nekos.best and sends a styled message/embed.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],
      configSchema: {
        command: { type: 'string', default: 'kiss', required: true },
        apiUrl: { type: 'string', default: DEFAULT_KISS_API, required: false },
        embedEnabled: { type: 'boolean', default: true, required: false },
        embedColor: { type: 'string', default: '#F43F5E', required: false },
        titleTemplate: { type: 'string', default: '{author} kissed {target}!', required: false },
        descriptionTemplate: { type: 'string', default: '**{author}** is kissing **{target}**!', required: false },
        plainTextTemplate: { type: 'string', default: '**{author}** is kissing **{target}**! {gif}', required: false },
        noTargetMessage: { type: 'string', default: '❌ You need to mention someone to kiss! Usage: `{command} @user`', required: false },
        errorMessage: { type: 'string', default: '❌ Could not fetch a kiss GIF. Try again later.', required: false },
      },
      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;
        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data?.command || 'kiss').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        const targetUser = ctx.flow?.targetUser || ctx.flow?.targetMember?.user || message.mentions.users?.first() || null;
        if (!targetUser) {
          try { await message.reply(applyTemplate(node.data?.noTargetMessage || '❌ You need to mention someone to kiss! Usage: `{command} @user`', { command: cmd })); } catch {}
          return false;
        }

        let gifUrl = '';
        let animeName = '';
        try {
          const result = await fetchKissGif((node.data?.apiUrl || DEFAULT_KISS_API).trim(), TIMEOUT_MS);
          gifUrl = result.url;
          animeName = result.anime_name || result.animeName || '';
        } catch {
          try { await message.channel.send(node.data?.errorMessage || '❌ Could not fetch a kiss GIF. Try again later.'); } catch {}
          return false;
        }

        const vars = { author: message.author.username, target: targetUser.username, gif: gifUrl, anime: animeName || 'Unknown' };
        const embedEnabled = node.data?.embedEnabled !== false;
        const color = parseInt((node.data?.embedColor || '#F43F5E').replace('#', ''), 16) || 0xF43F5E;
        const embed = buildKissEmbed(vars.author, vars.target, gifUrl, color, animeName, node.data?.titleTemplate || '{author} kissed {target}!', node.data?.descriptionTemplate || '**{author}** is kissing **{target}**!');
        const plainText = applyTemplate(node.data?.plainTextTemplate || '**{author}** is kissing **{target}**! {gif}', vars);

        try {
          if (embedEnabled) await message.channel.send({ embeds: [embed] });
          else await message.channel.send(plainText);
        } catch {
          try { await message.channel.send(plainText); } catch {}
        }
        return true;
      },
      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'kiss').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const embedEnabled = node.data?.embedEnabled !== false;
        const color = parseInt((node.data?.embedColor || '#F43F5E').replace('#', ''), 16) || 0xF43F5E;
        const apiUrl = (node.data?.apiUrl || DEFAULT_KISS_API).replace(/"/g, '\\"');
        const titleTemplate = (node.data?.titleTemplate || '{author} kissed {target}!').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const descriptionTemplate = (node.data?.descriptionTemplate || '**{author}** is kissing **{target}**!').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        const plainTextTemplate = (node.data?.plainTextTemplate || '**{author}** is kissing **{target}**! {gif}').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        return `
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}") && !message.author.bot) {
  const _kiss_target = message.mentions.users.first();
  if (!_kiss_target) {
    message.reply(\`❌ Mention someone to kiss! Usage: \\\`${cmd} @user\\\`\`).catch(() => {});
  } else {
    const _kiss_ctrl = new AbortController();
    setTimeout(() => _kiss_ctrl.abort(), 10000);
    fetch("${apiUrl}", { signal: _kiss_ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(json => {
        const _kiss_gif = json?.results?.[0]?.url;
        if (!_kiss_gif) throw new Error("No GIF");
        const _kiss_anime = json?.results?.[0]?.anime_name || "Unknown";
        const _kiss_vars = { author: message.author.username, target: _kiss_target.username, gif: _kiss_gif, anime: _kiss_anime };
        const _kiss_apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_kiss_vars[k] ?? m));
        const _kiss_title = _kiss_apply(\`${titleTemplate}\`);
        const _kiss_desc = _kiss_apply(\`${descriptionTemplate}\`);
        const _kiss_plain = _kiss_apply(\`${plainTextTemplate}\`);
        ${embedEnabled ? `
        message.channel.send({ embeds: [{ color: ${color}, author: { name: _kiss_title }, description: _kiss_desc, image: { url: _kiss_gif }, footer: { text: \`Anime: \${_kiss_anime}\` }, timestamp: new Date().toISOString() }] }).catch(() => message.channel.send(_kiss_plain).catch(() => {}));
        ` : `
        message.channel.send(_kiss_plain).catch(() => {});
        `}
      })
      .catch(() => message.channel.send("❌ Could not fetch a kiss GIF.").catch(() => {}));
  }
}`;
      },
    },
  },
};
