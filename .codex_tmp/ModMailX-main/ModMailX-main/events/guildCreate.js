const { Events, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('../config');
const emoji = require('../emoji');
const chalk = require('chalk');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = {
    name: Events.GuildCreate,
    async execute(guild, client) {
        console.log(chalk.green(`[Security] Bot joined the guild: ${guild.name} (${guild.id}).`));
    },
};
