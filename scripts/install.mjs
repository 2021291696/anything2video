#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertDisjoint, buildEdition, collectCoreFiles, verifyEdition} from './build-editions.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const aliases = {claude: 'claude-code', 'claude-code': 'claude-code', zcode: 'zcode', codex: 'codex', minimax: 'minimax-code', 'minimax-code': 'minimax-code', codebuddy: 'codebuddy', doubao: 'doubao-work', 'doubao-work': 'doubao-work', workbuddy: 'workbuddy'};
const folders = {'claude-code': '.claude', zcode: '.agents', codex: '.agents', 'minimax-code': '.minimax', codebuddy: '.codebuddy', workbuddy: '.workbuddy'};
// WorkBuddy desktop discovers local skills from ~/.workbuddy/skills (verified on this machine 2026-10-05).
// Doubao Work still has no verified auto-discovery directory and only supports manual export for import.
const exportHosts = new Set(['doubao-work', 'workbuddy']);
const exportOnlyHosts = new Set(['doubao-work']);
const usage = 'Usage: node scripts/install.mjs claude|claude-code|zcode|codex|minimax|minimax-code|workbuddy [project-root] [--data-dir <MiniMax-data-directory>] | codebuddy [project-root] | doubao|doubao-work --export-dir <directory>';
const args = process.argv.slice(2);
const host = aliases[args.shift()];
if (!host) throw new Error(usage);
let project = null, dataDir = null, exportDir = null;
while (args.length) {
  const value = args.shift();
  if (value === '--data-dir') {
    if (dataDir || !args[0] || args[0].startsWith('--')) throw new Error(usage);
    dataDir = path.resolve(args.shift());
  } else if (value === '--export-dir') {
    if (exportDir || !args[0] || args[0].startsWith('--')) throw new Error(usage);
    exportDir = path.resolve(args.shift());
  } else if (value.startsWith('--') || project) throw new Error(usage);
  else project = path.resolve(value);
}
if (dataDir && host !== 'minimax-code') throw new Error('--data-dir is supported only for MiniMax Code');
if (dataDir && project) throw new Error('Choose either project-root or --data-dir, not both');
if (exportDir && !exportHosts.has(host)) throw new Error('--export-dir is supported only for doubao-work and workbuddy; other hosts install into their skill folders');
if (exportOnlyHosts.has(host) && !exportDir) throw new Error(`${host} has no verified auto-discovery directory; pass --export-dir <directory> to prepare a complete package for manual import`);
if (exportDir && (dataDir || project)) throw new Error('Choose either --export-dir or project-root/--data-dir, not both');

const editionFile = path.join(source, 'edition.json');
const metadata = fs.existsSync(editionFile) ? verifyEdition(source) : null;
if (metadata && metadata.host !== host) throw new Error(`This package belongs to ${metadata.host}; refusing installation for ${host}`);
const name = host === 'codebuddy' ? 'anything2video' : `anything2video-${host}`;
const dest = exportDir
  ? assertDisjoint(source, path.join(exportDir, name))
  : assertDisjoint(source, path.join(dataDir ?? path.join(project ?? os.homedir(), folders[host]), 'skills', name));try {
  fs.lstatSync(dest);
  throw new Error(`Existing skill preserved: ${dest}. Review and update it explicitly.`);
} catch (error) {if (error.code !== 'ENOENT') throw error;}

if (!metadata && host !== 'codebuddy') {
  buildEdition(host, dest, {source});
} else {
  const files = metadata ? [...Object.keys(metadata.coreHashes), 'SKILL.md', 'edition.json'] : [...collectCoreFiles(source), 'SKILL.md'];
  // Copy the verified inventory only, never local caches or unrelated host files.
  for (const relative of files) {
    const input = path.join(source, ...relative.split('/'));
    if (fs.lstatSync(input).isSymbolicLink()) throw new Error(`Refusing linked package input: ${relative}`);
    const output = path.join(dest, ...relative.split('/'));
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.copyFileSync(input, output);
  }
  if (metadata) verifyEdition(dest);
}
if (!fs.existsSync(path.join(dest, 'SKILL.md')) || !fs.existsSync(path.join(dest, 'reference', 'production-contract.md'))) throw new Error('Package incomplete');
if (exportDir) {
  console.log(`Exported complete package at ${dest}. This writes no host configuration and does not prove the application discovered it; import or authorize the full directory explicitly, then verify the actual loaded path and version.`);
} else {
  console.log(`Installed complete package at ${dest}. Restart or reload your host, then verify the actual loaded path.`);
}
if (host === 'minimax-code') console.log('MiniMax discovery depends on the running app data directory; --data-dir must name that directory, not its skills folder. Confirm the app loaded this entrypoint.');
if (host === 'codebuddy') console.log('CodeBuddy receives the generic legacy package. WorkBuddy desktop uses its own skills directory installer.');
if (exportDir) console.log(`${host === 'workbuddy' ? 'WorkBuddy' : 'Doubao Work'} uses manual import of this exported package; see reference/desktop-hosts.md for verified boundaries and unknown items.`);
if (host === 'workbuddy' && !exportDir) console.log('WorkBuddy desktop discovers skills from ~/.workbuddy/skills on restart (verified on the machine that produced this package); confirm the skill appears and check the actual loaded path and version.');
if (host === 'doubao-work') console.log('Doubao Work has no verified auto-discovery directory; authorize the exported directory explicitly in a local task and require the entrypoint to be read.');
