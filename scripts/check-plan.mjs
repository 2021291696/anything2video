#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

export function validatePlan(project, plan) {
  const errors = [];
  const integer = n => Number.isInteger(n) && n > 0;
  if (![project.width, project.height, project.fps, project.totalFrames].every(integer)) errors.push('Project dimensions, fps and totalFrames must be positive integers');
  if (!Array.isArray(plan.shots) || !plan.shots.length) return [...errors, 'No shots: refusing an empty film'];
  const shots = [...plan.shots].sort((a, b) => a.from - b.from);
  const ids = new Set();
  let next = 1;
  for (const shot of shots) {
    if (!shot.id || ids.has(shot.id)) errors.push(`Missing/duplicate shot id: ${shot.id}`);
    ids.add(shot.id);
    if (!integer(shot.from) || !integer(shot.to) || shot.to < shot.from) errors.push(`Invalid inclusive frame range: ${shot.id}`);
    if (shot.from !== next) errors.push(`Gap/overlap before ${shot.id}: expected ${next}, found ${shot.from}`);
    next = shot.to + 1;
    if (!shot.group || !shot.component || !shot.action || !shot.purpose) errors.push(`Incomplete production contract: ${shot.id}`);
  }
  if (next !== project.totalFrames + 1) errors.push('Shots do not cover exactly totalFrames');
  for (const claim of plan.claims ?? []) {
    if (!claim.text || !claim.source || !/^(https?:\/\/|user:|local:)/.test(claim.source)) errors.push('Every factual claim needs a source');
  }
  for (const asset of plan.assets ?? []) {
    if (!asset.path || !asset.source || !asset.license || !asset.sha256) errors.push(`Incomplete asset provenance: ${asset.path}`);
    if (asset.ai && (!asset.model || !asset.prompt || !asset.disclosure)) errors.push(`Missing AI provenance/disclosure: ${asset.path}`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(process.argv[2] ?? '.');
  const project = JSON.parse(fs.readFileSync(path.join(root, 'project.json'), 'utf8'));
  const plan = JSON.parse(fs.readFileSync(path.join(root, 'script', 'storyboard.json'), 'utf8'));
  const errors = validatePlan(project, plan);
  for (const s of plan.shots ?? []) {
    const file = path.resolve(root, s.component ?? '');
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.readFileSync(file, 'utf8').trim()) errors.push(`Missing/empty component: ${s.component}`);
  }
  for (const a of plan.assets ?? []) {
    const file = path.resolve(root, a.path ?? '');
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      errors.push(`Missing/outside asset: ${a.path}`);
      continue;
    }
    const hash = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (hash !== String(a.sha256).toLowerCase()) errors.push(`Stale asset hash: ${a.path}`);
  }
  console.log(JSON.stringify({pass: errors.length === 0, errors, note: 'Coverage checks are not visual acceptance. Review moving sequences and final media separately.'}, null, 2));
  process.exitCode = errors.length ? 1 : 0;
}
