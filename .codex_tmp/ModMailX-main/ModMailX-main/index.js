if (process.env.FOIL_MAIN !== '1') {
    console.error('🚨 SECURITY ERROR: foil.js is required to start this application');
    console.error('This application is protected by foil.js security system');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    console.error('Start the bot with: node foil.js');
    
    process.exit(1);
}

const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const config = require('./config');
const connectDB = require('./database/mongoose');
const chalk = require('chalk');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

client.commands = new Collection();


connectDB();


require('./handlers/commandHandler')(client);
require('./handlers/eventHandler')(client);

client.login(config.token).catch(err => {
    console.error(chalk.red('Failed to login:'), err);
});
