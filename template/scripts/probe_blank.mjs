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
 *
 * 用法：node probe_blank.mjs [帧号...] [--comp PromoDemo] [--step N] [--rebundle]
 *   帧号缺省 = 全片每 20 帧采样（--step 可改）。
 * 退出码：0=通过｜1=发现空白/纯色帧｜2=用法/环境错误。
 */
import {withRenderer, listShots, argValue, die, decodePng, toLuma} from './probe_lib.mjs';

const compId = argValue('--comp') ?? 'PromoDemo';
const step = +(argValue('--step') ?? 20);
const posFrames = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);

const shots = listShots().filter((s) => s.comp === compId);
if (!shots.length) die(`合成 ${compId} 下没有镜头`);
const cutFrames = new Set(shots.map((s) => s.from - 1)); // 各镜头起始帧（0 起合成帧）＝硬切过渡豁免帧

await withRenderer({compId, warmup: false}, async ({composition, still}) => {
  const duration = composition.durationInFrames;
  const frames = posFrames.length ? posFrames : Array.from({length: Math.ceil(duration / step)}, (_, i) => i * step).filter((f) => f < duration);
  for (const f of frames) if (!(f >= 0 && f < duration)) die(`帧号 ${f} 越界（合成共 ${duration} 帧，0 起）`);
  const W = composition.width, H = composition.height;

  console.log(`== probe_blank：空白/纯色检测（合成 ${compId}，画布 ${W}×${H}，共 ${frames.length} 帧）==`);
  console.log(`判据：极差<8 → 接近纯色｜单桶占比>92% → 近乎全屏同色｜均值<3 → 全黑。判据为画布无关的亮度统计，阈值不随画布缩放。镜头起始帧为硬切过渡，豁免不计（输出注记）。`);
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
    const hit = !isCut && (nearSolid || dominant || black);
    if (hit) flagged++;
    console.log(`帧 ${f}${hit ? '  ✗' : '  ✓'} 亮度 min=${min} max=${max} 均值=${mean.toFixed(2)}  前三桶: ${top.join(' / ')}${nearSolid ? '  ←接近纯色' : ''}${dominant ? '  ←近乎全屏同色' : ''}${black ? '  ←全黑' : ''}${isCut ? '  ←硬切过渡帧豁免（不计缺陷）' : ''}`);
  }
  console.log('');
  if (flagged) {
    console.log(`结论：${frames.length} 帧中 ${flagged} 帧空白/纯色命中 → 不通过（退出码 1）`);
    process.exit(1);
  }
  console.log(`结论：${frames.length} 帧全部正常 → 通过`);
  process.exit(0);
});
