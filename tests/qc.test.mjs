import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkQc} from '../scripts/check-qc.mjs';
import {sha256File, snapshotSources, isWithin} from '../scripts/runtime-lib.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'a2v-qc-'));
const generated = path.join(sandbox, 'fixture.mp4');
const command = (executable, args) => {
  const result = spawnSync(executable, args, {encoding: 'utf8', windowsHide: true});
  assert.equal(result.status, 0, result.stderr || result.error?.message || executable);
  return result.stdout;
};
command('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=64x96:rate=10', '-frames:v', '10', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', generated]);
const originalProbe = JSON.parse(command('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', generated]));
const ids = ['technical', 'registration', 'sources', 'visual', 'motion', 'teaching', 'audio', 'platform'];
const project = {status: 'production', width: 64, height: 96, fps: 10, totalFrames: 10, audio: {mode: 'silent'}};
const shot = {id: 'S1', from: 1, to: 10, group: 'G1', component: 'src/Shot.tsx', action: 'move', purpose: 'fixture only'};
const write = (base, relative, value) => {
  const file = path.join(base, relative);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
  return file;
};
const json = (base, relative) => JSON.parse(fs.readFileSync(path.join(base, relative), 'utf8'));
const edit = (base, relative, change) => {const value = json(base, relative); change(value); write(base, relative, value);};
function fixture() {
  const base = fs.mkdtempSync(path.join(sandbox, 'project-'));
  write(base, 'project.json', project);
  write(base, 'script/storyboard.json', {shots: [shot], assets: []});
  write(base, 'src/Shot.tsx', 'export const Shot = () => null;');
  write(base, 'src/build/Nested.tsx', 'export const Nested = () => null;');
  write(base, 'components/Imported.tsx', 'export const Imported = () => null;');
  write(base, 'qc/review.txt', 'Synthetic test fixture; no actual human playback review has occurred.');
  fs.mkdirSync(path.join(base, 'renders'));
  fs.copyFileSync(generated, path.join(base, 'renders/film.mp4'));
  const hash = sha256File(path.join(base, 'renders/film.mp4'));
  write(base, 'renders/film.mp4.delivery.json', {schemaVersion: 1, mode: 'video', frames: {from: 1, to: 10}, mediaSha256: hash, sourceHashes: snapshotSources(base), ffprobe: originalProbe});
  write(base, 'qc/final.json', {schemaVersion: 1, media: 'renders/film.mp4', mediaSha256: hash, blockingDefects: [], checks: ids.map(id => ({id, status: 'passed', reviewer: 'test fixture', tool: 'fixture', notes: 'Schema test only, not genuine creative acceptance', method: ['audio', 'motion'].includes(id) ? 'playback' : 'inspection', frames: {from: 1, to: 10}, evidence: [{path: 'qc/review.txt', sha256: sha256File(path.join(base, 'qc/review.txt'))}]}))});
  return base;
}
const rebind = base => edit(base, 'renders/film.mp4.delivery.json', value => {value.sourceHashes = snapshotSources(base);});
async function rejects(mutation, expected) {
  const base = fixture();
  mutation(base);
  const result = await checkQc(base);
  assert.equal(result.pass, false, JSON.stringify(result));
  assert.ok(result.errors.some(error => expected.test(error)), JSON.stringify(result.errors));
  return result;
}
after(() => {
  const resolved = fs.realpathSync(sandbox);
  assert.ok(isWithin(fs.realpathSync(os.tmpdir()), resolved));
  assert.ok(path.basename(resolved).startsWith('a2v-qc-'));
  fs.rmSync(resolved, {recursive: true, force: true});
});

test('fresh production evidence passes genuine local probe and full decode', async () => {
  const result = await checkQc(fixture());
  assert.deepEqual(result.errors, []);
  assert.equal(result.pass, true);
  assert.equal(result.technical.ffprobe, 'passed');
  assert.equal(result.technical.decode, 'passed');
  assert.equal(Number(result.technical.media.streams.find(stream => stream.codec_type === 'video').nb_read_frames), 10);
  assert.match(result.note, /do not prove/);
});

test('missing, failed, not_performed and duplicate review checks cannot pass', async () => {
  await rejects(base => edit(base, 'qc/final.json', value => value.checks.pop()), /Missing required check: platform/);
  for (const status of ['failed', 'not_performed', 'pending']) await rejects(base => edit(base, 'qc/final.json', value => {value.checks[0].status = status;}), /check must be passed/);
  await rejects(base => edit(base, 'qc/final.json', value => value.checks.push(value.checks[0])), /duplicate check/);
});

test('motion and hearing cannot be declared from stills or waveform inspection', async () => {
  for (const id of ['motion', 'audio']) await rejects(base => edit(base, 'qc/final.json', value => {value.checks.find(check => check.id === id).method = 'stills';}), /playback declaration/);
  await rejects(base => edit(base, 'qc/final.json', value => {value.checks[0].reviewer = ' ';}), /reviewer\/tool\/notes\/method/);
  await rejects(base => edit(base, 'qc/final.json', value => {value.blockingDefects = ['Unreadable command'];}), /blockingDefects/);
});

test('draft, preview, stills and incomplete film scopes cannot pass', async () => {
  await rejects(base => {edit(base, 'project.json', value => {value.status = 'draft';}); rebind(base);}, /status='production'/);
  for (const mode of ['preview', 'stills']) await rejects(base => edit(base, 'renders/film.mp4.delivery.json', value => {value.mode = mode;}), /video sidecar/);
  await rejects(base => edit(base, 'renders/film.mp4.delivery.json', value => {value.frames.to = 9;}), /sidecar must cover/);
  await rejects(base => edit(base, 'qc/final.json', value => {value.checks[3].frames.from = 2;}), /check must cover/);
});

test('stale media, source inputs, evidence and missing delivery data cannot pass', async () => {
  await rejects(base => fs.appendFileSync(path.join(base, 'renders/film.mp4'), 'changed'), /Stale QC media hash/);
  await rejects(base => fs.appendFileSync(path.join(base, 'src/Shot.tsx'), '// changed'), /source hashes/);
  for (const file of ['src/build/Nested.tsx', 'components/Imported.tsx']) {
    await rejects(base => fs.appendFileSync(path.join(base, file), '// changed'), /source hashes/);
  }
  await rejects(base => fs.appendFileSync(path.join(base, 'qc/review.txt'), 'changed'), /stale evidence hash/);
  await rejects(base => edit(base, 'renders/film.mp4.delivery.json', value => {delete value.sourceHashes['script/storyboard.json'];}), /source hashes/);
  await rejects(base => fs.unlinkSync(path.join(base, 'renders/film.mp4.delivery.json')), /Cannot read.*delivery/);
});

test('evidence containment rejects traversal and escaping junctions', async () => {
  await rejects(base => edit(base, 'qc/final.json', value => {value.checks[0].evidence[0].path = '../fixture.mp4';}), /missing\/outside evidence/);
  await rejects(base => {
    const external = fs.mkdtempSync(path.join(sandbox, 'external-'));
    write(external, 'review.txt', 'outside');
    fs.symlinkSync(external, path.join(base, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
    edit(base, 'qc/final.json', value => {value.checks[0].evidence[0] = {path: 'alias/review.txt', sha256: sha256File(path.join(external, 'review.txt'))};});
  }, /missing\/outside evidence/);
});

test('AI assets require literal passing text, geometry and continuity verdicts', async () => {
  const withAsset = (base, qc) => {
    const file = write(base, 'public/image.png', 'synthetic asset bytes');
    edit(base, 'script/storyboard.json', value => value.assets.push({path: 'public/image.png', source: 'user:fixture', license: 'test-only', usage: 'fixture', sha256: sha256File(file), ai: true, model: 'fixture', prompt: 'fixture', seed: 'n/a', disclosure: 'synthetic', qc}));
    rebind(base);
  };
  await rejects(base => withAsset(base, 'pending'), /AI asset QC/);
  await rejects(base => withAsset(base, {textFree: 'passed', geometry: 'pending', continuity: 'passed'}), /AI asset QC/);
  const base = fixture();
  withAsset(base, {textFree: 'passed', geometry: 'passed', continuity: 'passed'});
  assert.equal((await checkQc(base)).pass, true);
});

test('sidecar media properties and required audio must match the project', async () => {
  for (const key of ['width', 'height', 'r_frame_rate', 'avg_frame_rate', 'nb_frames', 'duration']) await rejects(base => edit(base, 'renders/film.mp4.delivery.json', value => {value.ffprobe.streams[0][key] = key.includes('rate') ? '20/1' : '999';}), /Sidecar:/);
  await rejects(base => {edit(base, 'project.json', value => {delete value.audio;}); rebind(base);}, /audio stream missing/);
});

test('independent probe catches forged sidecar dimensions and invalid media bytes', async () => {
  const mismatch = await rejects(base => {
    edit(base, 'project.json', value => {value.width = 128;});
    edit(base, 'renders/film.mp4.delivery.json', value => {value.ffprobe.streams[0].width = 128;});
    rebind(base);
  }, /Actual media: dimensions/);
  assert.equal(mismatch.technical.decode, 'passed');
  const invalid = await rejects(base => {
    write(base, 'renders/film.mp4', 'invalid MP4');
    const hash = sha256File(path.join(base, 'renders/film.mp4'));
    edit(base, 'qc/final.json', value => {value.mediaSha256 = hash;});
    edit(base, 'renders/film.mp4.delivery.json', value => {value.mediaSha256 = hash;});
  }, /Actual ffprobe failed/);
  assert.equal(invalid.technical.decode, 'failed');
});

test('malformed boundary inputs safely return JSON diagnostics', async () => {
  for (const value of [null, false, 1, [], {}, {schemaVersion: 1, checks: [null], media: 9, blockingDefects: null}]) await rejects(base => write(base, 'qc/final.json', value), /QC|media|Check/);
  await rejects(base => write(base, 'qc/final.json', '{invalid'), /Cannot read/);
  await rejects(base => write(base, 'script/storyboard.json', '{invalid'), /Plan:/);
  await rejects(base => write(base, 'project.json', []), /Invalid project/);
  await rejects(base => write(base, 'renders/film.mp4.delivery.json', []), /sidecar must be an object/);
  await rejects(base => edit(base, 'qc/final.json', value => {value.checks[0].evidence = [null];}), /evidence requires/);
});

test('CLI prints machine-readable failures and exits nonzero', () => {
  const base = fixture();
  edit(base, 'qc/final.json', value => {value.checks[0].status = 'not_performed';});
  const result = spawnSync(process.execPath, [path.join(repo, 'scripts/check-qc.mjs'), base], {encoding: 'utf8', windowsHide: true});
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).pass, false);
});

test('files changing during independent media checks invalidate the result', async () => {
  const base = fixture();
  const pending = checkQc(base);
  fs.appendFileSync(path.join(base, 'qc/review.txt'), 'Changed during probe');
  fs.appendFileSync(path.join(base, 'src/Shot.tsx'), '// Changed during probe');
  const result = await pending;
  assert.equal(result.pass, false);
  assert.ok(result.errors.some(error => /File changed during final QC/.test(error)));
  assert.ok(result.errors.some(error => /Sources changed during final QC/.test(error)));
});
