import React from 'react';
import {clamp01} from '../common/easing';

// ============================================================================
// pop-comic 图元库（波普漫画 · 战役 L 新卡样片正本）
// 风格句：纸白漫画底 + 粗黑描边 + 高饱和有限色（红/黄/青/品红）+ 半调网点 + 拟声词爆炸星
//         + 贴纸拍入 + 漫画分格/对话泡 + 速度线 + 网点擦除转场。
// 机制借鉴 lanshu-create-ai-presenter-video（MIT, cclank）explainer/kits/v5-comic——Remotion(React+TSX) 重写，
// 全部图形为纯代码绘制（seeded 多边形/CSS 渐变），无外部素材、无 Math.random/Date。
// 坐标：屏幕 px；画布 1280×720@30，帧号 1 起含端点。
// ============================================================================

/** 锁死色板：暖纸白底 + 墨黑 + 四高饱和（品红=唯一重点色：新增/变化/情绪；红=钩子/代价；黄=贴纸/爆星；青=结构/机制；绿=过关，少量） */
export const PK = {
  paper: '#FBF1D9', // 漫画纸底（暖纸白）
  paper2: '#FFE9B0', // 纸底深端（分格内衬）
  surface: '#FFFFFF', // 分格/贴纸纸面
  ink: '#1A1613', // 墨黑（描边/字）
  muted: '#6B6157', // 未念到的字幕字/弱注
  pink: '#F0439A', // 品红：唯一重点色（重点词/情绪/hero 爆星）
  red: '#E9482F', // 波普红：钩子/警示/代价
  yellow: '#FFD53E', // 贴纸/说明框/爆星底
  cyan: '#2BA3D4', // 青：结构/机制标签
  green: '#3CB667', // 过关/正确（少量）
} as const;

export const W = 1280;
export const H = 720;

// ---- 确定性随机（mulberry32 + hash；禁 Math.random/Date）----
export const mulberry32 = (seed: number) => () => {
  let a = seed >>> 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** 单值确定性 hash（帧号/索引 → [0,1)），用于幕震与网点扰动 */
export const hash1 = (n: number) => mulberry32((Math.floor(n) * 2654435761) % 2147483647 + 1013904223)();

const withAlpha = (hex: string, a: number) => {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

// ---- 字体（Noto Sans SC 900 = 粗黑展示体，随模板字体分发，确定性本地加载）----
export const FONT_DISPLAY = `'Noto Sans SC', 'PingFang SC', sans-serif`; // 中文全部字重用它（900 标题/拟声词、700 正文）
export const FONT_NUM = `'Audiowide', 'Orbitron', sans-serif`; // 拉丁拟声词 / 数字 / 角标

// ---- 波普描边契约：粗黑描边 + 硬错位阴影（无模糊）----
/** 标准描边 5px / 分格与主视觉 8px；硬阴影位移 6-10px */
export const LINE = 5;
export const LINE_B = 8;
export const hardShadow = (d = 6, color = PK.ink) => `${d}px ${d}px 0 ${color}`;
export const strokeInk = (w: number) => ({WebkitTextStroke: `${w}px ${PK.ink}`, paintOrder: 'stroke fill'} as React.CSSProperties);

// ============================================================================
// 半调网点（签名幕底 / 贴片）：CSS radial-gradient 平铺。pattern 化平铺，禁逐点 DOM。
// ============================================================================
/** 网点平铺样式：color 点色 / r点半径 / gap 网距 / alpha 点透明度 / offset 相位错排（45° 交错感用双层叠加） */
export const halftone = (color: string, r: number, gap: number, alpha = 1, offset = false): React.CSSProperties => ({
  backgroundImage: `radial-gradient(circle, ${withAlpha(color, alpha)} ${r}px, ${withAlpha(color, 0)} ${(r + 1.1).toFixed(1)}px)`,
  backgroundSize: `${gap}px ${gap}px`,
  backgroundPosition: offset ? `${gap / 2}px ${gap / 2}px` : '0 0',
});
/** 幕底压重 mask：网点只在页缘显形（中央留净版面，防「满屏雨点」误读） */
export const HALFTONE_VIGNETTE = 'radial-gradient(ellipse 74% 74% at 50% 50%, rgba(0,0,0,0) 34%, #000 100%)';

// ============================================================================
// 拟声词爆炸星（签名）：seeded 锯齿多边形（尖角随机抖动）+ 墨色错位阴影层 + 描边。
// ============================================================================
/** 锯齿星多边形 points：n 尖 / inner 内缩比 / seed 抖动种子（同 seed 同形，逐帧不变） */
export const burstPts = (w: number, h: number, n: number, inner: number, seed: number): string => {
  const rnd = mulberry32(seed);
  const cx = w / 2, cy = h / 2, rx = w / 2 - 4, ry = h / 2 - 4;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.2;
    const a1 = ((i + 0.5) / n) * Math.PI * 2 + (rnd() - 0.5) * 0.16;
    const ro = 0.84 + rnd() * 0.16;
    const ri = inner * (0.9 + rnd() * 0.2);
    pts.push(`${(cx + Math.cos(a0) * rx * ro).toFixed(1)},${(cy + Math.sin(a0) * ry * ro).toFixed(1)}`);
    pts.push(`${(cx + Math.cos(a1) * rx * ri).toFixed(1)},${(cy + Math.sin(a1) * ry * ri).toFixed(1)}`);
  }
  return pts.join(' ');
};
export const Burst: React.FC<{
  w: number; h: number; n?: number; inner?: number; seed?: number; fill?: string; sw?: number; shadow?: number; style?: React.CSSProperties;
}> = ({w, h, n = 12, inner = 0.62, seed = 7, fill = PK.yellow, sw = 7, shadow = 8, style}) => {
  const p = burstPts(w, h, n, inner, seed);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{overflow: 'visible', display: 'block', ...style}}>
      {shadow > 0 ? <polygon points={p} transform={`translate(${shadow} ${shadow})`} fill={PK.ink} /> : null}
      <polygon points={p} fill={fill} stroke={PK.ink} strokeWidth={sw} strokeLinejoin="round" />
    </svg>
  );
};
/** 爆星包裹的拟声词（签名组合：Burst + 粗黑描边大字，slam 入场；s0/r1 可放大档，默认=锁死贴纸参数） */
export const BurstWord: React.FC<{
  f: number; at: number; text: string; x: number; y: number; w?: number; h?: number; size?: number;
  fill?: string; burstFill?: string; n?: number; seed?: number; font?: string; z?: number; s0?: number; r1?: number;
}> = ({f, at, text, x, y, w = 300, h = 220, size = 92, fill = PK.ink, burstFill = PK.yellow, n = 12, seed = 11, font = FONT_DISPLAY, z = 5, s0, r1}) => {
  const sl = slam(f, at, s0 !== undefined || r1 !== undefined ? {s0, r1} : undefined);
  if (!sl) return null;
  return (
    <div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, zIndex: z, opacity: sl.o,
      transform: `rotate(${sl.r.toFixed(2)}deg) scale(${sl.s.toFixed(4)})`, transformOrigin: '50% 50%'}}>
      <Burst w={w} h={h} n={n} seed={seed} fill={burstFill} />
      <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <span style={{fontFamily: font, fontWeight: 900, fontSize: size, lineHeight: 1, color: fill, ...strokeInk(10), textShadow: hardShadow(6)}}>{text}</span>
      </div>
    </div>
  );
};

// ============================================================================
// 贴纸拍入（签名纪律，锁死参数）：0.16s easeInQuad 加速砸落，scale 1.16→1，+7°→落定 -1.6°。
// 落定后保持 -1.6° 歪贴感（漫画贴纸的随手一贴），不回弹不呼吸。
// ============================================================================
export const SLAM_DUR = 0.16; // s（锁死：贴纸拍入 0.16s easeInQuad）
export type SlamState = {o: number; s: number; r: number};
export const SLAM_DEF = {s0: 1.16, r1: -1.6}; // 锁死：scale 1.16→1，+7°→落定 -1.6°
export const slam = (f: number, at: number, o?: {s0?: number; r1?: number; d?: number}): SlamState | null => {
  const s0 = o?.s0 ?? SLAM_DEF.s0;
  const r1 = o?.r1 ?? SLAM_DEF.r1;
  const durF = ((o?.d ?? SLAM_DUR) * 30);
  if (f < at) return null;
  const u = clamp01((f - at) / durF);
  const e = u * u; // easeInQuad（加速砸落）
  return {o: clamp01(0.3 + u * 3.2), s: s0 - (s0 - 1) * e, r: 7 + (r1 - 7) * e}; // +7° → r1
};
/** slam 样式套壳：绝对定位点 (x,y)，transformOrigin 中心。slam 的 r 为绝对角度（+7°→-1.6°），直接用作 rotate */
export const slamStyle = (sl: SlamState, x: number, y: number, z = 4): React.CSSProperties => ({
  position: 'absolute', left: 0, top: 0, zIndex: z, opacity: sl.o,
  transform: `translate(${x}px, ${y}px) rotate(${sl.r.toFixed(2)}deg) scale(${sl.s.toFixed(4)})`,
  transformOrigin: '50% 50%',
});
/** 小物件弹出（back.out），用于勾/角标等非贴纸级元素 */
export const popIn = (f: number, at: number, d = 8, s0 = 0.3): {o: number; s: number} | null => {
  if (f < at) return null;
  const u = clamp01((f - at) / d);
  const c1 = 1.7, c3 = c1 + 1;
  const e = 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  return {o: clamp01(u * 4), s: s0 + (1 - s0) * e};
};

// ============================================================================
// 幕震（seeded、帧量化、二次衰减）：只依赖绝对帧号，逐帧可复现。
// ============================================================================
export type Impact = {f: number; amp: number; dur?: number};
export const shakeAt = (f: number, impacts: Impact[]): [number, number] => {
  let x = 0, y = 0;
  impacts.forEach((it, i) => {
    const dur = it.dur ?? 8;
    const u = (f - it.f) / dur;
    if (u >= 0 && u < 1) {
      const k = Math.pow(1 - u, 2) * it.amp;
      x += (hash1(f * 13.17 + i * 7.77) * 2 - 1) * k;
      y += (hash1(f * 29.31 + i * 3.13) * 2 - 1) * k * 0.7;
    }
  });
  return [x, y];
};

// ============================================================================
// 速度线（签名）：mover 身后的平行拖尾线组（seeded 长短错落），纯 SVG line。
// ============================================================================
export const SpeedLines: React.FC<{
  f: number; from: number; to: number; x: number; y: number; len?: number; n?: number; gap?: number; seed?: number; color?: string; vertical?: boolean;
}> = ({f, from, to, x, y, len = 120, n = 5, gap = 13, seed = 21, color = PK.ink, vertical = false}) => {
  if (f < from || f > to) return null;
  const u = clamp01((f - from) / (to - from));
  const o = u < 0.25 ? u / 0.25 : u > 0.75 ? (1 - u) / 0.25 : 1;
  const rnd = mulberry32(seed);
  const lines = [];
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * gap + (rnd() - 0.5) * 5;
    const l = len * (0.55 + rnd() * 0.45) * (1 - u * 0.25);
    const w = 3 + rnd() * 3;
    lines.push(vertical
      ? <line key={i} x1={x + off} y1={y} x2={x + off} y2={y + l} stroke={color} strokeWidth={w} strokeLinecap="round" opacity={o.toFixed(2)} />
      : <line key={i} x1={x} y1={y + off} x2={x - l} y2={y + off} stroke={color} strokeWidth={w} strokeLinecap="round" opacity={o.toFixed(2)} />);
  }
  return <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>{lines}</svg>;
};

// ============================================================================
// 漫画分格 / 贴纸 / 对话泡（波普框线语言：粗黑描边 + 硬错位阴影）
// ============================================================================
/** 漫画分格：白纸面 + 8px 墨框 + 10px 硬阴影 */
export const Panel: React.FC<{x: number; y: number; w: number; h: number; rot?: number; z?: number; style?: React.CSSProperties; children?: React.ReactNode}> =
({x, y, w, h, rot = 0, z = 2, style, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, background: PK.surface, border: `${LINE_B}px solid ${PK.ink}`,
    boxShadow: hardShadow(10), transform: rot ? `rotate(${rot}deg)` : undefined, zIndex: z, overflow: 'hidden', ...style}}>
    {children}
  </div>
);
/** 贴纸标签：色底 + 5px 墨框 + 6px 硬阴影（tone：yellow 默认 / pink 重点 / red 警示 / cyan 机制 / ink 反白） */
export const Sticker: React.FC<{x: number; y: number; text: string; sub?: string; tone?: 'yellow' | 'pink' | 'red' | 'cyan' | 'ink'; size?: number; rot?: number; z?: number; style?: React.CSSProperties}> =
({x, y, text, sub, tone = 'yellow', size = 26, rot = -1.6, z = 6, style}) => {
  const bg = tone === 'ink' ? PK.ink : tone === 'pink' ? PK.pink : tone === 'red' ? PK.red : tone === 'cyan' ? PK.cyan : PK.yellow;
  const fg = tone === 'ink' || tone === 'pink' || tone === 'red' || tone === 'cyan' ? '#FFFFFF' : PK.ink;
  return (
    <div style={{position: 'absolute', left: x, top: y, zIndex: z, display: 'inline-flex', alignItems: 'baseline', gap: 10, padding: '7px 18px 8px',
      background: bg, border: `${LINE}px solid ${PK.ink}`, boxShadow: hardShadow(6), transform: `rotate(${rot}deg)`, whiteSpace: 'nowrap', ...style}}>
      <span style={{fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: size, lineHeight: 1.2, color: fg}}>{text}</span>
      {sub ? <span style={{fontFamily: FONT_NUM, fontSize: size * 0.62, letterSpacing: 2, color: fg, opacity: 0.85}}>{sub}</span> : null}
    </div>
  );
};
/** 圆角对话泡（带尾巴）：SVG 白底 + 描边 + 错位阴影；tail = 尾巴尖端相对泡体坐标 */
export const Balloon: React.FC<{x: number; y: number; w: number; h: number; tail?: [number, number]; children?: React.ReactNode; z?: number; fill?: string}> =
({x, y, w, h, tail = [w * 0.7, h + 26], children, z = 6, fill = PK.surface}) => {
  const rr = Math.min(h / 2, 34);
  const i = LINE / 2 + 1;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h + 30, zIndex: z}}>
      <svg width={w} height={h + 30} viewBox={`0 0 ${w} ${h + 30}`} style={{overflow: 'visible', display: 'block'}}>
        <g transform="translate(6 6)" fill={PK.ink}>
          <rect x={i} y={i} width={w - 2 * i} height={h - 2 * i} rx={rr} ry={rr} />
          <polygon points={`${tail[0] - 13},${h - 8} ${tail[0]},${tail[1]} ${tail[0] + 13},${h - 8}`} />
        </g>
        <g fill={fill} stroke={PK.ink} strokeWidth={LINE} strokeLinejoin="round">
          <rect x={i} y={i} width={w - 2 * i} height={h - 2 * i} rx={rr} ry={rr} />
        </g>
        <polygon points={`${tail[0] - 13},${h - 8} ${tail[0]},${tail[1] - 2} ${tail[0] + 13},${h - 8}`} fill={fill} stroke={PK.ink} strokeWidth={LINE} strokeLinejoin="round" />
        <rect x={i + LINE} y={h - 14} width={26} height={10} fill={fill} />
      </svg>
      <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// 拟声词爆字（无爆星底的单字大字版）：粗黑描边 + 硬错位阴影
// ============================================================================
export const SfxWord: React.FC<{f: number; at: number; end?: number; text: string; x: number; y: number; size?: number; color?: string; rot?: number; font?: string; z?: number}> =
({f, at, end, text, x, y, size = 96, color = PK.yellow, rot = -8, font = FONT_DISPLAY, z = 8}) => {
  const sl = slam(f, at);
  if (!sl) return null;
  const ex = end !== undefined && f > end;
  const shrink = ex ? clamp01((f - end) / 6) : 0;
  const r = rot + (sl.r + 1.6); // 绕自定终角 rot 摆动：落定=rot，入场=rot+8.6
  return (
    <div style={{...slamStyle(sl, x, y, z), transform: `translate(${x}px, ${y}px) rotate(${r.toFixed(2)}deg) scale(${(sl.s * (1 - shrink)).toFixed(4)})`, opacity: sl.o * (1 - shrink)}}>
      <span style={{position: 'absolute', left: 0, top: 0, transform: 'translate(-50%,-50%)', fontFamily: font, fontWeight: 900, fontSize: size, lineHeight: 1,
        whiteSpace: 'nowrap', color, ...strokeInk(11), textShadow: hardShadow(7)}}>{text}</span>
    </div>
  );
};

// ============================================================================
// 半调网点擦除（签名转场，章节缝唯一转场）：网点自 origin 逐点放大盖满 → 缝帧下换景 → 自新 origin 收缩。
// ============================================================================
export type WipeSpec = {s: number; col: string; c: [number, number]; r: [number, number]}; // s=缝帧；c=盖入 origin；r=揭开 origin
const WIPE_LEAD = 6; // 盖入帧数
const WIPE_TAIL = 9; // 揭开帧数
const WIPE_GRID = 44;
const WIPE_DOTS: Array<{x: number; y: number; dmax: number}> = (() => {
  const dots: Array<{x: number; y: number; dmax: number}> = [];
  const cols = Math.ceil(W / WIPE_GRID) + 1, rows = Math.ceil(H / WIPE_GRID) + 1;
  for (let j = -1; j <= rows; j++) {
    for (let i = -1; i <= cols; i++) {
      const x = i * WIPE_GRID + (j % 2 ? WIPE_GRID / 2 : 0), y = j * WIPE_GRID;
      const dmax = Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
      dots.push({x, y, dmax});
    }
  }
  return dots;
})();
export const DotWipe: React.FC<{f: number; wipes: WipeSpec[]}> = ({f, wipes}) => {
  let phase: 'cover' | 'reveal' | null = null;
  let org: [number, number] = [0, 0], P = 0, col: string = PK.pink, seedShift = 0;
  for (const wp of wipes) {
    if (f >= wp.s - WIPE_LEAD && f <= wp.s) {phase = 'cover'; org = wp.c; P = (f - (wp.s - WIPE_LEAD)) / WIPE_LEAD; col = wp.col; seedShift = wp.s; break;}
    if (f > wp.s && f <= wp.s + WIPE_TAIL) {phase = 'reveal'; org = wp.r; P = 1 - (f - wp.s) / WIPE_TAIL; col = wp.col; seedShift = wp.s; break;}
  }
  if (!phase) return null;
  const e = P * P; // easeIn 收紧
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, zIndex: 40, pointerEvents: 'none'}}>
      {WIPE_DOTS.map((d, i) => {
        const lp = clamp01((e - (Math.hypot(d.x - org[0], d.y - org[1]) / d.dmax) * 0.55) / 0.45);
        const rr = WIPE_GRID * 0.36 * (phase === 'cover' ? Math.pow(lp, 0.7) : lp < 1 ? lp : 1) * (0.92 + hash1(i * 3.7 + seedShift) * 0.14);
        if (rr < 0.6) return null;
        return <circle key={i} cx={d.x} cy={d.y} r={rr.toFixed(1)} fill={col} />;
      })}
    </svg>
  );
};

// ============================================================================
// 漫画字幕盒（波普版字幕：白盒 + 墨框 + 硬阴影，slam 入 / 缩出；字随时间逐字点亮 muted→ink）
// ============================================================================
export const CaptionBox: React.FC<{f: number; from: number; to: number; text: string; litFrom?: number; litTo?: number}> = ({f, from, to, text, litFrom, litTo}) => {
  const sl = slam(f, from);
  const goneU = f > to + 4 ? clamp01((f - to - 4) / 5) : 0;
  if (!sl || goneU >= 1) return null;
  const chars = [...text];
  const litN = litFrom !== undefined && litTo !== undefined ? Math.floor(((f - litFrom) / Math.max(1, litTo - litFrom)) * chars.length) : chars.length;
  return (
    <div style={{position: 'absolute', left: '50%', bottom: 34, zIndex: 50,
      transform: `translateX(-50%) rotate(${(sl.r * 0.4).toFixed(2)}deg) scale(${(sl.s * (1 - 0.12 * goneU)).toFixed(4)})`, opacity: sl.o * (1 - goneU), transformOrigin: '50% 100%'}}>
      <div style={{padding: '9px 26px 11px', background: PK.surface, border: `${LINE}px solid ${PK.ink}`, boxShadow: hardShadow(6)}}>
        {chars.map((ch, i) => (
          <span key={i} style={{fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 30, lineHeight: 1.3, color: i < litN ? PK.ink : PK.muted,
            display: 'inline-block', whiteSpace: 'pre', transform: `translateY(${i < litN ? 0 : 2}px)`}}>{ch}</span>
        ))}
      </div>
    </div>
  );
};
