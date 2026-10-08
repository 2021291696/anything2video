import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePlan, checkPlan} from '../scripts/check-plan.mjs';
import {computeState, syncState, STATES} from '../scripts/check_state.mjs';
import {parseLoudnormReport, loudnessPassed, countEvents} from '../scripts/finalize_delivery.mjs';
import {renderOptions, assertOutput, renderProject} from '../scripts/render.mjs';
import {sha256File, snapshotSources} from '../scripts/runtime-lib.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = {width: 1080, height: 1920, fps: 30, totalFrames: 90, slug: 'film'};
const shot = {id: 'A', from: 1, to: 90, group: 'G1', component: 'src/A.tsx', action: 'build', purpose: 'explain'};
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'a2v-runtime-'));
const write = (base, name, value) => {
  const file = path.join(base, name);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
  return file;
};
function fixture() {
  const base = temp();
  write(base, 'project.json', project);
  write(base, 'package.json', {name: 'runtime-fixture'});
  write(base, 'script/storyboard.json', {shots: [shot]});
  write(base, 'src/A.tsx', 'export const A = () => null;');
  write(base, 'src/index.ts', 'export {};');
  return base;
}
function fakeRenderer(base, behavior = '') {
  write(base, 'node_modules/typescript/bin/tsc', 'process.exit(0);');
  write(base, 'node_modules/@remotion/bundler/package.json', {name: '@remotion/bundler', main: 'index.cjs'});
  write(base, 'node_modules/@remotion/bundler/index.cjs', "const fs = require('fs'); const path = require('path'); exports.bundle = async ({outDir, enableCaching}) => {if (enableCaching !== false) throw new Error('Shared webpack cache must be disabled'); fs.appendFileSync(path.join(__dirname, '../../../bundle-events.log'), outDir + '\\n'); return outDir;};");
  write(base, 'node_modules/@remotion/renderer/package.json', {name: '@remotion/renderer', main: 'index.cjs'});
  write(base, 'node_modules/@remotion/renderer/index.cjs', `const fs = require('fs'); const path = require('path'); const root = path.resolve(__dirname, '../../..'); exports.selectComposition = async () => (${JSON.stringify({...project, durationInFrames: project.totalFrames})}); exports.renderStill = async ({output, frame}) => {await new Promise(resolve => setTimeout(resolve, 25)); fs.writeFileSync(output, 'frame ' + frame); ${behavior}};`);
}

const asset = {path: 'public/image.png', source: 'user:original', license: 'CC0', usage: 'Explain the input', sha256: 'a'.repeat(64), ai: true, model: 'test', prompt: 'A complete prompt', seed: 'n/a', disclosure: 'AI generated', qc: {semantic: 'passed', artifacts: 'passed', consistency: 'passed'}};

test('inclusive complete storyboard passes', () => assert.deepEqual(validatePlan(project, {shots: [shot]}), []));
test('empty film, one-frame hole, overlap and duplicate ids fail', () => {
  assert.ok(validatePlan(project, {shots: []}).length);
  assert.ok(validatePlan(project, {shots: [{...shot, from: 2}]}).some(x => x.includes('Gap')));
  assert.ok(validatePlan(project, {shots: [{...shot, to: 50}, {...shot, from: 50}]}).length);
});
test('evidence ladder computes state, overclaim and missing list', async () => {
  const fake = files => ({
    io: {
      exists: rel => rel in files && files[rel] !== undefined,
      readJson: rel => files[rel] ?? null,
      readText: rel => files[rel] ?? null,
      probeMedia: async () => null,
      checkPlan: () => ({pass: true, errors: []}),
      listDir: rel => files[`§dir:${rel}`] ?? [],
    },
    readProject: async () => files['project.json'] ?? null,
  });
  const project = {slug: 'film'};
  const onlyIntake = await computeState('root', fake({'project.json': project}));
  assert.equal(onlyIntake.evidenced, 'intake');
  assert.equal(onlyIntake.next, 'scripted');
  assert.ok(onlyIntake.missing_for_next[0].includes('narration.txt'));
  const voiced = await computeState('root', fake({
    'project.json': project,
    'script/narration.txt': '一句',
    [path.join('public', 'assets', 'film', 'audio_narration.wav')]: 'x',
    'script/timeline.json': {fps: 30},
  }));
  assert.equal(voiced.evidenced, 'voiced');
  assert.equal(voiced.next, 'planned');
  const full = await computeState('root', fake({
    'project.json': {slug: 'film', status: 'draft'},
    'script/narration.txt': 'x', [path.join('public', 'assets', 'film', 'audio_narration.wav')]: 'x', 'script/timeline.json': {},
    'script/storyboard.json': {}, 'qc/final.json': {checks: {}},
    '§dir:renders': ['film_v2.mp4', 'film_v1.mp4', 'other_v1.mp4'],
    '§dir:delivery': ['film_v2-delivery-report.json'],
    [path.join('delivery', 'film_v2-delivery-report.json')]: {status: 'verified', loudness_passed: true},
  }));
  assert.equal(full.evidenced, 'delivered');
  assert.equal(full.next, null);
  assert.ok(full.notes.some(n => n.includes('status 仍是 draft')));
  const over = await computeState('root', fake({'project.json': {slug: 'film', state: 'rendered'}}));
  assert.equal(over.evidenced, 'intake');
  assert.equal(over.overclaim, true);
  assert.equal(over.consistent, false);
  const lagging = await computeState('root', fake({'project.json': {slug: 'film', state: 'intake'}, 'script/narration.txt': 'x'}));
  assert.equal(lagging.evidenced, 'scripted');
  assert.equal(lagging.overclaim, false);
  assert.equal(STATES.length, 7);
  assert.deepEqual(syncState({slug: 'film', state: 'rendered'}, 'voiced'), {slug: 'film', state: 'voiced'});
});
test('finalize loudness helpers parse reports and gate delivery', () => {
  const sample = '[Parsed_loudnorm_0 @ 0x0]\n{\n\t"input_i" : "-14.23",\n\t"input_tp" : "-1.52",\n\t"input_lra" : "8.10",\n\t"input_thresh" : "-24.50",\n\t"output_i" : "0.00",\n\t"offset" : "0.11"\n}';
  const parsed = parseLoudnormReport(sample);
  assert.deepEqual(parsed, {input_i: -14.23, input_tp: -1.52, input_lra: 8.1, input_thresh: -24.5, offset: 0.11});
  assert.equal(parseLoudnormReport('no json here'), null);
  assert.equal(loudnessPassed(-16.4, -1.5, -16), true);
  assert.equal(loudnessPassed(-17.0, -1.5, -16), false);
  assert.equal(loudnessPassed(-16.0, -0.5, -16), false);
  assert.equal(loudnessPassed(null, -1.5, -16), false);
  assert.equal(countEvents('[blackdetect] black_start:1 black_end:2\n[freezedetect] freeze_start:3\n[blackdetect] black_start:5', 'black_start:'), 2);
  assert.equal(countEvents('[freezedetect] freeze_start:3', 'freeze_start:'), 1);
});
test('malformed storyboard inputs return diagnostics without throwing', () => {
  for (const bad of [undefined, null, false, 5, 'text', [], {}, {shots: null}, {shots: [null, [], 'x']}, {shots: [shot], claims: {}}, {shots: [shot], assets: 'x'}, {shots: [shot], claims: [null], assets: [null]}]) {
    assert.doesNotThrow(() => assert.ok(validatePlan(null, bad).length));
    assert.doesNotThrow(() => assert.ok(validatePlan(project, bad).length));
  }
});
test('claim text/source and complete AI provenance are required', () => {
  assert.ok(validatePlan(project, {shots: [shot], claims: [{text: '100% replacement'}]}).length);
  assert.deepEqual(validatePlan(project, {shots: [shot], claims: [{text: 'Fact', source: 'local:evidence.md'}], assets: [asset]}), []);
  for (const key of ['seed', 'usage', 'qc', 'model', 'prompt', 'disclosure', 'sha256']) {
    const incomplete = {...asset};
    delete incomplete[key];
    assert.ok(validatePlan(project, {shots: [shot], assets: [incomplete]}).length, key);
  }
  assert.ok(validatePlan(project, {shots: [shot], assets: [{...asset, ai: 'false'}]}).length);
});
test('shot fact bindings must be valid indices into declared claims', () => {
  const claims = [{text: 'Fact', source: 'local:e.md'}];
  assert.deepEqual(validatePlan(project, {shots: [{...shot, facts: [0]}], claims}), []);
  assert.deepEqual(validatePlan(project, {shots: [{...shot, facts: []}], claims}), []);
  assert.ok(validatePlan(project, {shots: [{...shot, facts: [1]}], claims}).some(x => x.includes('out of range')));
  assert.ok(validatePlan(project, {shots: [{...shot, facts: [-1]}], claims}).some(x => x.includes('array of claim indices')));
  assert.ok(validatePlan(project, {shots: [{...shot, facts: 'x'}], claims}).some(x => x.includes('array of claim indices')));
  assert.ok(validatePlan(project, {shots: [{...shot, facts: [0]}]}).some(x => x.includes('out of range')));
  assert.ok(validatePlan(project, {shots: [{...shot, facts: {}}]}).some(x => x.includes('array of claim indices')));
});
test('file gate returns diagnostics for malformed JSON and hashes', () => {
  const base = fixture();
  assert.equal(checkPlan(base).pass, true);
  const file = write(base, 'public/image.png', 'asset data');
  write(base, 'script/storyboard.json', {shots: [shot], assets: [{...asset, sha256: sha256File(file)}]});
  assert.equal(checkPlan(base).pass, true);
  fs.appendFileSync(file, 'new');
  assert.ok(checkPlan(base).errors.some(error => error.includes('Stale asset hash')));
  write(base, 'script/storyboard.json', '{broken');
  assert.equal(checkPlan(base).pass, false);
  write(base, 'script/storyboard.json', {shots: [null], assets: [null]});
  assert.doesNotThrow(() => checkPlan(base));
});
test('component and asset symlink escapes are rejected by realpath', () => {
  const base = fixture();
  const outside = temp();
  write(outside, 'A.tsx', 'export const A = () => null;');
  write(outside, 'image.png', 'external');
  fs.symlinkSync(outside, path.join(base, 'external'), process.platform === 'win32' ? 'junction' : 'dir');
  write(base, 'script/storyboard.json', {shots: [{...shot, component: 'external/A.tsx'}], assets: [{...asset, path: 'external/image.png', sha256: sha256File(path.join(outside, 'image.png'))}]});
  const result = checkPlan(base);
  assert.equal(result.pass, false);
  assert.equal(result.errors.filter(error => error.includes('Outside project') || error.includes('Missing/outside file')).length, 2);
  write(base, 'script/storyboard.json', {shots: [{...shot, component: '../escape.tsx'}]});
  assert.equal(checkPlan(base).pass, false);
});
test('source snapshots are stable, cover inputs and ignore caches', () => {
  const base = fixture();
  write(base, 'scripts/build.py', 'print(1)');
  write(base, 'src/build/Shot.tsx', 'export const Shot = () => null;');
  write(base, 'components/Helper.tsx', 'export const Helper = () => null;');
  write(base, 'build/Imported.tsx', 'export const Imported = () => null;');
  write(base, 'qc/pending.json', '{}');
  write(base, 'public/audio.wav', 'audio');
  write(base, 'uv.lock', 'lock');
  write(base, 'package-lock.json', '{}');
  write(base, 'src/__pycache__/x.pyc', 'cache');
  write(base, 'renders/old.mp4', 'output');
  const before = snapshotSources(base);
  assert.deepEqual(snapshotSources(base), before);
  for (const name of ['src/A.tsx', 'src/build/Shot.tsx', 'components/Helper.tsx', 'build/Imported.tsx', 'script/storyboard.json', 'scripts/build.py', 'public/audio.wav', 'project.json', 'package.json', 'package-lock.json', 'uv.lock']) assert.ok(before[name], name);
  assert.ok(!before['qc/pending.json']);
  assert.ok(!before['src/__pycache__/x.pyc']);
  assert.ok(!before['renders/old.mp4']);
  fs.appendFileSync(path.join(base, 'src/A.tsx'), '\n// updated');
  assert.notDeepEqual(snapshotSources(base), before);
  const changed = snapshotSources(base);
  fs.appendFileSync(path.join(base, 'components/Helper.tsx'), '// changed');
  assert.notDeepEqual(snapshotSources(base), changed);
  write(base, 'renders/Reserved.tsx', 'export {};');
  write(base, 'script/storyboard.json', {shots: [{...shot, component: 'renders/Reserved.tsx'}]});
  assert.throws(() => snapshotSources(base), /reserved output/);
  write(base, 'script/storyboard.json', {shots: [shot]});
  const outside = temp();
  write(outside, 'secret', 'external');
  fs.symlinkSync(outside, path.join(base, 'public/escape'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => snapshotSources(base), /escapes project/);
});
test('initializer accepts demo, preserves nonempty targets and rejects overlap/unsafe slug', () => {
  const tmp = temp();
  const target = path.join(tmp, 'film');
  execFileSync(process.execPath, [path.join(root, 'scripts/init.mjs'), target, 'demo']);
  assert.ok(fs.readFileSync(path.join(target, 'src/config.ts'), 'utf8').includes("slug: 'demo'"));
  assert.equal(JSON.parse(fs.readFileSync(path.join(target, 'project.json'), 'utf8')).composition, 'Video');
  assert.ok(!fs.existsSync(path.join(target, 'node_modules')));
  assert.ok(!fs.existsSync(path.join(target, '.git')));
  for (const [dest, slug] of [[target, 'demo'], [root, 'film'], [path.dirname(root), 'film'], [path.join(root, 'unsafe-project'), 'film'], [path.join(tmp, 'unsafe'), '../escape']]) {
    assert.notEqual(spawnSync(process.execPath, [path.join(root, 'scripts/init.mjs'), dest, slug]).status, 0);
  }
  const alias = path.join(tmp, 'skill-alias');
  fs.symlinkSync(root, alias, process.platform === 'win32' ? 'junction' : 'dir');
  assert.notEqual(spawnSync(process.execPath, [path.join(root, 'scripts/init.mjs'), path.join(alias, 'project'), 'film']).status, 0);
});
test('single-argument initializer uses the declared data root and rejects relative roots', () => {
  const base = temp();
  const script = path.join(root, 'scripts/init.mjs');
  execFileSync(process.execPath, [script, 'single'], {env: {...process.env, A2V_DATA_ROOT: base}});
  assert.equal(JSON.parse(fs.readFileSync(path.join(base, 'single/project.json'), 'utf8')).slug, 'single');
  for (const dataRoot of ['relative-root', root]) {
    const failed = spawnSync(process.execPath, [script, 'blocked'], {env: {...process.env, A2V_DATA_ROOT: dataRoot}});
    assert.notEqual(failed.status, 0);
  }
  assert.ok(!fs.existsSync(path.join(root, 'blocked')));
});

test('render options validate all stills, overwrite and one-based mid/end previews', () => {
  assert.deepEqual(renderOptions(project, ['preview', '1', '31'], {}).frames, {from: 31, to: 60});
  assert.deepEqual(renderOptions(project, ['preview', '12', '81'], {}).frames, {from: 81, to: 90});
  assert.equal(renderOptions(project, ['video', '--overwrite'], {}).overwrite, true);
  assert.deepEqual(renderOptions(project, ['stills', '1,45,90'], {}).stills, [1, 45, 90]);
  for (const args of [['stills', '1,91'], ['stills', '1,0'], ['stills', '1,1'], ['preview', '0'], ['preview', '1', '0'], ['preview', '1', '91'], ['preview', '1', '1.5'], ['video', 'extra'], ['video', '--unknown']]) assert.throws(() => renderOptions(project, args, {}));
});
test('output overwrite protection also rejects symlink escapes', () => {
  const base = fixture();
  const file = write(base, 'renders/film_v1.mp4', 'old film');
  assert.throws(() => assertOutput(base, file, false), /--overwrite/);
  assert.doesNotThrow(() => assertOutput(base, file, true));
  const outside = temp();
  fs.symlinkSync(outside, path.join(base, 'escaped'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => assertOutput(base, path.join(base, 'escaped/new.mp4'), true), /escapes project/);
});
test('all render modes enforce storyboard before loading renderer dependencies', async () => {
  const base = fixture();
  write(base, 'script/storyboard.json', {shots: []});
  for (const args of [['video'], ['preview', '1', '31'], ['stills', '1']]) await assert.rejects(renderProject(base, args, {}), /Storyboard gate failed/);
  assert.ok(!fs.readdirSync(base).some(name => name.startsWith('.render-bundle')));
});
test('local TypeScript gate cannot be bypassed by any render mode', async () => {
  const base = fixture();
  await assert.rejects(renderProject(base, ['video'], {}), /Project-local TypeScript is missing/);
  write(base, 'node_modules/typescript/package.json', {name: 'typescript'});
  write(base, 'node_modules/typescript/bin/tsc', 'console.error("deliberate type failure"); process.exit(2);');
  for (const args of [['video'], ['preview', '1', '31'], ['stills', '1']]) await assert.rejects(renderProject(base, args, {}), /TypeScript gate failed/);
  assert.ok(!fs.readdirSync(base).some(name => name.startsWith('.render-bundle')));
});
test('render refuses existing files before invoking dependencies', async () => {
  const base = fixture();
  write(base, 'renders/film_v1.mp4', 'old');
  await assert.rejects(renderProject(base, ['video'], {}), /--overwrite/);
  assert.equal(fs.readFileSync(path.join(base, 'renders/film_v1.mp4'), 'utf8'), 'old');
  await assert.rejects(renderProject(base, ['video', '--overwrite'], {}), /Project-local TypeScript is missing/);
});
test('successful stills bind media/source evidence and concurrent bundles stay independent', async () => {
  const base = fixture();
  fakeRenderer(base);
  await Promise.all([renderProject(base, ['stills', '1'], {}), renderProject(base, ['stills', '90'], {})]);
  const media = path.join(base, 'stills/frame-90.png');
  const evidence = JSON.parse(fs.readFileSync(media + '.delivery.json', 'utf8'));
  assert.equal(evidence.mediaSha256, sha256File(media));
  assert.deepEqual(evidence.sourceHashes, snapshotSources(base));
  assert.deepEqual(evidence.frames, {from: 90, to: 90});
  assert.equal(evidence.mode, 'stills');
  assert.equal(evidence.ffprobe, null);
  assert.equal(evidence.visualReview, 'not_performed');
  assert.equal(evidence.audioReview, 'not_performed');
  assert.ok(Number.isFinite(Date.parse(evidence.renderedAt)));
  const bundles = fs.readFileSync(path.join(base, 'bundle-events.log'), 'utf8').trim().split(/\r?\n/);
  assert.equal(new Set(bundles).size, 2);
  assert.ok(bundles.every(file => !fs.existsSync(file)));
  assert.ok(!fs.readdirSync(path.join(base, 'stills')).some(file => file.endsWith('.render.lock') || file.startsWith('.render-')));
});
test('failed replacement or sources changing mid-render preserve the prior media', async () => {
  for (const behavior of ["throw new Error('render failed');", "fs.appendFileSync(path.join(root, 'src/A.tsx'), '// changed');"]) {
    const base = fixture();
    const output = write(base, 'stills/frame-1.png', 'prior media');
    fakeRenderer(base, behavior);
    await assert.rejects(renderProject(base, ['stills', '1', '--overwrite'], {}), /render failed|Sources changed/);
    assert.equal(fs.readFileSync(output, 'utf8'), 'prior media');
    assert.ok(!fs.existsSync(output + '.delivery.json'));
    assert.deepEqual(fs.readdirSync(path.join(base, 'stills')), ['frame-1.png']);
    assert.ok(!fs.readdirSync(base).some(file => file.startsWith('.render-bundle-')));
  }
});
test('concurrent renders cannot claim the same output', async () => {
  const base = fixture();
  fakeRenderer(base);
  const results = await Promise.allSettled([renderProject(base, ['stills', '1'], {}), renderProject(base, ['stills', '1'], {})]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.match(results.find(result => result.status === 'rejected').reason.message, /Render lock exists|Render already owns/);
});
