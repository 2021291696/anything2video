// cumulus-light 调色板与世界常量（《放学后的积雨云》，新海诚光影样片，战役 v4 批次④）。
// 本卡纪律：赛璐珞四组双色成对锁死（肤/发/白校服/藏青 base+shade）+ 天空蓝四档 + 云蓝灰两档，
// 光效三条红线量化：太阳必须在玻璃内、光晕核 ≤130px、横丝 ≤840px、泛光 α≤0.28。
/** 赛璐珞描线（本卡锁死 token）。 */
export const LINE = '#6a4632';
/** 肤：base+shade 成对锁死。 */
export const SK = {b: '#ffe8dc', s: '#f2b6a8', r: '#fffaf4'} as const;
/** 发（金棕）：base+shade 成对锁死。 */
export const HR = {b: '#f8d681', s: '#d8a050', r: '#fff6d6'} as const;
/** 白校服：base+shade 成对锁死。 */
export const WT = {b: '#fbfbfe', s: '#b9c3dc', r: '#ffffff'} as const;
/** 藏青（裙/水手领）：base+shade 成对锁死。 */
export const NV = {b: '#2c3a66', s: '#1b2446', r: '#5a6ea8'} as const;
/** 天空蓝四档（玻璃内天空纵向渐变，自上而下）。 */
export const SKY = ['#1360d0', '#3f9bf0', '#a8dcff', '#e4f6ff'] as const;
/** 积雨云剪影蓝灰（上亮下暗）与受光亮球白。 */
export const CLOUD = {hi: '#b7c6e6', lo: '#8297c6', ball0: '#ffffff', ball1: '#f6f8ff', ball2: '#e2e9fa'} as const;
/** 不随光变的固定色（室内/窗外细节）。室内比窗外暗一档——新海诚「外亮内暗」对比，光柱才读得出。 */
export const FIX = {
  wallWarm: '#e7ddcd', wallMid: '#dcd5ca', wallCool: '#adb3c6',
  skirt: '#d8d4cc', floorHi: '#9a6a48', floorLo: '#6a4430', seam: 'rgba(60,36,20,.45)',
  frame: '#d4d2d4', frameIn: '#f6f6f8', glassBase: '#b8bcc8', mullion: '#eef0f4', mullionD: '#c6cad4',
  sill: '#fbfbfc', sillD: '#c4c4cc',
  roof: '#7d9cc6', pole: '#5f7fae', wire: 'rgba(50,70,110,.8)', bird: '#3a4a6a',
  calPaper: '#ffffff', calHead: '#e2534a', calGrid: '#9aa0b0',
  desk: '#c99a68', deskHi: '#f0cf9c', deskD: '#8e623e', deskLeg: '#7a5236',
  book1: '#3d5a8e', book2: '#c94f4a', bookPage: '#f2ecdc', pencil: '#d8a03c',
  chair: '#8e623e', chairHi: '#b8865a',
  pot: '#e8e2d6', potD: '#c9c0b0', leaf: '#5fae5a', leafD: '#2f7a42', leafR: '#b8f09a', leafLine: '#2a5a32',
  beam: 'rgba(255,240,205,', mote: 'rgba(255,250,230,',
  rimWarm: 'rgba(255,220,160,.55)', halo: 'rgba(255,250,226,.85)',
  subPlate: 'rgba(18,26,52,0.55)', subText: '#fff6d6',
} as const;

export const W = 1280, H = 720, FPS = 30;
/** 窗玻璃可见区（天空/云/水珠裁切区）。 */
export const GLASS = {x: 212, y: 80, w: 388, h: 404} as const;
/** 窗中梃（竖向分隔条）。 */
export const MULLION = {x: 396, w: 22} as const;
/** 太阳（必须整体在玻璃内；核半径 76 ≤ 红线 130px）。 */
export const SUN = {x: 300, y: 158, r: 76} as const;
/** 窗台。 */
export const SILL = {x: 184, y: 500, w: 444, h: 22} as const;
/** 墙地分界（踢脚线 506-524，地板自此向下）。 */
export const FLOOR_Y = 520;
/** 课桌（光柱落点：光斑钉在桌面上）。 */
export const DESK = {x: 680, y: 468, w: 470, h: 26, legW: 20} as const;
/** 少女头部锚点（背身 3/4，面向左窗；约 5.3 头身）。 */
export const HEAD = {x: 430, y: 246, r: 33} as const;
/** 结尾定帧起点（f330 起 1.0s 定帧：姿态/相机冻结，光尘+云缓移继续）。 */
export const FREEZE_FROM = 330;

export type CanvasCtx = CanvasRenderingContext2D;
