// 副部件形变 blendParts（8 槽笔画 + 孔洞 evenodd + shade 折面）：技法借鉴 mg-styles-15 demos/08-morph (MIT, Vincentwei1021) index.html:344-362, TSX 重写
import React from 'react';
import {
  EASE_PRESS_IN, // 源 EIO = bez(0.45,0,0.55,1)，同常量复用
  MORPH_EASE, // 源 EM = bez(0.7,0,0.3,1)，同常量复用
  N_VERTS,
  lerpPts,
  orientTop,
  resample,
  toPath,
  type Pt,
} from './morph';

/**
 * morph v4.0 opt-in：PartsMorph 副部件形变系统（源 08-morph blendParts 机制重写）。
 * kit.tsx 的单闭合轮廓形变（MorphHero/morphPts）完全不动——本文件是「主体之外还有
 * 可动副部件」时的选配层（源码「蒸汽→光线→波浪」签名的载体，RECON 裁决 opt-in）。
 *
 * 部件四族（源 blendParts 返回面）：
 *  - body   主体轮廓（与既有 morphPts 同一套对位/插值；
 *  - holes  孔洞（源 NH=72 顶点；与 body 拼单 path、fillRule=evenodd 挖洞）；
 *           A 有 B 无 → 孔向自身质心收拢消失；B 有 A 无 → 自 B 质心展开（clamp(gA/0.6)、
 *           clamp((gB-0.4)/0.6)，源参数照抄）。
 *  - strokes 笔画槽（源 NM=24 顶点 / 8 槽）：槽序错相 0.03s（槽序表 [7,0,1,2,6,3,5,4]），
 *           gk = EIO(clamp((u-0.06-o)/0.7))；B 槽 w=0 → 「原地收缩+淡出」（向槽中点收
 *           f=1-0.7·smooth(0.05,0.48,u)，宽乘 wk=1-smooth(0.2,0.48,u)）。
 *  - shade  折面（源 NS=60 顶点）：向质心收拢（前半段）/ 自质心展开（后半段），
 *           渲染时 clip 在 body 内（源 :563 同法）。
 */

export type MorphPart = {pts: Pt[]; w?: number; on?: boolean};

export interface PartsSpec {
  body: Pt[];
  holes?: MorphPart[];
  strokes?: MorphPart[];
  shade?: MorphPart;
}

// 源顶点常量（index.html:58）：body NB=240（沿用本卡 N_VERTS=120，见 preparePart 注）
// NH=72 / NM=24 / NS=60 照抄。
export const NH_VERTS = 72;
export const NM_VERTS = 24;
export const NS_VERTS = 60;
/** 笔画槽序错相表（源照抄）：槽 k 的相位偏移 = 表内序 × 0.03。 */
export const STROKE_SLOT_ORDER = [7, 0, 1, 2, 6, 3, 5, 4] as const;
const SLOT_STAGGER = 0.03;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
/** 源 smooth(a,b,x)：smoothstep。 */
export const smoothStep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** 质心。 */
export const partCentroid = (P: Pt[]): Pt => {
  let x = 0;
  let y = 0;
  for (const p of P) {
    x += p[0];
    y += p[1];
  }
  return [x / P.length, y / P.length];
};
/** rep(p,n)：质心点复制 n 份（收拢/展开的目标形）。 */
export const repPt = (p: Pt, n: number): Pt[] => Array.from({length: n}, () => [p[0], p[1]] as Pt);

/** 部件备料：重采样到 n 点 + 12 点钟起步（与主体 SHAPES 同一套 build 链）。
 *  body 建议走 N_VERTS=120（与本卡 SHAPES 同拓扑可直接复用 morphPair 的对位结果）；
 *  源 NB=240 是 Canvas 逐帧重绘分辨率，本卡 SVG 管线 120 点已光滑。 */
export const preparePart = (raw: Pt[], n: number): Pt[] => orientTop(resample(raw, n));

/** 部件对质心的逐顶点插值视图（收拢/展开共用）。 */
const toCentroid = (pts: Pt[], t: number): Pt[] => lerpPts(pts, repPt(partCentroid(pts), pts.length), clamp01(t));
const fromCentroid = (pts: Pt[], t: number): Pt[] => lerpPts(repPt(partCentroid(pts), pts.length), pts, clamp01(t));

export interface BlendedParts {
  body: Pt[];
  holes: Pt[][];
  strokes: {pts: Pt[]; w: number}[];
  shade: {pts: Pt[]; on: boolean};
}

/**
 * blendParts（源 index.html:344-362 机制重写，参数照抄）：u = 形变线性进度 0..1。
 * A/B 的 body 须已同顶点数（preparePart）；holes/strokes 逐槽配对，缺槽按 dies 处理。
 */
export function blendParts(A: PartsSpec, B: PartsSpec, u: number): BlendedParts {
  const gA = MORPH_EASE(clamp01(u / 0.5));
  const gB = MORPH_EASE(clamp01((u - 0.5) / 0.5));
  const body = lerpPts(A.body, B.body, MORPH_EASE(clamp01(u)));
  // 孔洞：双有 → 直插；否则前半段 A 孔向自身质心收、后半段 B 孔自质心展（源阈值 0.6/0.4）
  const hA = (A.holes ?? [])[0];
  const hB = (B.holes ?? [])[0];
  const holes: Pt[][] = [];
  if (hA?.on && hB?.on) {
    holes.push(lerpPts(hA.pts, hB.pts, MORPH_EASE(clamp01(u))));
  } else if (hA?.on || hB?.on) {
    if (hA?.on) holes.push(toCentroid(hA.pts, gA / 0.6));
    if (hB?.on) holes.push(fromCentroid(hB.pts, clamp01((gB - 0.4) / 0.6)));
  }
  // 笔画槽：槽序错相 0.03s + 无 B 槽「原地收缩+淡出」
  const nStroke = Math.max((A.strokes ?? []).length, (B.strokes ?? []).length);
  const strokes = Array.from({length: nStroke}, (_, k) => {
    const sa: MorphPart | undefined = (A.strokes ?? [])[k];
    const sb: MorphPart | undefined = (B.strokes ?? [])[k];
    if (!sa) return {pts: [], w: 0};
    const order = STROKE_SLOT_ORDER.indexOf((k % 8) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7);
    const o = (order >= 0 ? order : k) * SLOT_STAGGER;
    const gk = EASE_PRESS_IN(clamp01((u - 0.06 - o) / 0.7));
    const wB = sb?.w ?? 0;
    const dies = wB === 0 && (sa.w ?? 0) > 0;
    const wk = dies ? 1 - smoothStep(0.2, 0.48, u) : 1;
    const pts = dies
      ? sa.pts.map((p) => {
          const md = sa.pts[Math.floor(sa.pts.length / 2)];
          const f = 1 - 0.7 * smoothStep(0.05, 0.48, u);
          return [md[0] + (p[0] - md[0]) * f, md[1] + (p[1] - md[1]) * f] as Pt;
        })
      : lerpPts(sa.pts, sb?.pts ?? sa.pts, gk);
    return {pts, w: ((sa.w ?? 1) + (wB - (sa.w ?? 1)) * gk) * wk};
  });
  // 折面：前半段向 A 质心收拢，后半段自 B 质心展开（源阈值 0.5/0.5）
  const sA = A.shade;
  const sB = B.shade;
  const shade =
    u < 0.5
      ? {pts: sA?.on ? toCentroid(sA.pts, gA / 0.5) : [], on: sA?.on ?? false}
      : {pts: sB?.on ? fromCentroid(sB.pts, clamp01((gB - 0.5) / 0.5)) : [], on: sB?.on ?? false};
  return {body, holes, strokes, shade};
}

/** 子路径拼接：body + holes 拼单 d（fillRule=evenodd 挖洞）。 */
const pathWithHoles = (body: Pt[], holes: Pt[][]): string => toPath(body) + holes.map((h) => ` ${toPath(h)}`).join('');
/** 开放折线 d（笔画槽是开曲线，不闭合——闭台会多一条弦）。 */
const openPath = (pts: Pt[]): string => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('');

/**
 * PartsMorph 渲染层：body(+holes) 单 path evenodd + 渐变/辉光（与 MorphPath 同配方），
 * strokes 逐槽描边（宽 w 随 gk/wk），shade 折面 clip 在 body 内（源 :554-563 同法）。
 * opt-in：不接管 kit.tsx 的 MorphHero；外层位移/旋转/拉伸请复用 morphPose 的 Xform
 * （applyM）后把结果点列喂进来，或用 transform 字符串整体包一层。
 */
export const PartsMorph: React.FC<{
  A: PartsSpec;
  B: PartsSpec;
  u: number; // 形变进度 0..1
  top: string;
  bottom: string;
  glow: string;
  glowSize?: number;
  gid: string;
  strokeColor?: string;
  shadeColor?: string;
  shadeOpacity?: number;
  transform?: string;
  opacity?: number;
}> = ({A, B, u, top, bottom, glow, glowSize = 46, gid, strokeColor, shadeColor = 'rgba(0,0,0,0.30)', shadeOpacity = 1, transform, opacity = 1}) => {
  const parts = blendParts(A, B, u);
  const d = pathWithHoles(parts.body, parts.holes);
  return (
    <g transform={transform} opacity={opacity}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <clipPath id={`${gid}-clip`}>
          <path d={d} clipRule="evenodd" />
        </clipPath>
      </defs>
      <path d={d} fill={`url(#${gid})`} fillRule="evenodd"
        style={{filter: `drop-shadow(0 0 ${glowSize}px ${glow})`}} />
      {parts.shade.on && parts.shade.pts.length > 0 ? (
        <g clipPath={`url(#${gid}-clip)`}>
          <path d={toPath(parts.shade.pts)} fill={shadeColor} opacity={shadeOpacity} />
        </g>
      ) : null}
      {parts.strokes.map((s, i) =>
        s.pts.length > 1 && s.w > 0.01 ? (
          <path key={i} d={openPath(s.pts)} fill="none" stroke={strokeColor ?? top} strokeWidth={s.w}
            strokeLinecap="round" strokeLinejoin="round" />
        ) : null,
      )}
    </g>
  );
};
