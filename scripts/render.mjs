#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const root = path.resolve(process.argv[2] ?? '.');
const mode = process.argv[3] ?? 'video';
const req = createRequire(path.join(root, 'package.json'));
const {bundle} = req('@remotion/bundler');
const {selectComposition, renderMedia, renderStill} = req('@remotion/renderer');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'project.json'), 'utf8'));
if (!['video', 'preview', 'stills'].includes(mode)) throw new Error('Mode must be video, preview or stills');
if (!/^[A-Za-z0-9_-]+$/.test(cfg.slug ?? '')) throw new Error('Invalid slug');
const version = process.env.VER || 'v1';
if (!/^[A-Za-z0-9_-]+$/.test(version)) throw new Error('Invalid version');
const concurrency = Number(process.env.A2V_CONCURRENCY ?? 3);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) throw new Error('Concurrency must be 1..32');
if (![cfg.width, cfg.height, cfg.fps, cfg.totalFrames].every(v => Number.isInteger(v) && v > 0)) throw new Error('Invalid project dimensions / timing');
const seconds = Number(process.argv[4] ?? 12);
if (mode === 'preview' && (!Number.isFinite(seconds) || seconds <= 0)) throw new Error('Preview seconds must be positive');
const serveUrl = await bundle({entryPoint: path.join(root, 'src', 'index.ts'), outDir: path.join(root, '.render-bundle')});
const browserExecutable = process.env.BROWSER_EXECUTABLE || undefined;
const composition = await selectComposition({serveUrl, id: cfg.composition ?? 'Video', browserExecutable});
if (composition.width !== cfg.width || composition.height !== cfg.height || composition.fps !== cfg.fps || composition.durationInFrames !== cfg.totalFrames) throw new Error('Composition does not match project.json; refusing misleading delivery');
fs.mkdirSync(path.join(root, 'renders'), {recursive: true});
if (mode === 'stills') {
  fs.mkdirSync(path.join(root, 'stills'), {recursive: true});
  for (const n of (process.argv[4] ?? '1').split(',').map(Number)) {
    if (!Number.isInteger(n) || n < 1 || n > cfg.totalFrames) throw new Error('Still frames are one-based inclusive');
    await renderStill({composition, serveUrl, browserExecutable, output: path.join(root, 'stills', `frame-${n}.png`), frame: n - 1});
    console.log(`Still ${n} complete`);
  }
} else {
  const preview = mode === 'preview';
  const out = path.join(root, 'renders', `${cfg.slug}_${preview ? 'preview' : version}.mp4`);
  let lastPct = -1;
  await renderMedia({composition, serveUrl, browserExecutable, codec: 'h264', crf: 18, pixelFormat: 'yuv420p', outputLocation: out, concurrency, ...(preview ? {frameRange: [0, Math.min(cfg.totalFrames - 1, Math.max(1, Math.round(seconds * cfg.fps)) - 1)]} : {}), onProgress: ({progress}) => {const pct = Math.floor(progress * 100); if (pct % 10 === 0 && pct !== lastPct) {console.log(`Render ${pct}%`); lastPct = pct;}}});
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', out], {encoding: 'utf8'});
  if (probe.status !== 0) throw new Error(probe.stderr || 'ffprobe failed');
  fs.writeFileSync(out + '.delivery.json', probe.stdout);
  console.log(out);
}
