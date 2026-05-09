const { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, SectionBuilder, ThumbnailBuilder } = require('discord.js');
const Ticket = require('../models/ticket');
const config = require('../config');
const emoji = require('../emoji');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = async (message, client) => {
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) throw new Error('Guild not found. Please check your config.js.');

    const category = guild.channels.cache.get(config.modmailCategory);
    if (!category) throw new Error('ModMail Category not found. Please check your config.js.');

    const channelName = `${config.ticketPrefix}${message.author.username}`;
    const staffChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `🎫 ModMail Ticket | ${message.author.tag} (${message.author.id})`,
        permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: config.staffRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] }
        ]
    });

    const ticketId = Math.random().toString(36).substr(2, 9).toUpperCase();

    const ticket = new Ticket({
        ticketId: ticketId,
        userId: message.author.id,
        channelId: staffChannel.id,
        status: 'open'
    });
    await ticket.save();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('claimTicket')
                .setLabel('Claim Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji(emoji.claim),
            new ButtonBuilder()
                .setCustomId('closeTicket')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji(emoji.close)
        );

    const staffContainer = new ContainerBuilder();
    
    const staffSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emoji.ticket} New ticket\nA new ModMail ticket has been created.`)
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(message.author.displayAvatarURL())
        );
    
    staffContainer.addSectionComponents(staffSection)
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${emoji.user} **User:** ${message.author} \`(${message.author.id})\`\n${emoji.ticket} **Ticket ID:** \`${ticketId}\``)
        )
        .addActionRowComponents(row);

    await staffChannel.send({ content: `<@&${config.staffRole}>` });
    await staffChannel.send({ components: [staffContainer], flags: [MessageFlags.IsComponentsV2] });

    const userContainer = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${emoji.ticket} Ticket created\nHello ${message.author.username}, your message has been forwarded to the support team.`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${emoji.ticket} **Ticket ID:** \`${ticketId}\``)
        );

    await message.author.send({ components: [userContainer], flags: [MessageFlags.IsComponentsV2] }).catch(() => {});

    return ticket;
};
