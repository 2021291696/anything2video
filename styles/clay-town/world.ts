// world.ts — clay-town 黏土小城世界数据：坐标 / 相机 / 时刻表。
// 坐标约定继承 isometric-city：等轴世界格 (u,v)，screen x=(u−v)·cos30°·U，y=(u+v)·sin30°·U−h·U。
// 与 isometric-city 的边界（SPEC 详述）：同族等轴投影与视差方法，材质语言换黏土
// （软圆角 / 哑光次表面 / squash 落位），叙事题材=自然与生活系统（供水）。

export const U = 56; // px / 世界单位
export const C30 = Math.cos(Math.PI / 6); // 0.8660
export const S30 = 0.5;

/** 等轴投影：世界格→屏幕偏移（未含站点 ox / 相机）。 */
export const isoDX = (u: number, v: number) => (u - v) * C30 * U;
export const isoDY = (u: number, v: number, y = 0) => (u + v) * S30 * U - y * U;

export const EASE = {
  clamp01: (x: number) => Math.min(1, Math.max(0, x)),
  easeOutCubic: (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3),
  easeInOutPow: (t: number, p = 2.5) => {
    t = Math.min(1, Math.max(0, t));
    return t < 0.5 ? 0.5 * Math.pow(2 * t, p) : 1 - 0.5 * Math.pow(2 - 2 * t, p);
  },
  /** 阻尼弹簧 0→1（isometric-city 同款参数 w14.8 z0.61）。tau 单位=秒。 */
  spring: (tau: number, w = 14.8, z = 0.61, v0 = 0) => {
    if (tau <= 0) return 0;
    const wd = w * Math.sqrt(1 - z * z);
    const B = (v0 - z * w) / wd;
    return 1 + Math.exp(-z * w * tau) * (-Math.cos(wd * tau) + B * Math.sin(wd * tau));
  },
  /** 黏土软落：下落 → 落地 squash（软糖压扁回弹）。返回 {dy,sx,sy}；tau<−fall 不可见。 */
  clayDrop: (tau: number, fall = 0.26, h0 = 2.4) => {
    if (tau < -fall) return null;
    if (tau < 0) {
      const u = (tau + fall) / fall; // 0→1 下落进程
      return {dy: -h0 * U * (1 - u * u), sx: 1 + 0.06 * u * u, sy: 1 - 0.05 * u * u};
    }
    const squashT = tau / 30; // 落地后 squash 时长 ≈0.23s
    const k = Math.exp(-6.5 * squashT) * Math.cos(18 * squashT); // 衰减振荡 ±
    return {dy: 0, sx: 1 + 0.22 * k, sy: 1 - 0.26 * Math.max(0, k)};
  },
  /** seeded PRNG（mulberry32，全片可复现）。 */
  rng: (seed: number) => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
};

/** 手捏抖动（签名特征 3）：seeded ±amp 的固定扰动，让形状/圆角/角度带轻微不规则。 */
export const wob = (seed: number, amp = 1) => (EASE.rng(seed)() - 0.5) * 2 * amp;

// ---------------------------------------------------------------- 相机（整组平移，无旋转；前中后 1:0.8:0.6 视差）
const PAN_B = 1250 / 0.8; // 站 B 居中
const PAN_C = 2500 / 0.8; // 站 C 居中
export const camPan = (f: number): number => {
  if (f < 101) return 0;
  if (f < 123) return PAN_B * EASE.easeInOutPow((f - 101) / 22, 2.6); // A→B
  if (f < 187) return PAN_B;
  if (f < 209) return PAN_B + (PAN_C - PAN_B) * EASE.easeInOutPow((f - 187) / 22, 2.6); // B→C
  if (f < 293) return PAN_C;
  if (f < 315) return PAN_C * (1 - EASE.easeInOutPow((f - 293) / 22, 2.6)); // C→A（回家）
  return 0;
};
export const LAYER_SPEED = {back: 0.6, mid: 0.8, front: 1.0};

// ---------------------------------------------------------------- 站点屏幕坐标（中景层基线）
export const STOX: Record<'A' | 'B' | 'C', number> = {A: 640, B: 1890, C: 3140};
export const STOY = 252;

/** 世界格→中景层屏幕坐标（未含相机）。 */
export const midPos = (st: 'A' | 'B' | 'C', u: number, v: number, y = 0) => ({
  x: STOX[st] + isoDX(u, v),
  y: STOY + isoDY(u, v, y),
});

// ---------------------------------------------------------------- 黏土底座时刻表（squash 落位）
export const SLAB_AT: Record<'A' | 'B' | 'C', number> = {A: 6, B: 106, C: 194};

// ---------------------------------------------------------------- 管网段（C 站，树状；hero 逐段点亮）
// dir 'u'=沿 u 轴（屏幕 +30°），'v'=沿 v 轴（屏幕 150°）；grow=生长帧，lit=水到点亮帧（9999=本片不点亮）。
export type PipeSeg = {id: string; u: number; v: number; len: number; dir: 'u' | 'v'; grow: number; lit: number; main?: boolean};
export const PIPES: PipeSeg[] = [
  {id: 'p1', u: 0.2, v: 3.6, len: 2.0, dir: 'u', grow: 198, lit: 235, main: true},  // 干管进站（水滴滑行①）
  {id: 'p2', u: 2.2, v: 3.6, len: 2.0, dir: 'u', grow: 204, lit: 246, main: true},  // 干管延伸至 C 楼墙角（滑行②）
  {id: 'p3', u: 2.2, v: 3.6, len: 2.2, dir: 'v', grow: 210, lit: 252},              // 支管①（下行）
  {id: 'p4', u: 2.2, v: 5.8, len: 1.4, dir: 'u', grow: 218, lit: 258},              // 支管①延伸
  {id: 'p5', u: 4.2, v: 3.6, len: 1.8, dir: 'v', grow: 226, lit: 266},              // 越过 C 楼向前（水到即亮）
  {id: 'p6', u: 3.6, v: 5.8, len: 1.2, dir: 'u', grow: 232, lit: 270},              // 支线接续（千家万户齐亮段）
  {id: 'p7', u: 4.2, v: 5.4, len: 1.0, dir: 'v', grow: 238, lit: 272},              // 支线延伸
];
/** hero 水滴行程：p1 f235-246 → p2 f246-258 → 没入 C 楼墙 f258-262；窗亮 f264。 */
export const HERO_RIDE = {f0: 235, p1End: 246, p2End: 258, arrive: 262, window: 264};

// ---------------------------------------------------------------- 前景黏土灌木带（1.0× 层）
export type BushDef = {x: number; y: number; s: number; col: number; t0: number};
export const FRONT_BUSHES: BushDef[] = [];
{
  const rand = EASE.rng(20261071);
  const spans = [[-80, 1500], [1330, 2900], [2540, 4400]];
  for (const [x0, x1] of spans) {
    for (let x = x0; x < x1; x += 200 + rand() * 150) {
      FRONT_BUSHES.push({x, y: 640 + rand() * 52, s: 0.9 + rand() * 0.7, col: Math.floor(rand() * 3), t0: 16 + rand() * 66});
    }
  }
}

// ---------------------------------------------------------------- 站内绿植 / 小件（中景层）
export type DecoDef = {st: 'A' | 'B' | 'C'; u: number; v: number; kind: 'tree' | 'flower' | 'bush'; col: number; t0: number};
export const DECO: DecoDef[] = [
  {st: 'A', u: 5.9, v: 1.1, kind: 'tree', col: 0, t0: 28},
  {st: 'A', u: 0.9, v: 5.6, kind: 'tree', col: 1, t0: 36},
  {st: 'A', u: 6.2, v: 4.6, kind: 'flower', col: 2, t0: 40},
  {st: 'A', u: 1.4, v: 1.0, kind: 'flower', col: 0, t0: 44},
  {st: 'A', u: 4.8, v: 0.6, kind: 'bush', col: 1, t0: 48},
  {st: 'B', u: 0.8, v: 1.0, kind: 'tree', col: 1, t0: 148},
  {st: 'B', u: 5.8, v: 4.8, kind: 'flower', col: 0, t0: 156},
  {st: 'B', u: 6.2, v: 1.4, kind: 'bush', col: 2, t0: 162},
  {st: 'C', u: 0.8, v: 5.8, kind: 'tree', col: 2, t0: 226},
  {st: 'C', u: 6.4, v: 4.9, kind: 'flower', col: 1, t0: 244},
];
