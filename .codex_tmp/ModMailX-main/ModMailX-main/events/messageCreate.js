const { Events, ChannelType, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, SectionBuilder, ThumbnailBuilder, AttachmentBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const Ticket = require('../models/ticket');
const Blacklist = require('../models/blacklist');
const config = require('../config');
const emoji = require('../emoji');
const createTicket = require('../utils/createTicket');
const chalk = require('chalk');
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

    // Grid effect
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
    ctx.shadowBlur = 0;

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
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;

        
        if (message.channel.type === ChannelType.DM) {
            console.log(chalk.blue(`[ModMail] Received DM from ${message.author.tag}: ${message.content || '(No text content)'}`));
            try {
                
                const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
                if (isBlacklisted) {
                    const blacklistContainer = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${emoji.error} You are not allowed to use ModMail.\nReason: ${isBlacklisted.reason}`)
                        );
                    return message.reply({ components: [blacklistContainer], flags: [MessageFlags.IsComponentsV2] });
                }

                let ticket = await Ticket.findOne({ userId: message.author.id, status: 'open' });

                if (ticket) {
                    const staffChannel = await client.channels.fetch(ticket.channelId).catch(() => null);
                    if (!staffChannel) {
                        console.log(chalk.yellow(`[ModMail] Channel ${ticket.channelId} for ${message.author.tag} is missing. Resetting ticket...`));
                        ticket.status = 'closed';
                        await ticket.save();
                        ticket = null; 
                    }
                }

                let isNewTicket = false;
                if (!ticket) {
                    ticket = await createTicket(message, client);
                    isNewTicket = true;
                }

                const staffChannel = await client.channels.fetch(ticket.channelId).catch(() => null);

                
                
                if (!isNewTicket) {
                    const container = new ContainerBuilder();
                    
                    const section = new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`## ${emoji.user} Message from ${message.author.tag}\n${message.content || '*No text content*'}`)
                        )
                        .setThumbnailAccessory(
                            new ThumbnailBuilder().setURL(message.author.displayAvatarURL())
                        );
                    
                    container.addSectionComponents(section)
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`-# **User ID:** ${message.author.id}`)
                        );

                    await staffChannel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                    
                    
                    if (message.attachments.size > 0) {
                        await staffChannel.send({ files: Array.from(message.attachments.values()) });
                    }
                }

                
                ticket.messages.push({
                    senderId: message.author.id,
                    senderName: message.author.tag,
                    content: message.content || "",
                    isStaff: false
                });
                await ticket.save();

                
                await message.react('✅').catch(() => {});
            } catch (error) {
                console.error(chalk.red('[ModMail] Error handling DM:'), error);
            }
            return;
        }

        
        const prefix = config.botPrefix;
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
        const generateTranscript = require('../utils/transcript');
        const fs = require('fs');
        const path = require('path');
        const { REST, Routes } = require('discord.js');

        
        if (commandName === 'help') {
            const bannerBuffer = await generateHelpBanner(client);
            const attachment = new AttachmentBuilder(bannerBuffer, { name: 'help_banner.png' });

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${config.botName} Prefix Commands\nOverview of available prefix commands.\n-# Use \`/help\` to view slash commands help.`)
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
                    new TextDisplayBuilder().setContent(`**User commands**\n${emoji.help} \`${prefix}help\` — Show this menu\n${emoji.guide} \`${prefix}guide\` — How to contact staff\n${emoji.ping} \`${prefix}ping\` — Check bot latency`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Staff commands**\n${emoji.reply} \`${prefix}reply\` — Reply to a ticket (shows info)\n${emoji.close} \`${prefix}close\` — Close a ticket\n${emoji.transcript} \`${prefix}transcripts\` — Generate ticket transcript\n${emoji.anon} \`${prefix}mode <mode>\` — Change reply mode (n/normal or a/anonymous)`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Owner commands**\n${emoji.reload} \`${prefix}reload\` — Reload bot commands\n${emoji.delete} \`${prefix}delete\` — Delete current ticket channel\n${emoji.list} \`${prefix}blacklist <add/a/remove/r/list>\` — Manage blacklist\n${emoji.staff} \`${prefix}mod <add/remove/list>\` — Manage staff members`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# ${config.botName} • Created by Foil`)
                );

            return message.reply({ components: [container], files: [attachment], flags: [MessageFlags.IsComponentsV2] });
        }

        
        if (commandName === 'guide') {
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

            return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        }

        
        if (commandName === 'ping') {
            const command = require('../commands/ping');
            return command.execute(message, client);
        }

        
        if (commandName === 'reply') {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.help} The \`${prefix}reply\` command is not supported for prefix. Please use \`/reply\` instead.`)
                );
            return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        }

        
        if (commandName === 'close') {
            if (!message.member.roles.cache.has(config.staffRole) && message.author.id !== config.ownerId) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Only staff can close tickets!`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }

            const ticket = await Ticket.findOne({ channelId: message.channel.id, status: 'open' });
            if (!ticket) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} This is not an open ticket channel!`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirmClose').setLabel('Yes, Close It').setStyle(ButtonStyle.Danger).setEmoji(emoji.close),
                new ButtonBuilder().setCustomId('cancelClose').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.close} Close ticket`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Do you want to close this ticket? A transcript will be generated and the user will be notified.`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Closing a ticket stops further messages.`))
                .addActionRowComponents(row);

            return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        }

        
        if (commandName === 'transcripts' || commandName === 'transcript') {
            if (!message.member.roles.cache.has(config.staffRole) && message.author.id !== config.ownerId) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Only staff can generate transcripts!`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }

            const ticket = await Ticket.findOne({ channelId: message.channel.id });
            if (!ticket) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} This is not a ticket channel!`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }

            const loadingContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.loading} Generating transcript...`));
            const replyMsg = await message.reply({ components: [loadingContainer], flags: [MessageFlags.IsComponentsV2] });

            try {
                const { file, name } = await generateTranscript(ticket, client);
                const attachment = new AttachmentBuilder(file, { name });

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.success} Transcript generated`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`A transcript for ticket **${ticket.ticketId}** is attached.`));

                await replyMsg.edit({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                await message.channel.send({ files: [attachment] });

                const transcriptChannel = client.channels.cache.get(config.transcriptChannel);
                if (transcriptChannel) {
                    const userForLog = await client.users.fetch(ticket.userId).catch(() => null);
                    const logContainer = new ContainerBuilder();
                    const logSection = new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.transcript} Manual Transcript Generated | ${ticket.ticketId}`))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(userForLog ? userForLog.displayAvatarURL() : client.user.displayAvatarURL()));
                    logContainer.addSectionComponents(logSection)
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.user} **User:** <@${ticket.userId}> (\`${ticket.userId}\`)\n${emoji.staff} **Generated by:** ${message.author.tag}`));
                    await transcriptChannel.send({ components: [logContainer], flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                    await transcriptChannel.send({ files: [attachment] }).catch(() => {});
                }
            } catch (err) {
                console.error(err);
                const errorContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Failed to generate transcript.`));
                await replyMsg.edit({ components: [errorContainer], flags: [MessageFlags.IsComponentsV2] });
            }
            return;
        }

        
        if (commandName === 'mode') {
            if (!message.member.roles.cache.has(config.staffRole) && message.author.id !== config.ownerId) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Only staff can change reply modes!`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }

            const ticket = await Ticket.findOne({ channelId: message.channel.id, status: 'open' });
            if (!ticket) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} This is not an open ticket channel!`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }

            let type = args[0]?.toLowerCase();
            if (type === 'n' || type === 'normal') type = 'normal';
            else if (type === 'a' || type === 'anonymous' || type === 'anon') type = 'anonymous';
            else {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Invalid mode! Use \`normal\` (n) or \`anonymous\` (a).`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }

            if (!ticket.staffModes) ticket.staffModes = new Map();
            ticket.staffModes.set(message.author.id, type);
            ticket.replyMode = type;
            await ticket.save();

            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.success} Your reply mode has been set to **${type.toUpperCase()}** for this ticket.`));
            return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        }

        
        if (commandName === 'reload') {
            if (message.author.id !== config.ownerId) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Only the owner can use this command!`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }

            const loadingContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.loading} Reloading commands...`));
            const replyMsg = await message.reply({ components: [loadingContainer], flags: [MessageFlags.IsComponentsV2] });

            const commands = [];
            const commandsPath = path.join(__dirname, '../commands');
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

            client.commands.clear();
            for (const file of commandFiles) {
                delete require.cache[require.resolve(`../commands/${file}`)];
                const command = require(`../commands/${file}`);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    commands.push(command.data.toJSON());
                }
            }

            const rest = new REST().setToken(config.token);
            try {
                await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.success} Commands reloaded`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Reloaded **${commands.length}** commands.`));
                await replyMsg.edit({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            } catch (error) {
                console.error(error);
                const errorContainer = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Failed to reload commands: \`${error.message}\``));
                await replyMsg.edit({ components: [errorContainer], flags: [MessageFlags.IsComponentsV2] });
            }
            return;
        }

        
        if (commandName === 'delete') {
            if (message.author.id !== config.ownerId) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Only the bot owner can use this command.`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }

            const ticket = await Ticket.findOne({ channelId: message.channel.id });
            if (!ticket) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} This is not a ticket channel!`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirmDelete').setLabel('Yes, Delete').setStyle(ButtonStyle.Danger).setEmoji(emoji.delete),
                new ButtonBuilder().setCustomId('cancelClose').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.delete} Delete channel`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Are you sure you want to permanently delete this ticket channel?`))
                .addActionRowComponents(row);

            return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        }

        
        if (commandName === 'blacklist') {
            if (message.author.id !== config.ownerId) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Only the owner can use this command!`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }

            const sub = args[0]?.toLowerCase();
            if (sub === 'add' || sub === 'a') {
                const user = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);
                if (!user) {
                    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Please mention a user or provide a valid ID!`));
                    return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                }
                const reason = args.slice(2).join(' ') || 'No reason provided';
                const isBlacklisted = await Blacklist.findOne({ userId: user.id });
                if (isBlacklisted) {
                    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} ${user.tag} is already blacklisted!`));
                    return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                }
                await new Blacklist({ userId: user.id, reason, addedBy: message.author.id }).save();
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.success} User blacklisted`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${user.tag} can no longer use ModMail.`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${emoji.user} User**\n${user} (\`${user.id}\`)`))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${emoji.list} Reason**\n\`${reason}\``));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            } else if (sub === 'remove' || sub === 'r') {
                const user = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);
                if (!user) {
                    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Please mention a user or provide a valid ID!`));
                    return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                }
                const isBlacklisted = await Blacklist.findOne({ userId: user.id });
                if (!isBlacklisted) {
                    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} ${user.tag} is not blacklisted!`));
                    return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                }
                await Blacklist.deleteOne({ userId: user.id });
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.success} User removed from blacklist`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${user.tag} can now use ModMail again.`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            } else if (sub === 'list') {
                const list = await Blacklist.find();
                if (list.length === 0) {
                    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.list} The blacklist is currently empty!`));
                    return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                }
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${emoji.list} Blacklisted users`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(list.map((u, i) => `**${i + 1}.** <@${u.userId}> (\`${u.userId}\`) — Reason: \`${u.reason}\``).join('\n')));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }
            return;
        }

        
        if (commandName === 'mod') {
            if (message.author.id !== config.ownerId) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Only the owner can use this command!`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }

            const sub = args[0]?.toLowerCase();
            const roleId = config.staffRole;
            const role = message.guild.roles.cache.get(roleId);
            if (!role) {
                const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Staff role not found!`));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }

            if (sub === 'add') {
                const user = message.mentions.members.first() || await message.guild.members.fetch(args[1]).catch(() => null);
                if (!user) {
                    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Please mention a user or provide a valid ID!`));
                    return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                }
                if (user.roles.cache.has(roleId)) {
                    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} User already has the staff role!`));
                    return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                }
                try {
                    await user.roles.add(roleId);
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Staff added`))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.success} Added ${role} role to ${user}.`));
                    return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                } catch (err) {
                    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Failed to add role: ${err.message}`));
                    return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                }
            } else if (sub === 'remove') {
                const user = message.mentions.members.first() || await message.guild.members.fetch(args[1]).catch(() => null);
                if (!user) {
                    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Please mention a user or provide a valid ID!`));
                    return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                }
                if (!user.roles.cache.has(roleId)) {
                    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} User doesn't have the staff role!`));
                    return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                }
                try {
                    await user.roles.remove(roleId);
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Staff removed`))
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.success} Removed ${role} role from ${user}.`));
                    return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                } catch (err) {
                    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.error} Failed to remove role: ${err.message}`));
                    return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
                }
            } else if (sub === 'list') {
                const members = message.guild.members.cache.filter(m => m.roles.cache.has(roleId));
                const list = members.map(m => `${emoji.staff} ${m} (\`${m.id}\`)`).join('\n') || 'No users found with this role.';
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Staff list`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(list));
                return message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }
            return;
        }
    },
};
