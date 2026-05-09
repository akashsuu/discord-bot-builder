const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    AttachmentBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');
const mongoose = require('mongoose');
const config = require('../config');
const { createCanvas, loadImage } = require('canvas');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Check bot latency and system status'),

    async execute(interaction, client) {
        const isPrefix = interaction.author !== undefined;
        const user = isPrefix ? interaction.author : interaction.user;

        // ── Measure Latencies ──────────────────────────────────────────────
        const websocketPing = client.ws.ping;

        const dbStart = Date.now();
        await mongoose.connection.db.admin().ping();
        const dbPing = Date.now() - dbStart;

        const responsePing = Date.now() - interaction.createdTimestamp;

        // ── Canvas Image Generation ────────────────────────────────────────
        const width  = 800;
        const height = 250;
        const canvas = createCanvas(width, height);
        const ctx    = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#12121c';
        ctx.fillRect(0, 0, width, height);

        // Load Bot Avatar
        const avatarURL = client.user.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar    = await loadImage(avatarURL);

        // Glowing circle for avatar
        const centerX = 130;
        const centerY = 125;
        const radius  = 90;

        ctx.save();
        ctx.shadowColor = '#00BFFF';
        ctx.shadowBlur  = 25;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#12121c';
        ctx.fill();
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth   = 6;
        ctx.stroke();
        ctx.restore();

        // Avatar clipped to circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 3, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
        ctx.restore();

        // Bot Name
        ctx.fillStyle = '#FFFFFF';
        ctx.font      = 'bold 42px Arial';
        const botNameText = config.botName.toUpperCase();
        ctx.fillText(botNameText, 260, 70);

        // Created by Foil (Shifted to right of Bot Name, 1/2 size)
        const nameWidth = ctx.measureText(botNameText).width;
        ctx.fillStyle = '#888888';
        ctx.font      = 'italic 21px Arial';
        ctx.fillText(`(Created by Foil)`, 260 + nameWidth + 15, 70);

        // Subtitle
        ctx.fillStyle = '#888888';
        ctx.font      = '22px Arial';
        ctx.fillText('System Latency', 260, 105);

        // Helper: draw a mini graph with label + value
        function drawGraph(x, y, w, h, color, label, value, subLabel) {
            // Label
            ctx.fillStyle = color;
            ctx.font      = 'bold 16px Arial';
            ctx.fillText(label, x, y - 10);

            // Gradient fill
            const gradient = ctx.createLinearGradient(x, y, x, y + h);
            gradient.addColorStop(0, color + '33');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, w, h);

            // Generate points
            const points = [];
            const step = w / 5;
            for (let i = 0; i <= 5; i++) {
                points.push({
                    px: x + i * step,
                    py: y + h - (Math.random() * h * 0.8 + 5)
                });
            }

            // Draw connecting line (thin)
            ctx.strokeStyle = color;
            ctx.lineWidth   = 1.5;
            ctx.beginPath();
            ctx.moveTo(points[0].px, points[0].py);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].px, points[i].py);
            }
            ctx.stroke();

            // Draw dots on top
            for (const point of points) {
                ctx.save();
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(point.px, point.py, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Value
            ctx.fillStyle = '#FFFFFF';
            ctx.font      = 'bold 18px Arial';
            ctx.fillText(value, x, y + h + 25);

            // Sub-label
            if (subLabel) {
                ctx.fillStyle = '#666666';
                ctx.font      = '14px Arial';
                ctx.fillText(subLabel, x, y + h + 45);
            }
        }

        drawGraph(260, 140, 160, 50, '#FF007F', 'API Latency', `${websocketPing}ms`, 'Websocket');
        drawGraph(440, 140, 160, 50, '#00FF00', 'Database',    `${dbPing}ms`, 'MongoDB');
        drawGraph(620, 140, 160, 50, '#00BFFF', 'Response',    `${Math.abs(responsePing)}ms`, 'Response Time');

        // ── Build Attachment ───────────────────────────────────────────────
        const buffer     = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buffer, { name: 'stats.png' });

        // ── Build Components V2 Container ──────────────────────────────────
        const container = new ContainerBuilder();

        const headerSection = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ${config.botName} Latency\nSystem status and connection metrics for **${config.serverName}**.`
                )
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 }))
            );

        const ansiLatencies = [
            `\u001b[36m🌐 Websocket\u001b[0m : ${websocketPing}ms`,
            `\u001b[35m💾 Database\u001b[0m  : ${dbPing}ms`,
            `\u001b[32m⚡ Response\u001b[0m  : ${Math.abs(responsePing)}ms`
        ].join('\n');

        container
            .addSectionComponents(headerSection)
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
                    .setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`\`\`\`ansi\n${ansiLatencies}\n\`\`\``)
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Small)
                    .setDivider(false)
            )
            // ✅ Correct way to attach an image inside Components V2
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL('attachment://stats.png')
                    )
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Requested by ${user.tag} • ${new Date().toLocaleTimeString()}`
                )
            );

        // ── Send Response ──────────────────────────────────────────────────
        const response = {
            // ❌ No `embeds` — not compatible with IsComponentsV2
            components: [container],
            files:      [attachment],   // ✅ File declared here, referenced via attachment://
            flags:      MessageFlags.IsComponentsV2
        };

        try {
            return await interaction.reply(response);
        } catch (error) {
            console.error('Error replying to command:', error);
            if (isPrefix) {
                return interaction.channel.send(response);
            }
        }
    },
};