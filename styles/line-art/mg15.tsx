// 字形描线标题 WriteOnText / 线辉光 GlowLine / 手绘抖动 WobbleStroke：技法借鉴 mg-styles-15 demos/02-line-art (MIT, Vincentwei1021), TSX 重写
import React from 'react';
import {clamp01} from '../common';
import {LA, LINE_W} from './kit';

/**
 * line-art v4.0 opt-in 技法增补（mg 02-line-art 移植；默认全关——本文件不被 kit.tsx /
 * extra.tsx 引用， kit 现有任何导出与默认输出零改动）。
 *
 * 三件（RECON-mg15 §02 裁决均为 opt-in）：
 *  1. WriteOnText 字形描线标题（源 film.js:462-543）：逐笔共享速度 + 起笔统一左上 + 闭合
 *     内 flood 金渐变 + 收束一次 flare。**降级声明**：源用 opentype 预导出字形轮廓
 *     （v5_title.json），本卡无字体轮廓数据且不引字体解析依赖（卡纪律：无 staticFile），
 *     故降级为「逐字符 clip-reveal + 笔锋光点近似 + 内 flood」——字符宽按 CJK≈size /
 *     latin≈0.55size 估宽，reveal 前沿即笔锋位。要在具体工程里升级为真轮廓描线，
 *     用 opentype.js 离线导出轮廓 JSON 后按逐笔 dash 揭示重写本组件即可。
 *  2. GlowLine 线辉光（源 film.js:593-597 双层 screen 合成）：SVG 双 feGaussianBlur
 *     （blur16@α0.2 + blur3@α0.3）+ 原色层 feMerge——参数照抄，合成由 screen 改 alpha
 *     over（SVG 单滤镜等价近似，SPEC 注明）。
 *  3. WobbleStroke 手绘抖动（源 film.js:115-127）：vnoise 噪声位移，幅度按段配置经
 *     41 点（步 4）box 平滑，垂直于局部切向偏移；直线感是现卡「蓝图感」，默认不接。
 */

// ---- vnoise（源 film.js:35-36 机制重写）：LAT 查找表 + smoothstep 插值 ----
const mulberry = (seed: number) => (): number => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rngN = mulberry(20260927); // 源 seed 照抄
const LAT: number[] = Array.from({length: 4096}, () => rngN() * 2 - 1);
/** 确定性 1D 值噪声 ∈[-1,1]（格点线性插值 + smoothstep）。 */
export const vnoise = (x: number): number => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = LAT[((i % 4096) + 4096) % 4096];
  const b = LAT[(((i + 1) % 4096) + 4096) % 4096];
  return a + (b - a) * u;
};

// ==================================================================
// WobbleStroke 手绘抖动（opt-in；默认描线 = 尺规直线，不受影响）
// ==================================================================
export type Pt = [number, number];

const densify = (pts: Pt[], step: number): {p: Pt; seg: number; s: number}[] => {
  const out: {p: Pt; seg: number; s: number}[] = [];
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const L = Math.hypot(bx - ax, by - ay);
      if (L === 0) continue;
      const n = Math.max(1, Math.round(L / step));
      for (let k = 1; k <= n; k++) {
        out.push({p: [ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n], seg: i - 1, s: s + (L * k) / n});
      }
      s += L;
    } else {
      out.push({p: pts[0], seg: 0, s: 0});
    }
  }
  return out;
};

/**
 * 折线手绘抖动（源 film.js:115-127 机制重写）：稠密采样 → 逐样本幅度（amps 单值=全线
 * 一档 / 数组=按输入段）→ box 平滑（窗 ±40 样本、步 4，源参数）→ 垂直切向位移
 * w = AMP·(0.75·vnoise(S/17) + 0.45·vnoise(S/5.5+300))（源公式照抄）。
 * 返回抖动后的稠密点列（首尾点保留原位，防端点漂移）。
 */
export const wobblePts = (
  pts: Pt[],
  opts: {seed?: number; amps?: number | readonly number[]; step?: number} = {},
): Pt[] => {
  const step = opts.step ?? 4; // 与 kit 的 LA_STEP 同步（4px 采样，σ 物理宽度不变）
  const base = opts.seed ?? 0;
  const dense = densify(pts, step);
  const n = dense.length;
  if (n < 3) return pts;
  const amps = opts.amps ?? 2.2; // 默认幅度≈手绘铅笔微颤档（源各段 a=1.5-3px 带内）
  const AMP = dense.map((d) => (Array.isArray(amps) ? (amps[Math.min(d.seg, amps.length - 1)] ?? 0) : amps));
  {
    // box 平滑：窗 R=40、步 4（源参数照抄）
    const tmp = AMP.slice();
    for (let i = 0; i < n; i++) {
      let acc = 0;
      let c = 0;
      for (let k = -40; k <= 40; k += 4) {
        const j = Math.min(n - 1, Math.max(0, i + k));
        acc += tmp[j];
        c++;
      }
      AMP[i] = acc / c;
    }
  }
  return dense.map((d, i) => {
    const a = Math.max(0, i - 2);
    const b = Math.min(n - 1, i + 2);
    let tx = dense[b].p[0] - dense[a].p[0];
    let ty = dense[b].p[1] - dense[a].p[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const ph = base * 37.7;
    const w = AMP[i] * (0.75 * vnoise(d.s / 17 + ph) + 0.45 * vnoise(d.s / 5.5 + 300 + ph));
    if (i === 0 || i === n - 1) return d.p; // 端点钉住（段表续接点不错位）
    return [d.p[0] - ty * w, d.p[1] + tx * w] as Pt;
  });
};

const toD = (pts: Pt[]): string => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');

/** WobbleStroke：手绘抖动描线（opt-in）。几何 = wobblePts(pts)，描边纪律与主笔画一致
 *  （恒线宽 LINE_W、round cap/join）；progress∈[0,1] 可选 dash 揭示（配 drawnAt 用）。 */
export const WobbleStroke: React.FC<{
  pts: Pt[];
  amps?: number | readonly number[];
  seed?: number;
  color?: string;
  width?: number;
  opacity?: number;
  progress?: number;
}> = ({pts, amps, seed = 0, color = LA.ink, width = LINE_W, opacity = 1, progress = 1}) => {
  const c = wobblePts(pts, {seed, amps}); // 纯函数逐帧同步计算（无状态，可 seek）
  const d = toD(progress >= 1 ? c : c.slice(0, Math.max(2, Math.round(c.length * clamp01(progress)))));
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />
  );
};

// ==================================================================
// GlowLine 线辉光（opt-in；源 film.js:593-597 blur16@0.2 + blur3@0.3 + 原色层）
// ==================================================================
let glowSeq = 0;

/** 线辉光组：children 内的 stroke 图元整体获得「远晕 16px@0.2 + 近晕 3px@0.3 + 原色层」
 *  三层合成（源双层 screen 合成的 SVG 滤镜等价实现，参数照抄）。id 供多实例复用。 */
export const GlowLine: React.FC<{id?: string; children: React.ReactNode; filterId?: string}> = ({children, filterId}) => {
  const idRef = React.useRef<string>('');
  if (!idRef.current) idRef.current = filterId ?? `la-glow-${++glowSeq}`;
  return (
    <g filter={`url(#${idRef.current})`}>
      <filter id={idRef.current} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="b16" />
        <feComponentTransfer in="b16" result="g16">
          <feFuncA type="linear" slope="0.2" intercept="0" />
        </feComponentTransfer>
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b3" />
        <feComponentTransfer in="b3" result="g3">
          <feFuncA type="linear" slope="0.3" intercept="0" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="g16" />
          <feMergeNode in="g3" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {children}
    </g>
  );
};

// ==================================================================
// WriteOnText 字形描线标题（opt-in；降级实现，见文件头降级声明）
// ==================================================================
const charW = (ch: string, size: number): number => (/[\x00-\xff]/.test(ch) ? 0.55 : 1.0) * size;

/**
 * WriteOnText：逐字符 clip-reveal 描线标题 + 笔锋光点 + 闭合内 flood（源 film.js:462-543
 * 参数照抄：stagger 0.08s、dur 0.56s、floodIn 0.06s、flood 0.26s、fill 0.36、flare 高斯
 * σ=0.1s 滞后 0.04s）。字符从左到右揭示（起笔统一左上语义的降级近似），reveal 前沿挂
 * 笔锋光点（金晕 r16/r8 + 墨点 r3，与 PenTip 同构）；字符闭合前 floodIn 起金渐变内 flood
 * （flood 色 = LA.gold 系），全题收束一次 flare 提亮 flood。
 */
export const WriteOnText: React.FC<{
  N: number; // 绝对帧
  fps: number;
  at: number; // 开写帧
  text: string;
  x: number; // 整题左上角
  y: number;
  size: number;
  color?: string; // 描线色（默认墨）
  floodColor?: string; // 内 flood 金（默认 LA.gold）
  fill?: number; // flood 落定 α（源 TT.fill=0.36）
  staggerF?: number; // 字符错帧（帧；源 0.08s）
  durF?: number; // 单字时长（帧；源 0.56s）
  pen?: boolean; // 笔锋光点（默认开）
  fontFamily?: string;
  weight?: number;
  letterSpacing?: number;
  gid?: string;
}> = ({
  N, fps, at, text, x, y, size,
  color = LA.ink, floodColor = LA.gold, fill = 0.36,
  staggerF, durF, pen = true,
  fontFamily = "'Noto Serif SC', serif", weight = 600, letterSpacing = 6,
}) => {
  const STAG = staggerF ?? Math.round(0.08 * fps);
  const DUR = durF ?? Math.round(0.56 * fps);
  const FLOOD_IN = Math.max(1, Math.round(0.06 * fps)); // 源 floodIn=0.06s
  const FLOOD = Math.max(1, Math.round(0.26 * fps)); // 源 flood=0.26s
  const idRef = React.useRef<string>('');
  if (!idRef.current) idRef.current = `la-wot-${Math.round(x)}-${Math.round(y)}-${text.length}`;
  const chars = Array.from(text);
  const widths = chars.map((ch) => charW(ch, size) + letterSpacing);
  const totalW = widths.reduce((a, b) => a + b, 0);
  const endT = at + (chars.length - 1) * STAG + DUR;
  // 全题 flare（源 flash = 0.5·exp(−((t−end−0.04)/0.1)²)，帧域换算）
  const dtF = (N - endT - 0.04 * fps) / (0.1 * fps);
  const flash = 0.5 * Math.exp(-(dtF * dtF));
  const floodA = fill * (1 + 0.6 * flash);
  const easeOut = (u: number): number => 1 - Math.pow(1 - clamp01(u), 3);
  return (
    <svg width={1280} height={720} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs>
        <linearGradient id={`${idRef.current}-flood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={floodColor} stopOpacity={floodA} />
          <stop offset="1" stopColor={floodColor} stopOpacity={floodA * 0.82} />
        </linearGradient>
        {chars.map((_, i) => {
          const t0 = at + i * STAG;
          const u = clamp01((N - t0) / DUR);
          const left = widths.slice(0, i).reduce((a, b) => a + b, 0);
          return (
            <clipPath key={i} id={`${idRef.current}-c${i}`}>
              <rect x={x + left - 2} y={y - size * 0.3} width={Math.max(0, u * (widths[i] + 2))} height={size * 1.6} />
            </clipPath>
          );
        })}
      </defs>
      {chars.map((ch, i) => {
        const t0 = at + i * STAG;
        const u = clamp01((N - t0) / DUR);
        if (u <= 0) return null;
        const left = widths.slice(0, i).reduce((a, b) => a + b, 0);
        const cx = x + left;
        // 闭合内 flood：源 u = (t − (t0+dur−floodIn)) / flood，easeOut 后由描边宽度 80e 内收
        // （clip 内加粗描边）；降级为整字 flood 色 α 渐显（e=1 时停在 fill 档）。
        const fu = clamp01((N - (t0 + DUR - FLOOD_IN)) / FLOOD);
        return (
          <g key={i}>
            <g clipPath={`url(#${idRef.current}-c${i})`}>
              <text x={cx} y={y + size} fill={color} fontSize={size} fontFamily={fontFamily} fontWeight={weight}
                style={{letterSpacing}}>{ch}</text>
              {fu > 0 ? (
                <text x={cx} y={y + size} fill={`url(#${idRef.current}-flood)`} fontSize={size} fontFamily={fontFamily}
                  fontWeight={weight} style={{letterSpacing}}>{ch}</text>
              ) : null}
            </g>
            {pen && u < 1 ? (
              // 笔锋光点：reveal 前沿（与 PenTip 同构三层）
              <g>
                <circle cx={cx + u * widths[i]} cy={y + size * 0.45} r={16} fill={LA.gold} opacity={0.10} />
                <circle cx={cx + u * widths[i]} cy={y + size * 0.45} r={8} fill={LA.gold} opacity={0.22} />
                <circle cx={cx + u * widths[i]} cy={y + size * 0.45} r={3} fill={color} opacity={0.95} />
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};
