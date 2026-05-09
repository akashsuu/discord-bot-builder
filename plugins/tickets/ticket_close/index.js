'use strict';

/**
 * ticket_close/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles:
 *   - !close prefix command
 *   - ticket:close:<ticketId> button (from welcome message)
 *   - ticket:close:confirm:<channelId> confirm button
 *   - ticket:close:cancel:<channelId>  cancel button
 *
 * Flow:
 *   1. Staff/owner triggers close
 *   2. Bot sends confirmation embed with Confirm + Cancel buttons
 *   3. On confirm → transcript → log → timed delete
 *   4. On cancel  → remove confirmation message
 */

const path = require('path');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

const ticketHelper = require(path.join(__dirname, '..', 'helpers', 'tickets.js'));
const permHelper   = require(path.join(__dirname, '..', 'helpers', 'permissions.js'));
const logHelper    = require(path.join(__dirname, '..', 'helpers', 'logger.js'));

let _transcriptHelper = null;
function getTranscriptHelper() {
  if (!_transcriptHelper) {
    _transcriptHelper = require(path.join(__dirname, '..', 'helpers', 'transcripts.js'));
  }
  return _transcriptHelper;
}

// ── Confirmation embed ────────────────────────────────────────────────────────
function buildConfirmEmbed(color) {
  return new EmbedBuilder()
    .setColor(color || 0xED4245)
    .setTitle('⚠️ Close Ticket?')
    .setDescription('Are you sure you want to close this ticket?\n\nA transcript will be saved and the channel will be deleted.')
    .setTimestamp();
}

function buildConfirmRow(channelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket:close:confirm:${channelId}`)
      .setLabel('✅ Confirm Close')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ticket:close:cancel:${channelId}`)
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary),
  );
}

// ── Execute the actual close ──────────────────────────────────────────────────
async function executeClose(interaction, channel, ticket, data) {
  const color    = parseInt((data?.embedColor || '#ED4245').replace('#', ''), 16);
  const timer    = Math.max(1, Number(data?.closeTimer ?? 5));
  const closerTag = interaction.user?.tag || interaction.author?.tag || 'Unknown';

  // ── Generate transcript ────────────────────────────────────────────────────
  let transcriptPath = null;
  if (data?.transcriptEnabled !== false) {
    try {
      const th = getTranscriptHelper();
      transcriptPath = await th.generateTranscript(channel, ticket, channel.guild.name);
      ticketHelper.updateTicket(channel.id, { transcriptPath });
    } catch (err) {
      console.error('[TicketClose] Transcript generation failed:', err.message);
    }
  }

  // ── Mark ticket closed ─────────────────────────────────────────────────────
  ticketHelper.closeTicket(channel.id, transcriptPath);

  // ── Send closing embed ─────────────────────────────────────────────────────
  try {
    const closeEmbed = new EmbedBuilder()
      .setColor(isNaN(color) ? 0xED4245 : color)
      .setTitle('🔒 Ticket Closed')
      .setDescription(`Closed by **${closerTag}**\nThis channel will be deleted in **${timer}** seconds.`)
      .setTimestamp();

    if (transcriptPath) {
      closeEmbed.addFields({ name: '📄 Transcript', value: `Saved to \`${path.basename(transcriptPath)}\``, inline: false });
    }

    await channel.send({ embeds: [closeEmbed] });
  } catch { /* channel may already be gone */ }

  // ── Log ────────────────────────────────────────────────────────────────────
  if (data?.logChannel && interaction.client) {
    await logHelper.sendLog(
      interaction.client,
      data.logChannel,
      'closed',
      {
        '🔒 Closed By': `<@${interaction.user?.id}>`,
        '📄 Transcript': transcriptPath ? 'Saved' : 'Disabled',
      },
      ticket
    );
  }

  // ── Timed channel deletion ─────────────────────────────────────────────────
  setTimeout(async () => {
    try {
      await channel.delete(`Ticket closed by ${closerTag}`);
      ticketHelper.removeTicket(channel.id);
    } catch { /* channel may already be deleted */ }
  }, timer * 1000);
}

module.exports = {
  meta: {
    name:          'Ticket Close',
    version:       '1.0.0',
    author:        'Akashsuu',
    description:   'Closes a ticket with confirmation, transcript, and timed deletion.',
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
      const id = interaction.customId;

      // ── Close button from welcome message: ticket:close:<ticketId> ────────
      if (id.startsWith('ticket:close:') && !id.includes(':confirm:') && !id.includes(':cancel:')) {
        const channel = interaction.channel;
        const ticket  = ticketHelper.getTicket(channel);
        if (!ticket) {
          return interaction.reply({ content: '❌ This is not a tracked ticket.', ephemeral: true }).catch(() => {});
        }

        const data = this._nodeData || {};
        const canClose = interaction.user.id === ticket.ownerId || permHelper.isSupportStaff(interaction.member, data);
        if (!canClose) {
          return interaction.reply({ content: '❌ You cannot close this ticket.', ephemeral: true }).catch(() => {});
        }

        const color = parseInt((data.embedColor || '#ED4245').replace('#', ''), 16);
        await interaction.reply({
          embeds: [buildConfirmEmbed(isNaN(color) ? 0xED4245 : color)],
          components: [buildConfirmRow(channel.id)],
          ephemeral: false,
        }).catch(() => {});
        return;
      }

      // ── Confirm close: ticket:close:confirm:<channelId> ───────────────────
      if (id.startsWith('ticket:close:confirm:')) {
        const channelId = id.split(':')[3];
        const channel   = interaction.guild?.channels.cache.get(channelId) || interaction.channel;
        const ticket    = ticketHelper.getTicket(channel);
        if (!ticket) {
          return interaction.reply({ content: '❌ Ticket not found.', ephemeral: true }).catch(() => {});
        }

        const data = this._nodeData || {};
        const canClose = interaction.user.id === ticket.ownerId || permHelper.isSupportStaff(interaction.member, data);
        if (!canClose) {
          return interaction.reply({ content: '❌ You cannot close this ticket.', ephemeral: true }).catch(() => {});
        }

        await interaction.deferUpdate().catch(() => {});
        await executeClose(interaction, channel, ticket, data);
        return;
      }

      // ── Cancel close: ticket:close:cancel:<channelId> ─────────────────────
      if (id.startsWith('ticket:close:cancel:')) {
        await interaction.message.delete().catch(() => {});
        await interaction.reply({ content: '✅ Close cancelled.', ephemeral: true }).catch(() => {});
      }
    });
  },

  nodes: {
    ticket_close: {
      label:       'Ticket Close',
      icon:        '🔒',
      color:       '#7B241C',
      description: 'Closes a ticket channel with confirmation flow, transcript, and timed deletion.',
      inputs:  [{ id: 'in',  label: 'Trigger',  type: 'flow' }],
      outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

      configSchema: {
        command:            { type: 'string',  default: 'close' },
        closeTimer:         { type: 'number',  default: 5 },
        transcriptEnabled:  { type: 'boolean', default: true },
        logChannel:         { type: 'string',  default: '' },
        supportRoles:       { type: 'string',  default: '' },
        embedColor:         { type: 'string',  default: '#ED4245' },
      },

      async execute(node, message, ctx) {
        const plugin = module.exports;
        plugin._nodeData = node.data || {};

        if (!message || !message.guild || message.author?.bot) return false;

        const data = node.data || {};
        const prefix = ctx?.prefix || '!';
        const rawCommand = (data.command || 'close').trim();
        const command = (prefix && !rawCommand.startsWith(prefix)) ? `${prefix}${rawCommand}` : rawCommand;
        if (!message.content.trim().toLowerCase().startsWith(command.toLowerCase())) return false;

        const ticket = ticketHelper.getTicket(message.channel);
        if (!ticket) {
          await message.reply('❌ This channel is not a tracked ticket.').catch(() => {});
          return false;
        }

        const canClose = message.author.id === ticket.ownerId || permHelper.isSupportStaff(message.member, data);
        if (!canClose) {
          await message.reply('❌ You cannot close this ticket.').catch(() => {});
          return false;
        }

        const color = parseInt((data.embedColor || '#ED4245').replace('#', ''), 16);
        await message.channel.send({
          embeds: [buildConfirmEmbed(isNaN(color) ? 0xED4245 : color)],
          components: [buildConfirmRow(message.channel.id)],
        }).catch(() => {});

        // Wire client
        if (message.client && !plugin._attached) {
          plugin._attachInteractionHandler(message.client);
        }

        return true;
      },

      generateCode(node) {
        const timer = Number(node.data?.closeTimer ?? 5);
        return `
// ── Ticket Close ──────────────────────────────────────────────────────────────
// Handles: !close command + ticket:close:* button interactions

// Inside messageCreate:
if (message.content.startsWith(prefix + 'close')) {
  const ticket = ticketStore[message.channel.id];
  if (!ticket) return message.reply('Not a ticket channel.');
  // Send confirmation embed with Confirm/Cancel buttons
  // See full logic: plugins/tickets/ticket_close/index.js
}

// Inside interactionCreate (buttons):
if (interaction.customId.startsWith('ticket:close:confirm:')) {
  // Execute close: generate transcript, log, delete after ${timer}s
}
if (interaction.customId.startsWith('ticket:close:cancel:')) {
  await interaction.message.delete();
}
`;
      },
    },
  },
};
