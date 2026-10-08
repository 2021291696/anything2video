// chrome-ball 调色板与世界常量（《1995 年的桌面》早期光追 CGI 样片，战役 v4 批次④）。
// 锁死 token（RECON-huashu §15 / 配方 15_raytrace）：青绿墙 #7dbcb9→#3f8285 + 粉紫天四段 + 白高光。
// 源配方为 1920×1080（VP 960,480 / 近墙雾 140px）；本片 1280×720 按 2/3 换算：VP(640,320)、雾距 93px（比例不变 35%）。
export const PAL = {
  wall0: '#7dbcb9', // 青绿墙径向内圈（光源在窗）
  wall1: '#64a6a6', // 青绿墙径向 0.45
  wall2: '#3f8285', // 青绿墙径向外圈
  sky0: '#a24cc4', // 窗外粉紫天四段（锁死）
  sky1: '#df62ae',
  sky2: '#f5a08a',
  sky3: '#f8c070',
  ckA: '#d9dadf', // 棋盘亮格
  ckB: '#3e5d62', // 棋盘暗格
  fog: [150, 190, 192] as [number, number, number], // 近墙雾色
  wire: '#46ff9a', // 磷光绿线框（签名⑦）
  wireDim: 'rgba(70,255,154,0.38)', // 线框网格暗线
  dark: '#05130e', // 线框阶段暗底
  catOrange: '#ee8f2e', // 猫塑料主色
  catWhite: '#f6f2ee', // 猫白胸/爪
  catStripe: 'rgba(170,70,10,0.5)', // 虎斑（blur 印在塑料下面）
  torusBase: '#7a1aa0', // 紫环暗底
  torusHi: '#d850f6', // 紫环高光
  torusMid: '#9a28c4',
  cone: '#25835a', // 绿锥
  sub: '#eafaf2', // 字幕暖白
  band: 'rgba(6,20,18,0.55)', // 字幕底带
  title: '#ffffff', // 片名白
} as const;

export type CanvasCtx = CanvasRenderingContext2D;
export type Pt = [number, number];

/** 画布 1280×720@30fps；TOTAL 由 tts_build 实测时间轴锁死（377f = 12.57s，12-14s 纪律内）。 */
export const W = 1280, H = 720, FPS = 30, TOTAL = 377;

/** 地平线（墙/地分界）与透视消失点（签名③，1920 版 (960,480) 的 2/3）。 */
export const FLOOR_Y = 527;
export const VP: Pt = [640, 320];
/** 镜头光晕日芯（窗内粉紫天上的太阳，签名⑥）。 */
export const SUN: Pt = [455, 152];
/** 反射水线（主接地基准；源 906 的 2/3）。 */
export const LINE_Y = 604;

/** 接地线（反射镜像各按自己的接地线）：锥 516 / 紫环 524 / 铬球 557 / 猫 560。 */
export const GROUND = {cone: 516, torus: 524, ball: 557, cat: 560} as const;

// ---- 段落帧号（tts_build 实测句界：S01 f31-98 / S02 f105-191 / S03 f198-276 / S04 f283-330）----
/** 钩子显影：f1-2 线框，f3-15 扫描线逐行下扫，f16 完成（0.5s 内，签名⑦）。 */
export const REVEAL = {start: 3, end: 15} as const;
/** HERO：f229 镜头光晕全开 = 60.7%（60-75% 窗口 f227-283 内）。 */
export const HERO_F = 229;
/** 结尾定帧：f345-377 = 33f = 1.1s（0.8-1.2s 纪律；微动效=棋盘 u 持续平移+光晕脉动）。 */
export const FREEZE_F = 345;
