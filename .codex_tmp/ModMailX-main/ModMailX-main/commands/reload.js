const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const config = require('../config');
const emoji = require('../emoji');
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('🔄 Reload all bot commands (Owner only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        if (interaction.user.id !== config.ownerId) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} Only the owner can use this command!`)
                );
            return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        const loadingContainer = new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${emoji.loading} Reloading commands...`)
            );
        await interaction.reply({ components: [loadingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

        const commands = [];
        const commandsPath = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        client.commands.clear();

        for (const file of commandFiles) {
            delete require.cache[require.resolve(`./${file}`)];
            const command = require(`./${file}`);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
            }
        }

        const rest = new REST().setToken(config.token);

        try {
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands },
            );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${emoji.success} Commands reloaded`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`Reloaded **${commands.length}** commands.`)
                );

            await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error(error);
            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emoji.error} Failed to reload commands: \`${error.message}\``)
                );
            await interaction.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
        }
    },
};