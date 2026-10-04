import {spawnSync} from 'node:child_process';
const results = ['node', 'npm', 'ffmpeg', 'ffprobe', 'uv', 'git'].map(command => {
  const r = spawnSync(process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command, [command.startsWith('ff') ? '-version' : '--version'], {encoding: 'utf8', shell: process.platform === 'win32' && command === 'npm'});
  return {command, available: r.status === 0, version: (r.stdout || r.stderr || r.error?.message || '').split('\n')[0]};
});
console.log(JSON.stringify({results, note: 'Provider credentials, browser readiness and application skill loading require separate checks.'}, null, 2));
process.exitCode = results.some(r => !r.available) ? 1 : 0;
