const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
                    new TextDisplayBuilder().setContent(`${emoji.error} Only staff can manage tickets!`)
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

        const selectedOption = interaction.values[0];
        
        
        if (!ticket.staffModes) ticket.staffModes = new Map();
        ticket.staffModes.set(interaction.user.id, selectedOption);
        ticket.replyMode = selectedOption;
        await ticket.save();

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${emoji.success} Reply mode updated\nYour mode is now set to **${selectedOption.toUpperCase()}** for this ticket.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# You can change this again using \`/mode\`.`)
            );

        await interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });

        
        const replyContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${emoji.reply} Ticket Ready\nSend replies to the user using the button below or use \`/reply\`.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Anyone from staff can use this button.`)
            );

        const replyRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('replyTicket')
                    .setLabel('Send Reply')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(emoji.reply)
            );

        await interaction.channel.send({ components: [replyContainer, replyRow], flags: [MessageFlags.IsComponentsV2] });
    },
};
