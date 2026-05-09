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
        if (interaction.user.id !== config.ownerId) {
            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} Only the **Bot Owner** can delete ticket channels!`)
                );
            return interaction.reply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
        if (!ticket) {
            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} This is not a ticket channel!`)
                );
            return interaction.reply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirmDelete')
                    .setLabel('Yes, Delete')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(emoji.delete),
                new ButtonBuilder()
                    .setCustomId('cancelClose') // Reusing cancelClose as it just hides the message
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${emoji.delete} Delete channel\nAre you sure you want to permanently delete this ticket channel? This action cannot be undone.`)
            )
            .addActionRowComponents(row);

        await interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
    },
};
