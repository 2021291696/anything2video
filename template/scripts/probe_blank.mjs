#!/usr/bin/env node
/**
 * probe_blank.mjs —— 空白/纯色检测（动态渲染）。
 *
 * 对给定帧（0 起合成帧）计算亮度直方图（256 桶，桶宽 1）：
 *  - 亮度极差 max-min < 8        → 「接近纯色」；
 *  - 单一亮度桶占比 > 92%        → 「近乎全屏同色」；
 *  - 平均亮度 < 3                → 「全黑」。
 * 任一命中 → 退出码 1。每帧输出：亮度 min..max、均值、前三占比桶。
 * 硬切过渡豁免：每个镜头的起始帧（shot.from 为 1 起帧号，对应 0 起合成帧 from-1）是设计内的硬切落点——
 * 前镜末帧已归零（style-guide §硬边界）、本镜内容自 f0≥2 才入场，该帧近乎空场属过渡瞬间而非「渲染没生效」
 * （A5 缺陷的定义是渲染管线静默失败产出的纯色帧，会命中边界后的所有采样帧）。只豁免边界当帧并输出注记，
 * 边界后的采样帧照判，真整段空场/纯色仍然退 1。
 * 设计内黑场豁免：--ignore-range f1-f2（可多次）把片头起渲黑场/片尾压黑段等设计内黑场（lessons：val-sand
 * f1600–1680、val-blueprint f1640/f1660、val-chalk f1680 均 QC 立豁免存照）标注为「设计内豁免」而非缺陷，
 * 不计入退出码；区间外的命中照判。
 * bundle 新鲜度告警：启动时若 scripts/.probe-tmp 的 bundle 比源码旧（且非首次运行），打印「bundle 过期，建议删除重跑」
 * 警告（lessons：假红=旧 bundle；withRenderer 本身会自动重打，此警告供人工留痕与人工清理参考）。
 *
 * 用法：node probe_blank.mjs [帧号...] [--comp PromoDemo] [--step N] [--ignore-range f1-f2]... [--rebundle]
 *   帧号缺省 = 全片每 20 帧采样（--step 可改）。
 * 退出码：0=通过｜1=发现空白/纯色帧｜2=用法/环境错误。
 */
import fs from 'node:fs';
import {withRenderer, listShots, argValue, die, decodePng, toLuma, BUNDLE_DIR, bundleIsStale} from './probe_lib.mjs';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`用法：node probe_blank.mjs [帧号...] [--comp PromoDemo] [--step N] [--ignore-range f1-f2]... [--rebundle]
  --comp <id>                合成 id（默认 PromoDemo；正片传 Video）
  --step <N>                 全片采样步长（默认 20 帧；帧号缺省时生效）
  [帧号...]                  只测这些帧（0 起合成帧，空格分隔）
  --ignore-range <f1-f2>     设计内黑场豁免区间（0 起合成帧，可多次；单帧号也收）——命中标注「设计内豁免」不计缺陷
  --rebundle                 强制重打 bundle`);
  process.exit(0);
}

const compId = argValue('--comp') ?? 'PromoDemo';
const step = +(argValue('--step') ?? 20);

// 位置帧号收集：跳过带值参数的值（--comp/--step/--ignore-range 的空格形式值不误当帧号；= 形式无独立值；裸数字才算位置帧号）
const VALUED_FLAGS = new Set(['--comp', '--step', '--ignore-range']);
const posFrames = [];
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) {
    if (VALUED_FLAGS.has(a.split('=')[0]) && !a.includes('=')) i++;
    continue;
  }
  if (/^\d+$/.test(a)) posFrames.push(+a);
}

// --ignore-range f1-f2（可多次，也收 --ignore-range=... 与单帧号 f1）
const ignoreRanges = [];
for (let i = 2; i < process.argv.length; i++) {
  let v = null;
  if (process.argv[i] === '--ignore-range') v = process.argv[i + 1];
  else if (process.argv[i].startsWith('--ignore-range=')) v = process.argv[i].slice('--ignore-range='.length);
  if (v == null) continue;
  const m = /^(\d+)(?:[-–](\d+))?$/.exec(v.trim());
  if (!m) die(`--ignore-range 需为 f1-f2 或单帧号（收到: ${v}）`);
  const lo = +m[1], hi = m[2] ? +m[2] : lo;
  if (hi < lo) die(`--ignore-range 区间起止颠倒: ${v}`);
  ignoreRanges.push([lo, hi]);
  if (process.argv[i] === '--ignore-range') i++; // 跳过值，避免下一个循环误读
}
const inIgnore = (f) => ignoreRanges.some(([lo, hi]) => f >= lo && f <= hi);

const shots = listShots().filter((s) => s.comp === compId);
if (!shots.length) die(`合成 ${compId} 下没有镜头`);
const cutFrames = new Set(shots.map((s) => s.from - 1)); // 各镜头起始帧（0 起合成帧）＝硬切过渡豁免帧

// bundle 新鲜度告警（lessons：假红=旧 bundle）：仅当已有 bundle 且比源码旧时提醒；首次运行无 bundle 不告警
let staleBundle = false;
try {
  fs.statSync(BUNDLE_DIR); // bundle 目录存在（首次运行不算「旧」）
  staleBundle = bundleIsStale(BUNDLE_DIR);
} catch { /* 无 bundle：首次运行，withRenderer 会新打 */ }
if (staleBundle) console.error('[probe_blank] 警告：scripts/.probe-tmp 的 bundle 比源码旧——bundle 过期，建议删除重跑（lessons：假红=旧 bundle；本探针将自动重打）。');

await withRenderer({compId, warmup: false}, async ({composition, still}) => {
  const duration = composition.durationInFrames;
  const frames = posFrames.length ? posFrames : Array.from({length: Math.ceil(duration / step)}, (_, i) => i * step).filter((f) => f < duration);
  for (const f of frames) if (!(f >= 0 && f < duration)) die(`帧号 ${f} 越界（合成共 ${duration} 帧，0 起）`);
  const W = composition.width, H = composition.height;

  console.log(`== probe_blank：空白/纯色检测（合成 ${compId}，画布 ${W}×${H}，共 ${frames.length} 帧）==`);
  console.log(`判据：极差<8 → 接近纯色｜单桶占比>92% → 近乎全屏同色｜均值<3 → 全黑。判据为画布无关的亮度统计，阈值不随画布缩放。镜头起始帧为硬切过渡，豁免不计（输出注记）。${ignoreRanges.length ? `设计内豁免区间: ${ignoreRanges.map(([lo, hi]) => (lo === hi ? lo : `${lo}-${hi}`)).join(', ')}（--ignore-range）。` : ''}`);
  console.log('');
  let flagged = 0;
  for (const f of frames) {
    const {buffer} = await still(f);
    const {rgba} = decodePng(buffer);
    const lum = toLuma(rgba, W, H);
    const hist = new Float64Array(256);
    let sum = 0;
    for (let i = 0; i < lum.length; i++) { hist[Math.min(255, Math.round(lum[i]))]++; sum += lum[i]; }
    let min = -1, max = -1;
    for (let b = 0; b < 256; b++) if (hist[b] > 0) { if (min < 0) min = b; max = b; }
    const mean = sum / lum.length;
    const top = [...hist.keys()].sort((a, b) => hist[b] - hist[a]).slice(0, 3)
      .map((b) => `亮度${b}(${(100 * hist[b] / lum.length).toFixed(1)}%)`);
    const nearSolid = max - min < 8;
    const dominant = 100 * Math.max(...hist) / lum.length > 92;
    const black = mean < 3;
    const isCut = cutFrames.has(f); // 硬切过渡帧：设计内过渡瞬间，不计缺陷（见文件头注释）
    const rawHit = nearSolid || dominant || black;
    const ignored = !isCut && rawHit && inIgnore(f); // 设计内黑场（片头起渲黑场/片尾压黑段）：标注豁免不计缺陷
    const hit = !isCut && rawHit && !inIgnore(f);
    if (hit) flagged++;
    console.log(`帧 ${f}${hit ? '  ✗' : '  ✓'} 亮度 min=${min} max=${max} 均值=${mean.toFixed(2)}  前三桶: ${top.join(' / ')}${nearSolid ? '  ←接近纯色' : ''}${dominant ? '  ←近乎全屏同色' : ''}${black ? '  ←全黑' : ''}${isCut ? '  ←硬切过渡帧豁免（不计缺陷）' : ''}${ignored ? '  ←设计内豁免（--ignore-range，不计缺陷）' : ''}`);
  }
  console.log('');
  if (flagged) {
    console.log(`结论：${frames.length} 帧中 ${flagged} 帧空白/纯色命中 → 不通过（退出码 1）`);
    process.exit(1);
  }
  console.log(`结论：${frames.length} 帧全部正常 → 通过`);
  process.exit(0);
});
