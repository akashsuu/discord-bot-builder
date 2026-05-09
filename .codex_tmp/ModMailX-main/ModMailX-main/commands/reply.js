const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
const Ticket = require('../models/ticket');
const emoji = require('../emoji');
const config = require('../config');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reply')
        .setDescription('💬 Reply to an open ticket')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.staffRole) && interaction.user.id !== config.ownerId) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} Only staff can reply to tickets!`)
                );
            return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: 'open' });
        if (!ticket) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} This is not an open ticket channel!`)
                );
            return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        const modal = new ModalBuilder()
            .setCustomId('replyModal')
            .setTitle('ModMail Response');

        const messageInput = new TextInputBuilder()
            .setCustomId('replyMessage')
            .setLabel('Message Content')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Type your response to the user here...')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(messageInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    },
};