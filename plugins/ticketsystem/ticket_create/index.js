'use strict';

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ticketHelpers = require('../ticketHelpers');

module.exports = {
  meta: {
    name: 'Create Ticket',
    version: '1.0.0',
    author: 'Akashsuu',
    description: 'Create a new ticket channel for users.',
    engineVersion: '>=1.0.0',
  },

  nodes: {
    ticket_create: {
      label: 'Create Ticket',
      icon: 'PLUS',
      color: '#43B581',
      description: 'Create a new ticket channel with configurable naming and categories.',
      inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
      outputs: [{ id: 'out', label: 'Success', type: 'flow' }, { id: 'err', label: 'Error', type: 'flow' }],

      configSchema: {
        categoryChannel: {
          type: 'string',
          default: '',
          required: false,
          description: 'Category channel ID where tickets are created'
        },
        logChannel: {
          type: 'string',
          default: '',
          required: false,
          description: 'Channel ID for ticket logs'
        },
        maxTicketsPerUser: {
          type: 'number',
          default: 1,
          min: 1,
          max: 10,
          required: false,
        },
        ticketNaming: {
          type: 'string',
          default: 'ticket-{username}',
          required: false,
          description: 'Format: ticket-{username} or ticket-{number}'
        },
        allowDuplicates: {
          type: 'boolean',
          default: false,
          required: false,
        },
        welcomeMessage: {
          type: 'string',
          default: 'Welcome to your support ticket! A team member will assist you soon.',
          required: false,
        },
      },

      async execute(ctx) {
        const { node, message, client } = ctx;
        if (!message || !message.guild || message.author?.bot) return false;

        // Check if triggered by button or command
        const isButton = message.customId?.startsWith('ticket:create:');
        if (!isButton && !message.content.toLowerCase().startsWith('/ticket create')) {
          return false;
        }

        try {
          const category = isButton ? message.customId.split(':')[2] : 'support';
          const user = message.user || message.author;
          const guild = message.guild;

          // Check max tickets per user
          const userTickets = ticketHelpers.getUserTickets(guild.id, user.id);
          const maxTickets = node.data?.maxTicketsPerUser || 1;

          if (userTickets.length >= maxTickets) {
            const reply = `You already have ${userTickets.length} open ticket(s). Close one before creating another.`;
            if (isButton) {
              await message.reply({ content: reply, ephemeral: true }).catch(() => {});
            } else {
              await message.reply(reply).catch(() => {});
            }
            return false;
          }

          // Check for duplicates
          if (!node.data?.allowDuplicates && ticketHelpers.hasOpenTicket(guild.id, user.id)) {
            const reply = 'You already have an open ticket. Please close it first.';
            if (isButton) {
              await message.reply({ content: reply, ephemeral: true }).catch(() => {});
            } else {
              await message.reply(reply).catch(() => {});
            }
            return false;
          }

          // Create ticket channel
          const categoryId = node.data?.categoryChannel;
          const ticketNaming = node.data?.ticketNaming || 'ticket-{username}';

          const result = await ticketHelpers.createTicketChannel(guild, user, category, categoryId, {
            naming: ticketNaming,
          });

          if (!result) {
            const reply = 'Failed to create ticket channel.';
            if (isButton) {
              await message.reply({ content: reply, ephemeral: true }).catch(() => {});
            } else {
              await message.reply(reply).catch(() => {});
            }
            return false;
          }

          const { channel, ticket } = result;

          // Send welcome message
          const welcomeEmbed = new EmbedBuilder()
            .setColor('#43B581')
            .setTitle('📋 Welcome to Your Ticket')
            .setDescription(node.data?.welcomeMessage || 'Welcome to your support ticket! A team member will assist you soon.')
            .addFields(
              { name: 'Ticket ID', value: ticket.id, inline: true },
              { name: 'Category', value: category, inline: true },
              { name: 'Created', value: new Date().toLocaleString(), inline: false }
            )
            .setFooter({ text: 'Ticket System' })
            .setTimestamp();

          await channel.send({ embeds: [welcomeEmbed] }).catch(() => {});

          // Send confirmation to user
          const confirmReply = `✅ Ticket created! <#${channel.id}>`;
          if (isButton) {
            await message.reply({ content: confirmReply, ephemeral: true }).catch(() => {});
          } else {
            await message.reply(confirmReply).catch(() => {});
          }

          // Log ticket creation
          const logChannelId = node.data?.logChannel;
          if (logChannelId) {
            const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setColor('#43B581')
                .setTitle('🎫 Ticket Created')
                .addFields(
                  { name: 'Ticket ID', value: ticket.id, inline: true },
                  { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                  { name: 'Category', value: category, inline: true },
                  { name: 'Channel', value: `<#${channel.id}>`, inline: true }
                )
                .setTimestamp();

              await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
          }

          return true;
        } catch (err) {
          console.error('Error in ticket_create:', err);
          return false;
        }
      },

      generateCode(node) {
        const maxTickets = node.data?.maxTicketsPerUser || 1;
        const welcomeMsg = node.data?.welcomeMessage || 'Welcome to your support ticket!';

        return `
async function handleTicketCreate(interaction, category = 'support') {
  const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
  const user = interaction.user || interaction.member.user;
  const guild = interaction.guild;

  // Check max tickets
  const userTickets = tickets.filter(t => t.guildId === guild.id && t.ownerId === user.id && !t.closedAt);
  if (userTickets.length >= ${maxTickets}) {
    return interaction.reply({ content: 'You have reached max open tickets', ephemeral: true });
  }

  // Create channel
  const channel = await guild.channels.create({
    name: \`ticket-\${user.username}\`,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ]
  });

  const ticket = {
    id: 'TKT-' + Date.now(),
    guildId: guild.id,
    channelId: channel.id,
    ownerId: user.id,
    category,
    priority: 'medium',
    locked: false,
    createdAt: new Date().toISOString(),
    closedAt: null,
    claimedBy: null,
  };

  tickets.push(ticket);

  const embed = new EmbedBuilder()
    .setColor('#43B581')
    .setTitle('📋 Welcome to Your Ticket')
    .setDescription('${welcomeMsg}')
    .addFields({ name: 'Ticket ID', value: ticket.id });

  await channel.send({ embeds: [embed] });
  await interaction.reply({ content: \`✅ Ticket created: <#\${channel.id}>\`, ephemeral: true });
}`;
      },
    },
  },
};
