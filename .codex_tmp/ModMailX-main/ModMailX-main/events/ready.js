const { Events, ActivityType } = require('discord.js');
const chalk = require('chalk');
const config = require('../config');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = {
    name: Events.ClientReady,
    once: true,
   async execute(client) {
        console.log(chalk.green(`Successfully logged in as ${client.user.tag}!`));

        // --- GUILD ACCESS DIAGNOSTIC ---
        const targetGuildId = config.guildId;
        const guild = client.guilds.cache.get(targetGuildId);

        if (!guild) {
            console.error(chalk.red.bold(`

🚨 CRITICAL ERROR: MISSING GUILD ACCESS 🚨
`));
            console.error(chalk.red(`The bot cannot find the server with ID: ${targetGuildId}`));
            console.error(chalk.yellow(`This is the primary reason for the 'Missing Access' error during command registration.`));
            console.error(chalk.yellow.bold(`
PLEASE CHECK THE FOLLOWING:
`));
            console.error(chalk.cyan(`1. Is the 'guildId' in your config.js file correct?`));
            console.error(chalk.cyan(`2. Is the bot actually in that server? Invite it if it's not.
`));
            const guilds = client.guilds.cache.map(g => `  - ${g.name} (${g.id})`);
            if (guilds.length > 0) {
                console.error(chalk.yellow(`The bot is currently in these servers:
${guilds.join('\n')}
`));
            } else {
                console.error(chalk.yellow(`The bot is currently in 0 servers.
`));
            }
            console.error(chalk.red.bold(`The bot will now exit. Please fix the configuration and restart.`));
            process.exit(1);
        }

        client.user.setActivity(`Modmails for ${config.serverName} | ${config.botPrefix}help`, { type: ActivityType.Watching });
    },
};
