// world.ts —— soft-jelly 世界数据（纯数学，全部帧号参数化，零时钟零随机 API）。
// 《软着陆》：两色糖果胶囊落上弹簧软胶床（站立胶囊克隆阵列），床面行进涟漪 + 胶囊 jelly squash。
// 数学移植自 mg-styles-15 demos/04-3d-render/blender/sim.py（MIT, Vincentwei1021），TS 重写：
//   bed_force 指数硬化弹簧床 / 一维接触 ODE + 阻尼振子 jelly squash（ws=2π·3.3, zeta=0.14）/
//   ring 行进涟漪包（阻尼余弦×高斯包络）/ expoOut 长尾缓动（80% 路程在前 20%）。
// 模块级预积分（dt=1/2400）= 纯常量函数 of 常量，确定性等价于源码的离线 sim。

export const FPS = 30;
export const TOTAL = 365; // tts_build 实测（12.2s，360-420 纪律内）

/** seeded PRNG（mulberry32；一切随机量走它，禁 Math.random）。 */
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
/** smoothstep(a,b,x)（sim.py smooth）。 */
export const smooth = (a: number, b: number, x: number) => {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};
/** 长尾缓动（sim.py expo_out k=7.2：80% 路程在前 20% 时间）。 */
export const expoOut = (u: number, k = 7.2) => {
  const c = clamp01(u);
  return 1 - Math.pow(1 - c, k);
};

// ---------------------------------------------------------------- 世界常数（sim.py/common.py 同源换算）
export const PILL_R = 0.094;
export const PILL_L = 0.4;
export const PITCH = 0.228;
export const G = 16.0;
export const SINK = 0.045;

/** 关键帧（旁白时间轴见 src/common/timeline.ts）：钩子胶囊入画 ≤f15；hero 触床 f240=65.8%（60-75% 窗口内）。 */
export const EV = {
  p1_drop: 4, p1_land: 20, // 钩子：小蜜桃胶囊入画 f6-8，触床 f20
  p2_drop: 58, p2_land: 74, // 「软着陆」词点：中号丁香紫胶囊触床
  p3_drop: 102, p3_land: 118, // 「弹一下」：第二记弹跳
  wave_from: 157, // 「涟漪从落点荡开」：床面行进扫掠波
  hero_drop: 222, hero_land: 240, // hero 大号糖果粉胶囊：t=8.0s（60-75% 窗口）
  lockup_from: 254, // 收束 lockup rise+unblur+track-in
  freeze_from: 329, // 结尾定帧（带 end-creep+颗粒 boil 微动）
};

// ---------------------------------------------------------------- 色板（粉彩糖果：candy pink / peach / cream / lilac）
export const COL = {
  bg: '#efe2ea', // 画布底（stage 背景，淡粉纸）
  cyc: '#e3d2de', // 无穷 Cyc（暗一档：床柱间隙要有对比）
  glow: '#f9e7f2', // 地平线辉光
  cap: '#ebdccd', // 胶囊帽（奶瓷，同源 pill_cap）
  bodyCream: '#d9bfa4',
  bodyLilac: '#b18cd4',
  bodyPeach: '#f99a6c',
  gummy: '#ff4d9e', // hero 软胶（同源 gummy base）
  lilacPill: '#a878d8',
  peachPill: '#ff8a52',
  plum: '#4a2e4e', // 排版梅紫（lockup/字幕）
  rimPink: '#ffc9e2', // 粉色条灯
};

// ---------------------------------------------------------------- 床面克隆阵列（hex 网格 + 逐实例 seeded 抖动，sim.py build_grid 简化到画框）
export type BedInst = {x: number; y: number; jitS: number; tiltX: number; tiltY: number; trembleSeed: number; variant: number; stray: boolean};

export const buildBed = (): BedInst[] => {
  const out: BedInst[] = [];
  const dy = PITCH * Math.sqrt(3) / 2;
  const r = rng(20261085);
  let j = 0;
  for (let y = -1.7; y <= 1.95; y += dy, j++) {
    const off = (j % 2) * PITCH / 2;
    for (let x = -2.35 + off; x <= 2.35; x += PITCH) {
      // 落点走廊（三颗胶囊着陆区）不摆倒伏件；色变：奶油为主，丁香/蜜桃岛（低频近似=seeded 大步进）
      const v = r();
      out.push({
        x, y,
        jitS: 1 + 0.06 * (2 * v - 1),
        tiltX: (Math.PI / 180) * 4 * (2 * r() - 1),
        tiltY: (Math.PI / 180) * 4 * (2 * r() - 1),
        trembleSeed: r() * Math.PI * 2,
        variant: v < 0.62 ? 0 : v < 0.82 ? 1 : 2, // 0 奶油 1 丁香 2 蜜桃
        // 倒伏件（sim.py STRAY：近景翻倒交代胶囊形状与双色；相机看 -z，近景=大 y；避开 hero 区）
        stray: v > 0.985 && y > 1.05 && y < 1.8 && (x < -0.55 || x > 0.75),
      });
    }
  }
  return out;
};
export const BED: BedInst[] = buildBed();

// ---------------------------------------------------------------- 接触动力学（sim.py bed_force + letter_track 的 TS 闭式重写）
const bedForce = (z: number, v: number, A: number, lam: number, Cd: number) => {
  const pen = -z;
  if (pen <= 0) return 0;
  return Math.max(A * (Math.exp(Math.min(pen / lam, 30)) - 1) - Cd * v, 0);
};

export type Contact = {t: number; v: number};
export type PillTrack = {z: number[]; s: number[]; contacts: Contact[]};

/** 一维接触 ODE + jelly squash 阻尼振子（ws=2π·3.3 / zeta=0.14 / beta=0.56，sim.py letter_track 同参）。 */
export const pillTrack = (tLandF: number, z0: number, dropF: number, heavy = false): PillTrack => {
  const tLand = tLandF / FPS;
  const t0 = tLand - Math.sqrt(2 * z0 / G);
  const dt = 1 / 2400;
  const n = Math.ceil((TOTAL / FPS + 0.05 - t0) / dt) + 1;
  const ws = 2 * Math.PI * 3.3, zs = 0.14, beta = heavy ? 0.72 : 0.56;
  const A = heavy ? 1.0 : 1.43, lam = heavy ? 0.033 : 0.02, Cd = heavy ? 62 : 47;
  const z = new Array<number>(TOTAL).fill(z0);
  const s = new Array<number>(TOTAL).fill(0);
  const contacts: Contact[] = [];
  let zz = z0, vv = 0, sq = 0, sv = 0, inContact = false;
  let ti = t0;
  for (let i = 0; i < n; i++, ti += dt) {
    const f = bedForce(zz, vv, A, lam, Cd);
    if (zz < 0 && !inContact) {
      contacts.push({t: ti, v: Math.abs(vv)});
      inContact = true;
    }
    if (zz >= 0.004) inContact = false;
    const sa = -ws * ws * sq - 2 * zs * ws * sv - beta * (zz < 0 ? f - G : 0);
    vv += (-G + f) * dt;
    zz += vv * dt;
    sv += sa * dt;
    sq += sv * dt;
    const fr = Math.round(ti * FPS); // 帧（1 起含端点）
    if (fr >= 1 && fr <= TOTAL) {
      z[fr - 1] = zz;
      s[fr - 1] = Math.min(0.42, Math.max(-0.35, sq));
    }
  }
  // drop 帧之前保持 z0（站外待命）
  for (let fr = 1; fr < Math.min(dropF, TOTAL); fr++) {
    z[fr - 1] = z0;
    s[fr - 1] = 0;
  }
  return {z, s, contacts};
};

/** 三颗糖果胶囊轨道（z=胶囊底高度，s=jelly squash；heavy=hero 用重球参数）。 */
export const P1 = pillTrack(EV.p1_land, 2.2, EV.p1_drop);
export const P2 = pillTrack(EV.p2_land, 2.6, EV.p2_drop);
export const P3 = pillTrack(EV.p3_land, 2.6, EV.p3_drop);
export const PH = pillTrack(EV.hero_land, 3.4, EV.hero_drop, true);

/** 胶囊在世界里的落点（x, 深度 y）与几何尺寸（躺平：轴向 X）。 */
export const PILLS = [
  {x: -0.44, y: 0.59, r: 0.082, L: 0.34, cap: COL.bodyCream, body: COL.peachPill, dropRot: 0.9, track: P1, dropF: EV.p1_drop, landF: EV.p1_land},
  {x: -0.16, y: 0.94, r: 0.09, L: 0.37, cap: COL.cap, body: COL.lilacPill, dropRot: -Math.PI, track: P2, dropF: EV.p2_drop, landF: EV.p2_land},
  {x: 0.21, y: 0.83, r: 0.086, L: 0.35, cap: COL.bodyPeach, body: COL.bodyLilac, dropRot: 0.55, track: P3, dropF: EV.p3_drop, landF: EV.p3_land},
  {x: 0.03, y: 1.3, r: 0.125, L: 0.46, cap: COL.cap, body: COL.gummy, dropRot: -0.7, track: PH, dropF: EV.hero_drop, landF: EV.hero_land, hero: true},
];

// ---------------------------------------------------------------- 涟漪波场（sim.py ring/sweep 同公式）
/** 行进涟漪包：阻尼余弦 × 高斯包络（rings expanding at speed c）。tau 窗口外早退（性能门优化，数学等价）。 */
export const ring = (r: number, tau: number, c: number, lam: number, amp: number, decay: number) => {
  if (tau <= 0 || tau > decay * 3.5 + 1.5) return 0; // 包络 <e^-3.5 且波前已出画，贡献可忽略
  const rho = r - c * tau;
  const env = Math.exp(-Math.pow(rho / (1.1 * lam), 2));
  if (env < 0.004) return 0;
  return (amp * env * Math.cos((2 * Math.PI * rho) / lam) * Math.exp(-tau / decay)) / Math.sqrt(1 + r / 0.6);
};
/** 方向扫掠带（高斯 band 沿 d 行进）。 */
export const sweep = (x: number, y: number, t: number, dx: number, dyv: number, tMid: number, speed: number, sigma: number) => {
  const u = x * dx + y * dyv - speed * (t - tMid);
  return Math.exp(-Math.pow(u / sigma, 2));
};
export const segDist = (x: number, y: number, cx: number, half: number) => {
  const dx = Math.max(0, Math.abs(x - cx) - half);
  return Math.hypot(dx, y);
};

export type RippleSrc = {x: number; y: number; contacts: Contact[]; amp0: number; heavy: boolean};
/** 波源登记：由 PILLS 派生（单一事实源）。三颗轻胶囊=letter 系数，hero=ball 系数（首触 0.16 / 后续 0.05，c=4.4, λ=1.15, decay 1.1）。 */
export const RIPPLES: RippleSrc[] = PILLS.map((p) => ({
  x: p.x,
  y: p.y,
  contacts: p.track.contacts,
  amp0: p.hero ? 0.16 : 0.105,
  heavy: !!p.hero,
}));

/** 波场高度（effector 扫掠 + 接触涟漪；t=秒）。S03 行进波 = 克隆阵列按波包依次起伏。 */
export const waveHeight = (x: number, y: number, t: number) => {
  return 0; // DEBUG
  let h = 0;
  // hero 预备 nest（落点前 tremble 由调用方单独处理）+ 收尾呼吸带
  h += 0.1 * sweep(x, y, t, 0.31, 0.95, 0.45, 3.0, 0.85) * Math.exp(-Math.max(0, t - 0.45) / 1.1); // 钩子开场横扫（向镜头滚来=+y）
  h += 0.12 * sweep(x, y, t, 0.92, 0.39, EV.wave_from / FPS, 2.6, 0.9); // S03 阵列波（阅读序向右 + 微向镜头）
  h += 0.05 * sweep(x, y, t, 0, 1, 10.0, 1.2, 1.1); // 收尾呼吸带（自画上方向镜头压来）
  for (const rs of RIPPLES) {
    const r = segDist(x, y, rs.x, rs.y + (rs.heavy ? 0.22 : 0.16));
    for (let k = 0; k < rs.contacts.length; k++) {
      const {t: tc, v} = rs.contacts[k];
      const a = rs.heavy ? (k === 0 ? 0.16 : 0.05) : rs.amp0 * Math.min(v / 11, 1.2);
      h += ring(r, t - tc, rs.heavy ? 4.4 : 3.4, rs.heavy ? 1.15 : 0.95, a, rs.heavy ? 1.1 : 0.85);
    }
  }
  return h;
};

// ---------------------------------------------------------------- 灯光/相机（静棚：微漂 + 无穷 Cyc）
export const CAM = {
  pos0: [0.15, 0.95, 2.25] as [number, number, number],
  pos1: [0.24, 0.99, 2.33] as [number, number, number], // 12s 慢漂终点（expoOut 长尾）
  tgt: [-0.08, -0.05, 0.35] as [number, number, number],
  fov: 42,
};

