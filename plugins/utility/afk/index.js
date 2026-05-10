'use strict';

const afkUsers = new Map();

function stateKey(guildId, userId) {
  return `${guildId || 'dm'}:${userId}`;
}

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'afk').trim() || 'afk';
  const effectivePrefix = String(prefix || '!');
  return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function matchesCommand(content, command) {
  const text = String(content || '').trim();
  const cmd = String(command || '').trim();
  if (!text || !cmd) return false;
  if (!text.toLowerCase().startsWith(cmd.toLowerCase())) return false;
  const rest = text.slice(cmd.length);
  return !rest || /^\s/.test(rest);
}

function commandArgs(content, command) {
  return String(content || '').trim().slice(String(command || '').length).trim();
}

function formatDuration(ms) {
  const totalSeconds = Math.max(1, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function userTag(user) {
  if (!user) return 'Unknown#0000';
  if (user.tag) return user.tag;
  return user.discriminator ? `${user.username}#${user.discriminator}` : user.username;
}

function varsFor(message, record, afkUser) {
  const author = message.author;
  const now = Date.now();
  const since = record?.since ? formatDuration(now - record.since) : '0s';
  const afk = afkUser || author;
  return {
    user: author?.username || 'Unknown',
    tag: userTag(author),
    id: author?.id || '',
    mention: author?.id ? `<@${author.id}>` : '@user',
    afkUser: afk?.username || record?.username || 'Unknown',
    afkTag: userTag(afk),
    afkId: afk?.id || record?.userId || '',
    afkMention: (afk?.id || record?.userId) ? `<@${afk?.id || record.userId}>` : '@afk-user',
    reason: record?.reason || 'AFK',
    since,
    time: record?.since ? new Date(record.since).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
    date: record?.since ? new Date(record.since).toLocaleDateString('en-US') : '',
    server: message.guild?.name || '',
    channel: message.channel?.name || '',
  };
}

async function sendConfigured(message, data, text, ctx) {
  if (!message?.channel || !text) return;
  const embedData = {
    ...data,
    embedTitle: data?.embedTitle || 'AFK',
  };
  if (ctx?.sendEmbed) {
    await ctx.sendEmbed(message, embedData, text);
    return;
  }
  await message.channel.send(text);
}

module.exports = {
  meta: {
    name: 'AFK',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Set your AFK status with an optional reason and notify users who mention AFK members.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    util_afk: {
      label: 'AFK',
      icon: 'AFK',
      color: '#5865F2',
      description: 'Prefix command that sets AFK status, clears it when the user returns, and replies when AFK users are mentioned.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'afk', required: true },
        defaultReason: { type: 'string', default: 'AFK', required: false },
        setMessage: { type: 'string', default: '{mention} is now AFK: {reason}', required: false },
        mentionMessage: { type: 'string', default: '{afkMention} is AFK: {reason} (since {since})', required: false },
        returnMessage: { type: 'string', default: 'Welcome back {mention}, I removed your AFK status. You were AFK for {since}.', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;

        const data = node.data || {};
        const command = commandWithPrefix(data.command, ctx?.prefix || '!');
        const guildId = message.guild.id;
        const authorId = message.author.id;
        const authorKey = stateKey(guildId, authorId);

        if (matchesCommand(message.content, command)) {
          const reason = commandArgs(message.content, command) || data.defaultReason || 'AFK';
          const record = {
            guildId,
            userId: authorId,
            username: message.author.username,
            reason,
            since: Date.now(),
          };
          afkUsers.set(authorKey, record);
          const text = applyTemplate(data.setMessage || '{mention} is now AFK: {reason}', varsFor(message, record, message.author));
          await sendConfigured(message, data, text, ctx);
          return true;
        }

        const authorRecord = afkUsers.get(authorKey);
        if (authorRecord) {
          afkUsers.delete(authorKey);
          const text = applyTemplate(
            data.returnMessage || 'Welcome back {mention}, I removed your AFK status. You were AFK for {since}.',
            varsFor(message, authorRecord, message.author)
          );
          await sendConfigured(message, data, text, ctx);
        }

        const mentionedUsers = message.mentions?.users;
        if (mentionedUsers?.size) {
          const seen = new Set();
          for (const [, user] of mentionedUsers) {
            if (!user?.id || user.id === authorId || seen.has(user.id)) continue;
            seen.add(user.id);
            const record = afkUsers.get(stateKey(guildId, user.id));
            if (!record) continue;
            const text = applyTemplate(
              data.mentionMessage || '{afkMention} is AFK: {reason} (since {since})',
              varsFor(message, record, user)
            );
            await sendConfigured(message, data, text, ctx);
          }
        }

        return false;
      },

      generateCode(node, prefix = '') {
        const rawCmd = String(node.data?.command || 'afk').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `
// AFK command
const __afkUsers = global.__afkUsers || (global.__afkUsers = new Map());
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const __rest = message.content.slice("${cmd}".length);
  if (!__rest || /^\\s/.test(__rest)) {
    const __reason = __rest.trim() || "AFK";
    __afkUsers.set(message.guild.id + ":" + message.author.id, { reason: __reason, since: Date.now(), userId: message.author.id });
    message.channel.send("<@" + message.author.id + "> is now AFK: " + __reason);
  }
}`;
      },
    },
  },
};
