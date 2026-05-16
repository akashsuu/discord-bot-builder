'use strict';

const fs = require('fs');
const path = require('path');
const asar = require('@electron/asar');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = process.argv[2] || 'release-selection';
const resourcesDir = path.join(projectRoot, outputDir, 'win-unpacked', 'resources');
const appDir = path.join(resourcesDir, 'app');
const asarPath = path.join(resourcesDir, 'app.asar');
const unpackedDir = `${asarPath}.unpacked`;

function assertInsideProject(target) {
 const resolved = path.resolve(target);
 if (!resolved.startsWith(projectRoot + path.sep)) {
 throw new Error(`Refusing to modify path outside project: ${resolved}`);
 }
 return resolved;
}

async function main() {
 assertInsideProject(resourcesDir);
 assertInsideProject(appDir);
 assertInsideProject(asarPath);
 assertInsideProject(unpackedDir);

 if (!fs.existsSync(appDir)) {
 throw new Error(`Cannot pack ASAR because app folder is missing: ${appDir}`);
 }

 fs.rmSync(asarPath, { force: true });
 fs.rmSync(unpackedDir, { recursive: true, force: true });

 await asar.createPackageWithOptions(appDir, asarPath, {
 unpack: '**/*.node',
 unpackDir: 'node_modules/ffmpeg-static',
 });

 fs.rmSync(appDir, { recursive: true, force: true });
 console.log(`Packed ${path.relative(projectRoot, asarPath)}`);
}

main().catch((err) => {
 console.error(err);
 process.exitCode = 1;
});
