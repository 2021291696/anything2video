#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {checkPlan} from './check-plan.mjs';
import {isRecord, nonempty, projectFile, sha256File, snapshotSources} from './runtime-lib.mjs';

const REQUIRED = ['technical', 'registration', 'sources', 'visual', 'motion', 'teaching', 'audio', 'platform'];
const HASH = /^[a-f0-9]{64}$/i;
const fullRange = (value, totalFrames) => isRecord(value) && value.from === 1 && value.to === totalFrames;
const rate = value => {
  if (typeof value !== 'string' || !/^\d+(?:\/\d+)?$/.test(value)) return NaN;
  const [numerator, denominator = '1'] = value.split('/').map(Number);
  return numerator / Number(denominator);
};
const count = value => typeof value === 'number' || typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
const duration = value => typeof value === 'number' || typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN;

function run(command, args) {
  return new Promise(resolve => {
    const child = spawn(command, args, {windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '', stderr = '', failure = '';
    const timer = setTimeout(() => {failure = `${command} timed out`; child.kill();}, 600_000);
    const collect = key => chunk => {
      if (key === 'stdout') stdout += chunk; else stderr += chunk;
      if (stdout.length + stderr.length > 8_000_000) {failure = `${command} output exceeded limit`; child.kill();}
    };
    child.stdout.on('data', collect('stdout'));
    child.stderr.on('data', collect('stderr'));
    child.on('error', error => {failure = error.message;});
    child.on('close', code => {clearTimeout(timer); resolve({pass: code === 0 && !failure, stdout, stderr, error: failure || (code === 0 ? '' : `${command} exited ${code}`)});});
  });
}

function inspectProbe(probe, project, label, errors, requireCount = false) {
  if (!isRecord(probe) || !Array.isArray(probe.streams) || !isRecord(probe.format)) {
    errors.push(`${label}: invalid ffprobe data`);
    return;
  }
  const streams = probe.streams.filter(isRecord);
  const videos = streams.filter(stream => stream.codec_type === 'video');
  if (videos.length !== 1) {errors.push(`${label}: expected exactly one video stream`); return;}
  const video = videos[0];
  if (video.width !== project.width || video.height !== project.height) errors.push(`${label}: dimensions differ from project`);
  for (const key of ['r_frame_rate', 'avg_frame_rate']) {
    if (!Number.isFinite(rate(video[key])) || Math.abs(rate(video[key]) - project.fps) > 0.001) errors.push(`${label}: ${key} differs from project fps`);
  }
  const frames = count(video.nb_read_frames ?? video.nb_frames);
  if (Number.isFinite(frames) ? frames !== project.totalFrames : requireCount) errors.push(`${label}: frame count differs or is unavailable`);
  const seconds = duration(video.duration ?? probe.format.duration);
  if (!Number.isFinite(seconds) || Math.abs(seconds - project.totalFrames / project.fps) > 1 / project.fps + 0.02) errors.push(`${label}: duration differs from project`);
  const audio = streams.filter(stream => stream.codec_type === 'audio');
  if (project.audio?.mode !== 'silent' && audio.length === 0) errors.push(`${label}: audio stream missing; declare project.audio.mode='silent' only for an intentionally silent film`);
}

/** Verify declared review evidence and actual media integrity, not artistic merit or reviewer behavior. */
export async function checkQc(root, qcPath = 'qc/final.json') {
  const errors = [];
  const technical = {ffprobe: 'not_performed', decode: 'not_performed'};
  const reviewedFiles = new Map();
  let reviewedSources;
  const note = 'Evidence integrity is checked. Playback declarations do not prove that someone watched or heard the film, or that it is artistically effective.';
  const result = () => ({pass: errors.length === 0, errors, technical, note});
  const read = relative => {
    try {
      const file = projectFile(root, relative);
      reviewedFiles.set(relative, sha256File(file));
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch (error) {errors.push(`Cannot read ${relative}: ${error.message}`); return null;}
  };
  try {root = fs.realpathSync(root);}
  catch (error) {errors.push(`Cannot resolve project: ${error.message}`); return result();}
  const planResult = checkPlan(root);
  errors.push(...planResult.errors.map(error => `Plan: ${error}`));
  const project = read('project.json');
  const plan = read('script/storyboard.json');
  const qc = read(qcPath);
  if (!isRecord(project) || ![project.width, project.height, project.fps, project.totalFrames].every(value => Number.isInteger(value) && value > 0)) errors.push('Invalid project dimensions or timing');
  if (!isRecord(project) || project.status !== 'production') errors.push("Final QC requires project.status='production'");
  if (!isRecord(qc)) {errors.push('QC must be an object'); return result();}
  if (qc.schemaVersion !== 1) errors.push('QC schemaVersion must be 1');
  if (!Array.isArray(qc.blockingDefects) || qc.blockingDefects.length !== 0) errors.push('QC blockingDefects must be an empty array');
  if (!nonempty(qc.mediaSha256) || !HASH.test(qc.mediaSha256)) errors.push('QC requires a full media SHA256');
  let media;
  try {
    media = projectFile(root, qc.media);
    reviewedFiles.set(qc.media, sha256File(media));
    if (!nonempty(qc.mediaSha256) || sha256File(media) !== qc.mediaSha256.toLowerCase()) errors.push('Stale QC media hash');
  } catch (error) {errors.push(`Missing/outside media: ${error.message}`);}
  const sidecar = nonempty(qc.media) ? read(`${qc.media}.delivery.json`) : null;
  if (!isRecord(sidecar)) errors.push('Media delivery sidecar must be an object');
  else {
    if (sidecar.schemaVersion !== 1 || sidecar.mode !== 'video') errors.push('Final delivery requires a schemaVersion=1 video sidecar');
    if (!fullRange(sidecar.frames, project?.totalFrames)) errors.push('Delivery sidecar must cover the entire film');
    if (!nonempty(sidecar.mediaSha256) || !HASH.test(sidecar.mediaSha256) || !media || sha256File(media) !== sidecar.mediaSha256.toLowerCase()) errors.push('Stale delivery media hash');
    try {
      const current = snapshotSources(root);
      reviewedSources = current;
      const supplied = isRecord(sidecar.sourceHashes) ? Object.fromEntries(Object.entries(sidecar.sourceHashes).sort(([a], [b]) => a.localeCompare(b))) : null;
      if (JSON.stringify(current) !== JSON.stringify(supplied)) errors.push('Stale or incomplete delivery source hashes');
    } catch (error) {errors.push(`Cannot verify delivery sources: ${error.message}`);}
    if (isRecord(project)) inspectProbe(sidecar.ffprobe, project, 'Sidecar', errors);
  }
  const seen = new Set();
  if (!Array.isArray(qc.checks)) errors.push('QC checks must be an array');
  for (const [index, check] of (Array.isArray(qc.checks) ? qc.checks : []).entries()) {
    if (!isRecord(check)) {errors.push(`Check ${index + 1} must be an object`); continue;}
    const label = nonempty(check.id) ? check.id : `#${index + 1}`;
    if (!nonempty(check.id) || seen.has(check.id)) errors.push(`Missing/duplicate check id: ${label}`);
    if (nonempty(check.id)) seen.add(check.id);
    if (check.status !== 'passed') errors.push(`${label}: check must be passed`);
    if (![check.reviewer, check.tool, check.notes, check.method].every(nonempty)) errors.push(`${label}: reviewer/tool/notes/method are required`);
    if (['motion', 'audio'].includes(check.id) && check.method !== 'playback') errors.push(`${label}: actual full-media playback declaration is required`);
    if (!fullRange(check.frames, project?.totalFrames)) errors.push(`${label}: check must cover the entire film`);
    if (!Array.isArray(check.evidence) || check.evidence.length === 0) errors.push(`${label}: evidence is required`);
    for (const evidence of Array.isArray(check.evidence) ? check.evidence : []) {
      if (!isRecord(evidence) || !nonempty(evidence.sha256) || !HASH.test(evidence.sha256)) {errors.push(`${label}: evidence requires a full SHA256`); continue;}
      try {
        const file = projectFile(root, evidence.path);
        reviewedFiles.set(evidence.path, sha256File(file));
        if (sha256File(file) !== evidence.sha256.toLowerCase()) errors.push(`${label}: stale evidence hash: ${evidence.path}`);
      } catch (error) {errors.push(`${label}: missing/outside evidence: ${error.message}`);}
    }
  }
  for (const id of REQUIRED) if (!seen.has(id)) errors.push(`Missing required check: ${id}`);
  for (const asset of isRecord(plan) && Array.isArray(plan.assets) ? plan.assets : []) {
    if (isRecord(asset) && asset.ai === true && (!isRecord(asset.qc) || !['textFree', 'geometry', 'continuity'].every(key => asset.qc[key] === 'passed'))) errors.push(`AI asset QC must pass textFree/geometry/continuity: ${asset.path ?? '<missing>'}`);
  }
  if (errors.length || !media) return result();
  const probe = await run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', media]);
  technical.ffprobe = probe.pass ? 'passed' : 'failed';
  if (!probe.pass) errors.push(`Actual ffprobe failed: ${probe.error || probe.stderr}`);
  else {
    try {
      technical.media = JSON.parse(probe.stdout);
      inspectProbe(technical.media, project, 'Actual media', errors, true);
      if (errors.length) technical.ffprobe = 'failed';
    } catch (error) {technical.ffprobe = 'failed'; errors.push(`Invalid actual ffprobe output: ${error.message}`);}
  }
  const decode = await run('ffmpeg', ['-v', 'error', '-xerror', '-err_detect', 'explode', '-i', media, '-map', '0:v:0', '-map', '0:a?', '-f', 'null', '-']);
  technical.decode = decode.pass ? 'passed' : 'failed';
  if (!decode.pass) errors.push(`Full-media decode failed: ${decode.error || decode.stderr}`);
  try {
    if (JSON.stringify(snapshotSources(root)) !== JSON.stringify(reviewedSources)) errors.push('Sources changed during final QC; rerun from fresh evidence');
    for (const [relative, hash] of reviewedFiles) {
      if (sha256File(projectFile(root, relative)) !== hash) errors.push(`File changed during final QC: ${relative}`);
    }
  } catch (error) {errors.push(`Cannot revalidate QC inputs: ${error.message}`);}
  return result();
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await checkQc(path.resolve(process.argv[2] ?? '.'), process.argv[3] ?? 'qc/final.json');
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.pass ? 0 : 1;
  } catch (error) {console.log(JSON.stringify({pass: false, errors: [error.message]}, null, 2)); process.exitCode = 1;}
}
