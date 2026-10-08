// shadow-play 调色板与世界常量（《幕后》皮影样片，战役 v4 批次④）。
// 锁死 token（RECON/配方锁死）：红/绿/琥珀/黄/蓝 + 橘/皮白 七皮色 + 幕布径向四档暖 —— 禁第六色相。
export const PAL = {
  red: '#c0352a', // 红皮（旦角袄/武将靠）
  grn: '#2f7d4c', // 绿皮（裙/靠旗）
  amb: '#d99a2e', // 琥珀皮（发/盔）
  yel: '#e2bd4a', // 黄皮（襟边/飘带）
  blu: '#2c5a8a', // 蓝皮（扇/簪/兵）
  org: '#d9782a', // 橘皮（马）
  tan: '#efe2c4', // 皮白（手/马蹄尾梢）
  darkred: '#7a2a20', // 净角脸深红
  edge: '#3a160a', // 深褐皮边（所有皮件外轮廓 2.6px）
  rivet: '#2a1006', // 铆钉深褐
  rivetLite: '#b07a3a', // 铆钉铜高光
  wood: '#2a140a', // 影窗木框
  woodLite: '#a8742e', // 木框内衬线
  scrim0: 'rgb(255,246,214)', // 幕布径向内圈 #fff6d6
  scrim1: '#f2d7a0', // 幕布径向 0.35
  scrim2: '#cf9a58', // 幕布径向 0.7
  scrim3: '#7a4a20', // 幕布径向外圈
  flame: '#5a2c10', // 灯苗剪影（幕后挡光）
  hot: 'rgba(255,236,190,', // 灯芯热点基色
  ink: '#3a160a', // 杆/描线
  sub: '#f6e7c8', // 字幕暖白
  band: 'rgba(28,12,4,0.55)', // 字幕底带
  title: '#c0352a', // 片名印红
} as const;

export type CanvasCtx = CanvasRenderingContext2D;
export type Pt = [number, number];

/** 画布 1280×720@30fps；TOTAL 由 tts_build 实测时间轴锁死（408f = 13.6s，12-14s 纪律内）。 */
export const W = 1280, H = 720, FPS = 30, TOTAL = 408;

/** 幕后油灯（光心，随灯焰漂移 ±26/±18 的基点）。 */
export const LAMP: Pt = [640, 250];
