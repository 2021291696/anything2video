// 速度方向拉伸 makeM / impact 预备-释放事件 / smearCap 解析模糊：技法借鉴 mg-styles-15 demos/08-morph (MIT, Vincentwei1021), TSX 重写
/**
 * morph.ts — MORPH 风格卡核心数学库（s34-morph 样片正本，可整库拷入 styles/<sku>/）。
 *
 * 签名特征实现（对应 SPEC 锁死项）：
 *  1. 路径对齐：所有互变形状 resample 成同一顶点数 N，统一绕向（normWinding），
 *     首顶点方位对应（orientTop 统一 12 点钟起步）+ 逐对最优循环对位（alignStart，防打结）。
 *  2. 复杂 A→B 走中介简形：城市→圆点→地图钉（M3a/M3b，各 12f）三段式。
 *  3. 形变全程 squash & stretch（v4.0 起默认走速度方向拉伸 morphPose/makeM，10-15% 带内）
 *     + 轻微旋转（±5°）+ 伴随位移（二次贝塞尔轨）。
 *  4. 速度曲线 cubic-bezier(0.7,0,0.3,1)（中段最快），起止各留 3 帧缓冲（morphProgress）。
 *  5. 轮廓连续过渡：弧长均匀重采样保证顶点沿轮廓等距分布，逐帧位移由缓动函数约束，无跳变。
 *  6. v4.0 新增：impact 事件系统（阻尼正弦冲击 + 预备压 0.3s→释放 0.12s）、smearCap 解析
 *     运动模糊（帧中心 ± 半快门两端采样的 alpha 渐变胶囊）——机制移植自 mg demos/08-morph。
 */
export type Pt = [number, number];

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const N_VERTS = 120; // 全部互变形状统一顶点数（签名特征1）

// ---------------------------------------------------------------- 多边形代数

function signedArea(P: Pt[]): number {
  let a = 0;
  for (let i = 0; i < P.length; i++) {
    const [x1, y1] = P[i];
    const [x2, y2] = P[(i + 1) % P.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** 统一绕向（符号面积恒正），保证逐点插值不打结的前提之一。 */
export function normWinding(P: Pt[]): Pt[] {
  return signedArea(P) < 0 ? [...P].reverse() : P;
}

/** 闭合多边形弧长均匀重采样到 n 点（签名特征1：顶点数一致且等距分布）。 */
export function resample(raw: Pt[], n: number): Pt[] {
  const P = normWinding(raw);
  const L: number[] = [0];
  for (let i = 0; i < P.length; i++) {
    const a = P[i];
    const b = P[(i + 1) % P.length];
    L.push(L[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const tot = L[P.length];
  const out: Pt[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (tot * i) / n;
    while (j < P.length - 1 && L[j + 1] < s) j++;
    const a = P[j];
    const b = P[(j + 1) % P.length];
    const u = (s - L[j]) / (L[j + 1] - L[j] || 1);
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return out;
}

/** 首顶点方位对应：把数组旋转到「离质心正上方（12 点钟）最近的顶点」起步。 */
export function orientTop(P: Pt[]): Pt[] {
  let sx = 0;
  let sy = 0;
  for (const p of P) {
    sx += p[0];
    sy += p[1];
  }
  const cx = sx / P.length;
  const cy = sy / P.length;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < P.length; i++) {
    const ang = Math.atan2(P[i][1] - cy, P[i][0] - cx) + Math.PI / 2;
    const d = Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang)));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return [...P.slice(best), ...P.slice(0, best)];
}

/** 逐对最优循环对位：在所有 n 个起点偏移里取「顶点距离平方和最小」的一个（防打结的关键）。 */
export function alignStart(A: Pt[], B: Pt[]): Pt[] {
  const n = Math.min(A.length, B.length);
  let best = 0;
  let bestS = Infinity;
  for (let k = 0; k < n; k++) {
    let s = 0;
    for (let i = 0; i < n; i += 2) {
      const dx = A[(i + k) % n][0] - B[i][0];
      const dy = A[(i + k) % n][1] - B[i][1];
      s += dx * dx + dy * dy;
    }
    if (s < bestS) {
      bestS = s;
      best = k;
    }
  }
  return [...A.slice(best), ...A.slice(0, best)];
}

/** 逐顶点线性插值（配合弧长对位即得轮廓连续过渡）。 */
export function lerpPts(A: Pt[], B: Pt[], t: number): Pt[] {
  return A.map((p, i) => [p[0] + (B[i][0] - p[0]) * t, p[1] + (B[i][1] - p[1]) * t] as Pt);
}

export function toPath(P: Pt[]): string {
  return (
    'M' +
    P.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L') +
    'Z'
  );
}

// ---------------------------------------------------------------- 速度曲线（签名特征4）

/** CSS cubic-bezier(x1,y1,x2,y2) 缓动（二分反解 x）。 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const fx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const fy = (t: number) => ((ay * t + by) * t + cy) * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 28; i++) {
      const v = fx(t);
      if (Math.abs(v - x) < 1e-7) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return fy(t);
  };
}

/** 风格锁死：中段最快的形变速度曲线。 */
export const MORPH_EASE = cubicBezier(0.7, 0, 0.3, 1);
/** impact 预备压入曲线（源 EIO = bez(0.45,0,0.55,1)）。 */
export const EASE_PRESS_IN = cubicBezier(0.45, 0, 0.55, 1);
/** impact 释放曲线（源 EO = bez(0.16,1,0.3,1)）。 */
export const EASE_RELEASE = cubicBezier(0.16, 1, 0.3, 1);

/** 形变进度：lf = 局部帧（1..dur）；起止各留 3 帧缓冲（签名特征4）。 */
export function morphProgress(lf: number, dur: number): number {
  if (lf <= 3) return 0;
  if (lf >= dur - 2) return 1;
  return MORPH_EASE((lf - 3) / (dur - 6));
}

/**
 * v3 兼容视图：固定轴向（x/y）挤压拉伸 + 旋转 + 位移。v4.0 起默认形变变换走
 * morphPose/makeM——同一组幅值（10-15% 带）改骑在速度方向 phi 上；本函数保留旧调用面
 * 与数值（sx +10% / sy −12%、rot ±5°·dir、dx 12px、dy −6px），不再被默认链路使用。
 */
export function morphDeform(e: number, dir = 1): {sx: number; sy: number; rot: number; dx: number; dy: number} {
  const bulge = Math.sin(Math.PI * e);
  return {
    sx: 1 + 0.1 * bulge,
    sy: 1 - 0.12 * bulge,
    rot: 5 * dir * bulge,
    dx: 12 * dir * bulge,
    dy: -6 * bulge,
  };
}

// ---------------------------------------------------------------- v4.0 速度方向拉伸（mg 08-morph 移植）

export type Mat2 = [number, number, number, number]; // 行主序 [a,b,c,d]：x'=a·x+b·y, y'=c·x+d·y
export interface Xform { A: Mat2; b: [number, number] }

const mul2 = (a: Mat2, b: Mat2): Mat2 => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
];

/** 应用仿射变换（矩阵 + 平移）到一点。 */
export const applyM = (m: Xform, p: Pt): Pt => [
  m.A[0] * p[0] + m.A[1] * p[1] + m.b[0],
  m.A[2] * p[0] + m.A[3] * p[1] + m.b[1],
];

/**
 * makeM —— v4.0 默认形变变换（源 08-morph index.html:329-339 机制重写）：
 * Q（沿速度方向 phi 拉伸 k、垂直向 1/k）× R（旋转 rot、整体缩放 sc）× D（绕局部支点 piv
 * 压扁 (1+q, 1−q)），平移至 pos 且支点仿射不变（piv 映射到 pos + QR·piv）。
 * k=1 时 Q 恒为单位阵（与 phi 无关）——速度为 0 时整体退化为纯压扁（q≠0）或恒等（q=0）。
 */
export function makeM(pos: [number, number], rot: number, sc: number, phi: number, k: number, q: number, piv: Pt): Xform {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const R: Mat2 = [c * sc, -s * sc, s * sc, c * sc];
  const D: Mat2 = [1 + q, 0, 0, 1 - q];
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  const ik = 1 / k;
  const Q: Mat2 = [cp * cp * k + sp * sp * ik, cp * sp * (k - ik), cp * sp * (k - ik), sp * sp * k + cp * cp * ik];
  const QR = mul2(Q, R);
  const A = mul2(QR, D);
  const dp: [number, number] = [piv[0] - D[0] * piv[0], piv[1] - D[3] * piv[1]];
  return {
    A,
    b: [pos[0] + QR[0] * dp[0] + QR[1] * dp[1], pos[1] + QR[2] * dp[0] + QR[3] * dp[1]],
  };
}

/** 二次贝塞尔插值（形变伴随位移轨：from → ctrl → to）。 */
export const qbez = (a: Pt, c: Pt, b: Pt, t: number): Pt => {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
};

/** 位移轨速度方向 phi：中心差分 g±0.02（源 heroAt 同参）；速度过小（<0.5px）回退竖直向下。 */
export const phiAlong = (a: Pt, c: Pt, b: Pt, t: number, eps = 0.02): number => {
  const p2 = qbez(a, c, b, Math.min(1, t + eps));
  const p1 = qbez(a, c, b, Math.max(0, t - eps));
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  return Math.hypot(dx, dy) > 0.5 ? Math.atan2(dy, dx) : Math.PI / 2;
};

/** 沿速度方向拉伸幅（SPEC 锁死 10-15% 带中值；v3 的 +10%/−12% 幅值带宽不变，载体换向）。 */
export const STRETCH = 0.12;
/** 旋转摆幅 ±5°（SPEC 锁死）。 */
export const SWING = (5 * Math.PI) / 180;

export interface MorphPoseInput {
  from: Pt;
  ctrl: Pt;
  to: Pt; // 位移二次贝塞尔（形状锚定位置间）
  e: number; // 已缓动进度 0..1（morphProgress 输出）
  dir?: number; // 旋转方向（逐段交替，默认 1）
  piv?: Pt; // 压扁支点（局部坐标；默认钉尖类 [0,150]）
  sc?: number; // 主体基准缩放（默认 1）
  impact?: {q: number; uni: number}; // impactEvent 输出（可省）
}

/** v4.0 默认形变位姿：速度方向拉伸 k=1+STRETCH·sin(πe) + 旋转 ±5°·dir + impact 切向压扁/
 *  均匀脉冲，位移走贝塞尔轨。与 makeM 同返回面并附 pos/phi/k 供 smear 复用。 */
export function morphPose(o: MorphPoseInput): Xform & {pos: Pt; phi: number; k: number} {
  const t = clamp01(o.e);
  const bulge = Math.sin(Math.PI * t);
  const dir = o.dir ?? 1;
  const pos = qbez(o.from, o.ctrl, o.to, t);
  const phi = phiAlong(o.from, o.ctrl, o.to, t);
  const im = o.impact ?? {q: 0, uni: 0};
  const k = 1 + STRETCH * bulge;
  const sc = (o.sc ?? 1) * (1 + im.uni);
  return {...makeM(pos, SWING * dir * bulge, sc, phi, k, im.q, o.piv ?? [0, 150]), pos, phi, k};
}

// ---------------------------------------------------------------- v4.0 impact 事件系统（mg 08-morph 移植）

export interface ImpactHit {
  kind: 'hit';
  t: number; // 冲击时刻（帧）
  a: number; // 幅度
  who: string; // 主体键（卡内镜头表按 who 过滤后传入）
  uni?: boolean; // true = 均匀缩放脉冲（整体膨胀），否则切向压扁
}
export interface ImpactPress {
  kind: 'press';
  t: number; // 预备-释放所服务的节拍时刻（帧；预备压自 t−0.3s 起）
  a: number; // 预备压幅度
  who: string;
}
export type ImpactEvent = ImpactHit | ImpactPress;

/**
 * impact 事件求值（源 08-morph impact() 机制重写，参数照抄；tFrame 帧号，fps 默认 30）：
 * - hit  阻尼正弦冲击：起于冲击时刻前 2 帧，τ 秒内 v = a·sin(2π·τ/0.28)·e^(−7.5τ)，1.2s 窗。
 * - press 形变预备-释放：t 前 0.3s 开始压（前 0.2s easeInOut 压满）→ 后 0.12s 释放
 *   （easeOut 回零并带 −0.35·a·sin(π·u) 下冲回弹）。
 * 返回 {q, uni}：直接喂 morphPose 的 impact。事件表由卡内镜头表驱动（按 who 预过滤）。
 */
export function impactEvent(tFrame: number, table: readonly ImpactEvent[], fps = 30): {q: number; uni: number} {
  const t = tFrame / fps;
  let q = 0;
  let uni = 0;
  for (const ev of table) {
    if (ev.kind === 'hit') {
      const tau = t - (ev.t / fps - 2 / fps);
      if (tau < 0 || tau > 1.2) continue;
      const v = ev.a * Math.sin((2 * Math.PI * tau) / 0.28) * Math.exp(-tau * 7.5);
      if (ev.uni) uni += v;
      else q += v;
    } else {
      const tau = t - (ev.t / fps - 0.3);
      if (tau <= 0 || tau >= 0.42) continue;
      if (tau < 0.3) q += ev.a * EASE_PRESS_IN(clamp01(tau / 0.2));
      else {
        const u = (tau - 0.3) / 0.12;
        q += ev.a * (1 - EASE_RELEASE(clamp01(u))) - 0.35 * ev.a * Math.sin(Math.PI * clamp01(u));
      }
    }
  }
  return {q, uni};
}

// ---------------------------------------------------------------- v4.0 smearCap 解析运动模糊（mg 08-morph 移植）

/** 帧率（源 FPS=30）与半快门（源 SH = 0.5/FPS 秒 = 0.5 帧）。 */
export const FPS = 30;
export const SHUTTER = 0.5 / FPS;

/** 快门两端采样（帧号域）：帧中心量化后 ±0.25 帧（源 tqc ± SH/2）。 */
export const shutterFrames = (f: number): [number, number] => {
  const q = Math.round(f);
  return [q - 0.25, q + 0.25];
};

export interface SmearGeom {
  pA: Pt;
  pB: Pt;
  r: number; // 胶囊两端圆心与半径
  disc: boolean; // true = 速度过低（L<1.5px），按单圆盘处理
  grad: {
    from: Pt;
    to: Pt; // 线性渐变轴（沿运动方向，长 T=L+2r）
    stops: Array<readonly [number, number]>; // [offset, alpha] 停靠：两端 0，平台 min(1, 2r/L)
  };
}

/**
 * smearCap 解析运动模糊几何（源 08-morph index.html:604-611 机制重写，参数照抄）：
 * 快件在快门窗内自 pA 移动到 pB，画一枚 alpha 渐变 stadium（胶囊）——运动模糊不靠帧累积。
 * 渐变停靠：0→0，o1=min(2r,L)/T→am=min(1,2r/L)，1−o1→am，1→0。
 */
export function smearCapGeom(pA: Pt, pB: Pt, r: number): SmearGeom {
  const dx = pB[0] - pA[0];
  const dy = pB[1] - pA[1];
  const L = Math.hypot(dx, dy);
  const mx = (pA[0] + pB[0]) / 2;
  const my = (pA[1] + pB[1]) / 2;
  if (L < 1.5) {
    return {pA, pB, r, disc: true, grad: {from: [mx, my], to: [mx, my], stops: [[0, 1], [1, 1]]}};
  }
  const ux = dx / L;
  const uy = dy / L;
  const T = L + 2 * r;
  const am = Math.min(1, (2 * r) / L);
  const o1 = Math.min(2 * r, L) / T;
  return {
    pA,
    pB,
    r,
    disc: false,
    grad: {
      from: [mx - (ux * T) / 2, my - (uy * T) / 2],
      to: [mx + (ux * T) / 2, my + (uy * T) / 2],
      stops: [[0, 0], [o1, am], [1 - o1, am], [1, 0]],
    },
  };
}

// ---------------------------------------------------------------- OKLab 颜色插值

function hexToRgb(h: string): [number, number, number] {
  const v = parseInt(h.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; // 归一到 0..1（srgbToLin 的定义域）
}
const srgbToLin = (u: number) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4));
const linToSrgb = (u: number) => (u <= 0.0031308 ? u * 12.92 : 1.055 * Math.pow(u, 1 / 2.4) - 0.055);

function rgbToOklab(rgb: [number, number, number]): [number, number, number] {
  const [r, g, b] = rgb.map(srgbToLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb(lab: [number, number, number]): [number, number, number] {
  const [L, a, bb] = lab;
  const l = L + 0.3963377774 * a + 0.2158037573 * bb;
  const m = L - 0.1055613458 * a - 0.0638541728 * bb;
  const s = L - 0.0894841775 * a - 1.291485548 * bb;
  const L3 = l * l * l;
  const M3 = m * m * m;
  const S3 = s * s * s;
  return [
    linToSrgb(+4.0767416621 * L3 - 3.3077115913 * M3 + 0.2309699292 * S3),
    linToSrgb(-1.2684380046 * L3 + 2.6097574011 * M3 - 0.3413193965 * S3),
    linToSrgb(-0.0041960863 * L3 - 0.7034186147 * M3 + 1.707614701 * S3),
  ];
}

/** OKLab 空间颜色插值（色相过渡不走灰）。 */
export function oklabLerp(c1: string, c2: string, t: number): string {
  if (t <= 0) return c1;
  if (t >= 1) return c2;
  const lab = rgbToOklab(hexToRgb(c1));
  const lab2 = rgbToOklab(hexToRgb(c2));
  const mix: [number, number, number] = [
    lab[0] + (lab2[0] - lab[0]) * t,
    lab[1] + (lab2[1] - lab[1]) * t,
    lab[2] + (lab2[2] - lab[2]) * t,
  ];
  const [r, g, b] = oklabToRgb(mix).map((u) => Math.round(Math.min(1, Math.max(0, u)) * 255));
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------- 形状生成器（顶点数统一 N_VERTS）

/** 咖啡杯（带实心把手，轮廓单闭合路径）。 */
const CUP_RAW: Pt[] = [
  [-95, -120], [0, -122], [95, -120],
  [100, -98], [95, -70],
  [112, -72], [142, -62], [158, -34], [158, 2], [142, 32], [112, 44], [96, 40],
  [86, 66], [76, 98],
  [58, 116], [0, 122], [-58, 116],
  [-76, 98], [-88, 60], [-96, 8], [-100, -60], [-98, -98],
];

/** 城市天际线（单闭合轮廓，阶梯楼顶；y 已平移到质心平衡）。 */
const CITY_RAW: Pt[] = [
  [-195, 106], [-195, -6], [-158, -6], [-158, -78], [-118, -78], [-118, -20],
  [-84, -20], [-84, -134], [-44, -134], [-44, -56], [-12, -56], [-12, -106],
  [26, -106], [26, -44], [64, -44], [64, -88], [102, -88], [102, -12],
  [140, -12], [140, -62], [178, -62], [178, -6], [195, -6], [195, 106],
];

/** 圆（r 可变，首点 12 点钟）。 */
function circleRaw(r: number, cx = 0, cy = 0): Pt[] {
  const P: Pt[] = [];
  for (let i = 0; i < 72; i++) {
    const a = -Math.PI / 2 + (i / 72) * Math.PI * 2;
    P.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return P;
}

/** 地图钉：圆头 + 双颊收尖（单闭合路径，r=90 头圆心 (0,-62)，尾尖 (0,150)）。 */
function pinRaw(): Pt[] {
  const R = 90;
  const cy = -62;
  const P: Pt[] = [[0, 150]];
  for (let i = 0; i <= 44; i++) {
    const deg = 125 + (i / 44) * 290; // 左颊 → 逆时针过顶 → 右颊
    const a = (deg * Math.PI) / 180;
    P.push([R * Math.cos(a), cy + R * Math.sin(a)]);
  }
  return P;
}

function build(raw: Pt[]): Pt[] {
  return orientTop(resample(raw, N_VERTS));
}

/** 形状库（首顶点统一 12 点钟方位；y-down 局部坐标，质心近原点）。 */
export const SHAPES = {
  cup: build(CUP_RAW),
  sun: build(circleRaw(150)),
  city: build(CITY_RAW),
  dot: build(circleRaw(58)),
  pin: build(pinRaw()),
} as const;

export type ShapeKey = keyof typeof SHAPES;

const pairCache = new Map<string, [Pt[], Pt[]]>();

/** 取一对已对位的形状（B 相对 A 做最优循环对位，模块级缓存）。 */
export function morphPair(a: ShapeKey, b: ShapeKey): [Pt[], Pt[]] {
  const key = `${a}>${b}`;
  let pair = pairCache.get(key);
  if (!pair) {
    pair = [SHAPES[a], alignStart(SHAPES[b], SHAPES[a])];
    pairCache.set(key, pair);
  }
  return pair;
}

/** 一帧形变轮廓：先对位再插值。 */
export function morphPts(a: ShapeKey, b: ShapeKey, t: number): Pt[] {
  const [A, B] = morphPair(a, b);
  return lerpPts(A, B, t);
}

// ---------------------------------------------------------------- 城市窗灯矩阵（非形变元素，种子可复现）

export type Win = {x: number; y: number; lit: number; warm: number};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 楼体矩形（与 CITY_RAW 同一坐标系，用于窗灯布点）。 */
export const BUILDINGS = [
  {x: -195, w: 37, top: -6},
  {x: -158, w: 40, top: -78},
  {x: -118, w: 40, top: -20},
  {x: -84, w: 40, top: -134},
  {x: -44, w: 32, top: -56},
  {x: -12, w: 38, top: -106},
  {x: 26, w: 38, top: -44},
  {x: 64, w: 38, top: -88},
  {x: 102, w: 38, top: -12},
  {x: 140, w: 38, top: -62},
  {x: 178, w: 17, top: -6},
];
export const CITY_GROUND = 106;

/** 窗灯矩阵：确定性生成（seed 20261076），lit = 绝对帧号（点亮相位）。 */
export function cityWindows(seed = 20261076): Win[] {
  const rng = mulberry32(seed);
  const wins: Win[] = [];
  for (const b of BUILDINGS) {
    const cols = Math.max(1, Math.floor((b.w - 8) / 14));
    const rows = Math.max(1, Math.floor((CITY_GROUND - b.top - 12) / 19));
    const gx = b.x + (b.w - (cols * 14 - 5)) / 2;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rng() < 0.32) continue; // 三成窗不亮，避免满铺
        wins.push({
          x: gx + c * 14,
          y: b.top + 9 + r * 19,
          lit: 185 + Math.floor(rng() * 30),
          warm: rng(),
        });
      }
    }
  }
  return wins;
}
