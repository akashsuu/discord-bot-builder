'use strict';

/**
 * ticket_claim/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles:
 *   - ticket:claim:<ticketId> button interaction
 *   - !claim prefix command
 *
 * Prevents double-claiming. Updates the ticket record and logs the event.
 */

const path = require('path');
const { EmbedBuilder } = require('discord.js');

const ticketHelper = require(path.join(__dirname, '..', 'helpers', 'tickets.js'));
const permHelper   = require(path.join(__dirname, '..', 'helpers', 'permissions.js'));
const logHelper    = require(path.join(__dirname, '..', 'helpers', 'logger.js'));

// ── Build claimed status embed ────────────────────────────────────────────────
function buildClaimedEmbed(ticket, claimer, color) {
  return new EmbedBuilder()
    .setColor(color || 0x5865F2)
    .setTitle('✋ Ticket Claimed')
    .setDescription(`This ticket has been claimed by <@${claimer.id}>.`)
    .addFields(
      { name: '👤 Claimer', value: `<@${claimer.id}>`,     inline: true },
      { name: '🎫 Ticket',  value: ticket.ticketId,         inline: true },
      { name: '📂 Category',value: ticket.category,         inline: true },
    )
    .setThumbnail(claimer.displayAvatarURL?.({ size: 64 }) || claimer.user?.displayAvatarURL({ size: 64 }))
    .setTimestamp();
}

module.exports = {
  meta: {
    name:          'Ticket Claim',
    version:       '1.0.0',
    author:        'Akashsuu',
    description:   'Staff can claim a ticket to take ownership.',
    engineVersion: '>=1.0.0',
  },

  onLoad(safeAPI) {
    if (!safeAPI?.client) return;
    this._attachInteractionHandler(safeAPI.client);
  },

  _nodeData: null,

  _attachInteractionHandler(client) {
    if (this._attached) return;
    this._attached = true;

    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('ticket:claim:')) return;

      const ticket = ticketHelper.getTicket(interaction.channel);
      if (!ticket) {
        return interaction.reply({ content: '❌ Not a tracked ticket.', ephemeral: true }).catch(() => {});
      }

      const data     = this._nodeData || {};
      const isStaff  = permHelper.isSupportStaff(interaction.member, data);
      if (!isStaff) {
        return interaction.reply({ content: '❌ Only support staff can claim tickets.', ephemeral: true }).catch(() => {});
      }

      // Prevent double-claim
      if (ticket.claimedBy) {
        return interaction.reply({
          content: `❌ This ticket is already claimed by <@${ticket.claimedBy}>.`,
          ephemeral: true,
        }).catch(() => {});
      }

      // Update ticket
      ticketHelper.updateTicket(interaction.channel.id, { claimedBy: interaction.user.id });
      const updatedTicket = ticketHelper.getTicket(interaction.channel);

      const color = parseInt((data.embedColor || '#5865F2').replace('#', ''), 16);
      const embed = buildClaimedEmbed(updatedTicket, interaction.user, isNaN(color) ? 0x5865F2 : color);

      await interaction.reply({ embeds: [embed] }).catch(() => {});

      // Log
      if (interaction.client) {
        await logHelper.sendLog(
          interaction.client,
          data.logChannel,
          'claimed',
          { '✋ Claimed By': `<@${interaction.user.id}>` },
          updatedTicket
        );
      }
    });
  },

  nodes: {
    ticket_claim: {
      label:       'Ticket Claim',
      icon:        '✋',
      color:       '#1F618D',
      description: 'Allows support staff to claim a ticket.',
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command:      { type: 'string',  default: 'claim' },
        supportRoles: { type: 'string',  default: '' },
        logChannel:   { type: 'string',  default: '' },
        embedColor:   { type: 'string',  default: '#5865F2' },
      },

      async execute(node, message, ctx) {
        const plugin = module.exports;
        plugin._nodeData = node.data || {};

        if (!message || !message.guild || message.author?.bot) return false;
        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const rawCommand = (data.command || 'claim').trim();
        const command = (prefix && !rawCommand.startsWith(prefix)) ? `${prefix}${rawCommand}` : rawCommand;
        if (!message.content.trim().toLowerCase().startsWith(command.toLowerCase())) return false;

        const ticket = ticketHelper.getTicket(message.channel);
        if (!ticket) {
          await message.reply('❌ This is not a tracked ticket.').catch(() => {});
          return false;
        }

        const isStaff = permHelper.isSupportStaff(message.member, data);
        if (!isStaff) {
          await message.reply('❌ Only support staff can claim tickets.').catch(() => {});
          return false;
        }

        if (ticket.claimedBy) {
          await message.reply(`❌ Already claimed by <@${ticket.claimedBy}>.`).catch(() => {});
          return false;
        }

        ticketHelper.updateTicket(message.channel.id, { claimedBy: message.author.id });
        const updated = ticketHelper.getTicket(message.channel);

        const color = parseInt((data.embedColor || '#5865F2').replace('#', ''), 16);
        const embed = buildClaimedEmbed(updated, message.author, isNaN(color) ? 0x5865F2 : color);
        await message.channel.send({ embeds: [embed] }).catch(() => {});

        if (message.client) {
          await logHelper.sendLog(message.client, data.logChannel, 'claimed', {
            '✋ Claimed By': `<@${message.author.id}>`,
          }, updated);
        }

        if (message.client && !plugin._attached) {
          plugin._attachInteractionHandler(message.client);
        }

        return true;
      },

      generateCode(node) {
        return `
// ── Ticket Claim ──────────────────────────────────────────────────────────────
if (message.content.startsWith(prefix + 'claim')) {
  const ticket = ticketStore[message.channel.id];
  if (!ticket) return message.reply('Not a ticket.');
  if (ticket.claimedBy) return message.reply('Already claimed by <@' + ticket.claimedBy + '>.');
  ticket.claimedBy = message.author.id;
  saveTickets(ticketStore);
  message.channel.send({ embeds: [{ color: 0x5865F2, title: '✋ Ticket Claimed', description: 'Claimed by ' + message.author.tag }] });
}
`;
      },
    },
  },
};
