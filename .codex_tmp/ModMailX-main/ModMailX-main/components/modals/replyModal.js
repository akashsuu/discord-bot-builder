const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const Ticket = require('../../models/ticket');
const emoji = require('../../emoji');
const config = require('../../config');
const sendToUser = require('../../utils/sendToUser');
const sendToStaff = require('../../utils/sendToStaff');

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
                    new TextDisplayBuilder().setContent(`${emoji.error} Only staff can reply to tickets!`)
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

        const replyMessage = interaction.fields.getTextInputValue('replyMessage');
        const user = await client.users.fetch(ticket.userId).catch(() => null);

        if (!user) {
            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} Failed to find user for this ticket!`)
                );
            return interaction.reply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        
        const staffMode = (ticket.staffModes && ticket.staffModes.get(interaction.user.id)) || ticket.replyMode || 'normal';

        const success = await sendToUser(user, replyMessage, interaction.user, client, staffMode);

        if (success) {
            await sendToStaff(interaction.channel, user, replyMessage, interaction.user, client);
            
            
            ticket.messages.push({
                senderId: interaction.user.id,
                senderName: staffMode === 'anonymous' ? 'Staff Member' : interaction.user.tag,
                content: replyMessage,
                isStaff: true
            });
            await ticket.save();

            const successContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${emoji.success} Message sent\nYour message has been delivered to **${user.username}**.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.anon} **Mode:** \`${staffMode.toUpperCase()}\``)
                );

            await interaction.reply({ components: [successContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        } else {
            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} Failed to send reply to user! (DMs might be closed)`)
                );
            return interaction.reply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }
    },
};
