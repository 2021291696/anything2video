#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);

// 工作目录解析（2026-10-04 用户定规：首次使用必须问用户片子放哪，选择持久化，后续有条理沿用）：
// 优先级：两参显式目标 > 单参 <slug>（根 = A2V_DATA_ROOT 或 ~/.anything2video/workdir 持久化文件）。
// 根未知时报错并引导先问用户，不静默落到当前目录。
let target = argv[0];
let slug = argv[1];
if (target && !slug) {
  const asSlug = target;
  const workdirFile = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.anything2video', 'workdir');
  const base = (process.env.A2V_DATA_ROOT
    || (fs.existsSync(workdirFile) ? fs.readFileSync(workdirFile, 'utf8').trim() : '')).trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(asSlug)) throw new Error('Usage: node scripts/init.mjs <target-directory> <safe-slug>');
  if (!base) {
    throw new Error(
      '数据根未设置（首次使用）：先问用户要把片子放在哪个目录，然后执行\n' +
      `  mkdir -p "${path.dirname(workdirFile)}" && echo "<用户给的目录>" > "${workdirFile}"\n` +
      '（或临时 A2V_DATA_ROOT=<目录>，或直接传两参 init.mjs <目标目录> <slug>）',
    );
  }
  target = path.join(base, asSlug);
  slug = asSlug;
}
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
