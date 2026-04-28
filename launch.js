'use strict';
// Spawns electron with ELECTRON_RUN_AS_NODE removed so the app process
// runs as a proper Electron GUI app regardless of the parent environment.
const { spawn } = require('child_process');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.'], { stdio: 'inherit', env, windowsHide: false });
child.on('close', (code) => process.exit(code ?? 0));
