'use strict';

const { EmbedBuilder } = require('discord.js');

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'userinfo').trim() || 'userinfo';
  const effectivePrefix = String(prefix || '!');
  return !raw.startsWith(effectivePrefix) ? `${effectivePrefix}${raw}` : raw;
}

function splitAliases(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchCommand(content, commands) {
  const text = String(content || '').trim();
  for (const command of commands) {
    const cmd = String(command || '').trim();
    if (!cmd) continue;
    if (!text.toLowerCase().startsWith(cmd.toLowerCase())) continue;
    const rest = text.slice(cmd.length);
    if (!rest || /^\s/.test(rest)) return { args: rest.trim() };
  }
  return null;
}

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== null && vars[key] !== undefined
      ? String(vars[key])
      : match
  );
}

function hexToInt(hex) {
  const parsed = parseInt(String(hex || '#3B82F6').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0x3B82F6 : parsed;
}

function fmt(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function discordDate(date) {
  const value = date instanceof Date ? date : new Date(date || Date.now());
  if (Number.isNaN(value.getTime())) return 'Unknown';
  const seconds = Math.floor(value.getTime() / 1000);
  return `<t:${seconds}:D> (<t:${seconds}:R>)`;
}

function boolText(value) {
  return value ? 'Yes' : 'No';
}

function userAvatar(user) {
  if (!user) return '';
  if (typeof user.displayAvatarURL === 'function') {
    return user.displayAvatarURL({ size: 256, extension: 'png', dynamic: true });
  }
  if (typeof user.avatarURL === 'function') {
    return user.avatarURL({ size: 256, extension: 'png', dynamic: true });
  }
  return user.avatarURL || '';
}

async function resolveTarget(message, args) {
  const mentionedMember = message.mentions?.members?.first?.();
  if (mentionedMember) return mentionedMember;

  const mentionedUser = message.mentions?.users?.first?.();
  if (mentionedUser && message.guild?.members?.fetch) {
    try { return await message.guild.members.fetch(mentionedUser.id); }
    catch { return { user: mentionedUser }; }
  }

  const id = String(args || '').match(/\d{15,25}/)?.[0];
  if (id) {
    const cached = message.guild?.members?.cache?.get?.(id);
    if (cached) return cached;
    if (message.guild?.members?.fetch) {
      try { return await message.guild.members.fetch(id); }
      catch { /* Try client user cache below. */ }
    }
    const cachedUser = message.client?.users?.cache?.get?.(id);
    if (cachedUser) return { user: cachedUser };
  }

  return message.member || { user: message.author };
}

async function varsFor(message, member) {
  const user = member?.user || message.author || {};
  let fetchedUser = user;
  if (typeof user.fetch === 'function') {
    try { fetchedUser = await user.fetch(); }
    catch { fetchedUser = user; }
  }

  const roles = member?.roles?.cache;
  const roleList = roles
    ? roles
        .filter((role) => role.id !== message.guild?.id)
        .sort((a, b) => (b.position || 0) - (a.position || 0))
        .map((role) => role.toString?.() || role.name)
    : [];
  const topRole = roleList[0] || 'None';
  const joined = member?.joinedAt || member?.joinedTimestamp;
  const presence = member?.presence?.status || 'offline';
  const avatarUrl = userAvatar(fetchedUser || user);
  const bannerUrl = typeof fetchedUser?.bannerURL === 'function'
    ? fetchedUser.bannerURL({ size: 1024, extension: 'png', dynamic: true }) || ''
    : '';

  return {
    user: message.author?.username || 'Unknown',
    tag: message.author?.tag || message.author?.username || 'Unknown',
    id: message.author?.id || '',
    mention: message.author?.id ? `<@${message.author.id}>` : '@user',
    server: message.guild?.name || 'Server',
    serverId: message.guild?.id || '',
    channel: message.channel?.name || '',
    target: user.tag || user.username || 'Unknown',
    targetName: member?.displayName || user.globalName || user.username || 'Unknown',
    targetUsername: user.username || 'Unknown',
    targetGlobalName: user.globalName || user.username || 'Unknown',
    targetTag: user.tag || user.username || 'Unknown',
    targetId: user.id || '',
    targetMention: user.id ? `<@${user.id}>` : '@user',
    targetBot: boolText(user.bot),
    createdAt: user.createdAt ? discordDate(user.createdAt) : (user.createdTimestamp ? discordDate(user.createdTimestamp) : 'Unknown'),
    joinedAt: joined ? discordDate(joined) : 'Not in server',
    roleCount: fmt(roleList.length),
    roles: roleList.length ? roleList.slice(0, 12).join(' ') : 'None',
    topRole,
    status: presence.charAt(0).toUpperCase() + presence.slice(1),
    avatarUrl,
    bannerUrl,
  };
}

module.exports = {
  meta: {
    name: 'User Info',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Get detailed information about a user.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    util_userinfo: {
      label: 'User Info',
      icon: 'UI',
      color: '#3B82F6',
      description: 'Prefix command that shows user ID, mention, account age, join date, roles, status, and avatar.',
      inputs: [{ id: 'in', label: 'Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'userinfo', required: true },
        aliases: { type: 'string', default: 'ui,user', required: false },
        titleTemplate: { type: 'string', default: 'User Info: {targetName}', required: false },
        descriptionTemplate: { type: 'string', default: '**User:** {targetMention}\n**Tag:** {targetTag}\n**ID:** `{targetId}`\n**Bot:** {targetBot}\n**Created:** {createdAt}\n**Joined:** {joinedAt}\n**Roles:** {roleCount}\n**Top Role:** {topRole}\n**Status:** {status}', required: false },
        plainTextTemplate: { type: 'string', default: '{targetTag} ({targetId}) joined {server} on {joinedAt}.', required: false },
        notFoundMessage: { type: 'string', default: 'I could not find that user.', required: false },
      },

      async execute(node, message, ctx) {
        if (!message || message.author?.bot || !message.guild) return false;

        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command, prefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
        ];
        const matched = matchCommand(message.content, commands);
        if (!matched) return false;

        const member = await resolveTarget(message, matched.args);
        if (!member?.user) {
          await message.channel.send(data.notFoundMessage || 'I could not find that user.');
          return true;
        }

        const vars = await varsFor(message, member);
        const title = applyTemplate(data.titleTemplate || 'User Info: {targetName}', vars);
        const description = applyTemplate(
          data.descriptionTemplate || '**User:** {targetMention}\n**Tag:** {targetTag}\n**ID:** `{targetId}`\n**Created:** {createdAt}\n**Joined:** {joinedAt}',
          vars
        );

        if (data.embedEnabled === false) {
          const text = applyTemplate(data.plainTextTemplate || '{targetTag} ({targetId}) joined {server} on {joinedAt}.', vars);
          await message.channel.send(text);
          return true;
        }

        const embed = new EmbedBuilder()
          .setColor(hexToInt(data.embedColor || '#3B82F6'))
          .setTitle(title)
          .setDescription(description);

        if (vars.avatarUrl) embed.setThumbnail(vars.avatarUrl);
        if (vars.bannerUrl) embed.setImage(vars.bannerUrl);
        else if (data.imageUrl) embed.setImage(applyTemplate(data.imageUrl, vars));
        if (data.logoName || data.logoUrl) {
          embed.setAuthor({ name: applyTemplate(data.logoName || vars.targetTag, vars), iconURL: data.logoUrl || vars.avatarUrl || undefined });
        }
        if (data.embedFooter) embed.setFooter({ text: applyTemplate(data.embedFooter, vars) });

        await message.channel.send({ embeds: [embed] });
        return true;
      },

      generateCode(node, prefix = '') {
        const rawCmd = String(node.data?.command || 'userinfo').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `
// User Info command
if (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {
  const _rest = message.content.slice("${cmd}".length);
  if (!_rest || /^\\s/.test(_rest)) {
    const _member = message.mentions.members.first() || message.member;
    message.channel.send(\`\${_member.user.tag} | ID: \${_member.user.id} | Joined: \${_member.joinedAt?.toDateString() || "Unknown"}\`);
  }
}`;
      },
    },
  },
};
