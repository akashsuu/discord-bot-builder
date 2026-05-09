const { Events, InteractionType, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../config');
const emoji = require('../emoji');
const fs = require('fs');
const path = require('path');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emoji.error} There was an error while executing this command!`)
                    );
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                } else {
                    await interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                }
            }
        } else if (interaction.isButton()) {
            const buttonPath = path.join(__dirname, `../components/buttons/${interaction.customId}.js`);
            if (fs.existsSync(buttonPath)) {
                const button = require(buttonPath);
                try {
                    await button.execute(interaction, client);
                } catch (error) {
                    console.error(error);
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${emoji.error} There was an error while processing this button!`)
                        );
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                    } else {
                        await interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                    }
                }
            }
        } else if (interaction.isModalSubmit()) {
            const modalPath = path.join(__dirname, `../components/modals/${interaction.customId}.js`);
            if (fs.existsSync(modalPath)) {
                const modal = require(modalPath);
                try {
                    await modal.execute(interaction, client);
                } catch (error) {
                    console.error(error);
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${emoji.error} There was an error while processing this modal!`)
                        );
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                    } else {
                        await interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                    }
                }
            }
        } else if (interaction.isStringSelectMenu()) {
            const selectPath = path.join(__dirname, `../components/selectMenus/${interaction.customId}.js`);
            if (fs.existsSync(selectPath)) {
                const selectMenu = require(selectPath);
                try {
                    await selectMenu.execute(interaction, client);
                } catch (error) {
                    console.error(error);
                    const container = new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`${emoji.error} There was an error while processing this selection!`)
                        );
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                    } else {
                        await interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                    }
                }
            }
        }
    },
};
