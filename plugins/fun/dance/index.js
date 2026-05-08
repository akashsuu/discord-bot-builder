'use strict';

const DEFAULT_DANCE_API = 'https://nekos.best/api/v2/dance';
const TIMEOUT_MS = 10_000;

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

async function fetchDanceGif(apiUrl, timeoutMs) {
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

function buildDanceEmbed(author, targetName, gifUrl, color, animeName, titleTemplate, descriptionTemplate) {
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
    name: 'Anime Dance',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Fun dance command. Fetches an anime GIF from nekos.best and sends a rich embed.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    fun_dance: {
      label: 'Anime Dance',
      icon: 'DNC',
      color: '#7B2FBE',
      description: 'Fetches an anime dance GIF from nekos.best and sends a purple embed showing who danced with whom.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'dance', required: true, description: 'Command word (without prefix)' },
        apiUrl: { type: 'string', default: DEFAULT_DANCE_API, required: false, description: 'GIF API URL' },
        embedEnabled: { type: 'boolean', default: true, required: false, description: 'Send as embed' },
        embedColor: { type: 'string', default: '#7B2FBE', required: false, description: 'Embed accent color (hex)' },
        titleTemplate: { type: 'string', default: '{author} danced with {target}!', required: false, description: 'Embed author title text' },
        descriptionTemplate: { type: 'string', default: '**{author}** is dancing with **{target}**!', required: false, description: 'Embed description text' },
        plainTextTemplate: { type: 'string', default: '**{author}** is dancing with **{target}**! {gif}', required: false, description: 'Plain message when embed is disabled' },
        noTargetMessage: { type: 'string', default: '❌ You need to mention someone to dance with! Usage: `{command} @user`', required: false },
        errorMessage: { type: 'string', default: '❌ Could not fetch a dance GIF. Try again later.', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot) return false;
        if (!message.guild) return false;

        const prefix = ctx?.prefix || '';
        const rawCmd = (node.data?.command || 'dance').trim();
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        if (!message.content.toLowerCase().startsWith(cmd.toLowerCase())) return false;

        const targetUser =
          ctx.flow?.targetUser ||
          ctx.flow?.targetMember?.user ||
          message.mentions.users?.first() ||
          null;

        if (!targetUser) {
          const noTargetMsg = applyTemplate(
            node.data?.noTargetMessage || '❌ You need to mention someone to dance with! Usage: `{command} @user`',
            { command: cmd }
          );
          try { await message.reply(noTargetMsg); } catch {}
          return false;
        }

        const apiUrl = (node.data?.apiUrl || DEFAULT_DANCE_API).trim();
        let gifUrl;
        let animeName = '';
        try {
          const result = await fetchDanceGif(apiUrl, TIMEOUT_MS);
          gifUrl = result.url;
          animeName = result.anime_name || result.animeName || '';
        } catch {
          const errMsg = node.data?.errorMessage || '❌ Could not fetch a dance GIF. Try again later.';
          try { await message.channel.send(errMsg); } catch {}
          return false;
        }

        if (!ctx.vars || typeof ctx.vars !== 'object') ctx.vars = {};
        ctx.vars.danceData = { url: gifUrl, author: message.author.username, target: targetUser.username };

        const embedEnabled = node.data?.embedEnabled !== false;
        const author = message.author.username;
        const target = targetUser.username;
        const titleTemplate = node.data?.titleTemplate || '{author} danced with {target}!';
        const descriptionTemplate = node.data?.descriptionTemplate || '**{author}** is dancing with **{target}**!';
        const plainTextTemplate = node.data?.plainTextTemplate || '**{author}** is dancing with **{target}**! {gif}';
        const color = parseInt((node.data?.embedColor || '#7B2FBE').replace('#', ''), 16) || 0x7B2FBE;
        const embed = buildDanceEmbed(author, target, gifUrl, color, animeName, titleTemplate, descriptionTemplate);
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
        const rawCmd = (node.data?.command || 'dance').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const embedEnabled = node.data?.embedEnabled !== false;
        const color = parseInt((node.data?.embedColor || '#7B2FBE').replace('#', ''), 16) || 0x7B2FBE;
        const apiUrl = (node.data?.apiUrl || DEFAULT_DANCE_API).replace(/"/g, '\\"');
        const titleTemplate = (node.data?.titleTemplate || '{author} danced with {target}!')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');
        const descriptionTemplate = (node.data?.descriptionTemplate || '**{author}** is dancing with **{target}**!')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');
        const plainTextTemplate = (node.data?.plainTextTemplate || '**{author}** is dancing with **{target}**! {gif}')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');

        return `
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}") && !message.author.bot) {
  const _dance_target = message.mentions.users.first();
  if (!_dance_target) {
    message.reply(\`❌ Mention someone to dance with! Usage: \\\`${cmd} @user\\\`\`).catch(() => {});
  } else {
        const _dance_ctrl = new AbortController();
        setTimeout(() => _dance_ctrl.abort(), 10000);
        fetch("${apiUrl}", { signal: _dance_ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(json => {
        const _dance_gif = json?.results?.[0]?.url;
        if (!_dance_gif) throw new Error("No GIF");
        const _dance_author = message.author.username;
        const _dance_name = _dance_target.username;
        const _dance_anime = json?.results?.[0]?.anime_name || "Unknown";
        const _dance_vars = { author: _dance_author, target: _dance_name, gif: _dance_gif, anime: _dance_anime };
        const _dance_apply = (tpl) => String(tpl || "").replace(/\\{(\\w+)\\}/g, (m, k) => (_dance_vars[k] ?? m));
        const _dance_title = _dance_apply(\`${titleTemplate}\`);
        const _dance_desc = _dance_apply(\`${descriptionTemplate}\`);
        const _dance_plain = _dance_apply(\`${plainTextTemplate}\`);
        ${embedEnabled ? `
        message.channel.send({
          embeds: [{
            color: ${color},
            description: _dance_desc,
            author: { name: _dance_title },
            image: { url: _dance_gif },
            footer: { text: \`Anime: \${_dance_anime}\` },
            timestamp: new Date().toISOString(),
          }]
        }).catch(() => message.channel.send(_dance_plain).catch(() => {}));
        ` : `
        message.channel.send(_dance_plain).catch(() => {});
        `}
      })
      .catch(() => message.channel.send("❌ Could not fetch a dance GIF.").catch(() => {}));
  }
}`;
      },
    },
  },
};
