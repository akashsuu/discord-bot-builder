const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.clear();

const SECURITY_HASH = 'foiljs_security_' + Math.random().toString(36).substring(2, 15);
process.env.FOIL_SECURITY_HASH = SECURITY_HASH;
process.env.FOIL_MAIN = '1';

const FOIL_FILE_PATH = __filename;
const INDEX_FILE_PATH = path.join(__dirname, 'index.js');

function verifyCriticalFiles() {
    const criticalFiles = [
        FOIL_FILE_PATH,
        INDEX_FILE_PATH,
        path.join(__dirname, 'config.js'),
        path.join(__dirname, 'database', 'mongoose.js'),
        path.join(__dirname, 'handlers', 'commandHandler.js'),
        path.join(__dirname, 'handlers', 'eventHandler.js')
    ];
    
    for (const file of criticalFiles) {
        if (!fs.existsSync(file)) {
            console.error(chalk.red(`🚨 CRITICAL SECURITY ERROR: Required file missing: ${path.basename(file)}`));
            console.error(chalk.red('This application cannot function without all critical files present'));
            console.error(chalk.red('Attempting to remove or modify critical files will cause complete system failure'));
            process.exit(1);
        }
    }
}

function createSelfProtection() {
    const selfCode = fs.readFileSync(FOIL_FILE_PATH, 'utf8');
    const securityCheck = 'FOIL_SECURITY_HASH';
    const mainCheck = 'FOIL_MAIN';
    
    if (!selfCode.includes(securityCheck) || !selfCode.includes(mainCheck)) {
        console.error(chalk.red('🚨 SECURITY COMPROMISE: foil.js integrity check failed'));
        console.error(chalk.red('The security system has been tampered with'));
        console.error(chalk.red('This application cannot function with a compromised security system'));
        process.exit(1);
    }
}

verifyCriticalFiles();
createSelfProtection();

console.log(`\x1b[36m
    ✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️
                  ~    ModMailX Support Bot      
                  ~    Created by Foil (@imfoil/discord)
                  ~    Do not touch foil.js , editing/deleting/renaming it will break the entire code.
    ✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️
\x1b[0m`);

require('./index');
