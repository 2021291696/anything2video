// cave-wall 调色板与世界常量（洞穴岩画样片，战役 v4 批次④）。
// 锁死 token：墙三赭石 + 炭黑 + 红赭 + 黄赭 + 白垩 —— 全低饱和大地色，禁第五色相。
export const PAL = {
  wallL: '#ce925a', // 亮赭（墙面亮部）
  wallD: '#6e4426', // 暗赭（墙面暗部）
  wallR: '#b6643a', // 红斑赭（墙面锈斑）
  ink: '#21150d', // 炭黑（全部炭线/炭点）
  red: '#9c3520', // 红赭（颜料/人形剪影）
  redD: '#74261a', // 暗红赭（远侧肢体）
  ochre: '#c9772f', // 黄赭（火把/兽皮系）
  chalk: '#f0dfbf', // 白垩（高光/字幕）
  bison: '#8c3d22', // 野牛体色
  bisonD: '#76301a', // 野牛头部深色
  ember: '#ffe082', // 余烬亮核
  title: '#9b2a18', // 题字红
} as const;

export type CanvasCtx = CanvasRenderingContext2D;
export type Pt = [number, number];

/** 世界坐标系（岩壁全景，相机在其中取景）。 */
export const WORLD = {w: 2240, h: 1080};
export const FPS = 30;
export const TOTAL = 397;
