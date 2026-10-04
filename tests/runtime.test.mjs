import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePlan} from '../scripts/check-plan.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = {width: 1080, height: 1920, fps: 30, totalFrames: 90};
const shot = {id: 'A', from: 1, to: 90, group: 'G1', component: 'src/A.tsx', action: 'build', purpose: 'explain'};
test('inclusive complete storyboard passes', () => assert.deepEqual(validatePlan(project, {shots: [shot]}), []));
test('empty film fails', () => assert.ok(validatePlan(project, {shots: []}).length));
test('one-frame hole fails', () => assert.ok(validatePlan(project, {shots: [{...shot, from: 2}]}).some(x => x.includes('Gap'))));
test('overlap and duplicate ids fail', () => assert.ok(validatePlan(project, {shots: [{...shot, to: 50}, {...shot, from: 50}]}).length));
test('unverified claims and AI assets fail', () => assert.ok(validatePlan(project, {shots: [shot], claims: [{text: '100% replacement'}], assets: [{path: 'x.png', ai: true}]}).length));
test('initializer preserves existing directory and rejects unsafe slug', () => {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'a2v-init-'));
  const target=path.join(tmp,'film');
  execFileSync(process.execPath,[path.join(root,'scripts/init.mjs'),target,'safe-film']);
  assert.ok(fs.existsSync(path.join(target,'src/config.ts')));
  assert.ok(!fs.existsSync(path.join(target,'node_modules')));
  assert.ok(!fs.existsSync(path.join(target,'.git')));
  assert.notEqual(spawnSync(process.execPath,[path.join(root,'scripts/init.mjs'),target,'safe-film']).status,0);
  assert.notEqual(spawnSync(process.execPath,[path.join(root,'scripts/init.mjs'),path.join(tmp,'unsafe'),'../escape']).status,0);
});
test('host installers preserve complete reference files and refuse overwrite', () => {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'a2v-install-'));
  for(const host of ['codex','claude','zcode','codebuddy']) {
    const dest=path.join(tmp,host);
    const output=execFileSync(process.execPath,[path.join(root,'scripts/install.mjs'),host,dest],{encoding:'utf8'});
    assert.ok(output.includes('Installed complete package'));
    assert.notEqual(spawnSync(process.execPath,[path.join(root,'scripts/install.mjs'),host,dest]).status,0);
  }
});
