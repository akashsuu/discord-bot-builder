const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, SectionBuilder, ThumbnailBuilder } = require('discord.js');
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
                    new TextDisplayBuilder().setContent(`${emoji.error} Only staff can claim tickets!`)
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

        if (ticket.claimedBy) {
            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} This ticket is already claimed by <@${ticket.claimedBy}>!`)
                );
            return interaction.reply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        ticket.claimedBy = interaction.user.id;
        await ticket.save();

        const claimContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${emoji.claim} Ticket claimed\nSelect how you want to reply to the user.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${emoji.staff} **Staff:** ${interaction.user} (${interaction.user.tag})`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Select a mode from dropdown menu below (it will expire in 15s) or use command \`/mode\` that will effect staff's reply in current ticket.`)
            );

        const selectRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selectTalkMode')
                    .setPlaceholder('🛡️ Choose Reply Mode...')
                    .addOptions([
                        {
                            label: 'Normal Mode',
                            description: 'User will see your name and avatar.',
                            value: 'normal',
                            emoji: emoji.staff
                        },
                        {
                            label: 'Anonymous Mode',
                            description: 'User will only see "Staff Member".',
                            value: 'anonymous',
                            emoji: emoji.anon
                        }
                    ])
            );

        const controlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('replyTicket')
                    .setLabel('Send Reply')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(emoji.reply),
                new ButtonBuilder()
                    .setCustomId('closeTicket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(emoji.close)
            );

        
        const originalUser = await client.users.fetch(ticket.userId).catch(() => null);
        const disabledRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('claimTicket')
                    .setLabel('Claimed')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(emoji.claim)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('closeTicket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(emoji.close)
            );

        const updatedStaffContainer = new ContainerBuilder();
        const updatedStaffSection = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${emoji.ticket} New ticket\nA new ModMail ticket has been created.`)
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(originalUser ? originalUser.displayAvatarURL() : client.user.displayAvatarURL())
            );
            
        updatedStaffContainer.addSectionComponents(updatedStaffSection)
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${emoji.user} **User:** <@${ticket.userId}> (\`${ticket.userId}\`)\n${emoji.ticket} **Ticket ID:** \`${ticket.ticketId}\`\n${emoji.staff} **Claimed By:** ${interaction.user}`)
            )
            .addActionRowComponents(disabledRow);

        await interaction.message.edit({ components: [updatedStaffContainer], flags: [MessageFlags.IsComponentsV2] });
        
        const response = await interaction.reply({ components: [claimContainer, selectRow], flags: [MessageFlags.IsComponentsV2], fetchReply: true });

        
        setTimeout(async () => {
            try {
                const expiredContainer = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## ${emoji.claim} Ticket claimed\n${emoji.staff} **Staff:** ${interaction.user} (${interaction.user.tag})\n\n-# Mode selection expired. Use \`/mode\` or \`/reply\` to continue.`)
                    );
                await interaction.editReply({ components: [expiredContainer], flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            } catch (err) {}
        }, 15000);
    },
};
