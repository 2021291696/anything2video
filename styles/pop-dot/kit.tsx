import React from 'react';

// ============================================================================
// pop-dot 图元库（扁平矢量弹性 MG · 战役 4 新卡样片正本）
// 风格句：六色高饱和平涂 + 每主色 SHADE 自明暗对 + 弹簧物理三段（预备→冲出→回弹）
//         + 元素 stagger 错峰 + shape-wipe 色块擦除转场 + crisp 选择性快门。
// 技法借鉴 mg-styles-15 demos/01-flat-vector (MIT, Vincentwei1021), TSX 重写
// （spring/springV/kick/pop 数学、SHADE 映射、ShapeWipe 三形、crisp 8% shutter、
//   ping 扩散环 / buzz 弧线 / 蒸汽 dasharray 小动件词汇——机制与参数级借鉴，零代码拷贝）。
// 红线：无渐变、形状无轮廓描边（线条类造型元素 rays/速度线/曲线除外）、全确定性（禁 Math.random/Date）。
// 坐标：屏幕 px；画布 1280×720@30，帧号 1 起含端点；弹簧参数以秒为单位（f=帧/30）。
// ============================================================================

/** 锁死色板：六主色高饱和平涂 + 各自 SHADE 自明暗对 + 派生辅助（U 天蓝=世界底/结构，CO 珊瑚=硬币/hero，
 *  SU 葵黄=强调/数字，MI 薄荷=存钱罐/正向，CR 奶油=地面/卡片/字，INK 墨夜=轮廓线/文字）。 */
export const PD = {
  U: '#2B2BFF', UD: '#1F1FCC', UL: '#4D4DFF', UT: '#3B3BFF', UP: '#A3A3FF', INKW: '#2A2962',
  CO: '#FF5A4E', COD: '#E0433A', COL: '#FF8C82',
  SU: '#FFC62B', SUD: '#F0A91A', SUE: '#D98F00',
  MI: '#2EE6A8', MID: '#1FC28C',
  CR: '#FFF6E9', CRD: '#F1E3CC', CRS: '#E6D3B8',
  INK: '#151433',
} as const;

/** SHADE 同色明暗对映射（签名纪律：每个主色的暗侧面/投影用自身 SHADE 色，非黑非灰非渐变） */
export const SHADE: Record<string, string> = {
  [PD.U]: PD.UD, [PD.CO]: PD.COD, [PD.SU]: PD.SUD, [PD.MI]: PD.MID, [PD.CR]: PD.CRD, [PD.INK]: '#0B0A22',
};
/** 未点亮态（窗口/凹陷）映射：主色的降饱和同伴 */
export const UNLIT: Record<string, string> = {
  [PD.MI]: PD.MID, [PD.CR]: PD.UL, [PD.CO]: PD.COD, [PD.SU]: PD.SUD, [PD.INK]: PD.INKW,
};

export const W = 1280;
export const H = 720;

// ---- 确定性随机（mulberry32 + hash；禁 Math.random/Date）----
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
export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const clamp01 = (x: number) => clamp(x, 0, 1);
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** 进度归一：x 在 [a,b] 内 → [0,1]（越界裁剪） */
export const inv = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
/** 帧号 → 秒（弹簧参数以秒计） */
export const F = (n: number) => n / 30;

// ---- 缓动族 ----
export const E = {
  inQ: (u: number) => u * u,
  outQ: (u: number) => 1 - (1 - u) ** 2,
  ioQ: (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
  inC: (u: number) => u ** 3,
  outC: (u: number) => 1 - (1 - u) ** 3,
  ioC: (u: number) => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2),
  outQt: (u: number) => 1 - (1 - u) ** 4,
  outB: (u: number, s = 1.70158) => 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2,
  inB: (u: number, s = 1.70158) => (s + 1) * u ** 3 - s * u ** 2,
} as const;
/** 拱形包络：0→1→0（跳弧/接触压扁共享） */
export const hump = (u: number) => 4 * u * (1 - u);

// ============================================================================
// 弹簧三件套（签名核心，锁死默认参数）：闭式阻尼弹簧 0→1（值/速度导数）+ 衰减余弦冲击。
// f=频率 Hz，z=阻尼比；pop 的 squash 用速度导数限幅 ±0.3，落定前 30% 用 hump 一起压回 1。
// ============================================================================
export const spring = (t: number, f = 2, z = 0.4): number => {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f, a = z * w, b = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-a * t) * (Math.cos(b * t) + (a / b) * Math.sin(b * t));
};
export const springV = (t: number, f = 2, z = 0.4): number => {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f, a = z * w, b = w * Math.sqrt(1 - z * z);
  return Math.exp(-a * t) * ((w * w) / b) * Math.sin(b * t);
};
export const kick = (t: number, t0: number, f = 3, z = 0.35): number => {
  if (t <= t0) return 0;
  const w = 2 * Math.PI * f, tt = t - t0;
  return Math.exp(-z * w * tt) * Math.sin(w * Math.sqrt(1 - z * z) * tt);
};
/** spring pop（锁死默认 f=2.4 / z=.42 / amt=.12 / pin=.9）：返回 [scale, squash]，
 *  squash=速度导数限幅 ±0.3；pin 秒后钉死在 1（缩放下无亚像素漂移）。 */
export const pop = (t: number, t0: number, f = 2.4, z = 0.42, amt = 0.12, pin = 0.9): [number, number] => {
  const tt = t - t0;
  let s = spring(tt, f, z);
  let k = clamp((springV(tt, f, z) / (2 * Math.PI * f)) * amt * 2, -0.3, 0.3);
  const wp = E.ioQ(inv(pin * 0.7, pin, tt));
  s = lerp(s, 1, wp);
  k = lerp(k, 0, wp);
  return [s, k];
};
/** 帧版 pop：f0 为拍入帧（1 起绝对帧） */
export const popF = (f: number, f0: number, fo = 2.4, zo = 0.42, amt = 0.12, pin = 0.9): [number, number] =>
  pop(F(f - f0), 0, fo, zo, amt, pin);

/** pop 结果 → CSS transform（sx=s/(1+k)、sy=s*(1+k)：k>0 纵向拉长横向压缩）。
 *  origin 传 transformOrigin（弹簧落定锚点：落地件 '50% 100%'，中心件 '50% 50%'）。
 *  ⚠ CSS transform 的 scale() 两参必须逗号分隔（空格分隔只在 SVG transform attribute 里合法）。 */
export const popStyle = (s: number, k: number, origin = '50% 100%'): React.CSSProperties => {
  const sc = Math.max(s, 0.001);
  return {
    transform: `scale(${(sc / (1 + k)).toFixed(4)}, ${(sc * (1 + k)).toFixed(4)})`,
    transformOrigin: origin,
  };
};

// ============================================================================
// 象限节拍网格（签名件）：全屏 2×2 clipPath，每象限一个内容 burst（对位节拍错峰）。
// ============================================================================
export const QuadrantGrid: React.FC<{f: number; qAt: [number, number, number, number]; render: (qi: number, live: boolean) => React.ReactNode}> =
({f, qAt, render}) => (
  <>
    {[0, 1, 2, 3].map((qi) => {
      const x0 = qi % 2 === 0 ? 0 : W / 2, y0 = qi < 2 ? 0 : H / 2;
      const live = f >= qAt[qi];
      return (
        <div key={qi} style={{position: 'absolute', left: x0, top: y0, width: W / 2, height: H / 2, overflow: 'hidden', display: live ? 'block' : 'none'}}>
          {render(qi, live)}
        </div>
      );
    })}
  </>
);

// ============================================================================
// ShapeWipe（签名转场）：色块形状自 origin 放大盖满 → 缝帧下换景 → 自新 origin 揭开。
// 三形：circle 圆 / pill 大圆角矩形 / half 半圆（半圆走自上方压落变体）。
// crisp 纪律：平涂色块擦除边缘只取 8% 运动模糊跨度（帧量化 + 8% 残余），避免色块边缘糊出「渐变感」。
// ============================================================================
export type WipeSpec = {
  s: number; // 缝帧（盖满瞬间）
  shape: 'circle' | 'pill' | 'half';
  col: string;
  c: [number, number]; // 盖入 origin
  r: [number, number]; // 揭开 origin
};
const WIPE_COVER = 6;
const WIPE_REVEAL = 9;
/** crisp 快门：帧中心量化后只保留 k 比例的亚帧运动（k=.08 即 8% shutter） */
export const crisp = (f: number, k = 0.08): number => {
  const f0 = Math.round(f);
  return f0 + (f - f0) * k;
};
export const ShapeWipe: React.FC<{f: number; wipe: WipeSpec}> = ({f, wipe}) => {
  let phase: 'cover' | 'reveal' | null = null;
  let P = 0;
  if (f >= wipe.s - WIPE_COVER && f <= wipe.s) { phase = 'cover'; P = (f - (wipe.s - WIPE_COVER)) / WIPE_COVER; }
  else if (f > wipe.s && f <= wipe.s + WIPE_REVEAL) { phase = 'reveal'; P = 1 - (f - wipe.s) / WIPE_REVEAL; }
  if (!phase) return null;
  const fc = crisp(f, 0.08);
  const e = E.ioQ(P);
  if (wipe.shape === 'half') {
    // 半圆压落变体：巨大穹顶（chord 以下为填充区，凸边向上）自上方加速砸落——
    // cover：chord 从画布上方 1.2H 砸到 1.15H（全盖）；reveal：穹顶继续下坠出画（自顶部揭开）。
    const yeCover = lerp(-1.2 * H, 1.15 * H, E.inQ(P));
    const yeReveal = lerp(1.15 * H, 2.8 * H, E.outC(1 - P));
    const ye = phase === 'cover' ? yeCover : yeReveal;
    const R = W / 2 + 200;
    return (
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, zIndex: 40, pointerEvents: 'none'}}>
        <path d={`M-100 ${ye.toFixed(1)} A ${R} ${R} 0 0 1 ${W + 100} ${ye.toFixed(1)} Z`} fill={wipe.col} />
      </svg>
    );
  }
  // 覆盖半径：origin 到最远角的距离（+余量），scale 对数插值（源码 W2 手法：log 空间从收聚到全开）
  const dmax = Math.max(
    ...([[0, 0], [W, 0], [0, H], [W, H]] as Array<[number, number]>).map(([x, y]) => Math.hypot(x - wipe.c[0], y - wipe.c[1])),
  );
  const R = dmax + 60;
  const sc = Math.exp(lerp(Math.log(0.03), Math.log(1), e)) * R;
  const [ox, oy] = phase === 'cover' ? wipe.c : wipe.r;
  if (wipe.shape === 'circle') {
    return (
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, zIndex: 40, pointerEvents: 'none'}}>
        <circle cx={ox} cy={oy} r={Math.max(sc, 0.1)} fill={wipe.col} />
      </svg>
    );
  }
  // pill：3000×1500 圆角矩形（rx=750 胶囊）绕 origin 缩放
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, zIndex: 40, pointerEvents: 'none'}}>
      <rect x={-1500} y={-750} width={3000} height={1500} rx={750} fill={wipe.col}
        transform={`translate(${ox} ${oy}) scale(${Math.max(sc / R, 0.001).toFixed(4)})`} />
    </svg>
  );
};

// ============================================================================
// 小动件词汇（借鉴源码词汇表，TSX 重写）：ping 扩散环 / buzz 弧线 / 速度线 / 蒸汽 dasharray / 放射 burst 线。
// ============================================================================
/** burstLine：一线段自 r0 长出到 r1 再尾缩（头部先出、尾部追上），生命周期 out→in */
export const burstLineGeom = (t: number, t0: number, r0: number, r1: number, durS = F(10)): [number, number] | null => {
  const h = E.outC(inv(t0, t0 + durS * 0.7, t));
  const tl = E.outC(inv(t0 + durS * 0.3, t0 + durS, t));
  if (t < t0 || tl >= 1) return null;
  return [lerp(r0, r1, tl), lerp(r0, r1, h)];
};
/** PingRing：ping 扩散环（r 扩 + stroke 收窄，寿命末消失） */
export const PingRing: React.FC<{f: number; at: number; x: number; y: number; r0?: number; r1?: number; w?: number; dur?: number; col?: string}> =
({f, at, x, y, r0 = 40, r1 = 120, w = 10, dur = 12, col = PD.CO}) => {
  const u = inv(at, at + F(dur), F(f));
  if (f < at || u >= 1) return null;
  const sw = w * (1 - u) ** 1.15;
  if (sw < 1.5) return null;
  return <circle cx={x} cy={y} r={lerp(r0, r1, E.outQ(u))} fill="none" stroke={col} strokeWidth={sw.toFixed(2)} style={{position: 'absolute', left: 0, top: 0}} />;
};
/** BuzzArc：手机震动弧线对（buzz 弧线×2 侧），带 pop 入场与寿命 */
export const BuzzArc: React.FC<{f: number; at: number; end: number; x: number; y: number; h?: number; col?: string; side?: 1 | -1}> =
({f, at, end, x, y, h = 64, col = PD.INK, side = 1}) => {
  if (f < at || f > end) return null;
  const [s] = popF(f, at, 4, 0.4);
  const wob = f < at + 6 ? 6 * Math.cos(2 * Math.PI * 15 * F(f - at)) : 0;
  const die = 1 - E.inB(inv(end - 4, end, f), 2);
  return (
    <g style={{position: 'absolute', left: 0, top: 0}}
      transform={`translate(${(x + wob * side).toFixed(2)} ${(y - 8 * Math.sin(2 * Math.PI * 12 * F(f))).toFixed(2)}) scale(${(Math.max(s, 0.01) * die).toFixed(3)})`}>
      {[0, 1].map((k) => (
        <path key={k} d={`M${side * (34 + k * 16)} ${-h / 2} Q${side * (48 + k * 16)} 0 ${side * (34 + k * 16)} ${h / 2}`}
          fill="none" stroke={col} strokeWidth={6 - k * 1.5} strokeLinecap="round" />
      ))}
    </g>
  );
};
/** SpeedLines：mover 身后拖尾线组（seeded 长短错落） */
export const SpeedLines: React.FC<{f: number; from: number; to: number; x: number; y: number; len?: number; n?: number; gap?: number; seed?: number; col?: string; dir?: 1 | -1; vertical?: boolean}> =
({f, from, to, x, y, len = 110, n = 4, gap = 15, seed = 21, col = PD.CR, dir = -1, vertical = false}) => {
  if (f < from || f > to) return null;
  const u = clamp01((f - from) / (to - from));
  const o = u < 0.25 ? u / 0.25 : u > 0.75 ? (1 - u) / 0.25 : 1;
  const rnd = mulberry32(seed);
  const lines = [];
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * gap + (rnd() - 0.5) * 6;
    const l = len * (0.55 + rnd() * 0.45) * (1 - u * 0.25);
    lines.push(vertical
      ? <line key={i} x1={x + off} y1={y + (dir < 0 ? 0 : 0)} x2={x + off} y2={y + l} stroke={col} strokeWidth={4 + rnd() * 3} strokeLinecap="round" opacity={o.toFixed(2)} />
      : <line key={i} x1={x} y1={y + off} x2={x + dir * l} y2={y + off} stroke={col} strokeWidth={4 + rnd() * 3} strokeLinecap="round" opacity={o.toFixed(2)} />);
  }
  return <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>{lines}</svg>;
};
/** Steam：dasharray 流动曲线（蒸汽/现金流），offset 随帧推进（确定性） */
export const Steam: React.FC<{f: number; x: number; y: number; d: string; col?: string; swd?: number; speed?: number; seedShift?: number}> =
({f, x, y, d, col = PD.CR, swd = 9, speed = 150, seedShift = 0}) => (
  <g transform={`translate(${x} ${y})`}>
    <path d={d} fill="none" stroke={col} strokeWidth={swd} strokeLinecap="round"
      strokeDasharray="46 260" strokeDashoffset={(-(F(f) * speed + seedShift) % 306).toFixed(2)} />
  </g>
);
/** Rays：hero 放射线（12 根 round-cap 线绕中心 burst，outB 弹出） */
export const Rays: React.FC<{f: number; at: number; x: number; y: number; r0?: number; len?: number; n?: number; col?: string; w?: number; spin?: number}> =
({f, at, x, y, r0 = 90, len = 46, n = 12, col = PD.CO, w = 12, spin = 0.14}) => {
  if (f < at) return null;
  const rays = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + F(f) * spin;
    const u = E.outB(inv(at + i * F(0.6), at + F(9) + i * F(0.6), F(f)), 2.2);
    if (F(f) < at + i * F(0.6)) continue;
    const rr0 = r0, rr1 = r0 + len * u;
    rays.push(
      <line key={i} x1={x + Math.cos(a) * rr0} y1={y + Math.sin(a) * rr0}
        x2={x + Math.cos(a) * rr1} y2={y + Math.sin(a) * rr1} stroke={col} strokeWidth={w} strokeLinecap="round" />,
    );
  }
  return <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>{rays}</svg>;
};

// ============================================================================
// 弹性幕震（签名：kick 衰减余弦，解析确定，帧内连续）：冲击表对位大拍。
// ============================================================================
export type Impact = {f: number; amp: number; fHz?: number; z?: number; dur?: number};
export const kickAt = (f: number, impacts: Impact[]): [number, number] => {
  const t = F(f);
  let dx = 0, dy = 0;
  for (const it of impacts) {
    const t0 = F(it.f);
    const k = kick(t, t0, it.fHz ?? 4, it.z ?? 0.42);
    const dur = it.dur ?? 10;
    const die = 1 - inv(dur * 0.7, dur, f - it.f); // dur 帧后强制归零（无残留）
    dx += 0.7 * k * it.amp * die;
    dy += k * it.amp * die;
  }
  return [dx, dy];
};

// ============================================================================
// 字幕卡（奶油 pill + 墨字，pop 入场 / hump 出场；字色逐块点亮 muted→ink）
// ============================================================================
export const DotCaption: React.FC<{f: number; from: number; to: number; text: string}> = ({f, from, to, text}) => {
  const [s, k] = popF(f, from, 2.6, 0.38, 0.25);
  const out = f > to ? E.inC(inv(to, to + 4, f)) : 0;
  if (f < from || out >= 1) return null;
  return (
    <div style={{position: 'absolute', left: '50%', bottom: 30, zIndex: 50, opacity: 1 - out,
      transform: `translateX(-50%) scale(${(Math.max(s, 0.001) * (1 - 0.15 * out) / (1 + k)).toFixed(4)} ${(Math.max(s, 0.001) * (1 + k) * (1 - 0.1 * out)).toFixed(4)})`,
      transformOrigin: '50% 100%'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '10px 30px 12px', background: PD.CR, borderRadius: 999, boxShadow: `0 6px 0 ${PD.CRD}`}}>
        {[...text].map((ch, i) => (
          <span key={i} style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 28, lineHeight: 1.25,
            color: PD.INK, display: 'inline-block', whiteSpace: 'pre'}}>{ch}</span>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 场景内通用：标注 pill（胶囊标签，SHADE 底条 + 主色面，pop 入场）
// ============================================================================
export const PillTag: React.FC<{f: number; at: number; x: number; y: number; text: string; col?: string; ink?: string; size?: number; rot?: number; z?: number; sub?: string}> =
({f, at, x, y, text, col = PD.SU, ink = PD.INK, size = 24, rot = -2, z = 6, sub}) => {
  const [s, k] = popF(f, at, 2.8, 0.4, 0.22);
  if (f < at) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, zIndex: z, opacity: f >= at ? 1 : 0,
      transform: `translate(-0%,-50%) rotate(${rot}deg) scaleX(${(Math.max(s, 0.001) / (1 + k)).toFixed(4)}) scaleY(${(Math.max(s, 0.001) * (1 + k)).toFixed(4)})`,
      transformOrigin: '0% 50%'}}>
      <div style={{display: 'inline-flex', alignItems: 'baseline', gap: 8, padding: '6px 20px 8px', background: col, borderRadius: 999, boxShadow: `0 5px 0 ${SHADE[col] ?? PD.UD}`, whiteSpace: 'nowrap'}}>
        <span style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900, fontSize: size, lineHeight: 1.2, color: ink}}>{text}</span>
        {sub ? <span style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: size * 0.6, color: ink, opacity: 0.72}}>{sub}</span> : null}
      </div>
    </div>
  );
};
