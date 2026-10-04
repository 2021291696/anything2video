#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {isWithin, resolvedPath} from './runtime-lib.mjs';

const root = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const args = process.argv.slice(2);
let [target, slug] = args;
if (args.length === 1 && /^[a-zA-Z0-9_-]+$/.test(target)) {
  const settings = path.join(os.homedir(), '.anything2video', 'workdir');
  const base = (process.env.A2V_DATA_ROOT || (fs.existsSync(settings) ? fs.readFileSync(settings, 'utf8') : '')).trim();
  if (!base) throw new Error('Data root is unknown. Ask the user where videos belong, save the absolute directory in ~/.anything2video/workdir, or pass an explicit target and slug. No current-directory fallback.');
  if (!path.isAbsolute(base)) throw new Error('The saved data root / A2V_DATA_ROOT must be absolute');
  slug = target;
  target = path.join(base, slug);
}
if (args.length > 2 || !target || !/^[a-zA-Z0-9_-]+$/.test(slug ?? '')) {
  throw new Error('Usage: node scripts/init.mjs <safe-slug> OR <target-directory> <safe-slug>');
}
const dest = resolvedPath(target);
if (isWithin(root, dest) || isWithin(dest, root)) throw new Error('Projects and the skill package must not overlap in either direction');
if (fs.existsSync(dest) && !fs.statSync(dest).isDirectory()) throw new Error('Target is not a directory');
if (fs.existsSync(dest) && fs.readdirSync(dest).length) throw new Error('Target is not empty; refusing to overwrite');
const blocked = /^(node_modules|\.venv|\.git|\.mimosa|\.zcode|__pycache__|audio|renders|fin_frames|stills|out|build.*|\..*stills|\.verify.*|\.probe.*|\.render-bundle(?:-.*)?)$/;
fs.cpSync(path.join(root, 'template'), dest, {
  recursive: true,
  filter: p => !path.relative(path.join(root, 'template'), p).split(path.sep).some(x => blocked.test(x)) && !/\.(pyc|log)$/.test(p),
});
const cfg = path.join(dest, 'src', 'config.ts');
const original = fs.readFileSync(cfg, 'utf8');
if (!/slug:\s*'demo'/.test(original)) throw new Error('Template slug contract changed; initialization stopped');
const updated = original.replace(/slug:\s*'demo'/, `slug: '${slug}'`);
fs.writeFileSync(cfg, updated);
for (const folder of ['script', 'research', 'qc', 'renders', `public/assets/${slug}`]) fs.mkdirSync(path.join(dest, folder), {recursive: true});
fs.writeFileSync(path.join(dest, 'project.json'), JSON.stringify({schemaVersion: 1, status: 'draft', slug, width: 1280, height: 720, fps: 30, recipe: 'explainer', composition: 'Video', totalFrames: null}, null, 2));
console.log(`Created ${dest}. Next: npm install, uv sync, then build a real storyboard and shots. No git commands were run.`);
