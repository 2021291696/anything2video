import React from 'react';
import {useCurrentFrame as useFrameAbs} from 'remotion';

// ============================================================================
// tomb-wall 图元库（埃及墓室壁画 · 战役 4 新卡正本）
// 风格句：无笔触渲染器——干净 2.2–2.8px 深棕线 #2a1810；时代感全靠程式（侧脸正面眼＋正面双肩）
//         ＋色板（墙 #eadcb8＋红蓝黄绿四色＋金三阶＋肤 #e6b282）＋纹样密度（手写象形字栏）。
// 技法借鉴 huashu-art-motion scripts/engine/scenes/02_egypt.js (MIT)，Remotion/TSX 重写：
// 象形字函数表＋pathLength=100 dash 逐笔写出（每个子路径各自从头=天然笔顺）、墙面 feTurbulence 斑驳、
// 写出金色 shadowBlur→drop-shadow 余辉、四色彩块边框、深蓝饰带、Deterministic 全程（禁 Math.random/Date）。
// 画布 1280×720@30，帧号 1 起含端点；布局坐标＝源 1920×1080 构图 ×2/3 烘焙。
// ============================================================================

/** 锁死色板（源 02_egypt 色板 1:1） */
export const TW = {
  wall: '#eadcb8', wall2: '#d8c597', line: '#2a1810', rule: '#9a2b22',
  red: '#b8322a', blue: '#2a58a8', green: '#2e8a55', yellow: '#e2b13a', black: '#231a14',
  gold: '#e0ab38', goldD: '#a8741c', goldL: '#f3d27a', navy: '#1c2236', navy2: '#1f2640',
  cream: '#f2ead6', white: '#f6f2e8', winWhite: '#f2ede1',
  skin: '#e6b282', skinD: '#c98d5c', terra: '#d4936a', lapis: '#2c56b0', turq: '#3fa6a0',
  diskRed: '#c8372b', diskDark: '#7a1c14', rayRed: '#c23a2a', hand: '#b4452c', handDark: '#5a1c10',
  wig: '#9a6a18', wigD: '#7a4e10', lip: '#b6443a',
} as const;
const BAND = [TW.red, TW.blue, TW.yellow, TW.green]; // 埃及边框四色轮换

export const W = 1280;
export const H = 720;

// ---- 确定性随机（mulberry32 标准闭包形：a 在闭包内跨调用推进；禁 Math.random/Date）----
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const mx = (a: number, b: number, u: number) => a + (b - a) * u;
const hex2rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** 笔迹落金：字形原色向亮金 (246,200,70) 混合（写出余辉用） */
export const mixGold = (a: string, t: number) => {
  const A = hex2rgb(a), b = [246, 200, 70];
  const c = A.map((v, i) => Math.round(v + (b[i] - v) * clamp01(t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
const easeOutBack = (u: number) => { const c1 = 1.35, c3 = c1 + 1, t = u - 1; return 1 + c3 * t * t * t + c1 * t * t; };
const backIn = (u: number) => { const c1 = 1.5, c3 = c1 + 1; return c3 * u * u * u - c1 * u * u; };

// ---------------- 象形字函数表（局部坐标原点居中，~78px 设计框；借鉴源 GL 表重写为 path d） ----------------
const ell = (cx: number, cy: number, rx: number, ry: number) =>
  `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy}`;
type Stroke = { d: string; f?: boolean };
type GlyphDef = { h: number; cols: string[]; strokes: Stroke[]; water?: boolean };
/** 水纹字：三行折线随相位步进（12fps 步进、4 步一循环） */
export const waterD = (ph: number): Stroke[] => {
  const rows: Stroke[] = [];
  for (let r = -1; r <= 1; r++) {
    let d = '';
    for (let i = 0; i <= 16; i++) {
      const x = -21 + i * 2.625;
      const yy = r * 9 + ((((i + ph) % 2) + 2) % 2 < 1 ? -3 : 3);
      d += i ? ` L ${x.toFixed(1)} ${yy.toFixed(1)}` : `M ${x.toFixed(1)} ${yy.toFixed(1)}`;
    }
    rows.push({ d });
  }
  return rows;
};
export const GL: Record<string, GlyphDef> = {
  ankh: { h: 60, cols: [TW.blue, TW.green, TW.black, TW.red], strokes: [{ d: ell(0, -17, 8, 11) }, { d: 'M -16 -3 L 16 -3' }, { d: 'M 0 -5 L 0 29' }] },
  sun: { h: 40, cols: [TW.black, TW.blue, TW.red], strokes: [{ d: ell(0, 0, 15, 15) }, { d: ell(0, 0, 4, 4), f: true }] },
  bread: { h: 26, cols: [TW.red, TW.blue, TW.green], strokes: [{ d: 'M -19 9 A 19 19 0 0 1 19 9 Z' }, { d: 'M -12 4 L 12 4' }] },
  reed: { h: 62, cols: [TW.black, TW.green, TW.red], strokes: [{ d: 'M -2 29 Q -11 0 1 -29 Q 7 -2 4 29' }, { d: 'M 1 -29 Q 9 -31 10 -24' }] },
  owl: { h: 60, cols: [TW.black, TW.blue], strokes: [{ d: ell(3, 6, 12, 19) }, { d: ell(-2, -18, 10, 10) }, { d: ell(-6, -19, 2.4, 2.4), f: true }, { d: ell(2, -19, 2.4, 2.4), f: true }, { d: 'M -2 -14 L -3 -9' }, { d: 'M 9 22 L 18 29' }, { d: 'M -3 24 L -5 30' }, { d: 'M 4 24 L 3 30' }] },
  falcon: { h: 60, cols: [TW.black, TW.red, TW.blue], strokes: [{ d: ell(-6, -20, 7, 7), f: true }, { d: 'M -12 -21 L -19 -16 L -11 -15 Z', f: true }, { d: 'M -8 -19 Q 2 -21 12 -17 L 8 18 Q -2 22 -10 16 Z' }, { d: 'M 8 16 L 20 30 L 6 27 Z', f: true }, { d: 'M -3 19 L -5 30' }, { d: 'M 2 19 L 1 30' }, { d: 'M -1 -8 Q 10 0 12 14' }] },
  heron: { h: 64, cols: [TW.green, TW.black, TW.blue], strokes: [{ d: 'M -20 -22 L -8 -26 Q 0 -28 -1 -18 Q -6 -8 2 -2' }, { d: 'M -5 2 Q 8 -4 21 4 Q 16 14 -1 10 Z' }, { d: 'M 4 11 L 2 31' }, { d: 'M 10 11 L 12 31' }, { d: 'M 18 9 L 24 14' }] },
  snake: { h: 30, cols: [TW.green, TW.black, TW.red], strokes: [{ d: 'M 22 8 C 10 -4 4 14 -6 6 C -14 0 -16 -4 -20 -2' }, { d: 'M -20 -2 L -23 -9' }, { d: 'M -17 -3 L -15 -10' }] },
  eye: { h: 36, cols: [TW.green, TW.black, TW.blue], strokes: [{ d: 'M -18 0 Q 0 -12 18 0 Q 0 9 -18 0 Z' }, { d: ell(0, -1, 4.5, 4.5), f: true }, { d: 'M -18 -12 Q 0 -20 20 -11' }, { d: 'M -4 6 L -6 16' }, { d: 'M 6 5 Q 14 18 4 16' }] },
  cartouche: { h: 74, cols: [TW.black, TW.red], strokes: [{ d: ell(0, -2, 15, 31) }, { d: 'M -14 33 L 14 33' }, { d: ell(0, -18, 5, 5) }, { d: 'M -7 -2 L 7 -2' }, { d: 'M -6 8 L -3 13 L 0 8 L 3 13 L 6 8' }] },
  scarab: { h: 46, cols: [TW.blue, TW.black], strokes: [{ d: ell(0, 6, 10, 14), f: true }, { d: ell(0, -11, 6, 6), f: true }, { d: 'M -9 -2 L -17 -6' }, { d: 'M -9 6 L -17 6' }, { d: 'M -9 14 L -17 17' }, { d: 'M 9 -2 L 17 -6' }, { d: 'M 9 6 L 17 6' }, { d: 'M 9 14 L 17 17' }] },
  seated: { h: 58, cols: [TW.red, TW.black, TW.blue], strokes: [{ d: ell(-2, -21, 6.5, 6.5), f: true }, { d: 'M -6 -13 L 4 -13 L 6 6 L 16 8 L 17 18 L -10 18 L -10 2 Z', f: true }, { d: 'M -6 -8 L -17 -16' }, { d: 'M -14 26 L 18 26' }] },
  djed: { h: 62, cols: [TW.blue, TW.green], strokes: [{ d: 'M -6 29 L -6 -10' }, { d: 'M 6 29 L 6 -10' }, { d: 'M -13 -12 L 13 -12' }, { d: 'M -13 -17 L 13 -17' }, { d: 'M -13 -22 L 13 -22' }, { d: 'M -13 -27 L 13 -27' }, { d: 'M -12 29 L 12 29' }] },
  shen: { h: 42, cols: [TW.red, TW.blue], strokes: [{ d: ell(0, -4, 13, 13) }, { d: 'M -14 13 L 14 13' }] },
  jug: { h: 50, cols: [TW.red, TW.green, TW.blue], strokes: [{ d: 'M -6 -22 L 6 -22 L 5 -14 Q 16 -6 12 12 Q 8 22 0 22 Q -8 22 -12 12 Q -16 -6 -5 -14 Z' }, { d: 'M -10 0 L 10 0' }] },
  lotus: { h: 56, cols: [TW.green, TW.blue], strokes: [{ d: 'M 0 27 L 0 -6' }, { d: 'M 0 -6 L -12 -18 L -6 -26 L 0 -16 L 6 -26 L 12 -18 Z' }] },
  nfr: { h: 56, cols: [TW.black, TW.red], strokes: [{ d: ell(0, 12, 10, 14) }, { d: 'M 0 -2 L 0 -26' }, { d: 'M -6 -18 L 6 -18' }, { d: 'M -6 -12 L 6 -12' }] },
  strokes3: { h: 34, cols: [TW.red, TW.black], strokes: [{ d: 'M -8 -14 L -8 14' }, { d: 'M 0 -14 L 0 14' }, { d: 'M 8 -14 L 8 14' }] },
  feather: { h: 60, cols: [TW.blue, TW.green, TW.black], strokes: [{ d: 'M -2 29 Q -8 -10 4 -29 Q 12 -18 6 0 Q 3 15 2 29' }] },
  mouth: { h: 20, cols: [TW.red], strokes: [{ d: 'M -18 0 Q 0 -9 18 0 Q 0 9 -18 0 Z' }] },
  water: { h: 30, cols: [TW.blue], water: true, strokes: [] },
};
const GN = Object.keys(GL);

/** 字形实例 */
export type GlyphInst = { n: string; x: number; y: number; s: number; col: string; ph: number };
/** 栏位（源 GROUPS ×2/3）：[分栏 x 列表, y0, y1] */
const GROUPS: Array<[number[], number, number]> = [
  [[52, 103, 153, 204], 44, 377],
  [[568, 621, 674, 728, 781], 44, 301],
  [[1040, 1091, 1142, 1193, 1244], 168, 588],
  [[199, 244], 409, 590],
];
/** 种子化排布（rng 1350）：同栏不相邻重复、同栏同字形 ≤3、圣甲虫/水纹降权 60%、保底 ≥6 水纹 */
export const GLYPHS: GlyphInst[] = (() => {
  const r = mulberry32(1350);
  const out: GlyphInst[] = [];
  for (const [xs, y0, y1] of GROUPS) {
    for (let k = 0; k < xs.length - 1; k++) {
      const used: Record<string, number> = {};
      const cx = (xs[k] + xs[k + 1]) / 2;
      let y = y0 + 5.3, prev = '';
      for (;;) {
        let n: string;
        do { n = GN[(r() * GN.length) | 0]; } while (n === prev || (used[n] ?? 0) > 2 || ((n === 'scarab' || n === 'water') && r() < 0.6));
        prev = n; used[n] = (used[n] ?? 0) + 1;
        const gl = GL[n];
        const s = ((xs[k + 1] - xs[k]) / 78) * (1.0 + r() * 0.14);
        if (y + gl.h * s > y1) break;
        out.push({ n, x: cx + (r() - 0.5) * 2.7, y: y + gl.h * s / 2, s, col: gl.cols[(r() * gl.cols.length) | 0], ph: r() * 2 });
        y += gl.h * s + 4 + r() * 3.3;
      }
    }
  }
  let nw = out.filter((q) => q.n === 'water').length;
  for (const q of out) {
    if (nw >= 6) break;
    if (['mouth', 'bread', 'strokes3', 'shen'].includes(q.n)) { q.n = 'water'; q.col = TW.blue; nw++; }
  }
  return out;
})();

/** 单字形渲染；rv<1 时逐笔写出（pathLength=100 归一 dash，每条 path 各自从头=天然笔顺）＋金色余辉 */
export const GlyphSprite: React.FC<{ q: GlyphInst; rv?: number; col?: string; glow?: number; ph?: number }> = ({ q, rv = 1, col, glow = 0, ph }) => {
  const cc = col ?? q.col;
  const dash = rv < 1 ? `${Math.max(rv * 100, 0.5).toFixed(2)} 1000` : undefined;
  const strokes = q.n === 'water' ? waterD(ph ?? 0) : GL[q.n].strokes;
  return (
    <g transform={`translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) scale(${q.s.toFixed(3)})`}
      style={glow > 0.02 ? { filter: `drop-shadow(0 0 ${(7 * glow).toFixed(1)}px rgba(255,200,80,${(0.9 * glow).toFixed(2)}))` } : undefined}>
      {strokes.map((st, i) => (
        <path key={i} d={st.d} fill={st.f && rv > 0.55 ? cc : 'none'} stroke={cc} strokeWidth={3.4}
          strokeLinecap="round" strokeLinejoin="round" pathLength={100} strokeDasharray={dash} />
      ))}
    </g>
  );
};

// ---------------- 写出引擎：每 4f 一个槽 ×6 字，0.36s(11f) 写完，同时约 18 字在写 ----------------
const WRITERS = (() => {
  const idx = GLYPHS.map((q, i) => i).filter((i) => !GL[GLYPHS[i].n].water);
  const r = mulberry32(77);
  for (let i = idx.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx;
})();
const WRITE_SLOT_F = 4, WRITE_DUR_F = 11, WRITE_N = 6;
const activeWrites = (f: number): Map<number, number> => {
  const m = new Map<number, number>();
  if (!WRITERS.length) return m;
  const s0 = Math.floor(f / WRITE_SLOT_F);
  for (let s = Math.max(0, s0 - 2); s <= s0; s++) {
    for (let m2 = 0; m2 < WRITE_N; m2++) {
      const gi = WRITERS[(s * WRITE_N + m2) % WRITERS.length];
      const p = clamp01((f - s * WRITE_SLOT_F) / WRITE_DUR_F);
      if (p < 1) m.set(gi, p);
    }
  }
  return m;
};
/** 静态字形层（跳过正在写出的字） */
export const GlyphField: React.FC<{ f: number }> = ({ f }) => {
  const skip = activeWrites(f);
  return <>{GLYPHS.map((q, i) => (GL[q.n].water || skip.has(i) ? null : <GlyphSprite key={i} q={q} />))}</>;
};
/** 水纹字流动层（12fps 步进相位） */
export const WaterField: React.FC<{ f: number }> = ({ f }) => {
  const ph = Math.floor(f * 0.4) * 0.5;
  return <>{GLYPHS.map((q, i) => (q.n === 'water' ? <GlyphSprite key={i} q={q} ph={ph + q.ph} /> : null))}</>;
};
/** 写出层：笔迹从亮金落回原色＋drop-shadow 金粉余辉（0.36s） */
export const GlyphWrites: React.FC<{ f: number }> = ({ f }) => {
  const nodes: React.ReactNode[] = [];
  activeWrites(f).forEach((p, gi) => {
    const q = GLYPHS[gi];
    const glow = 1 - p;
    nodes.push(<GlyphSprite key={gi} q={q} rv={Math.min(1, p * 1.35)} col={mixGold(q.col, glow * 0.85)} glow={glow} />);
  });
  return <>{nodes}</>;
};

// ---------------- 彩色几何边框（四色块＋米白缝＋黑分隔线） ----------------
export const Blocks: React.FC<{ x0: number; y0: number; x1: number; y1: number; len: number; off?: number }> = ({ x0, y0, x1, y1, len, off = 0 }) => {
  const hor = x1 - x0 > y1 - y0;
  const L = hor ? x1 - x0 : y1 - y0;
  const segs: React.ReactNode[] = [];
  for (let s = 0, k = off; s < L; s += len, k++) {
    const w = Math.max(Math.min(len - 4, L - s - 2), 1);
    segs.push(hor
      ? <rect key={s} x={x0 + s + 2} y={y0 + 2} width={w} height={y1 - y0 - 4} fill={BAND[((k % 4) + 4) % 4]} />
      : <rect key={s} x={x0 + 2} y={y0 + s + 2} width={x1 - x0 - 4} height={w} fill={BAND[((k % 4) + 4) % 4]} />);
    segs.push(hor
      ? <rect key={`b${s}`} x={x0 + s} y={y0} width={1.3} height={y1 - y0} fill={TW.black} />
      : <rect key={`b${s}`} x={x0} y={y0 + s} width={x1 - x0} height={1.3} fill={TW.black} />);
  }
  return <>{segs}<rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="none" stroke={TW.black} strokeWidth={1.3} /></>;
};

// ---------------- 墙面（灰泥斑驳 feTurbulence ＋ 发丝裂纹）＋ 栏位红线 ＋ 字形 ----------------
const CRACKS: string[] = (() => {
  const r = mulberry32(5);
  const out: string[] = [];
  const seeds: Array<[number, number, number]> = [[0, 407, 0.1], [467, 0, 1.3], [807, 0, 1.1], [1000, 653, -0.9], [253, 720, -1.2], [1280, 280, 2.9]];
  for (const [x0, y0, a0] of seeds) {
    let a = a0, x = x0, y = y0;
    let d = `M ${x} ${y}`;
    for (let s = 0; s < 34; s++) {
      a += (r() - 0.5) * 0.7; x += Math.cos(a) * 9.3; y += Math.sin(a) * 9.3;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      if (r() < 0.08) d += ` M ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    out.push(d);
  }
  return out;
})();

/** 全局 SVG 滤镜 defs（每镜头挂一次） */
export const WallDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
    <defs>
      <filter id="tw-plaster" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.009" numOctaves="4" seed="13" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.1 1.1 1.1 0 -1.05" result="a" />
        <feComposite in="SourceGraphic" in2="a" operator="in" />
      </filter>
      <filter id="tw-age" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.007" numOctaves="4" seed="99" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.55  0 0 0 0 0.42  0.7 0.7 0.7 0 -0.42" />
      </filter>
      <filter id="tw-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.14  0 0 0 0 0.08  0.5 0.5 0.5 0 -0.72" />
      </filter>
    </defs>
  </svg>
);

/** 墙本体：底色＋斑驳＋裂纹＋栏位红线＋静态字形（跳过在写的）＋水纹＋写出层 */
export const WallCore: React.FC<{ f: number }> = ({ f }) => (
  <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
    <rect width={W} height={H} fill={TW.wall2} />
    <rect width={W} height={H} fill={TW.wall} filter="url(#tw-plaster)" />
    {CRACKS.map((d, i) => <path key={i} d={d} fill="none" stroke="rgba(90,70,50,.5)" strokeWidth={0.9} />)}
    {GROUPS.map(([xs, y0, y1], gi) => xs.map((x, xi) => (
      <line key={`${gi}-${xi}`} x1={x} y1={y0} x2={x} y2={y1} stroke={TW.rule} strokeWidth={1.7} strokeLinecap="round" />
    )))}
    <GlyphField f={f} />
    <WaterField f={f} />
    <GlyphWrites f={f} />
  </svg>
);

// ---------------- 窗（檐口/金楣/彩块框/白底）——阿顿日盘与光线在 motifs 动态层 ----------------
export const WindowFrame: React.FC = () => {
  const top: [number, number] = [225, 548], bot: [number, number] = [241, 532];
  const st = [TW.blue, TW.white, TW.red, TW.white, TW.green, TW.white];
  const segs: React.ReactNode[] = [];
  for (let i = 0; i < 30; i++) {
    const a = i / 30, b = (i + 1) / 30;
    const x1 = mx(top[0], top[1], a), x2 = mx(top[0], top[1], b), x3 = mx(bot[0], bot[1], b), x4 = mx(bot[0], bot[1], a);
    segs.push(<polygon key={i} points={`${x1.toFixed(1)},85 ${x2.toFixed(1)},85 ${x3.toFixed(1)},115 ${x4.toFixed(1)},115`} fill={st[i % 6]} />);
    segs.push(<line key={`l${i}`} x1={x1} y1={85} x2={x4} y2={115} stroke={TW.black} strokeWidth={0.8} />);
  }
  const teeth: React.ReactNode[] = [];
  for (let x = 243; x < 532; x += 9.3) teeth.push(<rect key={x} x={x} y={117.7} width={4} height={4.7} fill={TW.goldD} />);
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      {segs}
      <polygon points="225,85 548,85 532,99 241,99" fill="rgba(40,20,10,.16)" />
      <rect x={223} y={79} width={328} height={7.3} fill={TW.gold} stroke={TW.black} strokeWidth={1.3} />
      <rect x={239} y={115} width={296} height={8.7} fill={TW.gold} stroke={TW.black} strokeWidth={1.3} />
      {teeth}
      <Blocks x0={252} y0={123} x1={272} y1={373} len={27} off={1} />
      <Blocks x0={515} y0={123} x1={535} y1={373} len={27} off={3} />
      <Blocks x0={252} y0={353} x1={535} y1={373} len={27} off={0} />
      <rect x={272} y={123} width={243} height={10} fill={TW.blue} stroke={TW.black} strokeWidth={1.3} />
      <rect x={272} y={133} width={243} height={220} fill={TW.winWhite} />
      <rect x={272} y={133} width={243} height={6} fill={TW.blue} />
      <rect x={508} y={133} width={7} height={20} fill={TW.blue} />
      <polygon points="493,139 515,139 515,148" fill={TW.blue} />
      <rect x={272} y={133} width={243} height={220} fill="none" stroke={TW.black} strokeWidth={1.3} />
    </svg>
  );
};

// ---------------- 供桌／金椅／陶罐／蓝碗（静态陈设，源构图 ×2/3） ----------------
const Jar: React.FC<{ cx: number; y0: number; s: number; id: string }> = ({ cx, y0, s, id }) => {
  const g = 0.667 * s;
  const q = (pts: number[][]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ') + ' Z';
  return (
    <g transform={`translate(${cx} ${y0}) scale(${g.toFixed(3)})`}>
      <polygon points={q([[-26, 256], [-20, 256], [10, 196], [4, 196]])} fill={TW.white} stroke={TW.line} strokeWidth={3} />
      <polygon points={q([[26, 256], [20, 256], [-10, 196], [-4, 196]])} fill={TW.white} stroke={TW.line} strokeWidth={3} />
      <rect x={-24} y={198} width={48} height={6} fill={TW.white} stroke={TW.line} strokeWidth={3} />
      <path d="M -10 30 C -40 50 -38 120 -20 180 Q -6 222 0 228 Q 6 222 20 180 C 38 120 40 50 10 30 Z" fill={TW.terra} stroke={TW.line} strokeWidth={3.7} />
      <clipPath id={id}><path d="M -42 30 L 42 30 L 42 229 L -42 229 Z" /></clipPath>
      <g clipPath={`url(#${id})`}>
        <rect x={-40} y={52} width={80} height={6} fill={TW.green} />
        <rect x={-40} y={58} width={80} height={4} fill={TW.blue} />
        {[...Array(8)].map((_, i) => <polygon key={i} points={`${-36 + i * 9},62 ${-27 + i * 9},62 ${-31.5 + i * 9},82`} fill="#2f9a8a" />)}
        <ellipse cx={-14} cy={110} rx={6} ry={40} fill="rgba(255,230,200,.25)" />
      </g>
      <rect x={-9} y={18} width={18} height={14} fill={TW.terra} stroke={TW.line} strokeWidth={3} />
      <path d="M -14 20 Q -14 -6 0 -6 Q 14 -6 14 20 Z" fill="#3a302a" stroke={TW.line} strokeWidth={3} />
    </g>
  );
};
export const Props: React.FC = () => {
  const chairLeg = (x: number, k: number) => (
    <g key={k}>
      <path d={`M ${x - 6} 499 C ${x - 10.7} 527 ${x - 2.7} 553 ${x - 8} 581 L ${x + 8} 581 C ${x + 2.7} 553 ${x + 10.7} 527 ${x + 6} 499 Z`} fill={TW.gold} stroke={TW.line} strokeWidth={1.6} />
      <rect x={x - 10.7} y={581} width={21.3} height={17.3} fill={TW.white} stroke={TW.line} strokeWidth={1.3} />
      <rect x={x - 10.7} y={585.3} width={21.3} height={3.3} fill={TW.red} />
      <rect x={x - 10.7} y={592} width={21.3} height={3.3} fill={TW.red} />
    </g>
  );
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Jar cx={72} y0={429} s={1} id="jw1" />
      <Jar cx={141} y0={429} s={1} id="jw2" />
      <Jar cx={560} y0={478} s={0.72} id="jw3" />
      {/* 供桌 */}
      <polygon points="650,440 641,468 656,499 656,528 633,575 620,600 727,600 713,575 691,528 691,499 705,468 697,440"
        fill={TW.white} stroke={TW.line} strokeWidth={1.7} />
      <clipPath id="tw-tabclip"><polygon points="650,440 641,468 656,499 656,528 633,575 620,600 727,600 713,575 691,528 691,499 705,468 697,440" /></clipPath>
      <g clipPath="url(#tw-tabclip)">
        <rect x={620} y={501} width={110} height={6.7} fill={TW.blue} />
        <rect x={620} y={512} width={110} height={6.7} fill={TW.red} />
      </g>
      <rect x={547} y={427} width={253} height={13.3} fill={TW.white} stroke={TW.line} strokeWidth={1.7} />
      <line x1={549} y1={437} x2={797} y2={437} stroke={TW.red} strokeWidth={1.3} />
      {/* 供品：白圆锥面包／金碟／蓝葡萄／绿荷叶盘 */}
      <polygon points="557,427 563,393 568,379 573,393 580,427" fill={TW.white} stroke={TW.line} strokeWidth={1.5} />
      <path d="M 580 427 Q 581 403 605 401 Q 629 403 631 427 Z" fill={TW.gold} stroke={TW.line} strokeWidth={1.5} />
      <circle cx={605} cy={417} r={3.3} fill="none" stroke={TW.goldD} strokeWidth={1.3} />
      {[[595, 400], [604, 400], [613, 400], [599, 391], [609, 391], [604, 383], [590, 392], [618, 392], [595, 383], [613, 383], [604, 374]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={5.3} fill="#2c4aa0" stroke="#141a3a" strokeWidth={1} />
          <circle cx={x - 1.7} cy={y - 1.7} r={1.5} fill="rgba(160,190,255,.6)" />
        </g>
      ))}
      <ellipse cx={592} cy={361} rx={34.7} ry={6} fill={TW.green} stroke={TW.line} strokeWidth={1.3} />
      <line x1={561} y1={361} x2={623} y2={361} stroke="#1f6a40" strokeWidth={1} />
      {/* 金椅（细腿＋红白狮爪座＋红蓝块椅背） */}
      {chairLeg(972, 0)}{chairLeg(875, 1)}
      {[...Array(6)].map((_, i) => (
        <rect key={i} x={887 + i * 13.3} y={500} width={4.7} height={36} fill={TW.gold} stroke={TW.line} strokeWidth={0.9} />
      ))}
      <rect x={867} y={535} width={113} height={5.3} fill={TW.gold} stroke={TW.line} strokeWidth={1.2} />
      <path d="M 984 495 L 985 319 Q 987 305 995 305 Q 1003 307 1000 319 L 999 495 Z" fill={TW.gold} stroke={TW.line} strokeWidth={1.6} />
      {[...Array(9)].map((_, i) => (
        <rect key={i} x={989} y={329 + i * 18.7} width={6.7} height={8.7} fill={i % 2 ? TW.blue : TW.red} />
      ))}
      <rect x={861} y={489} width={140} height={10.7} fill={TW.gold} stroke={TW.line} strokeWidth={1.6} />
      {[...Array(7)].map((_, i) => <rect key={i} x={867 + i * 16} y={493} width={6.7} height={4} fill={TW.red} />)}
      {/* 脚边蓝碗 */}
      <path d="M 895 585 L 945 585 Q 941 600 920 600 Q 899 600 895 585 Z" fill="#3a78c8" stroke={TW.line} strokeWidth={1.3} />
      <ellipse cx={920} cy={585} rx={25} ry={3.3} fill="#8cc0ee" stroke={TW.line} strokeWidth={1.1} />
    </svg>
  );
};

// ---------------- 地线＋多层饰带＋深蓝带（开场逐条落下回弹）＋四周边框 ----------------
/** 饰带落场：自画外上方 easeIn 坠落 → 过冲 +6% → 回弹落定（3f；t0=起始帧） */
const dropY = (f: number, t0: number, dist = 760) => {
  const u = clamp01((f - t0) / 3);
  if (u <= 0) return -dist;
  if (u >= 1) return 0;
  if (u < 0.75) { const v = u / 0.75; return mx(-dist, dist * 0.06, v * v); }
  const v = (u - 0.75) / 0.25;
  return mx(dist * 0.06, 0, 1 - Math.pow(1 - v, 3));
};
export const GroundBands: React.FC<{ f: number }> = ({ f }) => {
  const navyDots: React.ReactNode[] = [];
  const r = mulberry32(7);
  for (let i = 0; i < 1300; i++) {
    navyDots.push(<rect key={i} x={r() * W} y={673 + r() * 47} width={0.7 + r() * 1.3} height={0.7 + r() * 1.3}
      fill={r() < 0.5 ? 'rgba(90,100,140,.35)' : 'rgba(5,8,20,.45)'} />);
  }
  const hair = (y: number) => <rect x={0} y={y} width={W} height={1.1} fill={TW.black} />;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      <g transform={`translate(0 ${dropY(f, 1).toFixed(1)})`}>{hair(599)}<rect x={0} y={599} width={W} height={4} fill={TW.black} /></g>
      <g transform={`translate(0 ${dropY(f, 2).toFixed(1)})`}>
        <rect x={0} y={603} width={W} height={70} fill={TW.cream} />{hair(608)}
      </g>
      <g transform={`translate(0 ${dropY(f, 3).toFixed(1)})`}><Blocks x0={-13} y0={609} x1={W + 13} y1={632} len={43} off={0} /></g>
      <g transform={`translate(0 ${dropY(f, 4.5).toFixed(1)})`}><rect x={0} y={640.7} width={W} height={10} fill={TW.yellow} />{hair(640)}{hair(651.3)}</g>
      <g transform={`translate(0 ${dropY(f, 5.5).toFixed(1)})`}><rect x={0} y={656} width={W} height={9.3} fill={TW.red} />{hair(655.3)}{hair(666)}</g>
      <g transform={`translate(0 ${dropY(f, 6.5).toFixed(1)})`}>{hair(672)}<rect x={0} y={673} width={W} height={47} fill={TW.navy} />{navyDots}</g>
    </svg>
  );
};
export const FrameBorders: React.FC<{ f: number }> = ({ f }) => (
  <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
    <g transform={`translate(0 ${dropY(f, 8, 60).toFixed(1)})`}><Blocks x0={-7} y0={4} x1={W + 7} y1={27} len={37} off={2} /></g>
    <g transform={`translate(${(-60 * (1 - clamp01((f - 9) / 3)) ** 2).toFixed(1)} 0)`}><Blocks x0={21} y0={27} x1={39} y1={599} len={31} off={1} /></g>
    <g transform={`translate(${(60 * (1 - clamp01((f - 10) / 3)) ** 2).toFixed(1)} 0)`}><Blocks x0={1260} y0={27} x1={1277} y1={599} len={31} off={3} /></g>
  </svg>
);

// ---------------- 壁画表面老化（斑驳 multiply ＋ 颗粒） ----------------
export const SurfaceAge: React.FC = () => (
  <>
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, mixBlendMode: 'multiply', opacity: 0.5 }}>
      <rect width={W} height={H} filter="url(#tw-age)" />
    </svg>
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, opacity: 0.06 }}>
      <rect width={W} height={H} filter="url(#tw-grain)" />
    </svg>
  </>
);

// ---------------- 镜头（zoom on point）与解析幕震 ----------------
export const Cam: React.FC<{ z: number; cx: number; cy: number; children: React.ReactNode }> = ({ z, cx, cy, children }) => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0',
      transform: `translate(${(W / 2 - cx * z).toFixed(2)}px, ${(H / 2 - cy * z).toFixed(2)}px) scale(${z.toFixed(4)})` }}>
      {children}
    </div>
  </div>
);
export type Impact = { f: number; amp: number; dur: number };
export const kickAt = (f: number, list: Impact[]): [number, number] => {
  let x = 0, y = 0;
  for (const it of list) {
    const u = (f - it.f) / it.dur;
    if (u < 0 || u > 1) continue;
    const env = (1 - u) * Math.cos(u * Math.PI * 3);
    x += it.amp * env * 0.8;
    y += it.amp * env * Math.sin(it.f * 1.7) * 0.6;
  }
  return [x, y];
};

// ---------------- 字幕条（米白字＋金左规＋深棕底，pop 入场） ----------------
export const Caption: React.FC<{ from: number; to: number; text: string }> = ({ from, to, text }) => {
  const f = useFrameAbs();
  if (f < from || f > to) return null;
  const u = clamp01((f - from) / 4);
  return (
    <div style={{ position: 'absolute', left: '50%', bottom: 26, transform: `translateX(-50%) translateY(${((1 - easeOutBack(u)) * 10).toFixed(1)}px) scale(${(0.92 + 0.08 * easeOutBack(u)).toFixed(3)})`,
      opacity: f > to - 3 ? clamp01((to - f) / 3).toFixed(2) : 1,
      background: 'rgba(28,16,10,.85)', borderLeft: `3px solid ${TW.gold}`, borderRadius: 6,
      padding: '7px 20px', fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 26,
      letterSpacing: 2, color: TW.cream, whiteSpace: 'nowrap', zIndex: 60 }}>
      {text}
    </div>
  );
};
