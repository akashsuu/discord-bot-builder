const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
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
            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} Only staff can close tickets!`)
                );
            return interaction.reply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: 'open' });
        if (!ticket) {
            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} This ticket is already closed!`)
                );
            return interaction.reply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${emoji.success} Ticket closure cancelled.`)
            );

        await interaction.update({ components: [container], flags: [MessageFlags.IsComponentsV2] });
    },
};
