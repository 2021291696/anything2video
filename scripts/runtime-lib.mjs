import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export const sha256File = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function isWithin(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

// Resolve existing ancestors as well, so a not-yet-created target cannot hide behind a junction.
export function resolvedPath(target) {
  const absolute = path.resolve(target);
  if (fs.existsSync(absolute)) return fs.realpathSync(absolute);
  try {if (fs.lstatSync(absolute).isSymbolicLink()) throw new Error(`Unresolved symlink: ${absolute}`);}
  catch (error) {if (error.code !== 'ENOENT') throw error;}
  const parent = path.dirname(absolute);
  if (parent === absolute) throw new Error(`Cannot resolve path: ${absolute}`);
  return path.join(resolvedPath(parent), path.basename(absolute));
}

export function projectFile(root, relative) {
  if (!nonempty(relative) || path.isAbsolute(relative)) throw new Error('Expected a relative project file');
  const base = fs.realpathSync(root);
  const lexical = path.resolve(base, relative);
  if (!isWithin(base, lexical) || lexical === base) throw new Error(`Outside project: ${relative}`);
  const actual = fs.realpathSync(lexical);
  if (!isWithin(base, actual) || !fs.statSync(actual).isFile()) throw new Error(`Missing/outside file: ${relative}`);
  return actual;
}

export function snapshotSources(root) {
  const base = fs.realpathSync(root);
  const hashes = {};
  const caches = /^(?:node_modules|\.venv|\.git|__pycache__|\.cache)$/;
  const rootOutputs = /^(?:\.mimosa|\.zcode|\.render-bundle(?:-.*)?|renders|stills|fin_frames|qc)$/;
  const ignored = relative => {
    const parts = relative.split(path.sep);
    if (parts.some(name => caches.test(name)) || /\.(?:pyc|log)$/.test(relative)) return true;
    if (rootOutputs.test(parts[0])) return true;
    return parts[0] === 'audio' && parts[1] === 'cache';
  };
  function visit(file, ancestors = new Set()) {
    const actual = fs.realpathSync(file);
    if (!isWithin(base, actual)) throw new Error(`Source escapes project: ${path.relative(base, file)}`);
    const stat = fs.statSync(actual);
    if (stat.isDirectory()) {
      if (ancestors.has(actual)) throw new Error(`Source symlink cycle: ${path.relative(base, file)}`);
      const next = new Set([...ancestors, actual]);
      for (const name of fs.readdirSync(file).sort()) {
        const child = path.join(file, name);
        if (!ignored(path.relative(base, child))) visit(child, next);
      }
    } else if (stat.isFile()) {
      hashes[path.relative(base, file).split(path.sep).join('/')] = sha256File(actual);
    }
  }
  // Root outputs are reserved; nested build/out names and custom source roots are real inputs.
  for (const name of fs.readdirSync(base).sort()) {
    const entry = path.join(base, name);
    if (!ignored(name)) visit(entry);
  }
  const storyboard = JSON.parse(fs.readFileSync(projectFile(base, 'script/storyboard.json'), 'utf8'));
  for (const shot of storyboard.shots ?? []) {
    const component = projectFile(base, shot.component);
    const key = path.relative(base, path.resolve(base, shot.component)).split(path.sep).join('/');
    if (!hashes[key]) {
      throw new Error(`Registered component is in a reserved output/cache location: ${path.relative(base, component)}`);
    }
  }
  return Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)));
}
