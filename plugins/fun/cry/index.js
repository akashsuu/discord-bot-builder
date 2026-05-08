'use strict';

const DEFAULT_CRY_API = 'https://nekos.best/api/v2/cry';
const TIMEOUT_MS = 10_000;

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

async function fetchCryGif(apiUrl, timeoutMs) {
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

function buildCryEmbed(author, targetName, gifUrl, color, animeName, titleTemplate, descriptionTemplate) {
  const vars = { author, target: targetName, gif: gifUrl, anime: animeName || 'Unknown' };
  const title = applyTemplate(titleTemplate, vars);
  const description = applyTemplate(descriptionTemplate, vars);

  return {
    color,
    description,
    author: { name: title },
    image: { url: gifUrl },
    footer: { text: `Anime: ${animeName || 'Unknown'}` },
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  meta: {
    name: 'Anime Cry',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Fun cry command. Fetches an anime GIF from nekos.best and sends a rich embed.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    fun_cry: {
      label: 'Anime Cry',
      icon: 'CRY',
      color: '#3B82F6',
      description: 'Fetches an anime cry GIF from nekos.best and sends a styled message/embed.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'cry', required: true, description: 'Command word (without prefix)' },
        apiUrl: { type: 'string', default: DEFAULT_CRY_API, required: false, description: 'GIF API URL' },
        embedEnabled: { type: 'boolean', default: true, required: false, description: 'Send as embed' },
        embedColor: { type: 'string', default: '#3B82F6', required: false, description: 'Embed accent color (hex)' },
        titleTemplate: { type: 'string', default: '{author} cried with {target}!', required: false, description: 'Embed author title text' },
        descriptionTemplate: { type: 'string', default: '**{author}** is crying with **{target}**!', required: false, description: 'Embed description text' },
        plainTextTemplate: { type: 'string', default: '**{author}** is crying with **{target}**! {gif}', required: false, description: 'Plain message when embed is disabled' },
        noTargetMessage: { type: 'string', default: '❌ You need to mention someone to cry with! Usage: `{command} @user`', required: false },
        errorMessage: { type: 'string', default: '❌ Could not fetch a cry GIF. Try again later.', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data?.command || 'cry').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        const targetUser =
          ctx.flow?.targetUser ||
          ctx.flow?.targetMember?.user ||
          message.mentions.users?.first() ||
          null;

        if (!targetUser) {
          const noTargetMsg = applyTemplate(
            node.data?.noTargetMessage || '❌ You need to mention someone to cry with! Usage: `{command} @user`',
            { command: cmd }
          );
          try { await message.reply(noTargetMsg); } catch {}
          return false;
        }

        const apiUrl = (node.data?.apiUrl || DEFAULT_CRY_API).trim();
        let gifUrl;
        let animeName = '';
        try {
          const result = await fetchCryGif(apiUrl, TIMEOUT_MS);
          gifUrl = result.url;
          animeName = result.anime_name || result.animeName || '';
        } catch {
          const errMsg = node.data?.errorMessage || '❌ Could not fetch a cry GIF. Try again later.';
          try { await message.channel.send(errMsg); } catch {}
          return false;
        }

        if (!ctx.vars || typeof ctx.vars !== 'object') ctx.vars = {};
        ctx.vars.cryData = { url: gifUrl, author: message.author.username, target: targetUser.username };

        const embedEnabled = node.data?.embedEnabled !== false;
        const author = message.author.username;
        const target = targetUser.username;
        const titleTemplate = node.data?.titleTemplate || '{author} cried with {target}!';
        const descriptionTemplate = node.data?.descriptionTemplate || '**{author}** is crying with **{target}**!';
        const plainTextTemplate = node.data?.plainTextTemplate || '**{author}** is crying with **{target}**! {gif}';
        const color = parseInt((node.data?.embedColor || '#3B82F6').replace('#', ''), 16) || 0x3B82F6;
        const embed = buildCryEmbed(author, target, gifUrl, color, animeName, titleTemplate, descriptionTemplate);
        const plainText = applyTemplate(plainTextTemplate, { author, target, gif: gifUrl, anime: animeName || 'Unknown' });

        try {
          if (embedEnabled) {
            await message.channel.send({ embeds: [embed] });
          } else {
            await message.channel.send(plainText);
          }
        } catch {
          try { await message.channel.send(plainText); } catch {}
        }

        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'cry').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const embedEnabled = node.data?.embedEnabled !== false;
        const color = parseInt((node.data?.embedColor || '#3B82F6').replace('#', ''), 16) || 0x3B82F6;
        const apiUrl = (node.data?.apiUrl || DEFAULT_CRY_API).replace(/"/g, '\\"');
        const titleTemplate = (node.data?.titleTemplate || '{author} cried with {target}!')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');
        const descriptionTemplate = (node.data?.descriptionTemplate || '**{author}** is crying with **{target}**!')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');
        const plainTextTemplate = (node.data?.plainTextTemplate || '**{author}** is crying with **{target}**! {gif}')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}") && !message.author.bot) {
  const _cry_target = message.mentions.users.first();
  if (!_cry_target) {
    message.reply(\`❌ Mention someone to cry with! Usage: \\\`${cmd} @user\\\`\`).catch(() => {});
  } else {
    const _cry_ctrl = new AbortController();
    setTimeout(() => _cry_ctrl.abort(), 10000);
    fetch("${apiUrl}", { signal: _cry_ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(json => {
        const _cry_gif = json?.results?.[0]?.url;
        if (!_cry_gif) throw new Error("No GIF");
        const _cry_author = message.author.username;
        const _cry_name = _cry_target.username;
        const _cry_anime = json?.results?.[0]?.anime_name || "Unknown";
        const _cry_vars = { author: _cry_author, target: _cry_name, gif: _cry_gif, anime: _cry_anime };
        const _cry_apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_cry_vars[k] ?? m));
        const _cry_title = _cry_apply(\`${titleTemplate}\`);
        const _cry_desc = _cry_apply(\`${descriptionTemplate}\`);
        const _cry_plain = _cry_apply(\`${plainTextTemplate}\`);
        ${embedEnabled ? `
        message.channel.send({
          embeds: [{
            color: ${color},
            description: _cry_desc,
            author: { name: _cry_title },
            image: { url: _cry_gif },
            footer: { text: \`Anime: \${_cry_anime}\` },
            timestamp: new Date().toISOString(),
          }]
        }).catch(() => message.channel.send(_cry_plain).catch(() => {}));
        ` : `
        message.channel.send(_cry_plain).catch(() => {});
        `}
      })
      .catch(() => message.channel.send("❌ Could not fetch a cry GIF.").catch(() => {}));
  }
}`;
      },
    },
  },
};
