/**
 * 探针共用库（probe_*.mjs 专用，不属于模板构建链）。
 * - 路径全部从 import.meta.url 解析，不依赖调用方 cwd；渲染前显式 chdir 到 template/。
 * - 最小 PNG 解码器：8-bit、非隔行、色型 0/2/3/4/6（Chrome Headless 截图为 8-bit RGBA），zlib.inflateSync + 反滤波。
 * - 镜头表：静态解析 src/shots/**（promo/Demo.tsx 的拍结构 + SHOTS_* 字面量）。
 * - 渲染器：单进程内 bundle 一次 + openBrowser 一次 + renderStill 循环出帧（复用 HeadlessBrowser 实例）。
 * 中间产物只写 template/scripts/.probe-tmp/。
 */
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import zlib from 'node:zlib';

export const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const TEMPLATE_ROOT = path.resolve(SCRIPTS_DIR, '..');
export const TMP_DIR = path.join(SCRIPTS_DIR, '.probe-tmp');
export const BUNDLE_DIR = path.join(TMP_DIR, 'bundle');

const require = createRequire(import.meta.url);

/** 环境错误：退出码 2 */
export function die(msg, code = 2) {
  console.error(`[探针环境错误·退出码${code}] ${msg}`);
  process.exit(code);
}

// ---------------- 最小 PNG 解码器 ----------------
export function decodePng(buf) {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) die('decodePng: 不是 PNG 文件');
  let pos = 8, w = 0, h = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  const plte = [];
  let trns = null;
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'PLTE') {
      for (let i = 0; i + 2 < len; i += 3) plte.push([data[i], data[i + 1], data[i + 2]]);
    } else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (!w || !h) die('decodePng: 缺 IHDR');
  if (bitDepth !== 8) die(`decodePng: 位深 ${bitDepth} 不支持（仅实现 8-bit）`);
  if (interlace !== 0) die('decodePng: 隔行 PNG 不支持');
  const ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[colorType];
  if (!ch) die(`decodePng: 色型 ${colorType} 不支持`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.allocUnsafe(w * h * 4);
  let prev = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const cur = Buffer.from(raw.subarray(p, p + stride));
    p += stride;
    if (cur.length < stride) die('decodePng: IDAT 数据不足');
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev[x];
      const c = x >= ch ? prev[x - ch] : 0;
      let v = cur[x];
      if (filter === 1) v = (v + a) & 255;
      else if (filter === 2) v = (v + b) & 255;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      cur[x] = v;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, s = x * ch;
      let r, g, b2, al = 255;
      if (colorType === 6) { r = cur[s]; g = cur[s + 1]; b2 = cur[s + 2]; al = cur[s + 3]; }
      else if (colorType === 2) { r = cur[s]; g = cur[s + 1]; b2 = cur[s + 2]; }
      else if (colorType === 4) { r = g = b2 = cur[s]; al = cur[s + 1]; }
      else if (colorType === 0) { r = g = b2 = cur[s]; }
      else {
        const px = plte[cur[s]];
        if (!px) die('decodePng: 调色板索引越界');
        [r, g, b2] = px;
        if (trns && trns[cur[s]] !== undefined) al = trns[cur[s]];
      }
      out[o] = r; out[o + 1] = g; out[o + 2] = b2; out[o + 3] = al;
    }
    prev = cur;
  }
  return {width: w, height: h, rgba: out};
}

/** RGBA → 亮度（Rec.709，0–255），Float32Array 长度 w*h */
export function toLuma(rgba, w, h) {
  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
    lum[i] = 0.2126 * rgba[p] + 0.7152 * rgba[p + 1] + 0.0722 * rgba[p + 2];
  }
  return lum;
}

/** 两帧平均绝对亮度差（0–255 量纲） */
export function madLuma(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

// ---------------- 镜头表（静态解析 src/shots/**） ----------------
function walkFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** 极简常量表达式求值：数字与 + - * / ( )；NAME[i] 从同文件 `const NAME = [a, b, ...]` 解析。失败返回 null。 */
function evalConst(expr, fileConsts) {
  const src = String(expr).replace(/([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]/g, (_, name, idx) => {
    const arr = fileConsts.get(name);
    return arr && arr[+idx] !== undefined ? String(arr[+idx]) : 'NaN';
  });
  if (!/^[\d\s+\-*/().]+$/.test(src)) return null;
  try {
    const v = Function(`"use strict";return (${src})`)();
    return Number.isFinite(v) ? Math.round(v) : null;
  } catch { return null; }
}

/**
 * 镜头表：
 * 1) promo/Demo.tsx 的拍结构（BEAT_LEN × BEATS 数组）→ comp='PromoDemo'，id=beat1..beatN，from/to 为 PromoDemo 全片 1 起帧号；
 * 2) shots/** 内 `SHOTS_*: ShotDef[] = [...]` 的数字字面量条目 → comp='Video'（G1–G8 在模板里为空占位）。
 * 每条：{id, from, to, comp, file, line, compName}
 */
export function listShots() {
  const shotsDir = path.join(TEMPLATE_ROOT, 'src', 'shots');
  if (!fs.existsSync(shotsDir)) die(`镜头目录不存在: ${shotsDir}`);
  const shots = [];
  for (const f of walkFiles(shotsDir)) {
    const rel = path.relative(TEMPLATE_ROOT, f).replaceAll('\\', '/');
    const src = fs.readFileSync(f, 'utf8');
    // --- 2) SHOTS_* 字面量（需配合同文件数字常量解析 from/to）---
    const consts = new Map();
    for (const m of src.matchAll(/const\s+([A-Za-z_]\w*)\s*=\s*\[\s*([\d\s,]+?)\s*\]/g)) {
      consts.set(m[1], m[2].split(',').map((s) => +s.trim()));
    }
    for (const m of src.matchAll(/SHOTS_\w+\s*:\s*ShotDef\[\]\s*=\s*\[([\s\S]*?)\]/g)) {
      for (const e of m[1].matchAll(/id:\s*'([^']+)'\s*,\s*from:\s*([^,]+),\s*to:\s*([^,]+)/g)) {
        const line = src.slice(0, e.index).split('\n').length;
        const from = evalConst(e[2], consts), to = evalConst(e[3], consts);
        if (from === null || to === null || !(from >= 1 && to >= from)) {
          console.error(`[probe_lib] 跳过无法静态求值的镜头定义: ${rel}:${line} (${e[1]})`);
          continue;
        }
        shots.push({id: e[1], from, to, comp: 'Video', file: rel, line, compName: e[1]});
      }
    }
    // --- 1) Demo.tsx 拍结构 ---
    if (rel.endsWith('shots/promo/Demo.tsx')) {
      const beatLen = +(/export\s+const\s+BEAT_LEN\s*=\s*(\d+)/.exec(src)?.[1] ?? NaN);
      const beatCount = +(/export\s+const\s+PROMO_DEMO_FRAMES\s*=\s*BEAT_LEN\s*\*\s*(\d+)/.exec(src)?.[1] ?? NaN);
      const arrRaw = /const\s+BEATS[^=]*=\s*\[([^\]]+)\]/.exec(src)?.[1];
      if (!Number.isFinite(beatLen) || !Number.isFinite(beatCount) || !arrRaw) {
        die('解析 Demo.tsx 的 BEAT_LEN / PROMO_DEMO_FRAMES / BEATS 失败');
      }
      const names = arrRaw.split(',').map((s) => s.trim()).filter(Boolean);
      if (names.length !== beatCount) {
        die(`Demo.tsx BEATS 组件数(${names.length}) 与 PROMO_DEMO_FRAMES 的拍数(${beatCount}) 不一致`);
      }
      names.forEach((name, i) => {
        const anchor = src.indexOf(`const ${name}:`);
        const line = anchor >= 0 ? src.slice(0, anchor).split('\n').length : 0;
        shots.push({id: `beat${i + 1}`, from: i * beatLen + 1, to: (i + 1) * beatLen, comp: 'PromoDemo', file: rel, line, compName: name});
      });
    }
  }
  return shots;
}

// ---------------- 渲染器（单进程复用） ----------------
function freshBundle(bundleDir = BUNDLE_DIR) {
  const {bundle} = require(path.join(TEMPLATE_ROOT, 'node_modules', '@remotion', 'bundler'));
  fs.rmSync(bundleDir, {recursive: true, force: true});
  console.error(`[probe_lib] 开始打包（enableCaching=false，产物写 ${bundleDir}）…`);
  return bundle({
    entryPoint: path.join(TEMPLATE_ROOT, 'src', 'index.ts'),
    outDir: bundleDir,
    enableCaching: false,
    webpackOverride: (c) => c,
    onProgress: () => {},
  }).then((r) => {
    fs.writeFileSync(path.join(bundleDir, '.src_ok'), String(Date.now()));
    return r;
  });
}

// ---------------- bundle 新鲜度（全 src 树 + 根配置 vs .src_ok 戳） ----------------
function walkSrcFiles(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, {withFileTypes: true}); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkSrcFiles(p, out);
    else if (/\.(tsx?|jsx?|css|json)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** bundleDir 是否过期：无 .src_ok 戳，或 src/** 与根配置里有文件比戳新（任一镜头文件改动都算，不只 index.ts） */
export function bundleIsStale(bundleDir = BUNDLE_DIR) {
  try {
    const stamp = fs.statSync(path.join(bundleDir, '.src_ok')).mtimeMs;
    let newest = 0;
    for (const f of walkSrcFiles(path.join(TEMPLATE_ROOT, 'src'))) newest = Math.max(newest, fs.statSync(f).mtimeMs);
    for (const f of ['package.json', 'tsconfig.json']) {
      try { newest = Math.max(newest, fs.statSync(path.join(TEMPLATE_ROOT, f)).mtimeMs); } catch { /* 根配置缺失不参与判定 */ }
    }
    return newest > stamp;
  } catch { return true; }
}

/**
 * 打开渲染器并在 fn({composition, still}) 内循环出帧；离开时关闭浏览器。
 * - 显式 process.chdir(TEMPLATE_ROOT)（渲染命令依赖 template/ 的 package.json/public）。
 * - bundle 复用：bundleDir（默认 .probe-tmp/bundle，可传 build_dev_<tag>）带 .src_ok 戳且不旧于 src/** 与根配置则跳过打包；--rebundle 强制重打。
 * - warmup=true 时先渲第 0 帧一次并丢弃计时（首帧含字体/脚本冷加载，不具代表性）。
 * still(frame) frame 为 0 起合成帧，返回 {ms, buffer(PNG)}。
 */
export async function withRenderer({compId = 'PromoDemo', warmup = true, bundleDir = BUNDLE_DIR}, fn) {
  process.chdir(TEMPLATE_ROOT);
  fs.mkdirSync(TMP_DIR, {recursive: true});
  if (process.argv.includes('--rebundle') || bundleIsStale(bundleDir)) await freshBundle(bundleDir);
  else console.error(`[probe_lib] 复用既有 bundle: ${bundleDir}`);
  const {selectComposition, openBrowser, renderStill} =
    require(path.join(TEMPLATE_ROOT, 'node_modules', '@remotion', 'renderer'));
  // BROWSER_EXECUTABLE 可指向本机已装 Chrome，跳过 remotion 的 chrome-headless-shell 下载（新项目首次下载 ~270MB，国内网络易永久停滞）；不设该 env 行为不变。
  const browser = await openBrowser('chrome', {browserExecutable: process.env.BROWSER_EXECUTABLE || null});
  try {
    const composition = await selectComposition({
      serveUrl: bundleDir, id: compId, puppeteerInstance: browser, logLevel: 'error',
    });
    const still = async (frame) => {
      const t0 = performance.now();
      const {buffer} = await renderStill({
        composition, serveUrl: bundleDir, frame, puppeteerInstance: browser, logLevel: 'error',
      });
      return {ms: performance.now() - t0, buffer};
    };
    if (warmup) {
      const w = await still(0);
      console.error(`[probe_lib] 预热帧(0) ${w.ms.toFixed(0)}ms（不计入统计）`);
    }
    return await fn({composition, still});
  } finally {
    // browser.close() 在 Windows 上偶发不返回：5s 超时兜底，探针自身以显式 process.exit 收尾
    try {
      await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
    } catch { /* 忽略关闭异常 */ }
  }
}

// ---------------- 小工具 ----------------
/** 解析 --key value / --key=value 形式的参数 */
export function argValue(flag) {
  const a = process.argv;
  const i = a.indexOf(flag);
  if (i >= 0) return a[i + 1] ?? null;
  const pfx = a.find((s) => s.startsWith(flag + '='));
  return pfx ? pfx.slice(flag.length + 1) : null;
}
export function hasFlag(flag) {
  return process.argv.includes(flag);
}
