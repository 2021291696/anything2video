import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertDisjoint, buildEditions, collectCoreFiles, HOSTS, verifyEdition} from '../scripts/build-editions.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'a2v-editions-'));
  t.after(() => {
    const resolved = fs.realpathSync.native(dir);
    const relative = path.relative(fs.realpathSync.native(os.tmpdir()), resolved);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'cleanup stays within temporary directory');
    fs.rmSync(resolved, {recursive: true, force: true});
  });
  return dir;
};
const write = (rootDir, relative, content) => {
  const file = path.join(rootDir, ...relative.split('/'));
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, content);
};
function fixture(temp) {
  const source = path.join(temp, 'source');
  write(source, 'SKILL.md', '---\nname: anything2video\ndescription: A shared video skill.\nmetadata:\n  version: "3.0.0"\n---\n');
  for (const host of HOSTS) write(source, `hosts/${host}.md`, `---\nname: anything2video-${host}\ndescription: Dedicated ${host} video production.\nmetadata:\n  version: "3.0.0"\n---\nRead reference/production-contract.md.\n`);
  write(source, 'LICENSE', 'Fixture license\n');
  write(source, 'docs/adapters.md', 'Installation and verification\n');
  write(source, 'docs/optimization-v3.md', 'Measured v3 results and limitations\n');
  write(source, 'docs/optimization-v3.1.md', 'Six-edition expansion and desktop boundaries\n');
  write(source, 'recipes/explainer.md', 'A complete recipe\n');
  write(source, 'reference/production-contract.md', 'Shared production contract\n');
  write(source, 'styles/README.md', 'Shared styles\n');
  write(source, 'samples/README.md', 'Visual preview origins and disclosures\n');
  write(source, 'samples/manifest.json', '{"schemaVersion":1,"samples":[]}');
  write(source, 'samples/sample.mp4', 'Fixture media');
  write(source, 'template/src/config.ts', "export const CONFIG = {slug: 'demo'};\n");
  write(source, 'template/package.json', '{"name":"fixture","private":true}');
  write(source, 'template/node_modules/secret.txt', 'cached dependency');
  write(source, 'template/.verify2_bundle/cached.js', 'cached render');
  write(source, 'template/audio/cache/generated.wav', 'generated audio');
  write(source, 'reference/.cache/private.md', 'cache');
  write(source, 'template/tests/private.test.mjs', 'not distributed');
  write(source, 'reference/.env', 'secret');
  write(source, 'reference/research-worker-report.md', 'transient review');
  write(source, 'examples/private.md', 'not distributed');
  write(source, 'styles/building-label.md', 'A legitimate style reference');
  for (const file of fs.readdirSync(path.join(root, 'scripts')).filter(name => name.endsWith('.mjs'))) {
    write(source, `scripts/${file}`, fs.readFileSync(path.join(root, 'scripts', file)));
  }
  return source;
}
const invoke = (source, ...args) => execFileSync(process.execPath, [path.join(source, 'scripts/install.mjs'), ...args], {encoding: 'utf8'});
const failed = (script, ...args) => spawnSync(process.execPath, [script, ...args], {encoding: 'utf8'});

test('six self-contained editions have identical core hashes and distinct entries', t => {
  const temp = temporary(t), source = fixture(temp), output = path.join(temp, 'editions');
  const packages = buildEditions(output, {source});
  assert.equal(packages.length, 6);
  assert.deepEqual(packages.map(packageDir => path.basename(packageDir)), HOSTS.map(host => `anything2video-${host}`));
  const metadata = packages.map(verifyEdition);
  for (let index = 0; index < packages.length; index++) {
    const packageDir = packages[index];
    assert.equal(metadata[index].host, HOSTS[index]);
    assert.deepEqual(metadata[index].coreHashes, metadata[0].coreHashes);
    assert.ok(fs.readFileSync(path.join(packageDir, 'SKILL.md'), 'utf8').includes(`name: anything2video-${HOSTS[index]}`));
    for (const relative of ['hosts', 'examples', 'tests', 'template/tests', 'template/node_modules', 'template/.verify2_bundle', 'template/audio', 'reference/.cache', 'reference/.env', 'reference/research-worker-report.md']) {
      assert.equal(fs.existsSync(path.join(packageDir, relative)), false, relative);
    }
    assert.ok(fs.existsSync(path.join(packageDir, 'styles/building-label.md')));
    assert.equal(fs.readFileSync(path.join(packageDir, 'samples/sample.mp4'), 'utf8'), 'Fixture media');
    assert.ok(metadata[index].coreHashes['samples/manifest.json']);
    for (const relative of ['scripts/init.mjs', 'scripts/install.mjs', 'scripts/build-editions.mjs', 'template/src/config.ts', 'reference/production-contract.md', 'LICENSE']) assert.ok(fs.existsSync(path.join(packageDir, relative)));
  }
});

test('a relocated offline package initializes and installs only its own host', t => {
  const temp = temporary(t), source = fixture(temp);
  const built = buildEditions(path.join(temp, 'editions'), {source}).find(packageDir => path.basename(packageDir) === 'anything2video-claude-code');
  const relocated = path.join(temp, 'offline relocated package');
  fs.renameSync(built, relocated);
  const project = path.join(temp, 'film');
  execFileSync(process.execPath, [path.join(relocated, 'scripts/init.mjs'), project, 'offline-film']);
  assert.ok(fs.readFileSync(path.join(project, 'src/config.ts'), 'utf8').includes('offline-film'));
  const installRoot = path.join(temp, 'host');
  assert.ok(invoke(relocated, 'claude', installRoot).includes('Installed complete package'));
  const installed = path.join(installRoot, '.claude/skills/anything2video-claude-code');
  verifyEdition(installed);
  const mismatch = failed(path.join(relocated, 'scripts/install.mjs'), 'codex', path.join(temp, 'wrong-host'));
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /belongs to claude-code/);
  assert.equal(fs.existsSync(path.join(temp, 'wrong-host')), false);
});

test('root installers support aliases and preserve generic and existing dedicated installs', t => {
  const temp = temporary(t), source = fixture(temp);
  for (const [host, folder, name] of [
    ['claude', '.claude', 'claude-code'], ['claude-code', '.claude', 'claude-code'],
    ['zcode', '.agents', 'zcode'], ['codex', '.agents', 'codex'],
    ['minimax', '.minimax', 'minimax-code'], ['minimax-code', '.minimax', 'minimax-code'],
  ]) {
    const projectRoot = path.join(temp, `host-${host}`);
    write(projectRoot, `${folder}/skills/anything2video/SKILL.md`, 'User generic installation');
    invoke(source, host, projectRoot);
    const dedicated = path.join(projectRoot, folder, 'skills', `anything2video-${name}`);
    verifyEdition(dedicated);
    assert.equal(fs.readFileSync(path.join(projectRoot, folder, 'skills/anything2video/SKILL.md'), 'utf8'), 'User generic installation');
    assert.notEqual(failed(path.join(source, 'scripts/install.mjs'), host, projectRoot).status, 0);
  }
  const codebuddyRoot = path.join(temp, 'codebuddy');
  invoke(source, 'codebuddy', codebuddyRoot);
  assert.ok(fs.existsSync(path.join(codebuddyRoot, '.codebuddy/skills/anything2video/SKILL.md')));
  assert.equal(fs.existsSync(path.join(codebuddyRoot, '.codebuddy/skills/anything2video/edition.json')), false);
});

test('MiniMax data directory is explicit and invalid flag combinations fail', t => {
  const temp = temporary(t), source = fixture(temp), dataDir = path.join(temp, 'actual app data');
  invoke(source, 'minimax-code', '--data-dir', dataDir);
  verifyEdition(path.join(dataDir, 'skills/anything2video-minimax-code'));
  for (const args of [['codex', '--data-dir', dataDir], ['minimax', '--data-dir'], ['minimax', path.join(temp, 'project'), '--data-dir', dataDir]]) {
    assert.notEqual(failed(path.join(source, 'scripts/install.mjs'), ...args).status, 0);
  }
});

test('desktop hosts export complete packages for manual import without host configuration', t => {
  const temp = temporary(t), source = fixture(temp);
  const exportRoot = path.join(temp, 'desktop-export');
  assert.ok(invoke(source, 'workbuddy', '--export-dir', exportRoot).includes('Exported complete package'));
  verifyEdition(path.join(exportRoot, 'anything2video-workbuddy'));
  assert.ok(invoke(source, 'doubao', '--export-dir', exportRoot).includes('Exported complete package'));
  verifyEdition(path.join(exportRoot, 'anything2video-doubao-work'));
  assert.equal(fs.existsSync(path.join(exportRoot, 'skills')), false);
  for (const args of [['workbuddy'], ['doubao-work', path.join(temp, 'project')], ['claude-code', '--export-dir', exportRoot], ['minimax', '--export-dir', exportRoot], ['workbuddy', '--export-dir'], ['workbuddy', '--export-dir', exportRoot, '--data-dir', exportRoot]]) {
    assert.notEqual(failed(path.join(source, 'scripts/install.mjs'), ...args).status, 0, JSON.stringify(args));
  }
  const relocated = buildEditions(path.join(temp, 'editions'), {source}).find(packageDir => path.basename(packageDir) === 'anything2video-doubao-work');
  const reExport = path.join(temp, 're-export');
  assert.ok(invoke(relocated, 'doubao-work', '--export-dir', reExport).includes('Exported complete package'));
  verifyEdition(path.join(reExport, 'anything2video-doubao-work'));
  assert.notEqual(failed(path.join(relocated, 'scripts/install.mjs'), 'workbuddy', '--export-dir', reExport).status, 0);
});

test('tampered core is rejected before any destination is created', t => {
  const temp = temporary(t), source = fixture(temp);
  const [packageDir] = buildEditions(path.join(temp, 'editions'), {source});
  fs.appendFileSync(path.join(packageDir, 'recipes/explainer.md'), 'tampered');
  const destination = path.join(temp, 'install');
  assert.notEqual(failed(path.join(packageDir, 'scripts/install.mjs'), 'claude-code', destination).status, 0);
  assert.equal(fs.existsSync(destination), false);
});

test('nonempty outputs are preserved and overwrite checks all six identities first', t => {
  const temp = temporary(t), source = fixture(temp), output = path.join(temp, 'editions');
  const packages = buildEditions(output, {source});
  write(output, 'notes.txt', 'unrelated file');
  assert.throws(() => buildEditions(output, {source}), /not empty/);
  const firstEntry = fs.readFileSync(path.join(packages[0], 'SKILL.md'), 'utf8');
  const lastIndex = packages.length - 1;
  const lastMetadata = JSON.parse(fs.readFileSync(path.join(packages[lastIndex], 'edition.json'), 'utf8'));
  write(packages[lastIndex], 'edition.json', JSON.stringify({...lastMetadata, host: 'not-a-host'}));
  assert.throws(() => buildEditions(output, {source, overwrite: true}), /identity/);
  assert.equal(fs.readFileSync(path.join(packages[0], 'SKILL.md'), 'utf8'), firstEntry);
  write(packages[lastIndex], 'edition.json', JSON.stringify(lastMetadata));
  buildEditions(output, {source, overwrite: true});
  assert.equal(fs.readFileSync(path.join(output, 'notes.txt'), 'utf8'), 'unrelated file');
});

test('source and destination ancestors, descendants and realpath aliases cannot overlap', t => {
  const temp = temporary(t), source = fixture(temp);
  for (const target of [source, path.join(source, 'dist'), temp]) assert.throws(() => buildEditions(target, {source}), /overlap/);
  const alias = path.join(temp, 'source-alias');
  fs.symlinkSync(source, alias, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => assertDisjoint(source, path.join(alias, 'new-package')), /overlap/);
  const output = path.join(temp, 'editions');
  buildEditions(output, {source});
  const original = path.join(output, 'anything2video-codex');
  const moved = path.join(temp, 'saved-codex');
  fs.renameSync(original, moved);
  fs.symlinkSync(moved, original, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => buildEditions(output, {source, overwrite: true}), /linked target/);
});

test('linked package inputs are rejected instead of following external content', t => {
  const temp = temporary(t), source = fixture(temp), external = path.join(temp, 'external');
  write(external, 'secret.md', 'outside shared source');
  fs.symlinkSync(external, path.join(source, 'reference/linked'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => collectCoreFiles(source), /symbolic links/);
});

test('metadata versions are read only from frontmatter and mismatches fail before writes', t => {
  const temp = temporary(t), source = fixture(temp), output = path.join(temp, 'editions');
  write(source, 'hosts/codex.md', '---\nname: anything2video-codex\ndescription: Codex.\n---\nmetadata:\n  version: "3.0.0"\n');
  assert.throws(() => buildEditions(output, {source}), /version differs/);
  assert.equal(fs.existsSync(output), false);
});
