const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, SectionBuilder, ThumbnailBuilder } = require('discord.js');
const Ticket = require('../../models/ticket');
const emoji = require('../../emoji');
const config = require('../../config');
const generateTranscript = require('../../utils/transcript');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = {
    async execute(interaction, client) {
        if (!interaction.member.roles.cache.has(config.staffRole) && interaction.user.id !== config.ownerId) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} Only staff can close tickets!`)
                );
            return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: 'open' });
        if (!ticket) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} This ticket is already closed!`)
                );
            return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        const loadingContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${emoji.loading} Closing ticket and generating transcript...`)
            );
        await interaction.update({ components: [loadingContainer], flags: [MessageFlags.IsComponentsV2] });

        ticket.status = 'closed';
        await ticket.save();

        const { file, name } = await generateTranscript(ticket, client);
        const attachment = new AttachmentBuilder(file, { name });

        
        const transcriptChannel = client.channels.cache.get(config.transcriptChannel);
        if (transcriptChannel) {
            const userForLog = await client.users.fetch(ticket.userId).catch(() => null);
            const logContainer = new ContainerBuilder();
            
            const logSection = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${emoji.transcript} Ticket transcript | ${ticket.ticketId}`)
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(userForLog ? userForLog.displayAvatarURL() : client.user.displayAvatarURL())
                );
                
            logContainer.addSectionComponents(logSection)
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.user} **User:** <@${ticket.userId}> (\`${ticket.userId}\`)\n${emoji.staff} **Closed by:** ${interaction.user.tag}`)
                );

            await transcriptChannel.send({ components: [logContainer], flags: [MessageFlags.IsComponentsV2] });
            await transcriptChannel.send({ files: [attachment] }).catch(() => {});
        }

        
        const user = await client.users.fetch(ticket.userId).catch(() => null);
        if (user) {
            const dmContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${emoji.success} Ticket closed\nYour ticket has been closed. A transcript of the conversation is attached.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.transcript} **Ticket ID:** \`${ticket.ticketId}\``)
                );

            await user.send({ components: [dmContainer], flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            await user.send({ files: [attachment] }).catch(() => {});
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('deleteTicket')
                    .setLabel('Delete Channel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(emoji.delete)
            );

        const finalContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${emoji.success} Ticket closed\nThe ticket is now closed and transcripts have been sent.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${emoji.lock} **Channel:** Only the bot owner can delete this channel.`)
            )
            .addActionRowComponents(row);

        await interaction.followUp({ components: [finalContainer], flags: MessageFlags.IsComponentsV2 });
    },
};
