const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
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
        .setName('guide')
        .setDescription('📖 How to contact the staff team'),
    async execute(interaction, client) {
        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${emoji.guide} Contacting staff\nFollow these steps to open a ModMail ticket.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Step 1 — Send a DM**\nSend a direct message to this bot with your question or issue.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Step 2 — Ticket created**\nThe bot creates a ticket and notifies the staff team.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Step 3 — Conversation**\nKeep chatting in DM with the bot. Staff replies are sent to you through ModMail.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# ${config.botName} • Created by Foil`)
            );

        await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    },
};