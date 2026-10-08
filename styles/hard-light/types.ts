// hard-light 调色板与世界常量（霍珀美国现实主义样片，战役 v4 批次④）。
// 本卡纪律：每物两色成对锁死——背光冷绿族（SH/TS）与受光暖黄族（LT/TL）逐物配对，
// 光影切换只靠 litClip 裁切换色，禁第三套中间色。
/** 背光（房间）：冷绿墙、暗地板。 */
export const SH = {
  wall: '#5d8679', dado: '#4b6d63', floor: '#5b3d2b', board: '#4a3122',
  trim: '#a7b3a5', trimD: '#7f8d80', blind: '#cfc3a0',
} as const;
/** 受光（房间）：暖黄墙、亮地板。 */
export const LT = {
  wall: '#efcf8f', dado: '#d8ad68', floor: '#c98b52', board: '#b0743e',
  trim: '#f7eed2', trimD: '#d9c9a2', blind: '#f4e8c4',
} as const;
/** 背光（家具/人物）。 */
export const TS = {
  wood: '#4f3322', woodD: '#3a2418', skin: '#c89a84', skinD: '#a87866',
  hair: '#a8893f', hairD: '#7f6428', dress: '#7a2c2a', dressD: '#5e1f1e',
  collar: '#b9b09c', cup: '#bfb8a8', band: '#3a5a8a',
} as const;
/** 受光（家具/人物）。 */
export const TL = {
  wood: '#a86c3c', woodD: '#7a4a26', skin: '#f7d3b4', skinD: '#e0ad8c',
  hair: '#f3d67e', hairD: '#c9a24a', dress: '#cc4a3c', dressD: '#9e3328',
  collar: '#f6efdc', cup: '#fbf8f0', band: '#4a78c0',
} as const;
/** 不随室内光变的固定色（街景/皮件/点缀）。砖红 #b4553a 为锁死 token。 */
export const FIX = {
  skyHi: '#5f97c9', skyLo: '#a9c8dc', brick: '#b4553a', brickHi: '#d27a52',
  brickShadow: '#5a2418', casing: '#e8dcc0', glass: '#1f2a24', blindOut: '#3d6a4e',
  winHardShadow: 'rgba(40,10,5,.55)', store: '#2d5a44', storeWin: '#c9d6c8',
  storeWinShade: 'rgba(30,50,40,.75)', fascia: '#e9e0c8', walk: '#d8c9a8',
  eye: '#2e2018', lip: '#a83a36', shoe: '#2a1810', cupRim: '#5a3a22',
  cord: '#7a6a4a', cordRing: '#c9b88a', poleCream: '#f4efe2',
  poleRed: '#c8302a', poleBlue: '#2a4a9a', poleCap: '#d9d2bf',
  subPlate: 'rgba(18,20,16,0.55)', subText: '#f4e8c4',
} as const;

export const W = 1280, H = 720, FPS = 30;
/** 墙/地分界线。 */
export const FLOOR = 487;
/** 窗洞（街景可见区）与整个窗套。 */
export const WINDOW = {view: {x: 248, y: 92, w: 280, h: 266}, frame: {x: 230, y: 74, w: 316, h: 302}};

export type CanvasCtx = CanvasRenderingContext2D;
export type RoomKey = Record<keyof typeof SH, string>;
export type ThingKey = Record<keyof typeof TS, string>;
