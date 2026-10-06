#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const HOSTS = Object.freeze(['doubao-work', 'workbuddy', 'claude-code', 'codex', 'zcode', 'minimax-code']);
const directories = ['recipes', 'reference', 'styles', 'template', 'scripts', 'gallery', 'audio-engine'];
const individual = ['LICENSE', 'docs/adapters.md', 'docs/optimization-v3.md', 'docs/optimization-v3.1.md', 'docs/optimization-v3.6.md', 'docs/optimization-v3.7.md'];
const excluded = /^(?:\.git|\.venv|node_modules|\.Codex|\.mimosa|\.zcode|__pycache__|\.pytest_cache|audio|renders|stills|fin_frames|out|dist|build.*|tests|examples|cache|\.cache|.*-cache|secrets?|credentials?|\..*stills|\.verify.*|\.probe.*|\.render-bundle.*)$/i;
const privateFile = /(?:^\.env(?:\..*)?$|^(?:secrets?|credentials?)(?:\..*)?$|^\.(?:npmrc|pypirc|netrc|git-credentials)$|\.(?:log|pyc|pem|key|p12|pfx)$|(?:^|[._-])worker-report(?:[._-]|$))/i;
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const exists = file => {try {fs.lstatSync(file); return true;} catch (error) {if (error.code === 'ENOENT') return false; throw error;}};
const canonical = file => {
  const suffix = [];
  let current = path.resolve(file);
  while (!exists(current)) {suffix.unshift(path.basename(current)); current = path.dirname(current);}
  return path.resolve(fs.realpathSync.native(current), ...suffix);
};
const comparable = file => process.platform === 'win32' ? file.toLowerCase() : file;
const contains = (parent, child) => {
  const relative = path.relative(comparable(parent), comparable(child));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};
export function assertDisjoint(source, target) {
  const from = canonical(source), to = canonical(target);
  if (contains(from, to) || contains(to, from)) throw new Error('Source and target must not overlap, including aliases and ancestors');
  return to;
}
const readJson = file => {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object');
    return value;
  } catch (error) {throw new Error(`Invalid package metadata: ${file}: ${error.message}`);}
};
function frontmatterOf(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('Missing YAML frontmatter');
  return match[1];
}
function splitFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('Missing YAML frontmatter');
  return {frontmatter: match[0], body: text.slice(match[0].length)};
}
// Edition entrypoints compose the per-host frontmatter with the shared SKILL.md body:
// host identity stays edition-specific while the entry guidance has one maintained source.
export function composeEntry(hostEntryText, coreSkillText) {
  const host = splitFrontmatter(hostEntryText);
  const core = splitFrontmatter(coreSkillText);
  return `${host.frontmatter.trimEnd()}\n\n${core.body.replace(/^\r?\n+/, '')}`;
}
function declaredVersion(frontmatter) {
  // Support the maintained metadata block and legacy packages, never Markdown body text.
  const block = frontmatter.match(/^metadata:\s*\r?\n((?:[ \t]+[^\r\n]*(?:\r?\n|$))*)/m)?.[1];
  const nested = block?.match(/^  version:\s*["']?([0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?)["']?\s*$/m)?.[1];
  return nested ?? frontmatter.match(/^version:\s*["']?([0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?)["']?\s*$/m)?.[1];
}
const versionOf = source => {
  const value = declaredVersion(frontmatterOf(fs.readFileSync(path.join(source, 'SKILL.md'), 'utf8')));
  if (!value) throw new Error('SKILL.md must declare a version');
  return value;
};

export function collectCoreFiles(source) {
  const root = canonical(source);
  const files = [];
  function walk(relative) {
    const absolute = path.join(root, ...relative.split('/'));
    const stat = fs.lstatSync(absolute);
    if ((stat.isDirectory() && excluded.test(path.basename(relative))) || (stat.isFile() && privateFile.test(path.basename(relative)))) return;
    if (stat.isSymbolicLink()) throw new Error(`Package inputs cannot contain symbolic links: ${relative}`);
    if (!contains(root, fs.realpathSync.native(absolute))) throw new Error(`Package input escapes source: ${relative}`);
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(absolute).sort()) walk(`${relative}/${child}`);
    } else if (stat.isFile()) files.push(relative);
    else throw new Error(`Unsupported package input: ${relative}`);
  }
  for (const relative of [...directories, ...individual]) {
    if (!exists(path.join(root, ...relative.split('/')))) throw new Error(`Missing shared package input: ${relative}`);
    walk(relative);
  }
  if (exists(path.join(root, 'samples'))) walk('samples');
  return files.sort();
}

function validateEntry(source, host, version, file = path.join(source, 'hosts', `${host}.md`)) {
  if (fs.lstatSync(file).isSymbolicLink() || !contains(canonical(source), fs.realpathSync.native(file))) throw new Error(`Host entrypoint must be a local regular file: ${file}`);
  const text = fs.readFileSync(file, 'utf8');
  const expected = `anything2video-${host}`;
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) throw new Error(`Missing YAML frontmatter: hosts/${host}.md`);
  const frontmatter = frontmatterOf(text);
  if (!new RegExp(`^name:\\s*${expected}\\s*$`, 'm').test(frontmatter)) throw new Error(`Host entry name must be ${expected}`);
  if (declaredVersion(frontmatter) !== version) throw new Error(`Host entry version differs from shared skill: ${host}`);
  if (!/^description:\s*\S/m.test(frontmatter)) throw new Error(`Missing host entry description: ${host}`);
  return text;
}

function requireKnownDestination(destination, host) {
  if (!exists(destination)) return;
  if (fs.lstatSync(destination).isSymbolicLink() || !fs.statSync(destination).isDirectory()) throw new Error(`Refusing non-directory or linked target: ${destination}`);
  const metadata = readJson(path.join(destination, 'edition.json'));
  if (metadata.schemaVersion !== 1 || metadata.host !== host || metadata.name !== `anything2video-${host}`) {
    throw new Error(`Refusing target without matching edition identity: ${destination}`);
  }
  verifyEdition(destination);
}

function packageInputs(source) {
  const version = versionOf(source);
  const files = collectCoreFiles(source);
  const coreHashes = Object.fromEntries(files.map(relative => [relative, sha256(path.join(source, ...relative.split('/')))]));
  const entries = Object.fromEntries(HOSTS.map(host => [host, validateEntry(source, host, version)]));
  const coreText = fs.readFileSync(path.join(source, 'SKILL.md'), 'utf8');
  return {version, files, coreHashes, entries, coreText};
}

function writePackage(source, destination, host, inputs) {
  fs.mkdirSync(destination, {recursive: true});
  for (const relative of inputs.files) {
    const target = path.join(destination, ...relative.split('/'));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.copyFileSync(path.join(source, ...relative.split('/')), target);
  }
  fs.writeFileSync(path.join(destination, 'SKILL.md'), composeEntry(inputs.entries[host], inputs.coreText));
  fs.writeFileSync(path.join(destination, 'edition.json'), JSON.stringify({
    schemaVersion: 1, version: inputs.version, host, name: `anything2video-${host}`,
    entrypointSha256: sha256(path.join(destination, 'SKILL.md')), coreHashes: inputs.coreHashes,
  }, null, 2) + '\n');
  verifyEdition(destination);
}

export function verifyEdition(source) {
  const metadataFile = path.join(source, 'edition.json');
  if (fs.lstatSync(metadataFile).isSymbolicLink()) throw new Error('Edition metadata cannot be a symbolic link');
  const metadata = readJson(metadataFile);
  if (metadata.schemaVersion !== 1 || !HOSTS.includes(metadata.host) || metadata.name !== `anything2video-${metadata.host}` || typeof metadata.version !== 'string') {
    throw new Error('Unrecognized edition identity');
  }
  if (!metadata.coreHashes || Array.isArray(metadata.coreHashes) || typeof metadata.coreHashes !== 'object') throw new Error('Invalid core hash inventory');
  const actual = collectCoreFiles(source);
  const declared = Object.keys(metadata.coreHashes).sort();
  if (JSON.stringify(actual) !== JSON.stringify(declared)) throw new Error('Shared package inventory differs from edition.json');
  for (const relative of actual) {
    if (!/^[a-f0-9]{64}$/.test(metadata.coreHashes[relative]) || sha256(path.join(source, ...relative.split('/'))) !== metadata.coreHashes[relative]) {
      throw new Error(`Shared package hash mismatch: ${relative}`);
    }
  }
  const entry = path.join(source, 'SKILL.md');
  if (fs.lstatSync(entry).isSymbolicLink() || sha256(entry) !== metadata.entrypointSha256) throw new Error('Host entrypoint hash mismatch');
  validateEntry(source, metadata.host, metadata.version, entry);
  return metadata;
}

export function buildEdition(host, destination, {source = SOURCE_ROOT} = {}) {
  if (!HOSTS.includes(host)) throw new Error(`Unknown edition host: ${host}`);
  const target = assertDisjoint(source, destination);
  if (exists(target)) throw new Error(`Existing installation preserved: ${target}`);
  const inputs = packageInputs(source);
  writePackage(source, target, host, inputs);
  return target;
}

export function buildEditions(output, {source = SOURCE_ROOT, overwrite = false} = {}) {
  const destination = assertDisjoint(source, output);
  if (exists(destination) && !fs.statSync(destination).isDirectory()) throw new Error('Output must be a directory');
  if (!overwrite && exists(destination) && fs.readdirSync(destination).length) throw new Error('Output is not empty; use --overwrite for known edition targets');
  const inputs = packageInputs(source);
  const targets = HOSTS.map(host => ({host, path: path.join(destination, `anything2video-${host}`)}));
  for (const target of targets) {
    assertDisjoint(source, target.path);
    if (overwrite) requireKnownDestination(target.path, target.host);
  }
  // Check every target before replacing any package; preserve unrelated output files.
  for (const target of targets) {
    const checked = assertDisjoint(source, target.path);
    if (!contains(destination, checked) || comparable(checked) !== comparable(target.path)) throw new Error(`Target escaped the named output directory: ${target.path}`);
    if (overwrite && exists(checked)) {
      requireKnownDestination(checked, target.host);
      fs.rmSync(checked, {recursive: true});
    }
    writePackage(source, checked, target.host, inputs);
  }
  return targets.map(target => target.path);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const overwrite = args.includes('--overwrite');
  const positional = args.filter(arg => arg !== '--overwrite');
  if (positional.length > 1 || positional.some(arg => arg.startsWith('--'))) throw new Error('Usage: node scripts/build-editions.mjs [output-directory] [--overwrite]');
  const output = positional[0] ?? path.join(path.dirname(SOURCE_ROOT), 'anything2video-editions');
  for (const target of buildEditions(output, {overwrite})) console.log(`Built verified edition at ${target}`);
}
