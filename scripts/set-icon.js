'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = process.argv[2] || 'release-selection';
const exePath = path.join(projectRoot, outputDir, 'win-unpacked', 'Kiodium.exe');
const iconPath = path.join(projectRoot, 'kiodium.ico');
const rceditPath = path.join(projectRoot, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe');

function assertInsideProject(target) {
 const resolved = path.resolve(target);
 if (!resolved.startsWith(projectRoot + path.sep)) {
 throw new Error(`Refusing to modify path outside project: ${resolved}`);
 }
 return resolved;
}

function sleep(ms) {
 return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
 assertInsideProject(exePath);
 assertInsideProject(iconPath);
 assertInsideProject(rceditPath);

 for (const file of [exePath, iconPath, rceditPath]) {
 if (!fs.existsSync(file)) throw new Error(`Missing required file: ${file}`);
 }

 let lastError = null;
 for (let attempt = 1; attempt <= 8; attempt += 1) {
 try {
 execFileSync(rceditPath, [exePath, '--set-icon', iconPath], { stdio: 'inherit' });
 console.log(`Updated icon for ${path.relative(projectRoot, exePath)}`);
 return;
 } catch (err) {
 lastError = err;
 if (attempt < 8) await sleep(1250);
 }
 }

 throw lastError;
}

main().catch((err) => {
 console.error(err?.message || err);
 process.exitCode = 1;
});
