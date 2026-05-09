const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
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

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${emoji.delete} Deleting channel\nThis channel will be permanently deleted in 5 seconds.`)
            );

        await interaction.update({ components: [container], flags: [MessageFlags.IsComponentsV2] });

        setTimeout(async () => {
            await interaction.channel.delete().catch(() => {});
        }, 5000);
    },
};
