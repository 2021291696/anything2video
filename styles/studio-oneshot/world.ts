// world.ts —— studio-oneshot 一镜到底的世界数据（纯数学，全部帧号参数化，零时钟零随机 API）。
// 四站沿 x 轴：A 沙粒(-6) → B 晶圆(0) → C 芯片(6) → D 大脑(12)。相机 Hermite 一镜串起。
// 时间轴（tts_build 实测 386 帧）：S01 f31-103 / S02 f110-188 / S03 f195-270 / S04 f277-339。
// 「到站比首词早 ~0.3s(9f)」：A f22 / B f101 / C f186 / D f268。

export const FPS = 30;
export const TOTAL = 386;

/** seeded PRNG（mulberry32；世界一切随机量走它，禁 Math.random）。 */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** easeInOut cubic */
export const easeIO = (t: number) => {
  const u = clamp01(t);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};
/** 阻尼弹簧 0→1（入坑过冲感）。tau 单位=秒。 */
export const spring = (tau: number, w = 13.5, z = 0.62) => {
  if (tau <= 0) return 0;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 + Math.exp(-z * w * tau) * (-Math.cos(wd * tau) - ((z * w) / wd) * Math.sin(wd * tau));
};

// ---------------------------------------------------------------- 色板（深石墨影棚 + 瓷白 + 双色 rim）
export const COL = {
  bg: '#141418', // 影棚深处（雾同色）
  floor: '#1a1a1e', // 地面（领地定稿 #1a1a1e 系）
  porcelain: '#f4f2ec', // 瓷质白
  graphite: '#26262c', // 石墨瓷（转台/暗部道具）
  die: '#1c1c22', // 晶圆上的 die
  rimCold: '#cfe4ff', // 冷白 rim
  rimWarm: '#ff9a4a', // 暖橙 rim（hero 大脑）
  accent: '#7fd8ff', // 青色电光（点亮/刻蚀，唯一装饰色）
};

// ---------------------------------------------------------------- Hermite 相机（一镜到底，禁停泊）
// Catmull-Rom 切线的非均匀三次 Hermite 样条：相机连续过所有键，速度连续，永不停泊。
export type CamKey = {f: number; px: number; py: number; pz: number; tx: number; ty: number; tz: number};

/** 键位表：到站键=到站帧（比该句首词早 9f）；驻留键提供微漂移；末键全景拉出。 */
export const CAM_KEYS: CamKey[] = [
  {f: 1,   px: -8.7, py: 1.9,  pz: 5.0,  tx: -6.5, ty: 0.82, tz: 0},     // 开场飞行中
  {f: 22,  px: -6.0, py: 1.28, pz: 3.1,  tx: -6.0, ty: 0.70, tz: 0},     // 到站 A（S01 f31-9）
  {f: 88,  px: -5.72, py: 1.34, pz: 3.0, tx: -5.96, ty: 0.72, tz: 0},    // 驻留微漂 → 起飞
  {f: 101, px: -0.14, py: 1.42, pz: 3.3, tx: 0.0,   ty: 0.60, tz: 0},     // 到站 B（S02 f110-9）
  {f: 172, px: 0.16, py: 1.48, pz: 3.24, tx: 0.06,  ty: 0.62, tz: 0},    // 驻留微漂 → 起飞
  {f: 186, px: 5.86, py: 1.42, pz: 3.3,  tx: 6.0,   ty: 0.62, tz: 0},     // 到站 C（S03 f195-9）
  {f: 258, px: 6.16, py: 1.48, pz: 3.28, tx: 6.06,  ty: 0.64, tz: 0},     // 驻留微漂 → 起飞
  {f: 268, px: 11.7, py: 1.5,  pz: 3.5,  tx: 12.0,  ty: 0.95, tz: 0},     // 到站 D（S04 f277-9）
  {f: 345, px: 11.86, py: 1.56, pz: 3.56, tx: 12.02, ty: 0.96, tz: 0},    // 驻留微漂 → 拉全景
  {f: 386, px: 2.6,  py: 7.4,  pz: 18.0, tx: 2.9,   ty: 0.5,  tz: 0},     // 结尾全景（缓出+持续微动）
];

const hermite = (p0: number, p1: number, m0: number, m1: number, u: number) => {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
};

/** 相机姿态：返回 [pos, tgt]（World 单位）。f 定义域 1..TOTAL，越界钳制。
 * 切线：Catmull-Rom 邻键差分 + 每段分量钳制 ±3|Δ|（Fritsch–Carlson 式限幅）——
 * 消除「长飞行→长驻留」处的过冲（相机甩过目标再荡回），保证键值间不越界。 */
export const camAt = (f: number): {pos: [number, number, number]; tgt: [number, number, number]} => {
  const t = Math.min(TOTAL, Math.max(1, f));
  const keys = CAM_KEYS;
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1].f) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const span = Math.max(1e-6, k1.f - k0.f);
  const u = clamp01((t - k0.f) / span);
  const km = keys[Math.max(0, i - 1)], kp = keys[Math.min(keys.length - 1, i + 2)];
  const P = (get: (k: CamKey) => number) => {
    const v0 = get(k0), v1 = get(k1);
    // CR 速度（每帧）：邻键差分 → 换算到本段 u 空间
    let t0 = ((get(k1) - get(km)) / Math.max(1e-6, k1.f - km.f)) * span;
    let t1 = ((get(kp) - get(k0)) / Math.max(1e-6, kp.f - k0.f)) * span;
    const lim = 3 * Math.abs(v1 - v0); // 限幅：不过冲
    t0 = Math.min(lim, Math.max(-lim, t0));
    t1 = Math.min(lim, Math.max(-lim, t1));
    return hermite(v0, v1, t0, t1, u);
  };
  const pos: [number, number, number] = [P((k) => k.px), P((k) => k.py), P((k) => k.pz)];
  const tgt: [number, number, number] = [P((k) => k.tx), P((k) => k.ty), P((k) => k.tz)];
  return {pos, tgt};
};

// ---------------------------------------------------------------- 站点与道具时刻表（全部纯帧函数）
export const STATIONS = {
  A: {x: -6, label: '沙粒', sub: 'SiO₂ · 原料', from: 22, to: 96},
  B: {x: 0, label: '晶圆', sub: 'Wafer · 提纯', from: 101, to: 178},
  C: {x: 6, label: '芯片', sub: 'Package · 封装', from: 186, to: 262},
  D: {x: 12, label: '大脑', sub: 'Compute · 思考', from: 268, to: 345},
};

/** 大脑点亮（hero）：起 f272（S04 内），f285 满亮；BGM drop 9.3s=f279 落在同窗。 */
export const BRAIN_IGNITE = {from: 272, full: 285};
/** 晶圆刻蚀扫掠（S02 中段）：f130-170 逐枚点亮 die。 */
export const ETCH = {from: 130, to: 170};
/** 封装三步（S03 内）：基板升起 / die 落下 / 顶盖合上。 */
export const PKG = {substrate: 200, die: 224, cap: 244};

/** 标签在屏投影的安全判定交给 chrome；这里给每站的世界锚点（道具上方，画框内）。 */
export const LABEL_ANCHORS: Record<keyof typeof STATIONS, [number, number, number]> = {
  A: [-6, 1.55, 0], B: [0, 1.1, 0], C: [6, 1.45, 0], D: [12, 2.05, 0],
};
