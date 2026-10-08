// watercolor-cel 调色板与世界常量（《风起的午后》吉卜力水彩背景+赛璐璐角色样片，战役 v4 批次④）。
// 本卡纪律：暖纸白水彩墙 + 青裙少女 + 暖橙猫三组锁死 token（RECON-huashu §25 建卡要点）；
// 线色 #6a4a38（调软暖褐，INDEX 短板「人物不如背景」修正项之一）。
/** 暖纸白水彩墙：窗边亮 → 角落暗（径向洗染用）。 */
export const WALL = {hi: '#fbf3e0', mid: '#f1e1bf', lo: '#dcc49a', base: '#efdcb4'} as const;
/** 墙面色晕 tint 池（暖黄/粉/蓝灰/浅绿交替，α≤0.03 防发霉羊皮纸坑；调亮防迷彩污块）。 */
export const BLOOM_TINTS = ['#f6d8b0', '#eec6b8', '#c8d6e2', '#f7e6bc', '#e0c096', '#d4debc'] as const;
/** 木作：护墙板/地板/家具逐块换色调洗染。 */
export const WOODS = {
  dado: ['#c08a56', '#b47e4c', '#c99460', '#ad7848'] as const,
  dadoLine: '#8a5a34',
  floor: ['#a86e3a', '#9a6232', '#b07a44', '#a06836'] as const,
  furniture: '#8a5a34', furnitureDark: '#7a4c2a',
};
/** 少女赛璐璐两调成对 token（青裙 + 金发 + 肤 + 白围裙 + 红结）。 */
export const GP = {
  skin: '#fde6d2', skinS: '#efbfa4',
  hair: '#f8dc8c', hairS: '#d9a95a',
  dress: '#3f8590', dressS: '#2b6470',
  white: '#fffaf0', whiteS: '#d8dde4',
  bow: '#d93a30', bowS: '#a0261f',
} as const;
/** 猫赛璐璐两调成对 token（暖橙 + 米白）。 */
export const KP = {
  fur: '#f3a24c', furS: '#d27a2c', cream: '#fffaf2', creamS: '#e2d8ca',
  stripe: '#c8682a', ear: '#f2a8a0', nose: '#d8746a', eye: '#2a1a12',
} as const;
/** 固定色：线色（暖褐，锁死 token）/天空/草坡/云影。 */
export const FIX = {
  line: '#6a4a38',
  skyHi: '#3a86d4', skyLo: '#bfe2f4',
  hill: '#7aa6a0', grassHi: '#9ccc5a', grassLo: '#4c8a3a',
  grassBlades: ['#5c9a3e', '#7fb84a', '#3f7a32', '#9ccc5a', '#4a8a3a'] as const,
  cloudShadeA: 'rgba(150,175,205,0)', cloudShadeB: 'rgba(120,145,190,.75)',
  lightShaft: 'rgba(255,236,180,.55)', shaftBar: 'rgba(190,150,110,.5)',
  windowGlow: 'rgba(255,240,200,.28)',
  komo: '255,236,170',
  subPlate: 'rgba(48,38,24,0.45)', subText: '#fdf6e4',
} as const;

export const W = 1280, H = 720, FPS = 30;
/** 室内地平线（墙/地分界）。 */
export const FLOOR = 480;
/** 窗洞（外景可见区）与窗套外框。 */
export const WIN = {view: {x: 140, y: 95, w: 300, h: 270}, frame: {x: 122, y: 77, w: 336, h: 306}};
/** 窗帘杆 y 与两端 x。 */
export const ROD = {y: 62, x0: 95, x1: 485};

export type CanvasCtx = CanvasRenderingContext2D;
export type Pt = [number, number];
