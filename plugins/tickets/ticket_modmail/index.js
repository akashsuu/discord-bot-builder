'use strict';

const path = require('path');
const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const ticketHelper = require(path.join(__dirname, '..', 'helpers', 'tickets.js'));
const permHelper = require(path.join(__dirname, '..', 'helpers', 'permissions.js'));
const logHelper = require(path.join(__dirname, '..', 'helpers', 'logger.js'));
const { generateTranscript } = require(path.join(__dirname, '..', 'helpers', 'transcripts.js'));
const { applyCommonEmbedOptions } = require(path.join(__dirname, '..', 'helpers', 'embeds.js'));

const state = {
  attached: false,
  configs: new Map(),
};

function applyTemplate(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

function normalizeChannelName(value) {
  return String(value || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'user';
}

function buildChannelName(format, user, ticketId) {
  return normalizeChannelName(applyTemplate(format || 'modmail-{username}', {
    username: user.username,
    tag: user.tag,
    userId: user.id,
    ticketId,
  }));
}

function getConfigForGuild(guildId) {
  return state.configs.get(guildId) || [...state.configs.values()][0] || null;
}

async function sendLog(client, data, event, fields, ticket) {
  if (!data.logChannel) return;
  await logHelper.sendLog(client, data.logChannel, event, fields, ticket).catch(() => {});
}

async function closeTicketChannel(channel, ticket, closer, data, client) {
  let transcriptPath = null;
  try {
    transcriptPath = await generateTranscript(channel, ticket, channel.guild?.name || 'Unknown Server');
    ticketHelper.updateTicket(channel.id, { transcriptPath });
  } catch {
    transcriptPath = null;
  }

  ticketHelper.closeTicket(channel.id, transcriptPath);

  const user = await client.users.fetch(ticket.ownerId).catch(() => null);
  if (user) {
    await user.send(`Your ticket ${ticket.ticketId} has been closed by ${closer.tag || 'staff'}.`).catch(() => {});
  }

  if (data.transcriptChannel && transcriptPath) {
    const transcriptChannel = await client.channels.fetch(data.transcriptChannel).catch(() => null);
    if (transcriptChannel?.send) {
      await transcriptChannel.send({
        content: `Transcript for ${ticket.ticketId} closed by ${closer.tag || closer.id}`,
        files: [{ attachment: transcriptPath, name: `${ticket.ticketId}.html` }],
      }).catch(() => {});
    }
  }

  await sendLog(client, data, 'closed', {
    'Closed By': `<@${closer.id}>`,
    Transcript: transcriptPath ? 'Saved' : 'Unavailable',
  }, ticket);

  await channel.send('Ticket closed. This channel will be deleted in 5 seconds.').catch(() => {});
  setTimeout(() => {
    channel.delete(`ModMail ticket closed by ${closer.tag || closer.id}`).catch(() => {});
    ticketHelper.removeTicket(channel.id);
  }, 5000);
}

async function createModmailTicket(message, data, client, guild) {
  const allTickets = ticketHelper.loadTickets();
  const ticketId = `modmail-${ticketHelper.getNextTicketNumber(allTickets)}`;
  const channelName = buildChannelName(data.ticketNamingFormat, message.author, ticketId);
  const supportRoleIds = permHelper.parseSupportRoles(data);
  const parent = data.ticketCategory ? guild.channels.cache.get(data.ticketCategory)?.id : undefined;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...supportRoleIds
      .filter((roleId) => guild.roles.cache.has(roleId))
      .map((roleId) => ({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageMessages,
        ],
      })),
  ];

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent,
    permissionOverwrites: overwrites,
    topic: `ModMail Ticket | OwnerID: ${message.author.id} | Category: modmail | ID: ${ticketId}`,
  });

  const ticket = ticketHelper.createTicket(channel.id, {
    guildId: guild.id,
    ownerId: message.author.id,
    category: 'modmail',
    ticketId,
    priority: 'normal',
  });

  ticketHelper.updateTicket(channel.id, {
    replyMode: data.anonymousMode ? 'anonymous' : 'normal',
  });

  const color = parseInt(String(data.embedColor || '#5865F2').replace('#', ''), 16);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket:claim:${ticketId}`).setLabel('Claim').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ticket:close:${ticketId}`).setLabel('Close').setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: supportRoleIds.map((roleId) => `<@&${roleId}>`).join(' ') || undefined,
    embeds: [
      applyCommonEmbedOptions(new EmbedBuilder()
        .setColor(isNaN(color) ? 0x5865F2 : color)
        .setTitle('New ModMail Ticket')
        .setDescription(message.content || '(no text content)')
        .addFields(
          { name: 'User', value: `<@${message.author.id}> (${message.author.id})`, inline: true },
          { name: 'Ticket ID', value: ticketId, inline: true }
        )
        .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
        .setTimestamp(), data),
    ],
    components: [row],
  });

  if (message.attachments.size > 0) {
    await channel.send({ files: [...message.attachments.values()].map((a) => a.url) }).catch(() => {});
  }

  ticketHelper.addTicketMessage(channel.id, {
    senderId: message.author.id,
    senderName: message.author.tag,
    content: message.content,
    isStaff: false,
  });

  await message.author.send(applyTemplate(data.welcomeMessage, {
    user: message.author.username,
    mention: `<@${message.author.id}>`,
    ticketId,
  })).catch(() => {});

  await sendLog(client, data, 'created', {
    User: `<@${message.author.id}>`,
    Channel: `<#${channel.id}>`,
  }, ticket);

  return ticket;
}

async function handleDm(message, client) {
  if (!message.author || message.author.bot || !message.channel || message.guild) return;
  const data = getConfigForGuild(null);
  if (!data) return;

  const guildId = data.guildId || client.guilds.cache.first()?.id;
  const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
  if (!guild) {
    await message.author.send('No server is configured for ModMail yet.').catch(() => {});
    return;
  }

  let ticket = ticketHelper.getTicketByOwner(guild.id, message.author.id, 'modmail');
  let staffChannel = ticket ? await client.channels.fetch(ticket.channelId).catch(() => null) : null;

  if (!ticket || !staffChannel) {
    ticket = await createModmailTicket(message, data, client, guild);
    return;
  }

  await staffChannel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ size: 64 }) })
        .setDescription(message.content || '(no text content)')
        .setTimestamp(),
    ],
  }).catch(() => {});

  if (message.attachments.size > 0) {
    await staffChannel.send({ files: [...message.attachments.values()].map((a) => a.url) }).catch(() => {});
  }

  ticketHelper.addTicketMessage(staffChannel.id, {
    senderId: message.author.id,
    senderName: message.author.tag,
    content: message.content,
    isStaff: false,
  });
}

async function handleStaffMessage(message, client) {
  if (!message.guild || message.author?.bot) return;
  const ticket = ticketHelper.getTicket(message.channel);
  if (!ticket || ticket.category !== 'modmail' || ticket.closed) return;

  const data = getConfigForGuild(message.guild.id) || {};
  const prefix = data.projectPrefix || '';
  const replyCommand = `${prefix}${data.staffReplyPrefix || 'reply'}`.toLowerCase();
  const closeCommand = `${prefix}${data.closeCommand || 'close'}`.toLowerCase();
  const content = message.content.trim();
  const lower = content.toLowerCase();

  if (lower === closeCommand || lower.startsWith(`${closeCommand} `)) {
    await closeTicketChannel(message.channel, ticket, message.author, data, client);
    return;
  }

  if (!lower.startsWith(replyCommand)) return;
  const reply = content.slice(replyCommand.length).trim();
  if (!reply) {
    await message.reply(`Usage: \`${replyCommand} <message>\``).catch(() => {});
    return;
  }

  if (!permHelper.isSupportStaff(message.member, data)) {
    await message.reply('Only support staff can reply to ModMail tickets.').catch(() => {});
    return;
  }

  const user = await client.users.fetch(ticket.ownerId).catch(() => null);
  if (!user) {
    await message.reply('Could not fetch the ticket user.').catch(() => {});
    return;
  }

  const anonymous = !!data.anonymousMode || ticket.replyMode === 'anonymous';
  const sent = await user.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Staff Reply')
        .setDescription(reply)
        .setFooter({ text: anonymous ? 'Sent by Staff Member' : `Sent by ${message.author.tag}` })
        .setTimestamp(),
    ],
  }).then(() => true).catch(() => false);

  if (!sent) {
    await message.reply('Could not DM this user.').catch(() => {});
    return;
  }

  ticketHelper.addTicketMessage(message.channel.id, {
    senderId: message.author.id,
    senderName: anonymous ? 'Staff Member' : message.author.tag,
    content: reply,
    isStaff: true,
  });

  await message.react('✅').catch(() => {});
}

function attach(client) {
  if (state.attached) return;
  state.attached = true;
  client.on('messageCreate', async (message) => {
    if (message.guild) await handleStaffMessage(message, client);
    else await handleDm(message, client);
  });
}

module.exports = {
  meta: {
    name: 'Ticket ModMail',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'ModMail-style DM ticket system with staff replies and transcripts.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_modmail: {
      label: 'Ticket ModMail',
      icon: 'MAIL',
      color: '#5865F2',
      description: 'Users DM the bot to open tickets; staff reply from private channels.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],
      configSchema: {
        guildId: { type: 'string', default: '' },
        ticketCategory: { type: 'string', default: '' },
        supportRoles: { type: 'string', default: '' },
        logChannel: { type: 'string', default: '' },
        transcriptChannel: { type: 'string', default: '' },
        ticketNamingFormat: { type: 'string', default: 'modmail-{username}' },
        welcomeMessage: { type: 'string', default: 'Hello {user}, your message has been forwarded to the staff team. Ticket ID: {ticketId}' },
        staffReplyPrefix: { type: 'string', default: 'reply' },
        closeCommand: { type: 'string', default: 'close' },
        anonymousMode: { type: 'boolean', default: false },
        embedColor: { type: 'string', default: '#5865F2' },
        embedFooter: { type: 'string', default: '' },
        logoUrl: { type: 'string', default: '' },
        logoName: { type: 'string', default: '' },
        imageUrl: { type: 'string', default: '' },
      },

      async initProject(ctx) {
        const data = {
          ...(ctx.node?.data || {}),
          projectPrefix: ctx.prefix || '',
        };
        const key = data.guildId || '__default';
        state.configs.set(key, data);
        attach(ctx.client);
      },

      async execute() {
        return true;
      },

      generateCode() {
        return '// Ticket ModMail is handled by the runtime plugin system.';
      },
    },
  },
};
