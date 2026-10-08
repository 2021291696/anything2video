// vhs-outrun 时基与运动数学：磁带时基重映射（15fps 步进 / 倒带 2 帧倒放 / 定帧微动效）
// + 速度曲线积分距离表（相机推进量）。全部纯函数、模块级预计算、零时钟零随机。
// 技法借鉴 mg-styles-15 demos/10-synthwave (MIT, Vincentwei1021) sceneTime/speed/ZT 机制，TSX 重写。

export const FPS = 30;
export const TOTAL_FRAMES = 397;

/** 1 起含端点帧号 → 场景时间（秒）。磁带时基：
 *  - f1-30 钩子段：15fps 步进（跟踪模式，TRACKING OSD 同窗）；
 *  - f240-246 倒带：每帧回退 1 帧（2 帧倒放观感，tape-rewind SFX 对位）；
 *  - f246-252 拖带：15fps 步进恢复（跳帧重同步，读作磁带 glitch）；
 *  - f362 起定帧：场景时间冻结在 f361，画面静止；噪声带/OSD/字幕在 VhsPost/Osd 层用真实帧继续微动（结尾定帧纪律 1.2s）。 */
export function sceneTime(f1: number): number {
  const fr = f1 - 1;
  if (fr >= 361) return 361 / FPS;
  if (fr < 30) return (Math.floor(fr / 2) * 2) / FPS;
  if (fr >= 240 && fr < 246) return (239 - (fr - 240)) / FPS;
  if (fr >= 246 && fr < 252) return (Math.floor(fr / 2) * 2) / FPS;
  return fr / FPS;
}

/** 倒带 glitch 窗口（含拖带）：VhsPost 撕裂行/RGB 大色偏/REW OSD 的帧窗 */
export const inRewind = (f1: number): boolean => {
  const fr = f1 - 1;
  return fr >= 240 && fr < 252;
};

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smooth = (k: number): number => { const c = clamp01(k); return c * c * (3 - 2 * c); };

/** 车速曲线（世界单位/秒）：钩子慢滚 → S01 点火 → S02 油门 → S03 冲到峰值（HERO 全速）→ S04 收油缓降 */
export function speed(t: number): number {
  if (t < 1.0) return 18 + 4 * t;
  if (t < 2.9) return 22 + 26 * smooth((t - 1.0) / 1.9);
  if (t < 5.8) return 48 + 14 * smooth((t - 2.9) / 2.9);
  if (t < 8.0) return 62 + 16 * smooth((t - 5.8) / 2.2);
  if (t < 9.6) return 78 - 4 * smooth((t - 8.0) / 1.6);
  return 74 - 34 * smooth(clamp01((t - 9.6) / 1.5));
}

// 距离表：dt=1/2400 梯形积分 speed → Z(t)（负向推进），查表线性插值
const DT = 1 / 2400;
const T_MAX = 13.6;
const ZT: number[] = [];
{
  let z = 0;
  for (let i = 0; i * DT <= T_MAX + DT; i++) {
    ZT.push(z);
    z -= 0.5 * (speed(i * DT) + speed((i + 1) * DT)) * DT;
  }
}
export const zAt = (t: number): number => {
  const f = Math.min(Math.max(t, 0), T_MAX) / DT;
  const i = Math.floor(f);
  const k = f - i;
  const a = ZT[Math.min(i, ZT.length - 1)];
  const b = ZT[Math.min(i + 1, ZT.length - 1)];
  return a + (b - a) * k;
};

/** HERO 条纹日落切缝上移（f250-272）：整球上移量 px（0→-58） */
export const sunLift = (f1: number): number => -58 * smooth((f1 - 250) / 22);

/** HERO 辉光泵（f250-266）：0→1→0 钟形，喂双层辉光强度 */
export const glowPump = (f1: number): number => {
  const u = clamp01((f1 - 250) / 16);
  return Math.sin(Math.PI * u);
};

/** seeded 哈希（mulberry32 单值版）：同输入同输出，禁 Math.random */
export const hash1 = (n: number): number => {
  let a = (n * 2654435761) >>> 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** 15fps 量化帧（磁带时基的离散步长，喂噪声/撕裂/OSD 闪烁） */
export const q15 = (t: number): number => Math.floor(t * 15);

/** HERO 段帧窗（beat-sheet 校准：f174-287，峰值 f250=63%） */
export const isHero = (f1: number): boolean => f1 >= 174 && f1 < 288;
