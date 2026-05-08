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

function buildDanceEmbed(author, targetName, gifUrl, color, isSelf) {
  const description = isSelf
    ? `**${author}** is dancing solo!`
    : `**${author}** is dancing with **${targetName}**!`;

  const title = isSelf
    ? `${author} started dancing!`
    : `${author} danced with ${targetName}!`;

  return {
    color,
    description,
    author: { name: title },
    image: { url: gifUrl },
    footer: { text: 'Powered by nekos.best' },
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
        embedColor: { type: 'string', default: '#7B2FBE', required: false, description: 'Embed accent color (hex)' },
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

        const isSelf = targetUser.id === message.author.id;
        const apiUrl = (node.data?.apiUrl || DEFAULT_DANCE_API).trim();
        let gifUrl;
        try {
          const result = await fetchDanceGif(apiUrl, TIMEOUT_MS);
          gifUrl = result.url;
        } catch {
          const errMsg = node.data?.errorMessage || '❌ Could not fetch a dance GIF. Try again later.';
          try { await message.channel.send(errMsg); } catch {}
          return false;
        }

        if (!ctx.vars || typeof ctx.vars !== 'object') ctx.vars = {};
        ctx.vars.danceData = { url: gifUrl, author: message.author.username, target: targetUser.username };

        const color = parseInt((node.data?.embedColor || '#7B2FBE').replace('#', ''), 16) || 0x7B2FBE;
        const embed = buildDanceEmbed(message.author.username, targetUser.username, gifUrl, color, isSelf);

        try {
          await message.channel.send({ embeds: [embed] });
        } catch {
          const fallback = isSelf
            ? `**${message.author.username}** is dancing solo! ${gifUrl}`
            : `**${message.author.username}** is dancing with **${targetUser.username}**! ${gifUrl}`;
          try { await message.channel.send(fallback); } catch {}
        }

        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = (node.data?.command || 'dance').replace(/"/g, '\\"');
        const cmd = (prefix && !rawCmd.startsWith(prefix)) ? prefix + rawCmd : rawCmd;
        const color = parseInt((node.data?.embedColor || '#7B2FBE').replace('#', ''), 16) || 0x7B2FBE;
        const apiUrl = (node.data?.apiUrl || DEFAULT_DANCE_API).replace(/"/g, '\\"');

        return `
if (message.content.toLowerCase().startsWith("${cmd.toLowerCase()}") && !message.author.bot) {
  const _dance_target = message.mentions.users.first();
  if (!_dance_target) {
    message.reply(\`❌ Mention someone to dance with! Usage: \\\`${cmd} @user\\\`\`).catch(() => {});
  } else {
    const _dance_isSelf = _dance_target.id === message.author.id;
    const _dance_ctrl = new AbortController();
    setTimeout(() => _dance_ctrl.abort(), 10000);
    fetch("${apiUrl}", { signal: _dance_ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(json => {
        const _dance_gif = json?.results?.[0]?.url;
        if (!_dance_gif) throw new Error("No GIF");
        const _dance_author = message.author.username;
        const _dance_name = _dance_target.username;
        const _dance_desc = _dance_isSelf
          ? \`**\${_dance_author}** is dancing solo!\`
          : \`**\${_dance_author}** is dancing with **\${_dance_name}**!\`;
        message.channel.send({
          embeds: [{
            color: ${color},
            description: _dance_desc,
            author: { name: _dance_isSelf ? \`\${_dance_author} started dancing!\` : \`\${_dance_author} danced with \${_dance_name}!\` },
            image: { url: _dance_gif },
            footer: { text: "Powered by nekos.best" },
            timestamp: new Date().toISOString(),
          }]
        }).catch(() => {});
      })
      .catch(() => message.channel.send("❌ Could not fetch a dance GIF.").catch(() => {}));
  }
}`;
      },
    },
  },
};
