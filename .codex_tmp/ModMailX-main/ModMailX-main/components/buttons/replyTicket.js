const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const Ticket = require('../../models/ticket');
const emoji = require('../../emoji');
const config = require('../../config');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = {
    async execute(interaction, client) {
        if (!interaction.member.roles.cache.has(config.staffRole) && interaction.user.id !== config.ownerId) {
            return interaction.reply({ content: `${emoji.error} Only staff can reply to tickets!`, flags: [MessageFlags.Ephemeral] });
        }

        const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: 'open' });
        if (!ticket) return interaction.reply({ content: `${emoji.error} This ticket is already closed!`, flags: [MessageFlags.Ephemeral] });

        const modal = new ModalBuilder()
            .setCustomId('replyModal')
            .setTitle('ModMail Reply');

        const messageInput = new TextInputBuilder()
            .setCustomId('replyMessage')
            .setLabel('Message')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Enter your reply here...')
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(messageInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    },
};
