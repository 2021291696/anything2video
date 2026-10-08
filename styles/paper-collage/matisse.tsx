// 有机形生成器 AlgaeShape / 整层手剪位移 roughenLayer：技法借鉴 huashu-art-motion 30_matisse（MIT, 整合仓 scripts/engine/lib/brush.js P.cut·render.js P.roughen）, TSX 重写
import React from 'react';
import {PAPER_TOKENS, paperRnd, type Pt} from './paper';

/**
 * paper-collage v4.0 opt-in（huashu 30_matisse 移植；本文件不被 paper.tsx 引用，
 * 既有词汇与默认输出零改动）。
 *
 *  1. AlgaeShape 有机形（配方 §30「海藻（关键）」）：一根锥形茎 + 2×lobes 根左右交替的
 *     圆头胶囊手指。手指角度 ±(1.05−0.55u)、长 width·(1−0.45u)、宽 width·(0.34−0.12u)
 *     （源参数照抄）。所有子路径并进同一个 <path>、fillRule=nonzero 一次填充 = 并集，
 *     投影只算一次。**禁「沿脊线调制宽度」**——第一版这么做出来的是毛毛虫和 Z 字闪电
 *     （配方原话），手指必须是胶囊并集。star/flame 为同一生成器的参数变体。
 *  2. roughenLayer 整层手剪位移（源 render.js P.roughen）：静态低频位移场
 *     dx = fbm(0.028x, 0.028y, 2)·9、dy = fbm(0.028x+40, 0.028y+17, 2)·9（源公式与
 *     +40/+17 偏移照抄，|d|≤9px）。源为 Canvas 逐像素搬运；本卡「不用 canvas」纪律下
 *     降级为**水平条带位移近似**（bands 条、逐条 clip + 场采样平移）——低频手剪观感
 *     的 DOM 等价实现，SPEC 注明。
 */

// ---- 确定性 2D 值噪声 fbm（paperRnd 格点 hash；归一化到 |fbm|≤1）----
const lattice = (ix: number, iy: number, ch: number): number =>
  paperRnd((ix * 157.31 + iy * 113.97 + ch * 271.3) * 1.0 + 7.13);
const vnoise2 = (x: number, y: number, ch: number): number => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = lattice(ix, iy, ch);
  const b = lattice(ix + 1, iy, ch);
  const c = lattice(ix, iy + 1, ch);
  const d = lattice(ix + 1, iy + 1, ch);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
};
/** 2 octaves fbm，∈[-1,1]（幅度 0.5^o 按总幅归一）。 */
export const fbm2 = (x: number, y: number, oct = 2): number => {
  let sum = 0;
  let norm = 0;
  let amp = 1;
  for (let o = 0; o < oct; o++) {
    sum += amp * vnoise2(x * (1 << o), y * (1 << o), o);
    norm += amp;
    amp *= 0.5;
  }
  return (sum / norm) * 2 - 1;
};
/** 位移场 dx/dy（源 P.roughen 公式照抄：freq 0.028、amp 9、dy 场 +40/+17）。|·|≤9。 */
export const roughenDx = (x: number, y: number): number => fbm2(0.028 * x, 0.028 * y, 2) * 9;
export const roughenDy = (x: number, y: number): number => fbm2(0.028 * x + 40, 0.028 * y + 17, 2) * 9;

/**
 * RoughenLayer：children 整层手剪边。实现 = 水平 bands 条切片，第 i 条 clip 在自己
 * 的横带内、按场平移 (roughenDx(中心x, 带y), roughenDy(...))——低频扰动让矢量边也像
 * 手剪的（条带近似，源为逐像素位移场）。children 会被渲染 bands 遍，适合简单剪影层。
 */
export const RoughenLayer: React.FC<{
  x: number; // 层左上（世界 px，场采样坐标）
  y: number;
  w: number;
  h: number;
  bands?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({x, y, w, h, bands = 14, children, style}) => {
  const bh = h / bands;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, ...style}}>
      {Array.from({length: bands}, (_, i) => {
        const by = y + (i + 0.5) * bh; // 带中心 y（世界坐标采样）
        const dx = roughenDx(x + w / 2, by);
        const dy = roughenDy(x + w / 2, by);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: w,
              height: h,
              clipPath: `inset(${(i * bh).toFixed(2)}px 0 ${(h - (i + 1) * bh).toFixed(2)}px 0)`,
              transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`,
            }}
          >
            {children}
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- AlgaeShape 有机形

export type AlgaeVariant = 'algae' | 'star' | 'flame';

export interface AlgaeOpts {
  x?: number; // 根部（茎基）位置（局部 px）
  y?: number;
  length?: number; // 茎长（默认 150）
  width?: number; // 手指基准宽（默认 26）
  lobes?: number; // 每侧手指根数（默认 4）
  lean?: number; // 茎的弯曲（末端横向偏移 px，默认 18）
  seed?: number;
}

/** 胶囊子路径（圆头手指）：a→b 轴线 + 半径 r，返回闭合点列（统一逆时针绕向）。 */
const capsule = (a: Pt, b: Pt, r: number): Pt[] => {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const out: Pt[] = [];
  const steps = 6; // 半圆 6 段（30°/段，剪纸语言足够）
  // a 端半圆：ang+90° → ang+270°
  for (let i = 0; i <= steps; i++) {
    const t = ang + Math.PI / 2 + (i / steps) * Math.PI;
    out.push([a[0] + r * Math.cos(t), a[1] + r * Math.sin(t)]);
  }
  // b 端半圆：ang+270° → ang+450°（= +90°，闭合）
  for (let i = 0; i <= steps; i++) {
    const t = ang + (3 * Math.PI) / 2 + (i / steps) * Math.PI;
    out.push([b[0] + r * Math.cos(t), b[1] + r * Math.sin(t)]);
  }
  return out;
};

const signedArea = (P: Pt[]): number => {
  let a = 0;
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    const q = P[(i + 1) % P.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
};
/** 统一子路径绕向（nonzero 并集的前提：全部同向）。 */
const normCW = (P: Pt[]): Pt[] => (signedArea(P) < 0 ? [...P].reverse() : P);

/**
 * 有机形子路径集（并集前）：锥形茎 + 2×lobes 胶囊手指。
 * 手指参数照抄配方：角度 ±(1.05−0.55u)、长 width·(1−0.45u)、宽 width·(0.34−0.12u)。
 */
export const algaeParts = (opts: AlgaeOpts = {}): Pt[][] => {
  const x0 = opts.x ?? 0;
  const y0 = opts.y ?? 0;
  const len = opts.length ?? 150;
  const width = opts.width ?? 26;
  const lobes = Math.max(1, opts.lobes ?? 4);
  const lean = opts.lean ?? 18;
  const seed = opts.seed ?? 1;
  const parts: Pt[][] = [];
  // 锥形茎：5 点脊线（末端向 lean 侧弯），宽 w0→w0·0.18（锥形收窄；茎允许调宽，手指不许）
  const spine: Pt[] = Array.from({length: 5}, (_, i) => {
    const t = i / 4;
    return [x0 + lean * t * t, y0 - len * t];
  });
  const stemW = width * 0.46;
  const stemL: Pt[] = [];
  const stemR: Pt[] = [];
  for (let i = 0; i < spine.length; i++) {
    const t = i / (spine.length - 1);
    const w = (stemW * (1 - 0.82 * t)) / 2;
    const p = spine[i];
    const q = spine[Math.min(spine.length - 1, i + 1)];
    const r = spine[Math.max(0, i - 1)];
    const ang = Math.atan2(q[1] - r[1], q[0] - r[0]);
    stemL.push([p[0] + Math.cos(ang + Math.PI / 2) * w, p[1] + Math.sin(ang + Math.PI / 2) * w]);
    stemR.push([p[0] + Math.cos(ang - Math.PI / 2) * w, p[1] + Math.sin(ang - Math.PI / 2) * w]);
  }
  parts.push(normCW([...stemL, ...stemR.reverse()]));
  // 手指：沿脊线两侧交替（u = 挂点在茎上的归一高度；±(1.05−0.55u) 弧度）
  for (let i = 0; i < lobes; i++) {
    const u = (i + 0.5) / lobes;
    const attach = spine[Math.min(spine.length - 1, Math.round(u * (spine.length - 1)))];
    const angBase = -Math.PI / 2; // 脊线大致朝上
    for (const side of [-1, 1] as const) {
      const j = paperRnd(seed * 13.7 + i * 3.1 + (side > 0 ? 101 : 7));
      const ang = angBase + side * (1.05 - 0.55 * u) + (j - 0.5) * 0.16;
      const flen = width * (1 - 0.45 * u) * (2.2 + 0.5 * j); // 长（源 width·(1−0.45u) × 比例系数 2.2±）
      const fr = (width * (0.34 - 0.12 * u)) / 2; // 半径（源宽 width·(0.34−0.12u)）
      const tip: Pt = [attach[0] + Math.cos(ang) * flen, attach[1] + Math.sin(ang) * flen];
      parts.push(normCW(capsule(attach, tip, fr)));
    }
  }
  return parts;
};

/** star 变体参数：以核心圆 + 5 根放射胶囊（替代茎），仍走同一并集通道。 */
export const starParts = (opts: AlgaeOpts = {}): Pt[][] => {
  const cx = opts.x ?? 0;
  const cy = opts.y ?? 0;
  const len = (opts.length ?? 150) / 2;
  const width = opts.width ?? 26;
  const rays = Math.max(3, opts.lobes ?? 5);
  const seed = opts.seed ?? 1;
  const parts: Pt[][] = [normCW(capsule([cx, cy], [cx, cy - 0.001], width * 0.72))]; // 核心圆（退化胶囊）
  for (let i = 0; i < rays; i++) {
    const j = paperRnd(seed * 7.7 + i * 2.3);
    const ang = -Math.PI / 2 + (i / rays) * Math.PI * 2 + (j - 0.5) * 0.22;
    const L = len * (0.82 + 0.36 * j);
    parts.push(normCW(capsule([cx, cy], [cx + Math.cos(ang) * L, cy + Math.sin(ang) * L], width * 0.4)));
  }
  return parts;
};

/** flame 变体参数：主焰舌（大胶囊垂直）+ 2 根侧焰（±(0.9−0.4u) 收窄），同并集通道。 */
export const flameParts = (opts: AlgaeOpts = {}): Pt[][] => {
  const x0 = opts.x ?? 0;
  const y0 = opts.y ?? 0;
  const len = opts.length ?? 150;
  const width = opts.width ?? 26;
  const seed = opts.seed ?? 1;
  const parts: Pt[][] = [];
  parts.push(normCW(capsule([x0, y0], [x0, y0 - len], width * 0.52)));
  for (const side of [-1, 1] as const) {
    const j = paperRnd(seed * 3.3 + (side > 0 ? 9 : 5));
    const ang = -Math.PI / 2 + side * (0.9 - 0.4 * j);
    const L = len * (0.52 + 0.14 * j);
    parts.push(normCW(capsule([x0, y0 - len * 0.24], [x0 + Math.cos(ang) * L, y0 - len * 0.24 + Math.sin(ang) * L], width * 0.3)));
  }
  return parts;
};

/** 子路径集 → 单 path d（nonzero 并集）。所有子路径已同绕向。 */
export const algaePathD = (parts: Pt[][]): string =>
  parts.map((sub) => sub.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('') + 'Z').join(' ');

/**
 * AlgaeShape：有机剪影（nonzero 单 fill 一次成形）。摆动语法（配方「母题动画」）：
 * sway(t) = sin(2.8t+φ)·0.13 rad 绕根部摆，外层 transform 提供；curl 呼吸 scaleX
 * 0.93–1.0 同层可叠。投影 = 钉墙投影 drop-shadow(5px 6px 4px rgba(10,20,40,.3))
 * （配方 §30 照抄）——单 fill 保证只算一次。
 */
export const AlgaeShape: React.FC<{
  seed?: number;
  variant?: AlgaeVariant;
  color?: string;
  x?: number;
  y?: number; // 层内根部位置（局部 px）
  left?: number; // 组件在画布的位置
  top?: number;
  w?: number; // 层框（供定位/裁剪语义；形本身超界由 overflow visible 承载）
  h?: number;
  swayT?: number; // 当前秒（配 sway() 得旋转角）
  swayPhase?: number; // φ
  opacity?: number;
  shadow?: boolean;
}> = ({seed = 1, variant = 'algae', color = PAPER_TOKENS.mustard, x = 0, y = 0, left, top, w = 320, h = 320, swayT, swayPhase = 0, opacity = 1, shadow = true}) => {
  const parts = variant === 'star' ? starParts({x, y, seed}) : variant === 'flame' ? flameParts({x, y, seed}) : algaeParts({x, y, seed});
  const rot = swayT !== undefined ? Math.sin(2.8 * swayT + swayPhase) * 0.13 * (180 / Math.PI) : 0;
  const pivot = `${left !== undefined ? left + w / 2 : '50%'} ${top !== undefined ? top + h : '100%'}`;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{
        position: 'absolute',
        left,
        top,
        overflow: 'visible',
        opacity,
        transform: `rotate(${rot.toFixed(3)}deg)`,
        transformOrigin: pivot,
        filter: shadow ? 'drop-shadow(5px 6px 4px rgba(10,20,40,0.3))' : undefined,
      }}
    >
      <path d={algaePathD(parts)} fill={color} fillRule="nonzero" />
    </svg>
  );
};

/** 摆动角（配方：sin(2.8t+φ)·0.13 rad；卷边呼吸 scaleX 0.93–1.0 由 1−0.035·(1+cos 3.1t)/2 给出）。 */
export const sway = (t: number, phase = 0): number => Math.sin(2.8 * t + phase) * 0.13;
export const curl = (t: number): number => 1 - 0.035 * ((1 + Math.cos(3.1 * t)) / 2);
