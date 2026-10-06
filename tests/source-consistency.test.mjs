import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectCoreFiles, HOSTS} from '../scripts/build-editions.mjs';

// 真实源一致性门禁（2026-10-06 收尾轮新增）：editions.test.mjs 全部跑 fixture 沙箱，
// 真实仓库的宿主入口版本漂移（v3.1.2 时代曾连续漏更四个版本）与缓存垃圾它看不见，本文件负责。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => fs.readFileSync(path.join(root, ...file.split('/')), 'utf8');
const frontmatter = text => text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
const declaredVersion = text => {
  const block = frontmatter(text).match(/^metadata:\s*\r?\n((?:[ \t]+[^\r\n]*(?:\r?\n|$))*)/m)?.[1] ?? '';
  const nested = block.match(/^  version:\s*["']?([0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?)["']?\s*$/m)?.[1];
  return nested ?? frontmatter(text).match(/^version:\s*["']?([0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?)["']?\s*$/m)?.[1];
};

test('every host entry shares the SKILL.md version and correct identity', () => {
  const skill = read('SKILL.md');
  const version = declaredVersion(skill);
  assert.match(version, /^\d+\.\d+\.\d+$/, 'SKILL.md must declare a semver version');
  assert.match(frontmatter(skill), /^name:\s*anything2video\s*$/m);
  for (const host of HOSTS) {
    const entry = read(`hosts/${host}.md`);
    assert.match(frontmatter(entry), new RegExp(`^name:\\s*anything2video-${host}\\s*$`, 'm'), host);
    assert.ok(/^description:\s*\S/m.test(frontmatter(entry)), `description required: ${host}`);
    assert.equal(declaredVersion(entry), version, `host entry version drift: ${host}`);
  }
});

test('core inventory walks the real tree including gallery, audio-engine and samples', () => {
  const files = collectCoreFiles(root);
  assert.ok(files.length > 500, `inventory unexpectedly small: ${files.length}`);
  for (const anchor of ['gallery/README.md', 'audio-engine/README.md', 'samples/manifest.json', 'docs/optimization-v3.7.md', 'template/scripts/mix_sfx.py', 'reference/production-contract.md', 'scripts/build-editions.mjs']) {
    assert.ok(files.includes(anchor), `core inventory missing ${anchor}`);
  }
  for (const absent of ['docs/audit.md', 'docs/optimization-v2.md', 'template/tests', 'hosts']) {
    assert.equal(files.some(file => file === absent || file.startsWith(`${absent}/`)), false, `${absent} must stay out of the package inventory`);
  }
});

test('sample manifest entries exist with matching sha256 and posters', () => {
  const manifest = JSON.parse(read('samples/manifest.json'));
  assert.ok(Array.isArray(manifest.samples) && manifest.samples.length >= 19, 'bundle pool must have at least 19 samples');
  for (const sample of manifest.samples) {
    const media = path.join(root, 'samples', ...sample.path.split('/'));
    assert.ok(fs.existsSync(media), `missing sample media: ${sample.path}`);
    assert.equal(sha256(media), sample.sha256, `sha mismatch: ${sample.path}`);
    const poster = path.join(root, 'samples', 'posters', sample.path.replace(/\.mp4$/, '.jpg'));
    assert.ok(fs.existsSync(poster), `missing poster for ${sample.path}`);
  }
});

test('no python or pytest caches are committed into the skill tree', () => {
  const offenders = [];
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__pycache__' || entry.name === '.pytest_cache') offenders.push(path.relative(root, full));
        else walk(full);
      }
    }
  };
  walk(root);
  assert.deepEqual(offenders, [], `runtime caches must not be committed: ${offenders.join(', ')}`);
});
