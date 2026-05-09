const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const chalk = require('chalk');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = async (client) => {
    const commands = [];
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
        } else {
            console.log(chalk.yellow(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`));
        }
    }

    const rest = new REST().setToken(config.token);

    try {
        console.log(chalk.cyan(`Started refreshing ${commands.length} application (/) commands.`));

        const data = await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );

        console.log(chalk.green(`Successfully reloaded ${data.length} application (/) commands.`));
    } catch (error) {
        console.error(chalk.red(error));
    }
};
