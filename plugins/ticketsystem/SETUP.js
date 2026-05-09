// ═══════════════════════════════════════════════════════════════════════════
// SETUP GUIDE - Ticket System Integration
// ═══════════════════════════════════════════════════════════════════════════

/*
COMPLETE SETUP INSTRUCTIONS FOR DISCORD.JS BOT
*/

// ─── STEP 1: INSTALL DISCORD.JS ────────────────────────────────────────

// npm install discord.js

// ─── STEP 2: CREATE BOT STRUCTURE ──────────────────────────────────────

/*
your-bot/
├── index.js                    (main bot file)
├── .env                        (TOKEN=...)
├── data/
│   └── tickets.json           (auto-created)
└── plugins/
    └── ticketsystem/
        ├── ticketHelpers.js
        ├── interactionHandler.js
        ├── ticket_panel/
        ├── ticket_create/
        ├── ticket_close/
        ├── ticket_add/
        ├── ticket_remove/
        ├── ticket_rename/
        ├── ticket_lock/
        ├── ticket_unlock/
        ├── ticket_priority/
        └── ticket_log/
*/

// ─── STEP 3: BOT INITIALIZATION ────────────────────────────────────────

const { Client, GatewayIntentBits, Collection } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const ticketHelpers = require('./plugins/ticketsystem/ticketHelpers');
const TicketInteractionHandler = require('./plugins/ticketsystem/interactionHandler');

// ─── STEP 4: SETUP INTERACTION HANDLER ──────────────────────────────────

const ticketHandler = new TicketInteractionHandler(client);

client.on('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  await ticketHandler.handle(interaction).catch(console.error);
});

// ─── STEP 5: MESSAGE COMMAND HANDLER ──────────────────────────────────

const PREFIX = '!';

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) {
    return;
  }

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    // ─── TICKET PANEL ─────────────────────────────────────────────────
    if (command === 'ticketpanel') {
      const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

      const embed = new EmbedBuilder()
        .setColor('#7289DA')
        .setTitle('📋 Support Tickets')
        .setDescription('Click a button below to create a ticket.')
        .setThumbnail(message.guild.iconURL())
        .setFooter({ text: 'Ticket System v1.0' });

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
        new ButtonBuilder()
          .setCustomId('ticket:create:partnership')
          .setLabel('Partnership')
          .setStyle(ButtonStyle.Primary),
      ];

      const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 2));
      const row2 = new ActionRowBuilder().addComponents(buttons.slice(2));

      await message.channel.send({ embeds: [embed], components: [row1, row2] });
      await message.delete().catch(() => {});
      return;
    }

    // ─── TICKET CREATE ────────────────────────────────────────────────
    if (command === 'create' || command === 'ticket') {
      const user = message.author;
      const userTickets = ticketHelpers.getUserTickets(message.guildId, user.id);

      if (userTickets.length > 0) {
        return message.reply('❌ You already have an open ticket. Close it first.').catch(() => {});
      }

      const result = await ticketHelpers.createTicketChannel(
        message.guild,
        user,
        'support',
        null, // Optional: category channel ID
        { naming: `ticket-${user.username}` }
      );

      if (!result) {
        return message.reply('❌ Failed to create ticket.').catch(() => {});
      }

      const { channel } = result;
      const { EmbedBuilder } = require('discord.js');

      const embed = new EmbedBuilder()
        .setColor('#43B581')
        .setTitle('📋 Welcome to Your Ticket')
        .setDescription('Thank you for contacting us. Please describe your issue below.\n\nA team member will assist you as soon as possible.')
        .addFields(
          { name: 'Commands', value: '`!close` - Close ticket\n`!priority high` - Set priority', inline: false }
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => {});
      await message.reply(`✅ Ticket created: <#${channel.id}>`).catch(() => {});
      return;
    }

    // ─── TICKET CLOSE ────────────────────────────────────────────────
    if (command === 'close') {
      const ticket = ticketHelpers.getTicketByChannel(message.channelId);
      if (!ticket) {
        return message.reply('❌ This is not a ticket channel.').catch(() => {});
      }

      const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

      const confirmEmbed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('⚠️ Close Ticket?')
        .setDescription('Are you sure you want to close this ticket?\n\nA transcript will be generated and stored.');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket:close:confirm')
          .setLabel('Close')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('ticket:close:cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

      await message.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true }).catch(() => {});
      return;
    }

    // ─── TICKET LOCK ──────────────────────────────────────────────────
    if (command === 'lock') {
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
      const td = tickets.find((t) => t.channelId === message.channelId);
      if (td) {
        td.locked = true;
        ticketHelpers.saveTickets(tickets);
      }

      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor('#34495E')
        .setTitle('🔒 Ticket Locked')
        .setDescription('This ticket is now locked. Users cannot send messages.');

      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // ─── TICKET UNLOCK ────────────────────────────────────────────────
    if (command === 'unlock') {
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
      const td = tickets.find((t) => t.channelId === message.channelId);
      if (td) {
        td.locked = false;
        ticketHelpers.saveTickets(tickets);
      }

      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor('#27AE60')
        .setTitle('🔓 Ticket Unlocked')
        .setDescription('This ticket is now unlocked. Users can send messages again.');

      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // ─── TICKET ADD USER ──────────────────────────────────────────────
    if (command === 'add') {
      const ticket = ticketHelpers.getTicketByChannel(message.channelId);
      if (!ticket) {
        return message.reply('❌ This is not a ticket channel.').catch(() => {});
      }

      const target = message.mentions.members?.first();
      if (!target) {
        return message.reply('Usage: `!add @user`').catch(() => {});
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
        .setDescription(`${target.user.tag} has been added to this ticket.`);

      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // ─── TICKET REMOVE USER ───────────────────────────────────────────
    if (command === 'remove') {
      const ticket = ticketHelpers.getTicketByChannel(message.channelId);
      if (!ticket) {
        return message.reply('❌ This is not a ticket channel.').catch(() => {});
      }

      const target = message.mentions.members?.first();
      if (!target) {
        return message.reply('Usage: `!remove @user`').catch(() => {});
      }

      await message.channel.permissionOverwrites.delete(target).catch(() => {});
      ticketHelpers.removeStaffMember(message.channelId, target.id);

      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('✅ User Removed')
        .setDescription(`${target.user.tag} has been removed from this ticket.`);

      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // ─── TICKET PRIORITY ──────────────────────────────────────────────
    if (command === 'priority') {
      const ticket = ticketHelpers.getTicketByChannel(message.channelId);
      if (!ticket) {
        return message.reply('❌ This is not a ticket channel.').catch(() => {});
      }

      const priority = (args[0] || 'medium').toLowerCase();
      const valid = ['low', 'medium', 'high', 'urgent'];

      if (!valid.includes(priority)) {
        return message.reply(`Invalid priority. Use: ${valid.join(', ')}`).catch(() => {});
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
      return;
    }

    // ─── TICKET RENAME ────────────────────────────────────────────────
    if (command === 'rename') {
      const ticket = ticketHelpers.getTicketByChannel(message.channelId);
      if (!ticket) {
        return message.reply('❌ This is not a ticket channel.').catch(() => {});
      }

      if (args.length === 0) {
        return message.reply('Usage: `!rename new-name`').catch(() => {});
      }

      const newName = args.join('-').toLowerCase().slice(0, 100);
      const oldName = message.channel.name;

      await message.channel.setName(newName).catch(() => {});

      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle('✅ Ticket Renamed')
        .setDescription(`Channel renamed from **#${oldName}** to **#${newName}**`);

      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // ─── LIST TICKETS ────────────────────────────────────────────────
    if (command === 'tickets') {
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
            .map((t) => `**${t.id}** - <@${t.ownerId}> (${t.priority}) ${t.locked ? '🔒' : ''}`)
            .join('\n')
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }

    // ─── HELP ────────────────────────────────────────────────────────
    if (command === 'tickethelp') {
      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor('#7289DA')
        .setTitle('🎫 Ticket System Help')
        .addFields(
          { name: 'User Commands', value: '`!create` - Create ticket\n`!close` - Close ticket\n`!tickets` - List tickets', inline: false },
          { name: 'Staff Commands', value: '`!add @user` - Add staff\n`!remove @user` - Remove staff\n`!priority [level]` - Set priority', inline: false },
          { name: 'Moderation', value: '`!lock` - Lock ticket\n`!unlock` - Unlock ticket\n`!rename name` - Rename ticket', inline: false },
          { name: 'Admin', value: '`!ticketpanel` - Create panel', inline: false }
        )
        .setFooter({ text: 'Ticket System v1.0' })
        .setTimestamp();

      await message.reply({ embeds: [embed] }).catch(() => {});
      return;
    }
  } catch (err) {
    console.error('Error handling command:', err);
    await message.reply('❌ An error occurred.').catch(() => {});
  }
});

// ─── STEP 6: START THE BOT ────────────────────────────────────────────

client.login(process.env.DISCORD_TOKEN);

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTANT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/*
1. Create .env file:
   DISCORD_TOKEN=your_bot_token_here

2. Create data directory:
   mkdir data

3. Run bot:
   node index.js

4. Configure channels:
   - Create a category for tickets
   - Create log channel
   - Create transcript archive channel
   - Copy channel IDs for node config

5. Create ticket panel:
   - Run: !ticketpanel
   - Panel appears with buttons

6. Test workflow:
   - Click "Create Support Ticket"
   - Run: !add @staff
   - Run: !priority high
   - Run: !close
   - Verify transcript created
*/

// ═══════════════════════════════════════════════════════════════════════════
// TROUBLESHOOTING
// ═══════════════════════════════════════════════════════════════════════════

/*
Q: "Bot token is invalid"
A: Check .env file, ensure token is correct

Q: "Missing permissions"
A: Give bot these roles:
   - Manage Channels
   - Manage Roles
   - Send Messages
   - Manage Messages

Q: "data/tickets.json not found"
A: Create data directory: mkdir data

Q: "Transcripts not generating"
A: Check data/transcripts/ directory exists
   Bot needs message history permissions

Q: "Buttons not working"
A: Ensure MESSAGE_CONTENT intent is enabled
   Check interaction handler is registered
*/

module.exports = { client };
