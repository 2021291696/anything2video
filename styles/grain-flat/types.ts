// grain-flat 调色板与世界常量（当代扁平插画样片《一只猫的晨间仪式》，战役 v4 批次④）。
// 锁死 token：奶油底 + 粉圆/淡紫/阳光黄低饱和族 + 深一档阴影色（全部同色系，无描边）。
// 技法借鉴 huashu-art-motion (MIT, alchaincyf) scenes/16_2026 + references/风格配方/16_2026.md，Remotion/TSX 重写。
export const PAL = {
  wall: '#f6efe2', // 奶油墙
  floor: '#eedfc7', // 奶咖地板
  floorDk: '#e3d2b4', // 地板暗带（踢脚）
  pink: '#f5cdc6', // 粉圆底
  pinkDot: '#e8807b', // 粉圆点彩
  pinkDk: '#e8b4ac', // 粉圆深一档
  lav: '#e4dbf6', // 淡紫色块
  lavDot: '#b9a4ea', // 淡紫点彩
  lavDk: '#8a6cd6', // 淡紫深一档
  navy: '#262a5c', // 藏青（家具/文字/五官）
  navyDk: '#1d2050', // 藏青深一档
  yellow: '#f2b33d', // 阳光黄
  yellowDk: '#d99a26', // 黄深一档
  mint: '#d6ece0', // 薄荷地毯
  mintDot: '#9fcfb4',
  white: '#fffaf2', // 暖白
  orange: '#f0a23c', // 猫主色
  orangeDk: '#d8832a', // 猫深一档（虎斑/轮廓分块）
  orangeLt: '#f3ad4c', // 猫大腿亮块
  catWhite: '#fff8ee', // 猫白胸/白爪
  catCream: '#f3e9dc', // 远侧腿
  earIn: '#f4aaa0', // 耳内
  blush: '#f39a8d', // 腮红
  red: '#e65a52', // 装饰红/杯
  cup: '#e35b55',
  cupDk: '#c4433e', // 杯深一档
  coffee: '#b8782f',
  coffeeLt: '#d79a4a',
  green: '#2f8a5d',
  greenDk: '#22704a',
  sky: '#a6d4f1',
  skyLt: '#e0f2ef',
} as const;

export type CanvasCtx = CanvasRenderingContext2D;

export const W = 1280;
export const H = 720;
export const FPS = 30;
export const TOTAL = 383;

/** 世界锚点：晨间卧室一角。 */
export const WORLD = {
  floorY: 540, // 墙脚线
  groundY: 648, // 地面活动线（猫脚/碎片落点）
  tableX0: 780, // 床头柜台面左缘
  tableX1: 1080,
  tableY: 470, // 台面顶
  lampX: 930, // 吊灯挂点
  catFloor: {x: 560, ground: 648}, // 猫Floor落位
  catTable: {x: 1000, ground: 470}, // 猫上桌落位（质心 x；dir=-1 面左）
  cupStart: 858, // 水杯初始 x（杯中心）
  clockX: 1055, // 闹钟中心
  smash: {x: 748, y: 658}, // 碎裂落点（咖啡渍中心）
} as const;
