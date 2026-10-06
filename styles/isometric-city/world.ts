// world.ts — s34-iso 等轴小城的世界数据：相机路径 / 三站布局 / 生长与点亮时刻表。
// 坐标约定：等轴世界格 (u,v)，screen x=(u−v)·cos30°，y=(u+v)·sin30°−h（详见 kit.tsx）。
// 三站间距 1250px（中景层坐标）：稿件进站 A→渲染农场 B→审片放映站 C。相机=整组平移（无旋转）。

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
  /** 阻尼弹簧 0→1（借 03-isometric demo 参数：w14.8 z0.61 ≈ 峰值 8 帧、9% 过冲）。tau 单位=秒。 */
  spring: (tau: number, w = 14.8, z = 0.61, v0 = 0) => {
    if (tau <= 0) return 0;
    const wd = w * Math.sqrt(1 - z * z);
    const B = (v0 - z * w) / wd;
    return 1 + Math.exp(-z * w * tau) * (-Math.cos(wd * tau) + B * Math.sin(wd * tau));
  },
  /** 瓦片坠落（fall 下落时长 s / h0 起始高度 / 落地微弹）。tau<−fall 不可见。 */
  dropLanding: (tau: number, fall = 0.3, h0 = 2.2) => {
    if (tau < -fall) return null;
    if (tau < 0) {
      const u = (tau + fall) / fall;
      return { dy: -h0 * U * (1 - u * u), s: 1 + 0.05 * u * u };
    }
    const b = 0.14;
    const dy = tau < b ? 0.06 * U * Math.sin((Math.PI * tau) / b) : 0;
    return { dy, s: 1 };
  },
  /** seeded PRNG（mulberry32，全粒子可复现）。 */
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

// ---------------------------------------------------------------- 相机（整组平移，无旋转）
// pan=前景层位移 px；中景 0.8×、远景 0.6×（签名特征 4：前中后 1:0.8:0.6 视差速度）。
const PAN_B = 1250 / 0.8; // 站 B 居中
const PAN_C = 2500 / 0.8; // 站 C 居中
export const camPan = (f: number): number => {
  if (f < 158) return 0;
  if (f < 180) return PAN_B * EASE.easeInOutPow((f - 158) / 22, 2.6);
  if (f < 291) return PAN_B;
  if (f < 312) return PAN_B + (PAN_C - PAN_B) * EASE.easeInOutPow((f - 291) / 21, 2.6);
  return PAN_C;
};
export const LAYER_SPEED = { back: 0.6, mid: 0.8, front: 1.0 };

// ---------------------------------------------------------------- 建筑生长时刻表（签名特征 3：底面→立面拉起→顶面延迟 2-3 帧）
export type GrowT = { base: number; wall: number; roof: number };
/** 底面 t0 落位；立面 t0+4 弹簧拉起；顶面 t0+4+3 延迟盖上。 */
export const growAt = (base: number): GrowT => ({ base, wall: base + 4, roof: base + 7 });

export type BoxDef = {
  id: string;
  st: 'A' | 'B' | 'C';
  u: number; v: number; // 背角（min u, min v）
  w: number; d: number; h: number;
  top: string; left: string; right: string;
  grow: GrowT;
  win?: { rows: number; cols: number; lit?: number }; // 立面窗格（左右面同构）
  led?: { rows: number }; // 机架 LED 带（左面横带，hero 扫掠点亮）
  screen?: boolean; // C 站银幕（左面巨幕）
};

export const RACK_IGNITE = [235, 245, 255, 265]; // hero 点亮扫掠：沿 screen-x 自左向右（≈f235-268 前沿）

export const BOXES: BoxDef[] = [
  // —— A 稿件进站：文档楼（白楼+纸卷顶）——
  { id: 'doc', st: 'A', u: 2.4, v: 2.2, w: 2.4, d: 2.4, h: 2.7, top: '#FBFAFF', left: '#E7E2FA', right: '#CFC7F0', grow: growAt(36), win: { rows: 3, cols: 3, lit: 1 } },
  { id: 'docTop', st: 'A', u: 3.15, v: 2.95, w: 0.9, d: 0.9, h: 0.55, top: '#FFE6A1', left: '#F4D795', right: '#DFC07E', grow: growAt(48) }, // 纸卷楼顶
  // —— B 渲染农场：4 栋机架楼（逐栋生长 f182/196/210/224）——
  { id: 'rack1', st: 'B', u: 1.1, v: 2.3, w: 1.5, d: 1.7, h: 2.9, top: '#FBFAFF', left: '#DDE8FD', right: '#B9CBF2', grow: growAt(182), led: { rows: 4 } },
  { id: 'rack2', st: 'B', u: 3.3, v: 2.3, w: 1.5, d: 1.7, h: 2.3, top: '#D9F6E8', left: '#B7ECD6', right: '#8FD5B8', grow: growAt(196), led: { rows: 3 } },
  { id: 'rack3', st: 'B', u: 5.5, v: 2.3, w: 1.5, d: 1.7, h: 3.3, top: '#FBFAFF', left: '#E4DEF9', right: '#C4BAEF', grow: growAt(210), led: { rows: 5 } },
  { id: 'rack4', st: 'B', u: 7.7, v: 2.3, w: 1.5, d: 1.7, h: 2.5, top: '#FFE9DC', left: '#FFC4AC', right: '#EDA488', grow: growAt(224), led: { rows: 4 } },
  { id: 'farmGate', st: 'B', u: 0.4, v: 5.6, w: 0.7, d: 0.7, h: 0.9, top: '#8781D0', left: '#746DCB', right: '#655FC4', grow: growAt(178) }, // 农场门牌柱
  // —— C 审片放映站：银幕楼（左面巨幕）——
  { id: 'cine', st: 'C', u: 2.0, v: 2.2, w: 3.4, d: 2.2, h: 3.0, top: '#FBFAFF', left: '#242254', right: '#CFC7F0', grow: growAt(300), screen: true },
  { id: 'cineTop', st: 'C', u: 3.25, v: 2.85, w: 0.9, d: 0.9, h: 0.5, top: '#FF9E86', left: '#F08A70', right: '#DB7A62', grow: growAt(311) }, // 放映机楼顶
  { id: 'booth', st: 'C', u: 6.0, v: 3.0, w: 0.9, d: 0.9, h: 1.1, top: '#74A9F2', left: '#A8D2FF', right: '#7FA9E2', grow: growAt(306) }, // 票亭
];

// ---------------------------------------------------------------- 地台瓦片时刻表（按站分批落位；环序+抖动）
export type TileDef = { st: 'A' | 'B' | 'C'; u: number; v: number; kind: 'plaza' | 'mint' | 'butter' | 'road'; t0: number };
export const TILES: TileDef[] = [];
{
  const rand = EASE.rng(20261036);
  const grid = (st: 'A' | 'B' | 'C', nu: number, nv: number, t0: number, roadV: number | null) => {
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const ring = Math.abs(i - (nu - 1) / 2) + Math.abs(j - (nv - 1) / 2);
      const r = rand();
      let kind: TileDef['kind'] = r < 0.16 ? 'mint' : r < 0.26 ? 'butter' : 'plaza';
      if (roadV !== null && Math.abs(j - roadV) < 0.75) kind = 'road';
      TILES.push({ st, u: i, v: j, kind, t0: t0 + ring * 2 + rand() * 3 });
    }
  };
  grid('A', 8, 8, 14, 5.5);
  grid('B', 10, 8, 166, 5.5);
  grid('C', 9, 8, 296, 5.5);
}

// ---------------------------------------------------------------- 站点屏幕坐标（中景层）
export const STOX: Record<'A' | 'B' | 'C', number> = { A: 640, B: 1890, C: 3140 };
export const STOY = 252; // 地台背角基线 y（屏幕 px，中景层）

/** 世界格→中景层屏幕坐标。 */
export const midPos = (st: 'A' | 'B' | 'C', u: number, v: number, y = 0) => ({
  x: STOX[st] + isoDX(u, v),
  y: STOY + isoDY(u, v, y),
});

// ---------------------------------------------------------------- 前景小件（速度 1.0 层）
export type PropDef =
  | { kind: 'tree'; x: number; y: number; s: number; col: number; t0: number }
  | { kind: 'car'; st: 'A' | 'B' | 'C'; u0: number; v: number; f0: number; f1: number; col: number };
// 前景带：站间与站前的近景树/灌木（x 为前景层坐标，y 屏幕基线）
export const FRONT_PROPS: Array<Extract<PropDef, { kind: 'tree' }>> = [];
{
  const rand = EASE.rng(3415);
  const spans = [[-80, 1500], [1330, 2900], [2540, 4400]];
  for (const [x0, x1] of spans) {
    for (let x = x0; x < x1; x += 170 + rand() * 130) {
      const y = 610 + rand() * 66;
      FRONT_PROPS.push({ kind: 'tree', x, y, s: 1.15 + rand() * 0.8, col: Math.floor(rand() * 4), t0: 20 + rand() * 60 });
    }
  }
}
// 站内行道树（中景层，随站台落位）
export const MID_TREES: Array<{ st: 'A' | 'B' | 'C'; u: number; v: number; s: number; col: number; t0: number }> = [
  { st: 'A', u: 6.4, v: 0.9, s: 1.0, col: 0, t0: 46 },
  { st: 'A', u: 0.8, v: 6.6, s: 0.85, col: 2, t0: 52 },
  { st: 'A', u: 6.6, v: 4.2, s: 0.7, col: 1, t0: 58 },
  { st: 'B', u: 0.6, v: 1.2, s: 0.9, col: 3, t0: 196 },
  { st: 'B', u: 9.0, v: 4.6, s: 0.8, col: 1, t0: 214 },
  { st: 'C', u: 0.8, v: 1.0, s: 0.95, col: 2, t0: 306 },
  { st: 'C', u: 7.6, v: 1.2, s: 0.8, col: 0, t0: 312 },
];
// 小车（沿 v=5.5 路带行驶，u0 起点 → 终点）
export const CARS: Array<{ st: 'A' | 'B' | 'C'; u0: number; v: number; f0: number; f1: number; col: number }> = [
  { st: 'A', u0: -1.5, v: 5.5, f0: 64, f1: 130, col: 0 },
  { st: 'B', u0: -1.5, v: 5.5, f0: 186, f1: 252, col: 2 },
  { st: 'C', u0: -1.5, v: 5.5, f0: 314, f1: 380, col: 3 },
];

// ---------------------------------------------------------------- hero 进度粒（上浮方块，f240-285）
export const HERO_CUBES: Array<{ st: 'B'; u: number; v: number; f0: number; s: number; col: string }> = [];
{
  const rand = EASE.rng(20261037);
  for (let k = 0; k < 14; k++) {
    HERO_CUBES.push({
      st: 'B', u: 0.8 + rand() * 8.6, v: 1.6 + rand() * 3.4,
      f0: 240 + rand() * 38, s: 0.16 + rand() * 0.16,
      col: ['#62F0F2', '#FFE6A1', '#FF9E86', '#FBFAFF'][k % 4],
    });
  }
}
