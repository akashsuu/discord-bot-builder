const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, AttachmentBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const emoji = require('../emoji');
const config = require('../config');
const { createCanvas, loadImage } = require('canvas');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

// Helper to generate the help banner
async function generateHelpBanner(client) {
    const width = 800;
    const height = 250;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#12121c';
    ctx.fillRect(0, 0, width, height);

    // Grid effect (optional but looks cool)
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }

    // Load Bot Avatar
    const avatarURL = client.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);

    // Draw Glowing Circle for Avatar
    const centerX = 130;
    const centerY = 125;
    const radius = 90;

    ctx.save();
    ctx.shadowColor = '#00BFFF'; // DarkSkyBlue Glow
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#12121c';
    ctx.fill();
    ctx.strokeStyle = '#00BFFF';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.restore();

    // Text Content Area
    const textX = 260;

    // Bot Name (Small, Uppercase)
    ctx.fillStyle = '#888888';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(config.botName.toUpperCase(), textX, 70);

    // Title: HELP MENU
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 70px Arial';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillText('HELP MENU', textX, 140);
    ctx.shadowBlur = 0; // Reset shadow

    // Tagline: PREMIUM MODMAIL SYSTEM
    ctx.fillStyle = '#00BFFF';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('PREMIUM MODMAIL SYSTEM', textX, 180);

    // Footer: Developed by Foil
    ctx.fillStyle = '#666666';
    ctx.font = 'italic 18px Arial';
    ctx.fillText('Developed by Foil', textX, 215);

    return canvas.toBuffer('image/png');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📚 View all available bot commands'),
    async execute(interaction, client) {
        const bannerBuffer = await generateHelpBanner(client);
        const attachment = new AttachmentBuilder(bannerBuffer, { name: 'help_banner.png' });

        const container = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${config.botName} Slash Commands\nOverview of available slash commands.\n-# Use \`?help\` to view non-slash commands help.`)
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL('attachment://help_banner.png')
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**User commands**\n${emoji.help} \`/help\` — Show this menu\n${emoji.guide} \`/guide\` — How to contact staff\n${emoji.ping} \`/ping\` — Check bot latency`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Staff commands**\n${emoji.reply} \`/reply\` — Reply to a ticket\n${emoji.close} \`/close\` — Close a ticket\n${emoji.transcript} \`/transcript\` — Generate ticket transcript\n${emoji.anon} \`/mode\` — Change reply mode (normal/anonymous)`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Owner commands**\n${emoji.reload} \`/reload\` — Reload bot commands\n${emoji.delete} \`/delete\` — Delete current ticket channel\n${emoji.list} \`/blacklist add/remove/list\` — Manage blacklist\n${emoji.staff} \`/mod add/remove/list\` — Manage staff members`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# ${config.botName} • Created by Foil`)
            );

        await interaction.reply({ components: [container], files: [attachment], flags: MessageFlags.IsComponentsV2 });
    },
};