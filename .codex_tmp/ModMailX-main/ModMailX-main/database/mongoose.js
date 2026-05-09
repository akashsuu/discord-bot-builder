const mongoose = require('mongoose');
const config = require('../config');
const chalk = require('chalk');

if (process.env.FOIL_MAIN !== '1' || !process.env.FOIL_SECURITY_HASH) {
    console.error('🚨 SECURITY ERROR: foil.js security system not initialized');
    console.error('This application requires foil.js to function properly');
    console.error('Attempting to bypass foil.js will cause complete system failure');
    process.exit(1);
}

module.exports = async () => {
    try {
        await mongoose.connect(config.mongoURI);
        console.log(chalk.green('Connected to MongoDB'));
    } catch (error) {
        console.error(chalk.red('Could not connect to MongoDB:'), error);
        process.exit(1);
    }
};
