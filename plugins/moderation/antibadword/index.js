'use strict';

const { PermissionFlagsBits } = require('discord.js');

const DEFAULT_WORDS = ['badword1', 'badword2'];

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function parseWords(value) {
  const words = Array.isArray(value)
    ? value
    : String(value || '').split(',');

  const parsed = words
    .map((word) => String(word).trim())
    .filter(Boolean);

  return parsed.length ? parsed : DEFAULT_WORDS;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findBlockedWord(content, words, matchWholeWords) {
  const text = String(content || '');

  return words.find((word) => {
    if (matchWholeWords) {
      const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
      return regex.test(text);
    }

    return text.toLowerCase().includes(String(word).toLowerCase());
  }) || null;
}

function buildVars(message, word) {
  const now = new Date();

  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || 'Unknown#0000',
    id: message.author?.id || '0',
    mention: `<@${message.author?.id || '0'}>`,
    word,
    server: message.guild?.name || 'Unknown',
    channel: message.channel?.name || 'Unknown',
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 8),
  };
}

module.exports = {
  meta: {
    name: 'Anti Bad Word',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Deletes messages containing banned words and optionally warns the user.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    moderation_antibadword: {
      label: 'Anti Bad Word',
      icon: 'BAD',
      color: '#8E1B1B',
      description: 'Blocks configured bad words with optional whole-word matching, admin bypass, deletion, and warnings.',

      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        enabled: { type: 'boolean', default: true, required: false },
        words: {
          type: 'string',
          default: 'badword1, badword2',
          required: false,
          description: 'Comma-separated bad words to block'
        },
        matchWholeWords: { type: 'boolean', default: true, required: false },
        deleteMessage: { type: 'boolean', default: true, required: false },
        warnUser: { type: 'boolean', default: true, required: false },
        ignoreAdmins: { type: 'boolean', default: true, required: false },
        output: {
          type: 'string',
          default: '{mention}, that word is not allowed here.\nBlocked word: `{word}`',
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

        const words = parseWords(node.data?.words);
        const blockedWord = findBlockedWord(
          message.content,
          words,
          node.data?.matchWholeWords !== false
        );

        if (!blockedWord) return false;

        if (node.data?.deleteMessage !== false) {
          await message.delete().catch(() => {});
        }

        if (node.data?.warnUser !== false) {
          const vars = buildVars(message, blockedWord);
          const outputTpl = node.data?.output || '{mention}, that word is not allowed here.\nBlocked word: `{word}`';
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
        const words = JSON.stringify(parseWords(node.data?.words));
        const output = (node.data?.output || '{mention}, that word is not allowed here.\nBlocked word: `{word}`')
          .replace(/\\/g, '\\\\')
          .replace(/`/g, '\\`');
        const matchWholeWords = node.data?.matchWholeWords !== false;
        const deleteMessage = node.data?.deleteMessage !== false;
        const warnUser = node.data?.warnUser !== false;
        const ignoreAdmins = node.data?.ignoreAdmins !== false;

        return `
// Anti Bad Word
{
  const _abw_words = ${words};
  const _abw_escape = (value) => String(value).replace(/[.*+?^${'${'}}()|[\\]\\\\]/g, '\\\\$&');
  const _abw_found = _abw_words.find((word) => {
    ${matchWholeWords
      ? 'return new RegExp(`\\\\b${_abw_escape(word)}\\\\b`, "i").test(message.content || "");'
      : 'return String(message.content || "").toLowerCase().includes(String(word).toLowerCase());'}
  });

  if (_abw_found${ignoreAdmins ? ' && !message.member?.permissions.has("Administrator")' : ''}) {
    ${deleteMessage ? 'try { await message.delete(); } catch {}' : ''}
    ${warnUser ? `
    const _abw_now = new Date();
    const _abw_vars = {
      user: message.author?.username,
      tag: message.author?.tag,
      id: message.author?.id,
      mention: \`<@\${message.author?.id}>\`,
      word: _abw_found,
      server: message.guild?.name,
      channel: message.channel?.name,
      date: _abw_now.toISOString().slice(0, 10),
      time: _abw_now.toTimeString().slice(0, 8),
    };
    const _abw_apply = (tpl) => tpl.replace(/\\{(\\w+)\\}/g, (m, k) => _abw_vars[k] ?? m);
    message.channel.send(_abw_apply(\`${output}\`)).catch(() => {});
    ` : ''}
  }
}
`;
      },
    },
  },
};
