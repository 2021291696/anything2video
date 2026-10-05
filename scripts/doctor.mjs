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
// 图像通道为可选能力：只报告环境配置，不影响退出码，不回显密钥值。
const missing = ['A2V_IMAGE_API_BASE', 'A2V_IMAGE_API_KEY', 'A2V_IMAGE_MODEL'].filter(name => !(process.env[name] || '').trim());
const imageChannel = {
  check: 'image-channel',
  available: missing.length === 0,
  provider: missing.length === 0 ? (process.env.A2V_IMAGE_PROVIDER || 'openai').trim().toLowerCase() : null,
  hint: missing.length === 0
    ? 'AI 世界底可 gen_world_frames.py --generate；无通道时的降级路线见 recipes/epic.md'
    : `missing ${missing.join(', ')}：epic 世界底需宿主多模态或手工生成+--register，其余配方不受影响`,
};
console.log(JSON.stringify({results, imageChannel, note: 'Provider credentials, browser readiness and application skill loading require separate checks. image-channel reports env configuration only; reachability is verified on first use.'}, null, 2));
process.exitCode = results.some(r => !r.available) ? 1 : 0;
