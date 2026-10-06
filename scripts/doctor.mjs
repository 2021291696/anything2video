import fs from 'node:fs';
import dns from 'node:dns';
import os from 'node:os';
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
// 图像通道为可选能力：只报告环境配置与首用决定，不影响退出码，不回显密钥值。
// 首用决定文件 ~/.anything2video/image-channel 记 provider（minimax/openai）或 none（用户选择不配），见统一合同「能力与授权」。
const missing = ['A2V_IMAGE_API_BASE', 'A2V_IMAGE_API_KEY', 'A2V_IMAGE_MODEL'].filter(name => !(process.env[name] || '').trim());
const decisionFile = path.join(os.homedir(), '.anything2video', 'image-channel');
const declared = fs.existsSync(decisionFile) ? fs.readFileSync(decisionFile, 'utf8').trim().toLowerCase() : '';
const known = ['minimax', 'openai'];
const envReady = missing.length === 0;
const imageChannel = {
  check: 'image-channel',
  available: envReady,
  declared,
  provider: envReady ? (process.env.A2V_IMAGE_PROVIDER || 'openai').trim().toLowerCase() : (known.includes(declared) ? declared : null),
  hint: envReady
    ? 'AI 世界底可 gen_world_frames.py --generate；可达性与余额在首次真实调用时验证（或 --probe-image 显式探测），欠费/鉴权失败会明确报错并给降级路线'
    : declared === 'none'
      ? `首用决定为不配置——不影响主链路；epic 世界底走程序材质、宿主生图或手工生成+--register。要启用：设 A2V_IMAGE_API_BASE/KEY/MODEL 三件套并把 ${decisionFile} 改为 provider 名`
      : known.includes(declared)
        ? `已声明 ${declared} 通道但环境变量缺失: ${missing.join(', ')}——补齐后重跑 doctor`
        : `missing ${missing.join(', ')}：首次使用时询问用户是否提供生图 key（只影响约 5%–10% 的 AI 材质画面，可不配，口径见统一合同「能力与授权」）；其余配方不受影响`,
};

// --probe-image：显式 opt-in 的真实探测（默认不跑，会产生 1 张图的生成计费）。
const probeEnabled = process.argv.includes('--probe-image');

// 与 template/scripts/gen_world_frames.py 的错误透传口径一致（统一合同「素材与参考片」）。
const HINTS = {
  401: 'API key 无效或未授权——核对 A2V_IMAGE_API_KEY 与该模型的生图权限',
  402: '通常是账户余额不足——充值后重跑，或走程序材质/手工生成+--register 降级路线',
  403: 'key 被拒——常见于欠费、无该模型权限或地区限制',
  404: '端点或模型名不对——核对 A2V_IMAGE_API_BASE 与 A2V_IMAGE_MODEL',
  429: '限流——稍后重试',
};
const hintFor = code => HINTS[code] ?? '上游通道错误——核对 BASE/MODEL/余额后重跑';

function isPrivateIp(ip) {
  if (ip.includes(':')) return ip === '::' || ip === '::1' || /^(f[cd]|fe[89ab])/i.test(ip);
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => Number.isNaN(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

async function assertSafeUrl(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error(`拒绝非 http(s) 通道地址: ${url}`);
  if (parsed.username || parsed.password) throw new Error('凭据不得出现在通道地址里');
  const records = await dns.promises.lookup(parsed.hostname, {all: true});
  for (const record of records) {
    if (isPrivateIp(record.address)) throw new Error(`拒绝内网/环回/保留通道地址: ${parsed.hostname} -> ${record.address}`);
  }
  return url;
}

async function probeImageChannel() {
  if (!envReady) {
    return {attempted: false, ok: false, detail: `未探测：环境变量缺失 ${missing.join(', ')}——先补齐三件套再 --probe-image`};
  }
  const provider = (process.env.A2V_IMAGE_PROVIDER || 'openai').trim().toLowerCase();
  const base = process.env.A2V_IMAGE_API_BASE.trim();
  const model = process.env.A2V_IMAGE_MODEL.trim();
  const endpoint = process.env.A2V_IMAGE_ENDPOINT || (provider === 'minimax' ? '/image_generation' : '/images/generations');
  const url = base.replace(/\/+$/, '') + endpoint;
  if (!known.includes(provider)) return {attempted: false, ok: false, detail: `未探测：provider 仅支持 openai / minimax，当前 ${provider}`};
  let safe;
  try {
    safe = await assertSafeUrl(url);
  } catch (error) {
    return {attempted: false, ok: false, detail: `未探测：${error.message}`};
  }
  const payload = provider === 'minimax'
    ? {model, prompt: 'connectivity probe, one flat gray square', response_format: 'url', watermark: false}
    : Object.assign({model, prompt: 'connectivity probe, one flat gray square', n: 1, size: '1024x1024'}, model.startsWith('dall-e') ? {response_format: 'b64_json'} : {});
  console.error(`⚠ --probe-image 将真实调用 ${provider} 生成 1 张图并计费：POST ${safe}`);
  try {
    const response = await fetch(safe, {
      method: 'POST',
      headers: {'Authorization': `Bearer ${process.env.A2V_IMAGE_API_KEY.trim()}`, 'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90000),
    });
    if (!response.ok) {
      let upstream = '';
      try { upstream = (await response.text()).replace(/\s+/g, ' ').trim().slice(0, 300); } catch {}
      return {attempted: true, ok: false, detail: `图像通道 HTTP ${response.status} ${response.statusText}：${hintFor(response.status)}${upstream ? ` 上游返回：${upstream}` : ''}`};
    }
    const data = await response.json();
    if (provider === 'minimax') {
      const baseResp = data.base_resp || {};
      if (baseResp.status_code === 0 && Array.isArray(data?.data?.image_urls) && data.data.image_urls.length) {
        return {attempted: true, ok: true, detail: '探测成功：通道可达、鉴权通过，余额足以完成一次生成'};
      }
      const msg = baseResp.status_msg || '无 status_msg';
      return {attempted: true, ok: false, detail: `MiniMax 图像通道失败 status_code=${baseResp.status_code} status_msg=${JSON.stringify(msg)}——提示余额/balance → 账户欠费：充值后重跑或降级程序材质；提示鉴权/invalid → 核对 A2V_IMAGE_API_KEY`};
    }
    const entry = Array.isArray(data?.data) ? data.data[0] : null;
    if (entry && (entry.b64_json || entry.url)) {
      return {attempted: true, ok: true, detail: '探测成功：通道可达、鉴权通过，返回了图像候选'};
    }
    return {attempted: true, ok: false, detail: '通道返回 2xx 但没有图像候选——核对 A2V_IMAGE_MODEL 是否为生图模型'};
  } catch (error) {
    const reason = error.name === 'TimeoutError' || error.name === 'AbortError' ? '请求超时（90s）' : (error.cause?.code || error.message);
    return {attempted: true, ok: false, detail: `探测请求失败：${reason}——检查网络/代理后重试`};
  }
}

const report = {results, imageChannel, note: 'Provider credentials, browser readiness and application skill loading require separate checks. image-channel reports env configuration and the first-use decision (provider name only, never the key); reachability is verified on first use.'};
if (probeEnabled) report.imageProbe = await probeImageChannel();
console.log(JSON.stringify(report, null, 2));
// 显式请求了探测却没跑成（缺 env/provider 非法/地址被拒/探测失败）→ 退出码红，便于脚本判断
const commandsBroken = results.some(result => !result.available);
process.exitCode = probeEnabled
  ? (report.imageProbe?.attempted && report.imageProbe.ok ? (commandsBroken ? 1 : 0) : 1)
  : (commandsBroken ? 1 : 0);
