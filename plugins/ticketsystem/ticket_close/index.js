'use strict';

const { ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const ticketHelpers = require('../ticketHelpers');

module.exports = {
  meta: {
    name: 'Close Ticket',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Close a ticket with transcript generation.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_close: {
      label: 'Close Ticket',
      icon: 'MINUS',
      color: '#E74C3C',
      description: 'Close the current ticket with optional transcript and deletion.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Success', type: 'flow' }, { id: 'err', label: 'Error', type: 'flow' }],

      configSchema: {
        command: {
          type: 'string',
          default: 'close',
          required: true,
        },
        requireConfirmation: {
          type: 'boolean',
          default: true,
          required: false,
          description: 'Show confirmation buttons before closing'
        },
        generateTranscript: {
          type: 'boolean',
          default: true,
          required: false,
        },
        deleteDelay: {
          type: 'number',
          default: 5,
          min: 0,
          max: 60,
          required: false,
          description: 'Seconds before deleting the ticket channel (0 = no deletion)'
        },
        transcriptChannel: {
          type: 'string',
          default: '',
          required: false,
          description: 'Channel ID to send transcript to'
        },
      },

      async execute(ctx) {
        const { node, message } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        const isCommand = message.content.toLowerCase().startsWith((node.data?.command || 'close').toLowerCase());
        if (!isCommand && !message.customId?.includes('ticket:close')) {
          return false;
        }

        try {
          const ticket = ticketHelpers.getTicketByChannel(message.channelId);
          if (!ticket) {
            await message.reply('This is not a ticket channel.').catch(() => {});
            return false;
          }

          if (node.data?.requireConfirmation) {
            const confirmEmbed = new EmbedBuilder()
              .setColor('#E74C3C')
              .setTitle('⚠️ Close Ticket?')
              .setDescription(`Are you sure you want to close this ticket? ${node.data?.generateTranscript ? 'A transcript will be generated.' : ''}`)
              .setTimestamp();

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
            return false;
          }

          // Generate transcript
          let transcriptUrl = null;
          if (node.data?.generateTranscript) {
            const html = await ticketHelpers.generateTranscript(message.channel, ticket);
            if (html) {
              transcriptUrl = ticketHelpers.saveTranscript(ticket.id, html);
            }
          }

          // Close ticket in database
          ticketHelpers.closeTicket(message.channelId, 'Closed by command', message.author.id);

          // Send transcript to log channel
          const transcriptChannelId = node.data?.transcriptChannel;
          if (transcriptChannelId && transcriptUrl) {
            const logChannel = await message.guild.channels.fetch(transcriptChannelId).catch(() => null);
            if (logChannel) {
              const transcriptEmbed = new EmbedBuilder()
                .setColor('#7289DA')
                .setTitle(`📄 Transcript - ${ticket.id}`)
                .setDescription(`[Download Transcript](${transcriptUrl})`)
                .addFields(
                  { name: 'User', value: `<@${ticket.ownerId}>`, inline: true },
                  { name: 'Category', value: ticket.category, inline: true },
                  { name: 'Closed At', value: new Date().toLocaleString(), inline: false }
                )
                .setTimestamp();

              await logChannel.send({ embeds: [transcriptEmbed] }).catch(() => {});
            }
          }

          // Send closing message
          const closeEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('🎫 Ticket Closed')
            .setDescription(`This ticket has been closed by ${message.author.tag}`)
            .setTimestamp();

          await message.channel.send({ embeds: [closeEmbed] }).catch(() => {});

          // Delete channel after delay
          const delaySeconds = node.data?.deleteDelay || 5;
          if (delaySeconds > 0) {
            setTimeout(async () => {
              await message.channel.delete().catch(() => {});
            }, delaySeconds * 1000);
          }

          return true;
        } catch (err) {
          console.error('Error in ticket_close:', err);
          return false;
        }
      },

      generateCode(node) {
        const generateTranscript = node.data?.generateTranscript !== false;
        const deleteDelay = node.data?.deleteDelay || 5;

        return `
async function closeTicket(channel, user, reason = 'No reason provided') {
  const { EmbedBuilder } = require('discord.js');

  ${generateTranscript ? `
  // Generate transcript
  const messages = await channel.messages.fetch({ limit: 100 });
  let html = '<html><body style="font-family: Arial">';
  messages.forEach(msg => {
    html += \`<p><strong>\${msg.author.username}</strong>: \${msg.content}</p>\`;
  });
  html += '</body></html>';
  ` : ''}

  const embed = new EmbedBuilder()
    .setColor('#E74C3C')
    .setTitle('🎫 Ticket Closed')
    .setDescription(\`This ticket has been closed by \${user.tag}\`)
    .addFields({ name: 'Reason', value: reason });

  await channel.send({ embeds: [embed] });

  ${deleteDelay > 0 ? `setTimeout(() => channel.delete().catch(() => {}), ${deleteDelay * 1000});` : ''}
}`;
      },
    },
  },
};
