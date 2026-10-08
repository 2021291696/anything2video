// world.ts — popup-book 纸艺立体书的世界数据：色 token / 缓动 / 相机漂移 / 四页时刻表。
// 坐标约定：全片是一册摊开的牛皮纸立体书；四页沿片轴展开（页 1 豆子 → 页 2 烘焙 → 页 3 研磨冲煮 → 尾页收束卡）。
// 相机=整组水平漂移（无旋转无缩放），三层 0.55 / 0.8 / 1.0 视差；页间「拉页」转场时整帧被新页盖住，漂移允许在窗口内换向。

// ---------------------------------------------------------------- 色 token（PAPER，暖纸+咖啡烘焙系）
export const PAPER = {
  kraftTop: '#d9bf95', // 牛皮纸页面上部（受光）
  kraftMid: '#c8a97e', // 页面主调（暖纸）
  kraftLow: '#b3925f', // 页面下部（落影）
  horizon: '#a8845344', // 远近分界淡线
  surface: '#fbf6ea', // 白纸片（卡片/标签）
  sand: '#f1e4c8', // 牛皮浅纸（飘带/托盘）
  sandDark: '#dcc9a8', // 纸厚度层
  cream: '#f6ead2',
  ink: '#4a3222', // 深咖啡墨（字/描边基色）
  muted: '#7a5c3e', // 次级字
  accent: '#d96f4e', // 烘焙珊瑚（本拍最重要的东西）
  accentInk: '#b34a2e',
  sky: '#c3d8e2', // 纸天空带/水弧
  sage: '#9db898', // 叶/草纸
  roast: '#6b4226', // 深烘豆色
  beanTan: '#c89b6b', // 生豆色
  cherry: '#c4553f', // 咖啡樱桃红
  flame: '#e2a13c', // 火焰芥末
  flameDeep: '#cf7f33',
  shadow: 'rgba(74,50,34,0.30)', // 纸影基色
  tape: 'rgba(214,196,158,0.82)', // 胶带
} as const;

// ---------------------------------------------------------------- 缓动 / seeded PRNG
export const EASE = {
  clamp01: (x: number) => Math.min(1, Math.max(0, x)),
  easeOutCubic: (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3),
  easeInOutPow: (t: number, p = 2.5) => {
    t = Math.min(1, Math.max(0, t));
    return t < 0.5 ? 0.5 * Math.pow(2 * t, p) : 1 - 0.5 * Math.pow(2 - 2 * t, p);
  },
  /** 阻尼弹簧 0→1（w14.8 z0.61 ≈ 峰值 8 帧、9% 过冲；tau 单位=秒）。 */
  spring: (tau: number, w = 14.8, z = 0.61, v0 = 0) => {
    if (tau <= 0) return 0;
    const wd = w * Math.sqrt(1 - z * z);
    const B = (v0 - z * w) / wd;
    return 1 + Math.exp(-z * w * tau) * (-Math.cos(wd * tau) + B * Math.sin(wd * tau));
  },
  /** 确定性 PRNG（mulberry32）：纸纹抖动 / 草叶姿态 / 粉末粒子全部可复现。 */
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

// ---------------------------------------------------------------- 相机（整组水平漂移，无旋转）
// 前中后三层 1.0 / 0.8 / 0.55 视差速度；漂移段边界对齐拉页窗口（f105-120 / f191-206 / f330-345），
// 页面盖满画面的瞬间换向，观众看不到跳变。
export const PARALLAX = { back: 0.55, mid: 0.8, front: 1.0 };
export const camDrift = (f: number): number => {
  if (f < 105) return 26 * EASE.easeInOutPow(f / 105, 2.2); // 页 1：缓慢右探
  if (f < 121) return 26 - 40 * EASE.easeInOutPow((f - 105) / 16, 2.2); // 拉页①窗口内换向
  if (f < 191) return -14 + 10 * EASE.easeInOutPow((f - 121) / 70, 2.2); // 页 2：微回中
  if (f < 207) return -4 - 10 * EASE.easeInOutPow((f - 191) / 16, 2.2); // 拉页②窗口内再换向
  if (f < 330) return -14 + 22 * EASE.easeInOutPow((f - 207) / 123, 2.2); // 页 3：右推到冲煮 hero
  if (f < 346) return 8 - 12 * EASE.easeInOutPow((f - 330) / 16, 2.2); // 拉页③（尾页）窗口内归位
  return -4 - 3 * EASE.easeInOutPow((f - 346) / 41, 2.0); // 尾页：极缓回漂（定帧段呼吸之一）
};
/** 中景层场景件 → 屏幕坐标（含 0.8× 视差偏移）。 */
export const midX = (x: number, f: number) => x - camDrift(f) * PARALLAX.mid;
export const backX = (x: number, f: number) => x - camDrift(f) * PARALLAX.back;
export const frontX = (x: number, f: number) => x - camDrift(f) * PARALLAX.front;

// ---------------------------------------------------------------- 四页时刻表（帧号=绝对帧，1 起含端点；依据 script/timeline.json TTS 实测）
export const TL = {
  total: 387,
  // 拉页转场窗口（0.55s ≈ 16f；窗口内允许左缘单向阴影，落定即撤）
  turn1: { from: 105, to: 120 }, // 页 1 → 页 2
  turn2: { from: 191, to: 206 }, // 页 2 → 页 3
  turn3: { from: 330, to: 345 }, // 页 3 → 尾页（收束卡即拉入的尾页）
  freezeFrom: 353, // 结尾定帧 f353-387 = 1.17s（0.8-1.2s 纪律内，微动效豁免档登记）
  hookAt: 3, // 钩子：标题立体卡 f3 折起，f12 内成形（0.4s < 0.5s）
} as const;

/** 折起进度：t0 起折，从平铺（rotateX 90°）立到 standDeg（默认 78°，微后仰=立体书视角）；弹簧过冲≈9%，1.0 为立定。 */
export const foldLift = (f: number, t0: number) => {
  if (f < t0) return 0;
  return Math.max(0, Math.min(1.09, EASE.spring((f - t0) / 30, 16, 0.55)));
};

// ---------------------------------------------------------------- 烘焙/研磨/冲煮的分件时刻表
export const SCH = {
  p1Branch: 36, // 页 1：咖啡枝立体卡折起
  p1Tag: 58, // 页 1：页码标签折起
  p1BeanHop: 84, // 页 1：豆子离枝跳落（S01 结束前落地 f100）
  p2Pan: 123, // 页 2：烘焙盘折起
  p2Flames: 139, // 页 2：三簇纸火苗折起
  p2Beans: [144, 154, 164, 172], // 页 2：四豆依次「爆裂一跳」+ 变深
  p2Tag: 150,
  p3Grinder: 209, // 页 3：磨豆机折起
  p3BeansIn: [224, 231], // 两颗豆投入料斗
  p3Crank: 238, // 摇柄转动（研磨）
  p3Powder: 242, // 粉末落进杯
  p3Cup: 236, // 纸杯折起
  pourFrom: 252, // hero：水壶倾斜出水（BGM drop 8.5s=f255 对位）
  pourTo: 280, // 水弧灌注区间，中点 f266 = 68.7%（60-75% 窗口）
  fillFrom: 258, // 杯内液面升起
  steamFrom: 292, // 热气飘带升起
  p3Tag: 214,
} as const;
