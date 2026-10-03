#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [target, slug] = process.argv.slice(2);
if (!target || !/^[a-zA-Z0-9_-]+$/.test(slug ?? '')) {
  throw new Error('Usage: node scripts/init.mjs <target-directory> <safe-slug>');
}
const dest = path.resolve(target);
if (dest === root || dest.startsWith(root + path.sep)) throw new Error('Projects must live outside the skill package');
if (fs.existsSync(dest) && fs.readdirSync(dest).length) throw new Error('Target is not empty; refusing to overwrite');
const blocked = /^(node_modules|\.venv|\.git|\.mimosa|\.zcode|__pycache__|audio|renders|fin_frames|stills|out|build.*|\..*stills|\.verify.*|\.probe.*|\.render-bundle)$/;
fs.cpSync(path.join(root, 'template'), dest, {
  recursive: true,
  filter: p => !path.relative(path.join(root, 'template'), p).split(path.sep).some(x => blocked.test(x)) && !/\.(pyc|log)$/.test(p),
});
const cfg = path.join(dest, 'src', 'config.ts');
const original = fs.readFileSync(cfg, 'utf8');
const updated = original.replace(/slug:\s*'demo'/, `slug: '${slug}'`);
if (updated === original) throw new Error('Template slug contract changed; initialization stopped');
fs.writeFileSync(cfg, updated);
for (const folder of ['script', 'research', 'qc', 'renders', `public/assets/${slug}`]) fs.mkdirSync(path.join(dest, folder), {recursive: true});
fs.writeFileSync(path.join(dest, 'project.json'), JSON.stringify({schemaVersion: 1, slug, width: 1280, height: 720, fps: 30, recipe: 'explainer', totalFrames: null}, null, 2));
console.log(`Created ${dest}. Next: npm install, uv sync, then build a real storyboard and shots. No git commands were run.`);
