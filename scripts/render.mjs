#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {checkPlan} from './check-plan.mjs';
import {isRecord, isWithin, projectFile, resolvedPath, sha256File, snapshotSources} from './runtime-lib.mjs';

export function renderOptions(cfg, args = [], env = process.env) {
  if (!isRecord(cfg) || ![cfg.width, cfg.height, cfg.fps, cfg.totalFrames].every(n => Number.isInteger(n) && n > 0)) throw new Error('Invalid project dimensions / timing');
  if (!/^[A-Za-z0-9_-]+$/.test(cfg.slug ?? '')) throw new Error('Invalid slug');
  const overwrite = args.includes('--overwrite');
  const positionals = args.filter(arg => arg !== '--overwrite');
  if (positionals.some(arg => arg.startsWith('--'))) throw new Error('Unknown render option');
  const [mode = 'video', value, start] = positionals;
  if (!['video', 'preview', 'stills'].includes(mode)) throw new Error('Mode must be video, preview or stills');
  const limit = mode === 'preview' ? 3 : mode === 'stills' ? 2 : 1;
  if (positionals.length > limit) throw new Error('Too many render arguments');
  const version = env.VER || 'v1';
  if (!/^[A-Za-z0-9_-]+$/.test(version)) throw new Error('Invalid version');
  const concurrency = Number(env.A2V_CONCURRENCY ?? 3);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) throw new Error('Concurrency must be 1..32');
  let frames = {from: 1, to: cfg.totalFrames};
  let stills = [];
  if (mode === 'preview') {
    const seconds = Number(value ?? 12);
    const from = Number(start ?? 1);
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Preview seconds must be positive');
    if (!Number.isInteger(from) || from < 1 || from > cfg.totalFrames) throw new Error('Preview startFrame must be one-based within the film');
    frames = {from, to: Math.min(cfg.totalFrames, from + Math.max(1, Math.round(seconds * cfg.fps)) - 1)};
  } else if (mode === 'stills') {
    stills = (value ?? '1').split(',').map(Number);
    if (stills.some(n => !Number.isInteger(n) || n < 1 || n > cfg.totalFrames)) throw new Error('Still frames are one-based inclusive');
    if (new Set(stills).size !== stills.length) throw new Error('Duplicate still frames');
    frames = {from: Math.min(...stills), to: Math.max(...stills)};
  }
  return {mode, overwrite, version, concurrency, frames, stills};
}

export function assertOutput(root, file, overwrite) {
  const base = fs.realpathSync(root);
  const parent = path.dirname(file);
  if (!isWithin(base, path.resolve(file)) || !isWithin(base, resolvedPath(parent))) throw new Error(`Output escapes project: ${file}`);
  try {if (fs.lstatSync(file).isSymbolicLink()) throw new Error(`Unsafe output symlink: ${file}`);}
  catch (error) {if (error.code !== 'ENOENT') throw error;}
  if (fs.existsSync(file)) {
    if (!isWithin(base, fs.realpathSync(file)) || fs.lstatSync(file).isSymbolicLink() || !fs.statSync(file).isFile()) throw new Error(`Unsafe output: ${file}`);
    if (!overwrite) throw new Error(`Output exists; use --overwrite explicitly: ${file}`);
  }
}

export async function renderProject(root, args = [], env = process.env) {
  root = fs.realpathSync(root);
  const cfg = JSON.parse(fs.readFileSync(projectFile(root, 'project.json'), 'utf8'));
  const options = renderOptions(cfg, args, env);
  const outputs = options.mode === 'stills'
    ? options.stills.map(n => path.join(root, 'stills', `frame-${n}.png`))
    : [path.join(root, 'renders', `${cfg.slug}_${options.mode === 'preview' ? 'preview' : options.version}.mp4`)];
  for (const output of outputs) {
    assertOutput(root, output, options.overwrite);
    assertOutput(root, output + '.delivery.json', options.overwrite);
  }
  const plan = checkPlan(root);
  if (!plan.pass) throw new Error(`Storyboard gate failed:\n${plan.errors.join('\n')}`);
  const req = createRequire(projectFile(root, 'package.json'));
  const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  if (!fs.existsSync(tsc) || !fs.statSync(tsc).isFile()) throw new Error('Project-local TypeScript is missing; install project dependencies');
  const types = spawnSync(process.execPath, [tsc, '--noEmit'], {cwd: root, encoding: 'utf8'});
  if (types.status !== 0) throw new Error(`TypeScript gate failed:\n${types.stdout || types.stderr || types.error?.message || 'unknown error'}`);
  const sourceHashes = snapshotSources(root);
  const {bundle} = req('@remotion/bundler');
  const {selectComposition, renderMedia, renderStill} = req('@remotion/renderer');
  let bundleDir;
  const locks = [];
  const staged = new Set();
  const token = randomUUID();
  try {
    for (const output of outputs) {
      fs.mkdirSync(path.dirname(output), {recursive: true});
      const file = output + '.render.lock';
      if (fs.existsSync(file)) throw new Error(`Render lock exists: ${file}. Inspect its PID; preserve a live render's lock.`);
      assertOutput(root, file, false);
      let handle;
      try {handle = fs.openSync(file, 'wx');}
      catch (error) {if (error.code === 'EEXIST') throw new Error(`Render already owns this output: ${file}`); throw error;}
      try {fs.writeFileSync(handle, JSON.stringify({token, pid: process.pid, startedAt: new Date().toISOString()}));}
      finally {fs.closeSync(handle);}
      locks.push(file);
      assertOutput(root, output, options.overwrite);
      assertOutput(root, output + '.delivery.json', options.overwrite);
    }
    bundleDir = fs.mkdtempSync(path.join(root, '.render-bundle-'));
    const serveUrl = await bundle({entryPoint: projectFile(root, 'src/index.ts'), outDir: bundleDir, enableCaching: false});
    const browserExecutable = env.BROWSER_EXECUTABLE || undefined;
    const composition = await selectComposition({serveUrl, id: cfg.composition ?? 'Video', browserExecutable});
    if (composition.width !== cfg.width || composition.height !== cfg.height || composition.fps !== cfg.fps || composition.durationInFrames !== cfg.totalFrames) throw new Error('Composition does not match project.json; refusing misleading delivery');
    const commitOutput = (temporary, output, frames, ffprobe = null) => {
      const current = snapshotSources(root);
      if (JSON.stringify(current) !== JSON.stringify(sourceHashes)) throw new Error('Sources changed during rendering; output requires a fresh render');
      assertOutput(root, output, options.overwrite);
      assertOutput(root, output + '.delivery.json', options.overwrite);
      const evidence = {schemaVersion: 1, mediaSha256: sha256File(temporary), sourceHashes, mode: options.mode, frames, renderedAt: new Date().toISOString(), ffprobe, visualReview: 'not_performed', audioReview: 'not_performed'};
      const sidecar = temporary + '.delivery.json';
      staged.add(sidecar);
      fs.writeFileSync(sidecar, JSON.stringify(evidence, null, 2), {flag: 'wx'});
      fs.renameSync(temporary, output);
      staged.delete(temporary);
      fs.renameSync(sidecar, output + '.delivery.json');
      staged.delete(sidecar);
    };
    for (const [index, output] of outputs.entries()) {
      assertOutput(root, output, options.overwrite);
      assertOutput(root, output + '.delivery.json', options.overwrite);
      const temporary = path.join(path.dirname(output), `.render-${token}-${index}${path.extname(output)}`);
      assertOutput(root, temporary, false);
      staged.add(temporary);
      if (options.mode === 'stills') {
        const frame = options.stills[index];
        await renderStill({composition, serveUrl, browserExecutable, output: temporary, frame: frame - 1});
        commitOutput(temporary, output, {from: frame, to: frame});
        console.log(`Still ${frame} complete: ${output}`);
      } else {
        let lastPct = -1;
        const frameRange = [options.frames.from - 1, options.frames.to - 1];
        await renderMedia({composition, serveUrl, browserExecutable, codec: 'h264', crf: 18, pixelFormat: 'yuv420p', outputLocation: temporary, concurrency: options.concurrency, frameRange, onProgress: ({progress}) => {
          const pct = Math.floor(progress * 100);
          if (pct % 10 === 0 && pct !== lastPct) {console.log(`Render ${pct}%`); lastPct = pct;}
        }});
        const probe = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', temporary], {encoding: 'utf8'});
        if (probe.status !== 0) throw new Error(probe.stderr || probe.error?.message || 'ffprobe failed');
        commitOutput(temporary, output, options.frames, JSON.parse(probe.stdout));
        console.log(output);
      }
    }
    return outputs;
  } finally {
    for (const file of staged) {
      if (!isWithin(root, path.resolve(file)) || !path.basename(file).startsWith(`.render-${token}-`)) throw new Error('Refusing unsafe staged-file cleanup');
      fs.rmSync(file, {force: true});
    }
    for (const file of locks) {
      if (!isWithin(root, fs.realpathSync(file)) || JSON.parse(fs.readFileSync(file, 'utf8')).token !== token) throw new Error('Refusing unsafe render-lock cleanup');
      fs.rmSync(file);
    }
    if (bundleDir && fs.existsSync(bundleDir)) {
      const actual = fs.realpathSync(bundleDir);
      if (!isWithin(root, actual) || !path.basename(actual).startsWith('.render-bundle-')) throw new Error('Refusing unsafe bundle cleanup');
      fs.rmSync(actual, {recursive: true, force: true});
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {await renderProject(path.resolve(process.argv[2] ?? '.'), process.argv.slice(3));}
  catch (error) {console.error(error.message); process.exitCode = 1;}
}
