// rubberhose 锁死 token（战役 v4 批次④ D3-3）：
// 1930 橡皮管卡通的「去色后色板」——整片每帧做 saturation 去色 + multiply #f2e8d2 染色，
// 所有填色在去色后必须塌缩到 3–4 个明度档 + 纸白，禁引入第二色相。
export const W = 1280;
export const H = 720;
export const FPS = 30;
/** 总帧数（tts_build 实测 396f = 13.2s，12–14s 纪律内） */
export const TOTAL = 396;
/** 墨线（最黑档） */
export const INK = '#141210';
/** 纸底 */
export const PAPER = '#efe7d2';
/** 浅档 */
export const LT = '#d9d0b8';
/** 中档（皮毛/窗帘/地板主色） */
export const MID = '#a39a84';
/** 深档（裙/花瓶/虎斑） */
export const DK = '#5e574b';
/** 纸白（手套/眼白/高光） */
export const WHITE = '#fbf7ec';
/** 天空（≈纸白一档） */
export const SKY = '#f6f0e0';
/** 窗框白漆 */
export const FRAME = '#f4eedc';
/** 墙纸条纹/菱点/地板三档 */
export const STRIPE = '#e5dcc5';
export const DOT = '#cfc5ab';
export const FLOOR = '#cdc3a8';
export const SEAM = '#8a816c';
/** 褪色染色（老胶片暖灰，multiply） */
export const TINT = '#f2e8d2';
/** 128 BPM 节拍（秒/拍）——一切弹跳的拍子 */
export const BEAT = 60 / 128;
export type CanvasCtx = CanvasRenderingContext2D;
