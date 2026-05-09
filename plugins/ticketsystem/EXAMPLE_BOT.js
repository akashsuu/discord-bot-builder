// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE: Complete Ticket System Bot Implementation
// ═══════════════════════════════════════════════════════════════════════════
// This shows how to integrate the ticket system into your Discord bot

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const ticketHelpers = require('./ticketHelpers');
const TicketInteractionHandler = require('./interactionHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const ticketHandler = new TicketInteractionHandler(client);

// ─── EVENT: Bot Ready ─────────────────────────────────────────────────────
client.on('ready', () => {
  console.log(`✅ Ticket Bot logged in as ${client.user.tag}`);
});

// ─── EVENT: Interaction Create ────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  await ticketHandler.handle(interaction).catch(console.error);
});

// ─── EVENT: Message Create ────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const prefix = '!'; // Your prefix

  // Ticket Panel Command
  if (message.content === `${prefix}ticketpanel`) {
    const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

    const embed = new EmbedBuilder()
      .setColor('#7289DA')
      .setTitle('📋 Support Tickets')
      .setDescription('Click a button below to create a ticket.')
      .setThumbnail(message.guild.iconURL())
      .setFooter({ text: 'Ticket System' });

    const buttons = [
      new ButtonBuilder()
        .setCustomId('ticket:create:support')
        .setLabel('Create Support Ticket')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket:create:billing')
        .setLabel('Billing Issue')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket:create:report')
        .setLabel('Report User')
        .setStyle(ButtonStyle.Primary),
    ];

    const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 3));

    await message.channel.send({ embeds: [embed], components: [row1] }).catch(console.error);
    await message.delete().catch(() => {});
  }

  // Create Ticket Command
  else if (message.content.startsWith(`${prefix}ticket create`)) {
    const user = message.author;
    const userTickets = ticketHelpers.getUserTickets(message.guildId, user.id);

    if (userTickets.length > 0) {
      return message.reply('❌ You already have an open ticket.').catch(() => {});
    }

    const result = await ticketHelpers.createTicketChannel(
      message.guild,
      user,
      'support',
      null,
      { naming: `ticket-${user.username}` }
    );

    if (result) {
      const { channel } = result;
      const { EmbedBuilder } = require('discord.js');

      const embed = new EmbedBuilder()
        .setColor('#43B581')
        .setTitle('📋 Welcome to Your Ticket')
        .setDescription('A team member will assist you shortly.')
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => {});
      await message.reply(`✅ Ticket created: <#${channel.id}>`).catch(() => {});
    } else {
      await message.reply('❌ Failed to create ticket.').catch(() => {});
    }
  }

  // Close Ticket Command
  else if (message.content === `${prefix}close` || message.content === `${prefix}ticket close`) {
    const ticket = ticketHelpers.getTicketByChannel(message.channelId);
    if (!ticket) {
      return message.reply('❌ This is not a ticket channel.').catch(() => {});
    }

    const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

    const confirmEmbed = new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle('⚠️ Close Ticket?')
      .setDescription('Are you sure you want to close this ticket? A transcript will be generated.');

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:close:confirm')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ticket:close:cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    await message.reply({ embeds: [confirmEmbed], components: [confirmRow], ephemeral: true }).catch(() => {});
  }

  // Lock Ticket Command
  else if (message.content === `${prefix}lock` || message.content === `${prefix}ticket lock`) {
    const ticket = ticketHelpers.getTicketByChannel(message.channelId);
    if (!ticket) {
      return message.reply('❌ This is not a ticket channel.').catch(() => {});
    }

    const ticketOwner = await message.guild.members.fetch(ticket.ownerId).catch(() => null);
    if (ticketOwner) {
      await message.channel.permissionOverwrites.create(ticketOwner, {
        SendMessages: false,
      }).catch(() => {});
    }

    const tickets = ticketHelpers.loadTickets();
    const ticketData = tickets.find((t) => t.channelId === message.channelId);
    if (ticketData) {
      ticketData.locked = true;
      ticketHelpers.saveTickets(tickets);
    }

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setColor('#34495E')
      .setTitle('🔒 Ticket Locked')
      .setDescription('This ticket is now locked.');

    await message.reply({ embeds: [embed] }).catch(() => {});
  }

  // Unlock Ticket Command
  else if (message.content === `${prefix}unlock` || message.content === `${prefix}ticket unlock`) {
    const ticket = ticketHelpers.getTicketByChannel(message.channelId);
    if (!ticket) {
      return message.reply('❌ This is not a ticket channel.').catch(() => {});
    }

    const ticketOwner = await message.guild.members.fetch(ticket.ownerId).catch(() => null);
    if (ticketOwner) {
      await message.channel.permissionOverwrites.create(ticketOwner, {
        SendMessages: true,
      }).catch(() => {});
    }

    const tickets = ticketHelpers.loadTickets();
    const ticketData = tickets.find((t) => t.channelId === message.channelId);
    if (ticketData) {
      ticketData.locked = false;
      ticketHelpers.saveTickets(tickets);
    }

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setColor('#27AE60')
      .setTitle('🔓 Ticket Unlocked')
      .setDescription('This ticket is now unlocked.');

    await message.reply({ embeds: [embed] }).catch(() => {});
  }

  // Add User Command
  else if (message.content.startsWith(`${prefix}add `)) {
    const ticket = ticketHelpers.getTicketByChannel(message.channelId);
    if (!ticket) {
      return message.reply('❌ This is not a ticket channel.').catch(() => {});
    }

    const target = message.mentions.members?.first();
    if (!target) {
      return message.reply(`Usage: \`${prefix}add @user\``).catch(() => {});
    }

    await message.channel.permissionOverwrites.create(target, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    }).catch(() => {});

    ticketHelpers.addStaffMember(message.channelId, target.id);

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('✅ User Added')
      .setDescription(`${target.user.tag} added to ticket`);

    await message.reply({ embeds: [embed] }).catch(() => {});
  }

  // Remove User Command
  else if (message.content.startsWith(`${prefix}remove `)) {
    const ticket = ticketHelpers.getTicketByChannel(message.channelId);
    if (!ticket) {
      return message.reply('❌ This is not a ticket channel.').catch(() => {});
    }

    const target = message.mentions.members?.first();
    if (!target) {
      return message.reply(`Usage: \`${prefix}remove @user\``).catch(() => {});
    }

    await message.channel.permissionOverwrites.delete(target).catch(() => {});
    ticketHelpers.removeStaffMember(message.channelId, target.id);

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle('✅ User Removed')
      .setDescription(`${target.user.tag} removed from ticket`);

    await message.reply({ embeds: [embed] }).catch(() => {});
  }

  // Priority Command
  else if (message.content.startsWith(`${prefix}priority `)) {
    const ticket = ticketHelpers.getTicketByChannel(message.channelId);
    if (!ticket) {
      return message.reply('❌ This is not a ticket channel.').catch(() => {});
    }

    const priority = message.content.split(' ')[1]?.toLowerCase() || 'medium';
    const validPriorities = ['low', 'medium', 'high', 'urgent'];

    if (!validPriorities.includes(priority)) {
      return message.reply(`Invalid priority. Use: ${validPriorities.join(', ')}`).catch(() => {});
    }

    ticketHelpers.setPriority(message.channelId, priority);

    const { EmbedBuilder } = require('discord.js');
    const emoji = ticketHelpers.getPriorityEmoji(priority);
    const color = ticketHelpers.getPriorityColor(priority);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} Priority Changed`)
      .setDescription(`Priority set to **${priority.toUpperCase()}**`);

    await message.reply({ embeds: [embed] }).catch(() => {});
  }

  // List Tickets Command
  else if (message.content === `${prefix}tickets`) {
    const guildTickets = ticketHelpers.getGuildTickets(message.guildId);

    if (guildTickets.length === 0) {
      return message.reply('No open tickets.').catch(() => {});
    }

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setColor('#7289DA')
      .setTitle('📋 Open Tickets')
      .setDescription(
        guildTickets
          .map((t) => `\`${t.id}\` - <@${t.ownerId}> (${t.priority})`)
          .join('\n')
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] }).catch(() => {});
  }
});

// Start the bot
client.login(process.env.DISCORD_TOKEN || 'YOUR_TOKEN_HERE');
