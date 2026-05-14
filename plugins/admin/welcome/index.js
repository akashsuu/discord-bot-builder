'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');

const DEFAULT_DESCRIPTION = 'Hey {mention}, we are happy to have you here.\n\nYou are member **#{member_count}**.\nAccount created: `{account_created}`';

function commandWithPrefix(rawCommand, prefix) {
  const raw = String(rawCommand || 'welcome').trim() || 'welcome';
  const effectivePrefix = String(prefix || '!');
  return raw.startsWith(effectivePrefix) ? raw : `${effectivePrefix}${raw}`;
}

function splitAliases(value) {
  return String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
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
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key] ?? '') : match
  );
}

function hexToInt(hex) {
  const parsed = parseInt(String(hex || '#22C55E').replace('#', ''), 16);
  return Number.isNaN(parsed) ? 0x22C55E : parsed;
}

function cleanUrl(value, vars = {}) {
  const url = applyTemplate(value || '', vars).trim();
  return /^https?:\/\//i.test(url) ? url : '';
}

function dateText(dateLike) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike || 0);
  if (!date || Number.isNaN(date.getTime())) return 'Unavailable';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function canManageGuild(message) {
  const perms = message.member?.permissions;
  if (!perms?.has) return true;
  return perms.has(PermissionFlagsBits.ManageGuild);
}

function varsFor(member, data, extra = {}) {
  const user = member?.user || member || {};
  const guild = member?.guild || extra.guild || {};
  const avatar = user.displayAvatarURL?.({ size: 1024, extension: 'png' }) || user.avatarURL?.() || '';
  const serverIcon = guild.iconURL?.({ size: 1024, extension: 'png' }) || '';
  return {
    user: user.username || 'New Member',
    username: user.username || 'New Member',
    user_tag: user.tag || user.username || 'New Member',
    user_id: user.id || '',
    mention: user.id ? `<@${user.id}>` : '@NewMember',
    avatar_url: avatar,
    server: guild.name || 'Server',
    server_id: guild.id || '',
    server_icon: serverIcon,
    member_count: Number(guild.memberCount || extra.memberCount || 1).toLocaleString('en-US'),
    account_created: user.createdAt ? dateText(user.createdAt) : 'Unavailable',
    channel: extra.channel?.toString?.() || extra.channel?.name || '#welcome',
    channel_id: extra.channel?.id || '',
    prefix: extra.prefix || '!',
    command: data.command || 'welcome',
    error: extra.error || '',
  };
}

function buildComponents(data, vars) {
  const label = applyTemplate(data.buttonLabel || '', vars).trim();
  const url = cleanUrl(data.buttonUrl, vars);
  if (!label || !url) return [];
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label.slice(0, 80)).setURL(url)
    ),
  ];
}

function buildPayload(member, data, extra = {}) {
  const vars = varsFor(member, data, extra);
  const content = data.mentionUser === false ? '' : vars.mention;
  const components = buildComponents(data, vars);

  if (data.embedEnabled === false) {
    return {
      content: applyTemplate(data.plainTextTemplate || 'Welcome {mention} to {server}!', vars).slice(0, 2000),
      components,
      vars,
    };
  }

  const embed = new EmbedBuilder()
    .setColor(hexToInt(data.embedColor || '#22C55E'))
    .setTitle(applyTemplate(data.titleTemplate || 'Welcome to {server}, {username}!', vars).slice(0, 256))
    .setDescription(applyTemplate(data.descriptionTemplate || DEFAULT_DESCRIPTION, vars).slice(0, 4096));

  const authorName = applyTemplate(data.authorName || '', vars).trim();
  const authorIconUrl = cleanUrl(data.authorIconUrl, vars);
  if (authorName || authorIconUrl) embed.setAuthor({ name: authorName || vars.server, iconURL: authorIconUrl || undefined });

  const footer = applyTemplate(data.footerTemplate || '', vars).trim();
  if (footer) embed.setFooter({ text: footer.slice(0, 2048) });

  const thumbnail = cleanUrl(data.thumbnailUrl, vars);
  const image = cleanUrl(data.imageUrl, vars);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);

  return { content, embeds: [embed], components, vars };
}

async function findWelcomeChannel(guild, data, fallbackChannel = null) {
  const channelId = String(data.channelId || '').trim();
  if (channelId) {
    return guild?.channels?.cache?.get?.(channelId)
      || await guild?.channels?.fetch?.(channelId).catch(() => null);
  }
  return fallbackChannel || null;
}

async function sendWelcome(member, data, extra = {}) {
  const channel = await findWelcomeChannel(member.guild, data, extra.fallbackChannel);
  if (!channel?.send) {
    const err = new Error('Welcome channel not found.');
    err.code = 'MISSING_CHANNEL';
    throw err;
  }
  const payload = buildPayload(member, data, { ...extra, channel });
  const sent = await channel.send(payload);
  const seconds = Number(data.deleteAfterSeconds || 0);
  if (seconds > 0) setTimeout(() => sent.delete?.().catch(() => {}), seconds * 1000);
  return { sent, vars: payload.vars, channel };
}

module.exports = {
  meta: {
    name: 'Welcome',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Create a customizable welcome message/embed for new members.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    admin_welcome: {
      label: 'Welcome',
      icon: 'WLC',
      color: '#22C55E',
      description: 'Sends a custom welcome embed on member join and by prefix test command.',
      inputs: [{ id: 'in', label: 'Member/Message', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command: { type: 'string', default: 'welcome', required: true },
        aliases: { type: 'string', default: 'welcometest,testwelcome,wlc', required: false },
        channelId: { type: 'string', default: '', required: false },
        requireManageGuild: { type: 'boolean', default: true, required: false },
        mentionUser: { type: 'boolean', default: true, required: false },
        deleteAfterSeconds: { type: 'string', default: '0', required: false },
        titleTemplate: { type: 'string', default: 'Welcome to {server}, {username}!', required: false },
        descriptionTemplate: { type: 'string', default: DEFAULT_DESCRIPTION, required: false },
        plainTextTemplate: { type: 'string', default: 'Welcome {mention} to {server}! You are member #{member_count}.', required: false },
        footerTemplate: { type: 'string', default: 'User ID: {user_id}', required: false },
        authorName: { type: 'string', default: '{server}', required: false },
        authorIconUrl: { type: 'string', default: '{server_icon}', required: false },
        thumbnailUrl: { type: 'string', default: '{avatar_url}', required: false },
        imageUrl: { type: 'string', default: '', required: false },
        buttonLabel: { type: 'string', default: 'Read Rules', required: false },
        buttonUrl: { type: 'string', default: '', required: false },
        testModeMessage: { type: 'string', default: 'Welcome preview sent in {channel}.', required: false },
        permissionMessage: { type: 'string', default: 'You need Manage Server permission to test the welcome message.', required: false },
        missingChannelMessage: { type: 'string', default: 'Welcome channel not found. Add a channel ID in the Welcome node.', required: false },
        errorMessage: { type: 'string', default: 'Could not send welcome message: {error}', required: false },
      },

      async initProject({ node, client }) {
        const data = node.data || {};
        client?.on?.('guildMemberAdd', async (member) => {
          try {
            await sendWelcome(member, data);
          } catch (_) {}
        });
      },

      async execute(node, message, ctx) {
        const data = node.data || {};
        if (ctx?.eventType === 'guildMemberAdd' && ctx?.eventData?.user) {
          await sendWelcome(ctx.eventData, data);
          return true;
        }
        if (!message || message.author?.bot || !message.guild) return false;

        const prefix = ctx?.prefix || '!';
        const commands = [
          commandWithPrefix(data.command || 'welcome', prefix),
          ...splitAliases(data.aliases).map((alias) => commandWithPrefix(alias, prefix)),
        ];
        const matched = matchCommand(message.content, commands);
        if (!matched) return false;

        if (data.requireManageGuild !== false && !canManageGuild(message)) {
          await message.channel.send(applyTemplate(data.permissionMessage || 'You need Manage Server permission to test the welcome message.', varsFor(message.member || message.author, data, { prefix, guild: message.guild, channel: message.channel })));
          return true;
        }

        try {
          const result = await sendWelcome(message.member || message.author, data, { prefix, fallbackChannel: message.channel });
          if (data.testModeMessage) {
            await message.channel.send(applyTemplate(data.testModeMessage, { ...result.vars, channel: result.channel?.toString?.() || result.channel?.name || '#welcome' }));
          }
        } catch (err) {
          const template = err.code === 'MISSING_CHANNEL'
            ? data.missingChannelMessage || 'Welcome channel not found. Add a channel ID in the Welcome node.'
            : data.errorMessage || 'Could not send welcome message: {error}';
          await message.channel.send(applyTemplate(template, varsFor(message.member || message.author, data, { prefix, guild: message.guild, channel: message.channel, error: err.message })));
        }
        return true;
      },

      generateCode(node, prefix = '!') {
        const rawCmd = String(node.data?.command || 'welcome').replace(/"/g, '\\"');
        const cmd = commandWithPrefix(rawCmd, prefix).replace(/"/g, '\\"');
        return `// Welcome command\nif (message.guild && message.content.toLowerCase().startsWith("${cmd.toLowerCase()}")) {\n  message.channel.send({ embeds: [{ title: "Welcome", description: "Welcome " + message.author.toString() + "!" }] });\n}`;
      },
    },
  },
};
