'use strict';

// ─── TICKET SYSTEM INTERACTION HANDLER ──────────────────────────────────────
// Add this to your bot's interactionCreate event listener

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const ticketHelpers = require('./ticketHelpers');

class TicketInteractionHandler {
  constructor(client) {
    this.client = client;
  }

  async handle(interaction) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    try {
      // ─── TICKET CREATION ──────────────────────────────────────────────────
      if (interaction.customId?.startsWith('ticket:create:')) {
        const category = interaction.customId.split(':')[2];
        await this.handleTicketCreate(interaction, category);
      }

      // ─── TICKET CLOSE CONFIRMATION ────────────────────────────────────────
      else if (interaction.customId === 'ticket:close:confirm') {
        await this.handleTicketCloseConfirm(interaction);
      }

      else if (interaction.customId === 'ticket:close:cancel') {
        await interaction.reply({ content: 'Close cancelled.', ephemeral: true }).catch(() => {});
      }

      // ─── TICKET LOCK ─────────────────────────────────────────────────────
      else if (interaction.customId === 'ticket:lock') {
        await this.handleTicketLock(interaction);
      }

      // ─── TICKET UNLOCK ───────────────────────────────────────────────────
      else if (interaction.customId === 'ticket:unlock') {
        await this.handleTicketUnlock(interaction);
      }

      // ─── ADD USER TO TICKET ──────────────────────────────────────────────
      else if (interaction.customId === 'ticket:add') {
        await this.handleAddUserModal(interaction);
      }

      // ─── REMOVE USER FROM TICKET ─────────────────────────────────────────
      else if (interaction.customId === 'ticket:remove') {
        await this.handleRemoveUserModal(interaction);
      }

      // ─── PRIORITY SELECTION ──────────────────────────────────────────────
      else if (interaction.customId?.startsWith('ticket:priority:')) {
        const priority = interaction.customId.split(':')[2];
        await this.handlePriorityChange(interaction, priority);
      }
    } catch (err) {
      console.error('Error handling ticket interaction:', err);
    }
  }

  async handleTicketCreate(interaction, category) {
    const user = interaction.user;
    const guild = interaction.guild;

    // Check max tickets
    const userTickets = ticketHelpers.getUserTickets(guild.id, user.id);
    if (userTickets.length > 0) {
      return interaction.reply({
        content: '❌ You already have an open ticket. Close it first.',
        ephemeral: true,
      }).catch(() => {});
    }

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    try {
      const result = await ticketHelpers.createTicketChannel(guild, user, category, null, {
        naming: `ticket-${user.username}`,
      });

      if (!result) {
        return interaction.editReply('❌ Failed to create ticket channel.').catch(() => {});
      }

      const { channel } = result;
      await interaction.editReply(`✅ Ticket created: <#${channel.id}>`).catch(() => {});
    } catch (err) {
      console.error('Error creating ticket:', err);
      await interaction.editReply('❌ An error occurred.').catch(() => {});
    }
  }

  async handleTicketCloseConfirm(interaction) {
    const ticket = ticketHelpers.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: '❌ Not a ticket channel.', ephemeral: true }).catch(() => {});
    }

    try {
      // Generate transcript
      const html = await ticketHelpers.generateTranscript(interaction.channel, ticket);
      let transcriptUrl = null;
      if (html) {
        transcriptUrl = ticketHelpers.saveTranscript(ticket.id, html);
      }

      // Close ticket
      ticketHelpers.closeTicket(interaction.channelId, 'Closed by user', interaction.user.id);

      // Send closing message
      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('🎫 Ticket Closed')
        .setDescription(`Closed by ${interaction.user.tag}`)
        .setTimestamp();

      if (transcriptUrl) {
        embed.addFields({ name: 'Transcript', value: `[Download](${transcriptUrl})` });
      }

      await interaction.reply({ embeds: [embed] }).catch(() => {});

      // Delete after delay
      setTimeout(async () => {
        await interaction.channel.delete().catch(() => {});
      }, 5000);
    } catch (err) {
      console.error('Error closing ticket:', err);
      await interaction.reply({ content: '❌ Error closing ticket.', ephemeral: true }).catch(() => {});
    }
  }

  async handleTicketLock(interaction) {
    const ticket = ticketHelpers.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: '❌ Not a ticket channel.', ephemeral: true }).catch(() => {});
    }

    try {
      const ticketOwner = await interaction.guild.members.fetch(ticket.ownerId).catch(() => null);
      if (ticketOwner) {
        await interaction.channel.permissionOverwrites.create(ticketOwner, {
          SendMessages: false,
        }).catch(() => {});
      }

      const tickets = ticketHelpers.loadTickets();
      const ticketData = tickets.find((t) => t.channelId === interaction.channelId);
      if (ticketData) {
        ticketData.locked = true;
        ticketHelpers.saveTickets(tickets);
      }

      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor('#34495E')
        .setTitle('🔒 Ticket Locked')
        .setDescription('This ticket is now locked.')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] }).catch(() => {});
    } catch (err) {
      console.error('Error locking ticket:', err);
      await interaction.reply({ content: '❌ Error locking ticket.', ephemeral: true }).catch(() => {});
    }
  }

  async handleTicketUnlock(interaction) {
    const ticket = ticketHelpers.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: '❌ Not a ticket channel.', ephemeral: true }).catch(() => {});
    }

    try {
      const ticketOwner = await interaction.guild.members.fetch(ticket.ownerId).catch(() => null);
      if (ticketOwner) {
        await interaction.channel.permissionOverwrites.create(ticketOwner, {
          SendMessages: true,
        }).catch(() => {});
      }

      const tickets = ticketHelpers.loadTickets();
      const ticketData = tickets.find((t) => t.channelId === interaction.channelId);
      if (ticketData) {
        ticketData.locked = false;
        ticketHelpers.saveTickets(tickets);
      }

      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor('#27AE60')
        .setTitle('🔓 Ticket Unlocked')
        .setDescription('This ticket is now unlocked.')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] }).catch(() => {});
    } catch (err) {
      console.error('Error unlocking ticket:', err);
      await interaction.reply({ content: '❌ Error unlocking ticket.', ephemeral: true }).catch(() => {});
    }
  }

  async handleAddUserModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('ticket:add:modal')
      .setTitle('Add User to Ticket')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('user_id')
            .setLabel('User ID or Mention')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

    await interaction.showModal(modal).catch(() => {});
  }

  async handleRemoveUserModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('ticket:remove:modal')
      .setTitle('Remove User from Ticket')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('user_id')
            .setLabel('User ID or Mention')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

    await interaction.showModal(modal).catch(() => {});
  }

  async handlePriorityChange(interaction, priority) {
    const ticket = ticketHelpers.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: '❌ Not a ticket channel.', ephemeral: true }).catch(() => {});
    }

    try {
      ticketHelpers.setPriority(interaction.channelId, priority);

      const emoji = ticketHelpers.getPriorityEmoji(priority);
      const color = ticketHelpers.getPriorityColor(priority);

      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Priority Changed`)
        .setDescription(`Priority set to **${priority.toUpperCase()}**`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] }).catch(() => {});
    } catch (err) {
      console.error('Error changing priority:', err);
      await interaction.reply({ content: '❌ Error changing priority.', ephemeral: true }).catch(() => {});
    }
  }
}

module.exports = TicketInteractionHandler;
