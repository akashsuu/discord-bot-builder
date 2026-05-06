'use strict';

const { PermissionFlagsBits } = require('discord.js');

const LINK_REGEX = /(?:https?:\/\/|www\.)[^\s<>()]+|(?:discord\.gg|discord(?:app)?\.com\/invite)\/[^\s<>()]+/i;

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function getLinkHost(rawLink) {
  const normalized = rawLink.startsWith('www.') ? `https://${rawLink}` : rawLink;

  try {
    return new URL(normalized).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function parseAllowDomains(value) {
  return String(value || '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, ''))
    .filter(Boolean);
}

function isAllowedDomain(link, allowDomains) {
  if (!allowDomains.length) return false;

  const host = getLinkHost(link);
  if (!host) return false;

  return allowDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function buildVars(message, link) {
  const now = new Date();

  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || 'Unknown#0000',
    id: message.author?.id || '0',
    mention: `<@${message.author?.id || '0'}>`,
    link,
    server: message.guild?.name || 'Unknown',
    channel: message.channel?.name || 'Unknown',
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 8),
  };
}

function findBlockedLink(content, blockDiscordInvites, allowDomains) {
  const matches = String(content || '').match(new RegExp(LINK_REGEX.source, 'gi')) || [];

  for (const link of matches) {
    const isInvite = /discord\.gg|discord(?:app)?\.com\/invite/i.test(link);

    if (isInvite && blockDiscordInvites) return link;
    if (!isInvite && !isAllowedDomain(link, allowDomains)) return link;
  }

  return null;
}

module.exports = {
  meta: {
    name: 'Anti Link',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Deletes messages containing links or Discord invite links.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    moderation_antilink: {
      label: 'Anti Link',
      icon: 'LINK',
      color: '#22577A',
      description: 'Blocks links in messages with admin bypass, allowlisted domains, and optional warning output.',

      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        enabled: { type: 'boolean', default: true, required: false },
        deleteMessage: { type: 'boolean', default: true, required: false },
        warnUser: { type: 'boolean', default: true, required: false },
        ignoreAdmins: { type: 'boolean', default: true, required: false },
        blockDiscordInvites: { type: 'boolean', default: true, required: false },
        allowDomains: {
          type: 'string',
          default: '',
          required: false,
          description: 'Comma-separated domains to allow, for example youtube.com, github.com'
        },
        output: {
          type: 'string',
          default: '{mention}, links are not allowed here.\nBlocked: `{link}`',
          required: false
        },
      },

      async execute(ctx) {
        const { node, message } = ctx;

        if (node.data?.enabled === false) return false;
        if (!message || !message.guild || message.author?.bot) return false;

        if (
          node.data?.ignoreAdmins !== false &&
          message.member?.permissions.has(PermissionFlagsBits.Administrator)
        ) {
          return false;
        }

        const allowDomains = parseAllowDomains(node.data?.allowDomains);
        const blockedLink = findBlockedLink(
          message.content,
          node.data?.blockDiscordInvites !== false,
          allowDomains
        );

        if (!blockedLink) return false;

        if (node.data?.deleteMessage !== false) {
          await message.delete().catch(() => {});
        }

        if (node.data?.warnUser !== false) {
          const vars = buildVars(message, blockedLink);
          const outputTpl = node.data?.output || '{mention}, links are not allowed here.\nBlocked: `{link}`';
          const text = applyTemplate(outputTpl, vars);

          try {
            if (ctx.sendEmbed) {
              await ctx.sendEmbed(message, node.data, text);
            } else {
              await message.channel.send(text);
            }
          } catch {
            await message.channel.send(text).catch(() => {});
          }
        }

        return true;
      },

      generateCode(node) {
        const allowDomains = JSON.stringify(parseAllowDomains(node.data?.allowDomains));
        const output = (node.data?.output || '{mention}, links are not allowed here.\nBlocked: `{link}`')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');
        const deleteMessage = node.data?.deleteMessage !== false;
        const warnUser = node.data?.warnUser !== false;
        const ignoreAdmins = node.data?.ignoreAdmins !== false;
        const blockDiscordInvites = node.data?.blockDiscordInvites !== false;

        return `
// Anti Link
{
  const _al_allow = ${allowDomains};
  const _al_matches = String(message.content || '').match(/(?:https?:\\/\\/|www\\.)[^\\s<>()]+|(?:discord\\.gg|discord(?:app)?\\.com\\/invite)\\/[^\\s<>()]+/gi) || [];
  const _al_host = (link) => {
    try {
      const _u = new URL(link.startsWith('www.') ? 'https://' + link : link);
      return _u.hostname.toLowerCase().replace(/^www\\./, '');
    } catch { return ''; }
  };
  const _al_allowed = (link) => {
    const _h = _al_host(link);
    return _h && _al_allow.some((d) => _h === d || _h.endsWith('.' + d));
  };
  const _al_blocked = _al_matches.find((link) => {
    const _invite = /discord\\.gg|discord(?:app)?\\.com\\/invite/i.test(link);
    if (_invite) return ${blockDiscordInvites};
    return !_al_allowed(link);
  });

  if (_al_blocked${ignoreAdmins ? ' && !message.member?.permissions.has("Administrator")' : ''}) {
    ${deleteMessage ? 'try { await message.delete(); } catch {}' : ''}
    ${warnUser ? `
    const _al_now = new Date();
    const _al_vars = {
      user: message.author?.username,
      tag: message.author?.tag,
      id: message.author?.id,
      mention: \`<@\${message.author?.id}>\`,
      link: _al_blocked,
      server: message.guild?.name,
      channel: message.channel?.name,
      date: _al_now.toISOString().slice(0, 10),
      time: _al_now.toTimeString().slice(0, 8),
    };
    const _al_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _al_vars[k] ?? m);
    message.channel.send(_al_apply(\`${output}\`)).catch(() => {});
    ` : ''}
  }
}
`;
      },
    },
  },
};
