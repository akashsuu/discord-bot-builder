const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const config = require('../config');
const emoji = require('../emoji');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('🛡️ Manage ModMail staff (Owner only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add the staff role to a user')
                .addUserOption(opt => opt.setName('user').setDescription('The user to give the staff role').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove the staff role from a user')
                .addUserOption(opt => opt.setName('user').setDescription('The user to remove the staff role from').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all users with the staff role')
        ),
    async execute(interaction, client) {
        if (interaction.user.id !== config.ownerId) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} Only the bot owner can use this command.`)
                );
            return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        const sub = interaction.options.getSubcommand();
        const roleId = config.staffRole;
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} The staff role configured in \`config.js\` does not exist!`)
                );
            return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        if (sub === 'add') {
            const user = interaction.options.getMember('user');
            if (user.roles.cache.has(roleId)) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emoji.error} This user already has the staff role!`)
                    );
                return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }

            try {
                await user.roles.add(roleId);
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## Staff added`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emoji.success} Added ${role} role to ${user}.`)
                    );
                return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            } catch (error) {
                if (error.code === 50013) {
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${emoji.error} I cannot manage this role. My highest role is likely lower than the staff role in the hierarchy!`)
                        );
                    return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                }
                throw error;
            }

        } else if (sub === 'remove') {
            const user = interaction.options.getMember('user');
            if (!user.roles.cache.has(roleId)) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emoji.error} This user does not have the staff role!`)
                    );
                return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }

            try {
                await user.roles.remove(roleId);
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## Staff removed`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emoji.success} Removed ${role} role from ${user}.`)
                    );
                return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            } catch (error) {
                if (error.code === 50013) {
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${emoji.error} I cannot manage this role. My highest role is likely lower than the staff role in the hierarchy!`)
                        );
                    return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                }
                throw error;
            }

        } else if (sub === 'list') {
            const members = interaction.guild.members.cache.filter(m => m.roles.cache.has(roleId));
            const list = members.map(m => `${emoji.staff} ${m} (\`${m.id}\`)`).join('\n') || 'No users found with this role.';

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## Staff list`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(list)
                );
            return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }
    },
};