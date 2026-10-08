import React from 'react';

// ============================================================================
// amphora 图元库（阿提卡黑绘陶器 · 战役 4 批次④ 新卡样片正本）
// 风格句：黑釉剪影不描边 + 陶土亮橙刻线 + 紫红色带/白点三件套（零纹理零滤镜）
//         + 预渲条带取模滚动（回纹 P=60 / 莲苞链真实周期 P=76）+ 陶瓶滚筒转面 + 手写希腊铭文。
// 技法借鉴 huashu-art-motion scenes/03_greek 配方（MIT），TSX/Remotion 重写（零代码拷贝）。
// 配方要点照搬：剪影 #1b120d、刻线 #e8904c 1.5-2px、紫红 #8a2a37+白点 r≈2 间距 11-17px；
// 拉坯纹=水平条带噪声 ±9 + 560 条随机水平细线；莲苞链奇偶苞交替真实周期 76px；
// 滚整数周期首尾帧一样会判「没动」→ 全片加 22-48px/s 匀速漂移。
// 红线：全确定性（mulberry32/hash，禁 Math.random/Date/网络）。
// 坐标：屏幕 px，画布 1280×720@30，帧号 1 起含端点。
// ============================================================================

/** 锁死六色：陶土双橙 + 黑釉 + 紫红 + 白 + 刻线橙（RECON 配方原值，不增不减） */
export const AM = {
  CLAY: '#dc6a2f', // 陶土底
  CLAY_LIT: '#e8803f', // 亮陶土（瓶面板）
  GLAZE: '#1b120d', // 黑釉剪影
  PURPLE: '#8a2a37', // 紫红附加色
  WHITE: '#f6ead6', // 白彩/白点
  INCISE: '#e8904c', // 陶土亮橙刻线
} as const;

export const W = 1280;
export const H = 720;

// ---- 确定性随机（mulberry32 + hash；禁 Math.random/Date）----
// 注意：a 的状态必须挂在闭包外层——若写在内层每次调用都会重置回种子，
// 序列退化为常数（560 条线全部叠在一点的事故根因）。
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const hash1 = (n: number) => mulberry32((Math.floor(n) * 2654435761) % 2147483647 + 1013904223)();

// ---- 基础数学 ----
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const inv = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
export const ioQ = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
export const outC = (u: number) => 1 - (1 - u) ** 3;
export const hump = (u: number) => 4 * u * (1 - u);
/** 帧 → 秒 */
export const F = (n: number) => n / 30;

// ============================================================================
// 陶土底（拉坯纹配方，一次预渲成 dataURL；fbm 斑驳 ±30 + 水平条带噪声 ±9
// + 420 深点/120 浅点 + 5 条裂纹 + 暖心径向提亮 + 暗角。低分辨率 480×270 放大。）
// ============================================================================
const vnoise = (seed: number) => {
  const rng = mulberry32(seed);
  const g = new Float32Array(256 * 256);
  for (let i = 0; i < g.length; i++) g[i] = rng();
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = sm(x - xi), yf = sm(y - yi);
    const at = (ix: number, iy: number) => g[((iy & 255) << 8) | (ix & 255)];
    return lerp(lerp(at(xi, yi), at(xi + 1, yi), xf), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), xf), yf);
  };
};

let bgUrlCache: string | null = null;
/** 陶土底纹理（模块级懒渲染一次，内容不含帧号 → 逐帧确定性） */
export const terracottaBackdropUrl = (): string => {
  if (bgUrlCache) return bgUrlCache;
  const w = 480, h = 270;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const n1 = vnoise(11), n2 = vnoise(23);
  const base = [220, 106, 47]; // #dc6a2f
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let f = 0, amp = 36, fr = 1;
      for (let o = 0; o < 4; o++) { f += (n1(x * 0.016 * fr, y * 0.016 * fr) - 0.5) * 2 * amp; amp *= 0.5; fr *= 2.1; }
      const band = (n2(x * 0.006, y * 0.85) - 0.5) * 2 * 11; // 拉坯水平条带噪声 ±11
      const v = clamp01((base[0] + f + band) / 255);
      const i = (y * w + x) * 4;
      img.data[i] = 255 * v;
      img.data[i + 1] = 255 * v * (base[1] / base[0]);
      img.data[i + 2] = 255 * v * (base[2] / base[0]);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // 深浅斑点
  const rng = mulberry32(41);
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = `rgba(90,30,5,${(0.05 + rng() * 0.09).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(rng() * w, rng() * h, 0.6 + rng() * 1.6, 0, 7); ctx.fill();
  }
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(255,222,170,${(0.05 + rng() * 0.07).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(rng() * w, rng() * h, 0.6 + rng() * 1.3, 0, 7); ctx.fill();
  }
  // 暖心径向提亮
  const g1 = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.55);
  g1.addColorStop(0, 'rgba(255,190,120,0.16)'); g1.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);
  // 暗角（外沿 rgba(30,6,0,.62)）
  const g2 = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.49);
  g2.addColorStop(0, 'rgba(30,6,0,0)'); g2.addColorStop(1, 'rgba(30,6,0,0.62)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
  bgUrlCache = c.toDataURL();
  return bgUrlCache;
};

// ============================================================================
// 拉坯水平细线（560 条，独立 SVG 层——钩子 f1-8 分带扫现 + 常驻微闪）
// ============================================================================
export type WheelLine = { x: number; y: number; len: number; a: number; dark: boolean; reveal: number; ph: number };
export const WHEEL_LINES: WheelLine[] = (() => {
  const rng = mulberry32(7);
  const out: WheelLine[] = [];
  for (let i = 0; i < 560; i++) {
    out.push({ x: rng() * W, y: rng() * H, len: 150 + rng() * 900, a: 0.1 + rng() * 0.14, dark: rng() < 0.55, reveal: Math.floor(rng() * 8), ph: rng() * 6.28 });
  }
  return out;
})();

// ============================================================================
// 滚动纹带（预渲条带 dataURL + backgroundPositionX = -(off mod P)）
// 顶：回纹 周期 60px，7px 黑线，单元折线照配方；底：莲苞链 周期 76px
// （两个 38px 单元，奇数苞填紫红 → wrap 必须用 76，否则每 38px 跳色）。
// ============================================================================
export const BAND_PERIOD = { top: 60, bottom: 76 };
let topStripCache: string | null = null;
let botStripCache: string | null = null;

const stripCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  const S = 2; // 2x 抗糊
  c.width = w * S; c.height = h * S;
  const ctx = c.getContext('2d')!;
  ctx.scale(S, S);
  return { c, ctx };
};

/** 顶带回纹条带：宽 W+2P，单元 60px 折线 [[4,46],[4,0],[50,0],[50,34],[18,34],[18,14],[36,14],[36,22]] + 通长底线 */
export const meanderStripUrl = (): string => {
  if (topStripCache) return topStripCache;
  const P = BAND_PERIOD.top, bw = 46;
  const { c, ctx } = stripCanvas(W + 2 * P, bw);
  const unit = [[4, 46], [4, 0], [50, 0], [50, 34], [18, 34], [18, 14], [36, 14], [36, 22]];
  ctx.strokeStyle = AM.GLAZE; ctx.lineWidth = 7; ctx.lineJoin = 'miter'; ctx.lineCap = 'square';
  for (let k = -1; k < (W + 2 * P) / P + 1; k++) {
    ctx.beginPath();
    unit.forEach(([ux, uy], i) => (i ? ctx.lineTo(k * P + ux, uy) : ctx.moveTo(k * P + ux, uy)));
    ctx.stroke();
  }
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, 44.5); ctx.lineTo(W + 2 * P, 44.5); ctx.stroke();
  topStripCache = c.toDataURL();
  return topStripCache;
};

/** 底带莲苞链：周期 76px=两个 38px 单元，苞形圆弧+侧叶，奇数苞填紫红（wrap 必须用 76） */
export const lotusStripUrl = (): string => {
  if (botStripCache) return botStripCache;
  const P = BAND_PERIOD.bottom, bw = 46;
  const { c, ctx } = stripCanvas(W + 2 * P, bw);
  for (let k = -1; k < (W + 2 * P) / 38 + 1; k++) {
    const x0 = k * 38, purple = ((k % 2) + 2) % 2 === 1; // 奇数苞紫红
    ctx.fillStyle = purple ? AM.PURPLE : AM.GLAZE;
    ctx.beginPath(); // 苞：水滴形
    ctx.moveTo(x0 + 19, 4);
    ctx.bezierCurveTo(x0 + 30, 10, x0 + 30, 30, x0 + 19, 38);
    ctx.bezierCurveTo(x0 + 8, 30, x0 + 8, 10, x0 + 19, 4);
    ctx.fill();
    // 侧叶（细三角）
    ctx.fillStyle = AM.GLAZE;
    ctx.beginPath(); ctx.moveTo(x0 + 2, 38); ctx.quadraticCurveTo(x0 + 6, 16, x0 + 14, 8); ctx.lineTo(x0 + 10, 38); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x0 + 36, 38); ctx.quadraticCurveTo(x0 + 32, 16, x0 + 24, 8); ctx.lineTo(x0 + 28, 38); ctx.fill();
  }
  ctx.strokeStyle = AM.GLAZE; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 42); ctx.lineTo(W + 2 * P, 42); ctx.stroke();
  botStripCache = c.toDataURL();
  return botStripCache;
};

/** 滚动纹带组件（背景取模平移；dir=1 向右） */
export const StripBand: React.FC<{ y: number; strip: string; period: number; off: number; opacity?: number; h?: number }> =
  ({ y, strip, period, off, opacity = 1, h = 46 }) => {
    const px = -(((off % period) + period) % period);
    return (
      <div style={{position: 'absolute', left: 0, top: y, width: W, height: h, opacity,
        backgroundImage: `url(${strip})`, backgroundRepeat: 'repeat-x',
        backgroundSize: `${(W + 2 * period)}px ${h}px`, backgroundPositionX: `${px.toFixed(2)}px`}} />
    );
  };

// ============================================================================
// 手写希腊铭文（笔画表：每字母 1-3 段折线，单位格 0..1；字母高 ×(0.9-1.06) 随机、
// 基线 ±6% 抖、顶点 ±0.7px；Ο 画成小圆（字高 0.25），Ι 宽 2px——手写陶画味=不等高+小 o）
// ============================================================================
const GLYPH_STROKES: Record<string, number[][][]> = {
  'Α': [[[0, 1], [0.5, 0], [1, 1]], [[0.22, 0.55], [0.78, 0.55]]],
  'Λ': [[[0, 1], [0.5, 0], [1, 1]]],
  'Μ': [[[0, 1], [0, 0], [0.5, 0.55], [1, 0], [1, 1]]],
  'Π': [[[0, 1], [0, 0], [1, 0], [1, 1]]],
  'Η': [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  'Κ': [[[0, 0], [0, 1]], [[0.95, 0], [0.08, 0.55]], [[0.4, 0.4], [1, 1]]],
  'Σ': [[[0.9, 0.06], [0.1, 0.06], [0.1, 0.5], [0.9, 0.5], [0.9, 0.94], [0.1, 0.94]]],
  'Ε': [[[0.85, 0.04], [0.12, 0.04], [0.12, 0.96], [0.85, 0.96]], [[0.12, 0.5], [0.72, 0.5]]],
  'Υ': [[[0, 0], [0.5, 0.52]], [[1, 0], [0.5, 0.52]], [[0.5, 0.52], [0.5, 1]]],
  'Ρ': [[[0, 1], [0, 0]], [[0, 0.04], [0.5, 0.1], [0.5, 0.42], [0, 0.5]]],
  'Τ': [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]],
};
const GLYPH_ADV: Record<string, number> = { 'Ι': 0.28, 'Τ': 0.9, 'Ε': 0.82, 'Σ': 0.92 };

/** 一段手写希腊文。返回 SVG 宽度。Φ/Ο/Ι 特殊：Φ=圆+竖杆，Ο=小 o（0.25 字高），Ι=2px 宽杆 */
export const GreekText: React.FC<{ text: string; x: number; y: number; size: number; seed: number; color?: string; opacity?: number }> =
  ({ text, x, y, size, seed, color = AM.GLAZE, opacity = 1 }) => {
    const rng = mulberry32(seed);
    const sw = Math.max(2.2, size * 0.075);
    const els: React.ReactNode[] = [];
    let cx = x;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === ' ') { cx += size * 0.42; continue; }
      const hJ = size * (0.9 + rng() * 0.16); // 字母高 ×(0.9-1.06)
      const bJ = (rng() - 0.5) * size * 0.12; // 基线 ±6%
      const jit = () => (rng() - 0.5) * 1.4; // 顶点 ±0.7px
      if (ch === 'Ο') { // 签名：Ο 画成小圆（字高 0.25）
        const r = hJ * 0.125;
        els.push(<circle key={i} cx={cx + r} cy={y + bJ + hJ * 0.75} r={r} fill="none" stroke={color} strokeWidth={sw} />);
        cx += r * 2 + size * 0.3;
      } else if (ch === 'Φ') {
        const r = hJ * 0.3, ccx = cx + r + 2;
        els.push(<circle key={`f${i}`} cx={ccx} cy={y + bJ + hJ * 0.45} r={r} fill="none" stroke={color} strokeWidth={sw} />);
        els.push(<line key={`s${i}`} x1={ccx} y1={y + bJ} x2={ccx} y2={y + bJ + hJ} stroke={color} strokeWidth={sw} />);
        cx += r * 2 + size * 0.34;
      } else if (ch === 'Ι') {
        els.push(<line key={i} x1={cx + 1} y1={y + bJ} x2={cx + 1} y2={y + bJ + hJ} stroke={color} strokeWidth={2} />);
        cx += size * 0.3;
      } else {
        const strokes = GLYPH_STROKES[ch];
        if (!strokes) { cx += size * 0.4; continue; }
        els.push(<g key={i}>
          {strokes.map((s, k) => (
            <polyline key={k} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
              points={s.map(([px, py]) => `${(cx + px * hJ * 0.72 + jit()).toFixed(1)},${(y + bJ + py * hJ + jit()).toFixed(1)}`).join(' ')} />
          ))}
        </g>);
        cx += hJ * 0.72 * (GLYPH_ADV[ch] ?? 0.86) + size * 0.16;
      }
    }
    return <g opacity={opacity}>{els}</g>;
  };

// ============================================================================
// 共用小件：白点串（r≈2 间距 11-17px）/ 紫红色带 / 白点四瓣小花 / 玫瑰花饰
// ============================================================================
export const WhiteDotRow: React.FC<{ x: number; y: number; n: number; spacing?: number; r?: number; seed?: number; color?: string }> =
  ({ x, y, n, spacing = 14, r = 2, seed = 5, color = AM.WHITE }) => {
    const rng = mulberry32(seed);
    return <g>{Array.from({length: n}, (_, i) => (
      <circle key={i} cx={x + i * spacing + (rng() - 0.5) * 3} cy={y + (rng() - 0.5) * 3} r={r + rng() * 0.4} fill={color} />
    ))}</g>;
  };

export const PurpleBand: React.FC<{ x: number; y: number; w: number; h?: number }> = ({ x, y, w, h = 15 }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill={AM.PURPLE} />
    <WhiteDotRow x={x + 10} y={y + h / 2} n={Math.max(2, Math.floor((w - 16) / 14))} spacing={14} seed={x + y} />
  </g>
);

/** 白点四瓣小花 */
export const DotFlower: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 5 }) => (
  <g>
    {[0, 90, 180, 270].map((a) => (
      <circle key={a} cx={x + r * Math.cos((a * Math.PI) / 180)} cy={y + r * Math.sin((a * Math.PI) / 180)} r={2} fill={AM.WHITE} />
    ))}
    <circle cx={x} cy={y} r={1.6} fill={AM.PURPLE} />
  </g>
);

/** 玫瑰花饰：8 瓣黑椭圆 + 刻线分瓣 + 紫红心 */
export const Rosette: React.FC<{ x: number; y: number; r?: number; rot?: number }> = ({ x, y, r = 26, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot.toFixed(2)})`}>
    {Array.from({length: 8}, (_, i) => (
      <ellipse key={i} cx={0} cy={-r * 0.62} rx={r * 0.3} ry={r * 0.42} transform={`rotate(${i * 45})`} fill={AM.GLAZE} />
    ))}
    {Array.from({length: 8}, (_, i) => (
      <line key={i} x1={0} y1={-r * 0.3} x2={0} y2={-r * 0.95} transform={`rotate(${i * 45 + 22.5})`} stroke={AM.INCISE} strokeWidth={1.6} />
    ))}
    <circle cx={0} cy={0} r={r * 0.26} fill={AM.PURPLE} />
    <circle cx={0} cy={0} r={r * 0.26} fill="none" stroke={AM.INCISE} strokeWidth={1.4} />
  </g>
);

/** 棕叶饰（7 瓣肥叶扇 + 刻线中脉 + 台座——经典棕叶形） */
export const Palmette: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[-3, -2, -1, 0, 1, 2, 3].map((i) => {
      const a = i * 13.5;
      return (
        <g key={i} transform={`rotate(${a})`}>
          <ellipse cx={0} cy={-19} rx={7.2} ry={20} fill={AM.GLAZE} />
          <line x1={0} y1={-6} x2={0} y2={-33} stroke={AM.INCISE} strokeWidth={1.5} />
        </g>
      );
    })}
    <path d="M -15 2 Q 0 9 15 2 L 11 9 Q 0 14 -11 9 Z" fill={AM.GLAZE} />
  </g>
);
