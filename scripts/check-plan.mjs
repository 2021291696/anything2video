#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {isRecord, nonempty, projectFile, sha256File} from './runtime-lib.mjs';

export function validatePlan(project, plan) {
  const errors = [];
  const integer = n => Number.isInteger(n) && n > 0;
  if (!isRecord(project)) errors.push('Project must be an object');
  if (!isRecord(project) || ![project.width, project.height, project.fps, project.totalFrames].every(integer)) errors.push('Project dimensions, fps and totalFrames must be positive integers');
  if (!isRecord(plan)) return [...errors, 'Storyboard must be an object'];
  if (!Array.isArray(plan.shots) || !plan.shots.length) errors.push('No shots: refusing an empty film');
  const shots = Array.isArray(plan.shots) ? plan.shots : [];
  const ids = new Set();
  const ranges = [];
  for (const [index, shot] of shots.entries()) {
    if (!isRecord(shot)) {errors.push(`Shot ${index + 1} must be an object`); continue;}
    const label = nonempty(shot.id) ? shot.id : `#${index + 1}`;
    if (!nonempty(shot.id) || ids.has(shot.id)) errors.push(`Missing/duplicate shot id: ${label}`);
    if (nonempty(shot.id)) ids.add(shot.id);
    if (!integer(shot.from) || !integer(shot.to) || shot.to < shot.from) errors.push(`Invalid inclusive frame range: ${label}`);
    else ranges.push(shot);
    if (![shot.group, shot.component, shot.action, shot.purpose].every(nonempty)) errors.push(`Incomplete production contract: ${label}`);
  }
  let next = 1;
  for (const shot of ranges.sort((a, b) => a.from - b.from)) {
    if (shot.from !== next) errors.push(`Gap/overlap before ${nonempty(shot.id) ? shot.id : '<invalid>'}: expected ${next}, found ${shot.from}`);
    next = shot.to + 1;
  }
  if (isRecord(project) && integer(project.totalFrames) && next !== project.totalFrames + 1) errors.push('Shots do not cover exactly totalFrames');
  for (const key of ['claims', 'assets']) {
    if (plan[key] !== undefined && !Array.isArray(plan[key])) errors.push(`${key} must be an array`);
  }
  for (const [index, claim] of (Array.isArray(plan.claims) ? plan.claims : []).entries()) {
    if (!isRecord(claim) || !nonempty(claim.text) || !nonempty(claim.source) || !/^(https?:\/\/|user:|local:)\S+/.test(claim.source)) errors.push(`Every factual claim needs a source: #${index + 1}`);
  }
  for (const [index, asset] of (Array.isArray(plan.assets) ? plan.assets : []).entries()) {
    if (!isRecord(asset)) {errors.push(`Asset ${index + 1} must be an object`); continue;}
    const label = nonempty(asset.path) ? asset.path : `#${index + 1}`;
    if (![asset.path, asset.source, asset.license, asset.usage].every(nonempty) || !nonempty(asset.sha256) || !/^[a-f0-9]{64}$/i.test(asset.sha256)) errors.push(`Incomplete asset provenance: ${label}`);
    if (asset.ai !== undefined && typeof asset.ai !== 'boolean') errors.push(`AI marker must be boolean: ${label}`);
    if (asset.ai) {
      const seed = nonempty(asset.seed) || (typeof asset.seed === 'number' && Number.isFinite(asset.seed));
      const qc = nonempty(asset.qc) || (isRecord(asset.qc) && Object.keys(asset.qc).length > 0 && Object.values(asset.qc).every(nonempty));
      if (![asset.model, asset.prompt, asset.disclosure].every(nonempty) || !seed || !qc) errors.push(`Missing AI provenance/disclosure/seed/QC: ${label}`);
    }
  }
  return errors;
}

export function checkPlan(root) {
  const errors = [];
  let project, plan;
  for (const [name, target] of [['project', 'project.json'], ['plan', 'script/storyboard.json']]) {
    try {
      const parsed = JSON.parse(fs.readFileSync(projectFile(root, target), 'utf8'));
      if (name === 'project') project = parsed; else plan = parsed;
    } catch (error) {errors.push(`Cannot read ${target}: ${error.message}`);}
  }
  errors.push(...validatePlan(project, plan));
  for (const shot of (isRecord(plan) && Array.isArray(plan.shots) ? plan.shots : [])) {
    if (!isRecord(shot)) continue;
    try {
      if (!fs.readFileSync(projectFile(root, shot.component), 'utf8').trim()) throw new Error('Empty component');
    } catch (error) {errors.push(`Missing/empty/outside component: ${nonempty(shot.component) ? shot.component : '<invalid>'} (${error.message})`);}
  }
  for (const asset of (isRecord(plan) && Array.isArray(plan.assets) ? plan.assets : [])) {
    if (!isRecord(asset)) continue;
    try {
      const file = projectFile(root, asset.path);
      if (!nonempty(asset.sha256) || sha256File(file) !== asset.sha256.toLowerCase()) errors.push(`Stale asset hash: ${asset.path}`);
    } catch (error) {errors.push(`Missing/outside asset: ${nonempty(asset.path) ? asset.path : '<invalid>'} (${error.message})`);}
  }
  return {pass: errors.length === 0, errors, note: 'Coverage checks are not visual acceptance. Review moving sequences and final media separately.'};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = checkPlan(path.resolve(process.argv[2] ?? '.'));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.pass ? 0 : 1;
}
