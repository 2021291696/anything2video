#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = process.argv[2];
const project = process.argv[3] ? path.resolve(process.argv[3]) : null;
const folders = {codex: '.agents', claude: '.claude', zcode: '.agents', codebuddy: '.codebuddy'};
if (!folders[host]) throw new Error('Usage: node scripts/install.mjs codex|claude|zcode|codebuddy [project-root]');
const dest = path.join(project ?? os.homedir(), folders[host], 'skills', 'anything2video');
if (fs.existsSync(dest)) throw new Error(`Existing skill preserved: ${dest}. Review and update it explicitly.`);
const blocked = /^(\.git|\.venv|node_modules|\.Codex|\.mimosa|\.zcode|__pycache__|renders|stills|fin_frames|out|dist|build.*|\..*stills|\.verify.*|\.probe.*|\.render-bundle)$/;
fs.cpSync(source, dest, {recursive: true, filter: p => !path.relative(source, p).split(path.sep).some(x=>blocked.test(x)) && !/\.(log|pyc)$/.test(p)});
if (!fs.existsSync(path.join(dest, 'SKILL.md')) || !fs.existsSync(path.join(dest, 'reference', 'production-contract.md'))) throw new Error('Package incomplete');
console.log(`Installed complete package at ${dest}. Restart or reload your host, then verify the actual loaded path. WorkBuddy desktop uses local import rather than this CodeBuddy directory installer.`);
