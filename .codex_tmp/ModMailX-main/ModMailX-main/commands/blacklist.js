const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const Blacklist = require('../models/blacklist');
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
        .setName('blacklist')
        .setDescription('🛡️ Blacklist management system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => 
            sub.setName('add')
                .setDescription('🚫 Add a user to the blacklist')
                .addUserOption(opt => opt.setName('user').setDescription('The user to blacklist').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('The reason for blacklisting'))
        )
        .addSubcommand(sub => 
            sub.setName('remove')
                .setDescription('✅ Remove a user from the blacklist')
                .addUserOption(opt => opt.setName('user').setDescription('The user to unblacklist').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('list')
                .setDescription('📜 View all blacklisted users')
        ),
    async execute(interaction) {
        if (interaction.user.id !== config.ownerId) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} Only the bot owner can manage the blacklist.`)
                );
            return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            const isBlacklisted = await Blacklist.findOne({ userId: user.id });
            if (isBlacklisted) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emoji.error} ${user.tag} is already blacklisted!`)
                    );
                return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }

            await new Blacklist({ userId: user.id, reason, addedBy: interaction.user.id }).save();

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${emoji.success} User blacklisted`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${user.tag} can no longer use ModMail.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**${emoji.user} User**\n${user} (\`${user.id}\`)`)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**${emoji.list} Reason**\n\`${reason}\``)
                );

            await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } else if (sub === 'remove') {
            const user = interaction.options.getUser('user');

            const isBlacklisted = await Blacklist.findOne({ userId: user.id });
            if (!isBlacklisted) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emoji.error} ${user.tag} is not blacklisted!`)
                    );
                return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }

            await Blacklist.deleteOne({ userId: user.id });

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${emoji.success} User removed from blacklist`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${user.tag} can now use ModMail again.`)
                );

            await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } else if (sub === 'list') {
            const list = await Blacklist.find();
            if (list.length === 0) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emoji.list} The blacklist is currently empty!`)
                    );
                return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${emoji.list} Blacklisted users`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(list.map((u, i) => `**${i + 1}.** <@${u.userId}> (\`${u.userId}\`) — Reason: \`${u.reason}\``).join('\n'))
                );

            await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    },
};