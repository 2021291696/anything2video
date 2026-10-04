import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

function version(command) {
  if (process.platform === 'win32' && command === 'npm') {
    const found = spawnSync('where.exe', ['npm.cmd'], {encoding: 'utf8'});
    const directories = [path.dirname(process.execPath), ...(found.stdout || '').split(/\r?\n/).filter(Boolean).map(file => path.dirname(file.trim()))];
    const cli = directories.map(dir => path.join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js')).find(file => fs.existsSync(file));
    if (!cli) return {status: 1, stderr: 'Cannot find npm-cli.js beside node/npm.cmd; verify npm installation'};
    return spawnSync(process.execPath, [cli, '--version'], {encoding: 'utf8'});
  }
  return spawnSync(command === 'node' ? process.execPath : command, [command.startsWith('ff') ? '-version' : '--version'], {encoding: 'utf8'});
}
const results = ['node', 'npm', 'ffmpeg', 'ffprobe', 'uv', 'git'].map(command => {
  const result = version(command);
  return {command, available: result.status === 0, version: (result.stdout || result.stderr || result.error?.message || '').split(/\r?\n/)[0]};
});
console.log(JSON.stringify({results, note: 'Provider credentials, browser readiness and application skill loading require separate checks.'}, null, 2));
process.exitCode = results.some(r => !r.available) ? 1 : 0;
