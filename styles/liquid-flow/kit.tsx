import React from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp01, lerp, cubicBezier} from '../common';
import {mulberry32} from '../common/kit/rand';

/**
 * liquid-flow 液态流动 · 图元库（自研风格卡，笔触参考 mg demos/07-liquid）
 *
 * 签名特征（SPEC 锁死项，评审依据）：
 * 1. 液态转场 LiquidWipe：遮罩路径手 K 波浪形前沿扫过画面，前沿 3-5 个错相位凸起（各自独立相位漂移）
 * 2. metaball 融合 GooFilter：feGaussianBlur(22px) → feColorMatrix alpha 阈值收紧（26a-12），
 *    两球靠近自动粘连——本片主体融合（水滴汇入汤面/拉丝）必须走此滤镜
 * 3. 拉丝-断裂-回弹 TeaStretch：主形离开留细颈，断裂瞬间两端各回弹 2-3 帧（damped 阻尼振）
 * 4. 缓动 LIQUID = cubic-bezier(0.22,1,0.36,1)：甩出类运动（转场/提起/泼入/文字）一律前快后慢；
 *    自由落体用 FALL=powIn(2.2)（重力加速例外，仍非线性）；全片禁匀速
 * 5. follow-through：次级液滴延迟主体 2-3 帧跟随，落地 landSquash 扁平化回弹；
 *    全部有机曲线（blobPath/wavyEdge 采样平滑），无直线边缘
 */

// ---- 色 token（SPEC 锁死项）----
export const LQ = {
  cream: '#f8f0dc', // 奶油幕底
  creamDeep: '#eedebd', // 底部暖影
  tea: '#c07a24', // 茶汤琥珀主
  teaBright: '#e5a34d', // 茶汤亮部
  teaDeep: '#8f4d12', // 茶汤深部
  foam: '#f4dfb6', // 泡沫浅
  leaf: '#5d7a2e', // 茶叶绿（点缀，全片 ≤2 次）
  ink: '#3a2310', // 品牌深棕
} as const;

// ---- 签名缓动（特征 4）----
/** 三参线性插值（传入的 t 已含进度缓动时的便捷式）。 */
export const mix = (t: number, a: number, b: number) => a + (b - a) * clamp01(t);
export const LIQUID = cubicBezier(0.22, 1, 0.36, 1); // 前快后慢：液体只会被"甩"出去
export const FALL = (t: number) => Math.pow(clamp01(t), 2.2); // 自由落体加速（非线性；甩出的例外仅此一处）

/** 阻尼回弹振（特征 3 断裂回弹 / 落地余波共用）：n=断裂后帧数，可见 2-3 帧后指数衰减。 */
export const damped = (n: number, amp: number, decay = 2.0, freq = 2.2) =>
  n <= 0 ? 0 : amp * Math.exp(-n / decay) * Math.sin(n * freq);

/** 手 K 分段缓动（特征 1 转场前沿驻留）：stops=[[t,v]...] 升序，段内用 LIQUID（甩出）推进，
 *  段间构成「扫入—驻留—再甩出」的手 K 节奏，避免 LIQUID 单段把前沿瞬间送出画面。 */
export const keyEase = (t: number, stops: Array<[number, number]>) => {
  const x = clamp01(t);
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [t0, v0] = stops[i - 1];
      const [t1, v1] = stops[i];
      return mix(LIQUID((x - t0) / (t1 - t0)), v0, v1);
    }
  }
  return stops[stops.length - 1][1];
};

/** 落地 squash（特征 5）：0-3 帧压扁至 0.55 → 指数回弹过冲 1.19 → 收定 1。返回体积近似守恒的 sx/sy。 */
export const landSquash = (n: number): {sx: number; sy: number} => {
  if (n < 0) return {sx: 1, sy: 1};
  const sy = n < 3 ? 1 - 0.45 * (1 - Math.pow(1 - n / 3, 2)) : 0.55 + 0.45 * (1 - Math.exp(-(n - 3) / 2.2) * Math.cos((n - 3) * 1.6));
  return {sx: 2 - sy, sy};
};

/** 下落拉伸（体积近似守恒）：fallProgress 0..1，中段拉伸峰值 0.35。 */
export const fallStretch = (t: number) => {
  const s = 0.35 * 4 * clamp01(t) * (1 - clamp01(t));
  return {sx: 1 - 0.6 * s, sy: 1 + s};
};

// ---- 有机曲线路径 ----
const fmt = (v: number) => v.toFixed(1);
const smoothClosed = (P: Array<[number, number]>) => {
  const n = P.length;
  let d = `M${fmt(P[0][0])},${fmt(P[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    d += `C${fmt(p1[0] + (p2[0] - p0[0]) / 6)},${fmt(p1[1] + (p2[1] - p0[1]) / 6)} ${fmt(p2[0] - (p3[0] - p1[0]) / 6)},${fmt(p2[1] - (p3[1] - p1[1]) / 6)} ${fmt(p2[0])},${fmt(p2[1])}`;
  }
  return `${d}Z`;
};
const smoothOpen = (P: Array<[number, number]>) => {
  const n = P.length;
  let d = `M${fmt(P[0][0])},${fmt(P[0][1])}`;
  for (let i = 0; i + 1 < n; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
    d += `Q${fmt((p1[0] + p2[0]) / 2 + (p2[0] - p0[0]) / 8)},${fmt((p1[1] + p2[1]) / 2 + (p2[1] - p0[1]) / 8)} ${fmt((p1[0] + p2[0]) / 2)},${fmt((p1[1] + p2[1]) / 2)}`;
    void p3;
  }
  return d;
};

/** 有机闭形（液滴/汤面隆起/圆盏液面）：多瓣正弦扰动的平滑闭环，无直线边缘。t 驱动缓慢蠕动。 */
export const blobPath = (cx: number, cy: number, r: number, opts: {wobble?: number; seed?: number; t?: number; lobes?: number} = {}) => {
  const {wobble = 0.05, seed = 7, t = 0, lobes = 5} = opts;
  const rnd = mulberry32(seed);
  const offs = Array.from({length: lobes}, (_, k) => ({ph: rnd() * Math.PI * 2, sp: 0.5 + rnd() * 0.9, am: wobble * (0.5 + rnd()) * (k % 2 === 0 ? 1 : 0.6)}));
  const P: Array<[number, number]> = [];
  const S = 18;
  for (let i = 0; i < S; i++) {
    const th = (i / S) * Math.PI * 2;
    let rr = r;
    offs.forEach((o, k) => {
      rr += r * o.am * Math.sin(o.ph + t * o.sp + th * (k + 3));
    });
    P.push([cx + rr * Math.cos(th), cy + rr * Math.sin(th)]);
  }
  return smoothClosed(P);
};

/** 波浪前沿采样（特征 1 的核，备用）：黄金角随机相位 + 各自漂移。 */
const crests = (n: number, p: number, seed: number, amp: number) => {
  const rnd = mulberry32(seed);
  return Array.from({length: n}, (_, i) => ({
    ph: i * 2.399 + rnd() * Math.PI, // 黄金角错相
    sp: 0.5 + rnd() * 0.9, // 慢漂
    am: amp * (0.78 + rnd() * 0.44),
  }));
};

/** 转场前沿偏移（特征 1 的核）：kπ 交替反相（任意时刻相邻瓣必反向 → 3-5 个分明凸起）
 *  + 全局行进 p*2.6 + 每瓣异相呼吸 0.85·sin(p·3.1+k·1.7)（错相位凸起随时间轮动）。 */
export const wipeOffset = (y01: number, p: number, seed: number, amp: number, lobes = 5) => {
  const rnd = mulberry32(seed);
  const ams = Array.from({length: lobes}, () => amp * (0.82 + rnd() * 0.36));
  let x = 0;
  for (let k = 0; k < lobes; k++) {
    const band = Math.exp(-Math.pow(clamp01(y01) * (lobes - 1) - k, 2) * 3.0); // 窄带：相邻凸起解耦可数
    const th = k * Math.PI + p * 2.6 + 0.85 * Math.sin(p * 3.1 + k * 1.7);
    x += ams[k] * band * Math.sin(th);
  }
  return x;
};

/** 液态转场（特征 1）：琥珀液层自左向右扫入。p=0..1；前沿 5 凸起错相位（大振幅+窄带，凸起分明）；
 *  前沿走 keyEase 手 K（扫入—画面中段驻留弄浪—甩出漫满），前沿亮缘 + 前沿液珠（goo 内自动粘连）。 */
export const LiquidWipe: React.FC<{p: number; seed?: number}> = ({p, seed = 21}) => {
  const W = 1280, H = 720;
  const fx = keyEase(p, [[0, -90], [0.34, 470], [0.66, 585], [1, W + 95]]);
  const pts: Array<[number, number]> = [];
  const N = 40;
  for (let i = 0; i < N; i++) {
    const y01 = i / (N - 1);
    pts.push([fx + wipeOffset(y01, p, seed, 84, 5), -70 + (H + 140) * y01]);
  }
  const edge = smoothOpen(pts);
  const body = `${edge} L-92,${fmt(pts[N - 1][1])} L-92,${fmt(pts[0][1])} Z`;
  // 前沿液珠：对齐 3 个凸起带（错相位随动），goo 内与前沿自动粘连
  const sats = [0, 1, 2].map((k) => {
    const y = 128 + k * 226;
    const x = fx + 44 + 16 * Math.sin(k * Math.PI + p * 2.6 + 0.85 * Math.sin(p * 3.1 + k * 1.7));
    return {x, y, r: 17 - k * 4};
  });
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <defs>
        <GooFilter id="lq-goo-wipe" />
        <linearGradient id="lq-grad-wipe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={LQ.teaBright} />
          <stop offset="0.55" stopColor={LQ.tea} />
          <stop offset="1" stopColor={LQ.teaDeep} />
        </linearGradient>
      </defs>
      <g filter="url(#lq-goo-wipe)">
        <path d={body} fill="url(#lq-grad-wipe)" />
        {sats.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="url(#lq-grad-wipe)" />
        ))}
      </g>
      <path d={edge} fill="none" stroke={LQ.foam} strokeWidth={9} strokeLinecap="round" opacity={0.85} />
      <path d={edge} fill="none" stroke={LQ.teaBright} strokeWidth={3} strokeLinecap="round" opacity={0.9} />
    </svg>
  );
};

/** 液层退场（特征 1 复用）：液面自上向下退去（揭露奶油舞台），下缘波浪 + 挂珠。p=0（满）→1（退光）。
 *  前沿 keyEase 手 K（快退—上中部驻留—甩出离场）。 */
export const LiquidDrain: React.FC<{p: number; seed?: number}> = ({p, seed = 33}) => {
  const W = 1280, H = 720;
  const fy = keyEase(p, [[0, -90], [0.4, 250], [0.72, 350], [1, H + 95]]);
  const pts: Array<[number, number]> = [];
  const N = 40;
  for (let i = 0; i < N; i++) {
    const x01 = i / (N - 1);
    pts.push([-70 + (W + 140) * x01, fy + wipeOffset(x01, p, seed, 52, 4)]);
  }
  const edge = smoothOpen(pts);
  const body = `${edge} L${fmt(pts[N - 1][0])},${H + 92} L${fmt(pts[0][0])},${H + 92} Z`;
  const hangs = [0.3, 0.62, 0.86].map((f, k) => {
    const i = Math.round(f * (N - 1));
    return {x: pts[i][0], y: pts[i][1] + 14 + k * 4, r: 13 - k * 3};
  });
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <defs>
        <GooFilter id="lq-goo-drain" />
        <linearGradient id="lq-grad-drain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={LQ.teaBright} />
          <stop offset="1" stopColor={LQ.teaDeep} />
        </linearGradient>
      </defs>
      <g filter="url(#lq-goo-drain)">
        <path d={body} fill="url(#lq-grad-drain)" />
        {hangs.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="url(#lq-grad-drain)" />
        ))}
      </g>
      <path d={edge} fill="none" stroke={LQ.foam} strokeWidth={7} strokeLinecap="round" opacity={0.8} />
    </svg>
  );
};

// ---- metaball 融合滤镜（特征 2，SPEC 指定配方：blur≥20px + alpha 阈值收紧）----
export const GooFilter: React.FC<{id: string; blur?: number}> = ({id, blur = 22}) => (
  <filter id={id} x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12" result="goo" />
    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
  </filter>
);

/** 茶汤渐变 defs（全镜头所有茶形体共用；userSpaceOnUse 屏幕坐标 → 拼接无缝）。 */
export const TeaGradDefs: React.FC<{id: string; y0?: number; y1?: number}> = ({id, y0 = 60, y1 = 790}) => (
  <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1={y0} x2="0" y2={y1}>
    <stop offset="0" stopColor={LQ.teaBright} />
    <stop offset="0.5" stopColor={LQ.tea} />
    <stop offset="1" stopColor={LQ.teaDeep} />
  </linearGradient>
);

/** 汤面缘线横向淡出渐变（中部透明——避免缘线横穿汤包隆起）。 */
export const EdgeFadeDefs: React.FC<{id: string}> = ({id}) => (
  <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1280" y2="0">
    <stop offset="0" stopColor={LQ.foam} stopOpacity={0.85} />
    <stop offset="0.3" stopColor={LQ.foam} stopOpacity={0.5} />
    <stop offset="0.5" stopColor={LQ.foam} stopOpacity={0} />
    <stop offset="0.7" stopColor={LQ.foam} stopOpacity={0.5} />
    <stop offset="1" stopColor={LQ.foam} stopOpacity={0.85} />
  </linearGradient>
);

/** 细颈肥胖带（特征 3 拉丝）：三次贝塞尔中轴 + 两端宽度 w0→w1 的填充带（goo 外绘制，既不断裂也不发黑）。 */
export const ribbonPath = (p0: [number, number], c0: [number, number], c1: [number, number], p1: [number, number], w0: number, w1: number) => {
  const bez = (t: number): [number, number] => {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * c0[0] + 3 * u * t * t * c1[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c0[1] + 3 * u * t * t * c1[1] + t * t * t * p1[1],
    ];
  };
  const pts: Array<[number, number]> = [];
  const M = 8;
  for (let i = 0; i <= M; i++) {
    const t = i / M;
    const [x, y] = bez(t);
    const [xa, ya] = bez(Math.min(1, t + 0.01));
    const [xb, yb] = bez(Math.max(0, t - 0.01));
    const dx = xa - xb, dy = ya - yb;
    const len = Math.max(1e-6, Math.hypot(dx, dy));
    const w = mix(t, w0, w1) / 2;
    pts.push([x + (-dy / len) * w, y + (dx / len) * w]);
  }
  const back: Array<[number, number]> = [];
  for (let i = M; i >= 0; i--) {
    const t = i / M;
    const [x, y] = bez(t);
    const [xa, ya] = bez(Math.min(1, t + 0.01));
    const [xb, yb] = bez(Math.max(0, t - 0.01));
    const dx = xa - xb, dy = ya - yb;
    const len = Math.max(1e-6, Math.hypot(dx, dy));
    const w = mix(t, w0, w1) / 2;
    back.push([x + (dy / len) * w, y + (-dx / len) * w]);
  }
  return smoothOpen([...pts, ...back]) + 'Z';
};

// ---- 汤面（池）----
/** 汤面波浪上缘：surfaceY 基线，4 瓣交替反相缓浪（kπ 交替 + 慢行进 + 每瓣异相呼吸，任意时刻皆有可读波浪）。
 *  返回开缘 path（供 stroke）与闭身 path。 */
export const poolEdge = (surfaceY: number, t: number, amp = 26, seed = 11) => {
  const rnd = mulberry32(seed);
  const ams = Array.from({length: 4}, () => amp * (0.8 + rnd() * 0.4));
  const phs = Array.from({length: 4}, () => rnd() * 1.0);
  const pts: Array<[number, number]> = [];
  const N = 30;
  for (let i = 0; i < N; i++) {
    const x01 = i / (N - 1);
    const x = -60 + 1400 * x01;
    let y = surfaceY;
    for (let k = 0; k < 4; k++) {
      const band = Math.exp(-Math.pow(x01 * 3 - k, 2) * 2.2);
      const th = k * Math.PI + t * 0.13 + 0.9 * Math.sin(t * 0.21 + k * 1.5) + phs[k];
      y += ams[k] * band * Math.sin(th);
    }
    pts.push([x, y]);
  }
  const edge = smoothOpen(pts);
  return {edge, body: `${edge} L1340,780 L-60,780 Z`};
};

/** 涟漪环（落地/融合反馈）：椭圆环扩散淡出。 */
export const Ripple: React.FC<{x: number; y: number; p: number; scale?: number; color?: string}> = ({x, y, p, scale = 1, color}) => (
  <ellipse cx={x} cy={y} rx={mix(clamp01(p), 8, 120 * scale)} ry={mix(clamp01(p), 3, 30 * scale)}
    fill="none" stroke={color ?? LQ.foam} strokeWidth={mix(clamp01(p), 5, 1)} opacity={(1 - clamp01(p)) * 0.65} />
);

/** 表面高光弧（crisp 层，画在 goo 组之后）。 */
export const SurfaceGloss: React.FC<{cx: number; cy: number; rx: number; ry: number; rot?: number; opacity?: number}> = ({cx, cy, rx, ry, rot = -18, opacity = 0.5}) => (
  <div style={{
    position: 'absolute', left: cx - rx, top: cy - ry, width: rx * 2, height: ry * 2,
    background: 'rgba(248,240,220,0.55)', borderRadius: '50%',
    transform: `rotate(${rot}deg)`, filter: 'blur(7px)', opacity,
  }} />
);

/** 泡沫微珠（seeded，可复现）：撒在汤面上的浅色小点。 */
export const FoamSpecks: React.FC<{surfaceY: number; count?: number; seed?: number; opacity?: number; t?: number}> = ({surfaceY, count = 9, seed = 5, opacity = 1, t = 0}) => {
  const rnd = mulberry32(seed);
  return (
    <svg width={1280} height={720} style={{position: 'absolute', inset: 0, opacity}}>
      {Array.from({length: count}, (_, i) => {
        const x = 140 + rnd() * 1000;
        const y = surfaceY + 8 + rnd() * 58;
        const r = 2 + rnd() * 4;
        const tw = 0.55 + 0.35 * Math.sin(t * 0.09 + i * 1.7);
        return <circle key={i} cx={x} cy={y} r={r} fill={LQ.foam} opacity={tw} />;
      })}
    </svg>
  );
};

/** 茶叶（点缀）：双弧叶形，旋转漂落。全片 ≤2 次。 */
export const Leaf: React.FC<{x: number; y: number; s?: number; rot?: number; opacity?: number}> = ({x, y, s = 1, rot = 0, opacity = 1}) => (
  <svg width={1280} height={720} style={{position: 'absolute', inset: 0, opacity}}>
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <path d={`M0,0 Q${fmt(16 * s)},${fmt(-9 * s)} ${fmt(34 * s)},0 Q${fmt(16 * s)},${fmt(9 * s)} 0,0 Z`} fill={LQ.leaf} opacity={0.82} />
      <path d={`M2,0 Q${fmt(16 * s)},${fmt(-2 * s)} ${fmt(31 * s)},0`} fill="none" stroke={LQ.cream} strokeWidth={1.1 * s} opacity={0.5} />
    </g>
  </svg>
);

/** 蒸汽缕（定帧微动效）：两缕 S 曲线上升 + 摇曳。 */
export const Steam: React.FC<{cx: number; y0: number; t: number; opacity?: number}> = ({cx, y0, t, opacity = 0.5}) => {
  const sway = (k: number) => Math.sin(t * 0.045 + k * 2.1) * 7;
  const path = (k: number, x0: number) =>
    `M${fmt(x0)},${fmt(y0)} C${fmt(x0 + sway(k) - 10)},${fmt(y0 - 46)} ${fmt(x0 + sway(k) + 12)},${fmt(y0 - 84)} ${fmt(x0 + sway(k))},${fmt(y0 - 128)}`;
  return (
    <svg width={1280} height={720} style={{position: 'absolute', inset: 0, opacity}}>
      {[0, 1].map((k) => (
        <path key={k} d={path(k, cx - 26 + k * 52)} fill="none" stroke={LQ.ink} strokeWidth={4.5} strokeLinecap="round" opacity={0.13 - k * 0.04} />
      ))}
    </svg>
  );
};

// ---- 幕底 ----
/** 奶油幕底：暖径向 + 底部暖影 + 轻暗角。全片镜头共用。 */
export const LqBackdrop: React.FC = () => (
  <AbsoluteFill style={{
    background: `radial-gradient(900px 620px at 50% 40%, ${LQ.cream} 0%, #f4e9cf 58%, ${LQ.creamDeep} 100%)`,
  }}>
    <AbsoluteFill style={{background: 'radial-gradient(1200px 800px at 50% 52%, transparent 62%, rgba(58,35,16,0.10) 100%)'}} />
  </AbsoluteFill>
);
