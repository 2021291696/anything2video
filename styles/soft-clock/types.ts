// soft-clock 调色板与世界常量（达利超现实主义样片，战役 v4 批次④）。
// 色板锁死源自 huashu 23_dali 配方：群青→淡金天空、玻璃静海、金色礁岩、暖沙荒原、钟金。
// 本卡纪律：全片无勾线，体积感只靠 vol 渐变＋clip 内 shadowBlur 内阴影。
/** 天空三阶（群青 → 灰蓝 → 淡金）。 */
export const SKY = {hi: '#22407c', mid: '#5f88bd', lo: '#e9dcae'} as const;
/** 海（玻璃般静海）。 */
export const SEA = {hi: '#8aa6b8', lo: '#4f6f86', glint: 'rgba(240,235,210,.6)'} as const;
/** 克雷乌斯角礁岩（金）。 */
export const CLIFF = {lit: '#e8c27a', dark: '#9a6a34', rim: 'rgba(70,40,15,.5)', ridge: 'rgba(255,240,200,.7)'} as const;
/** 荒原（暖沙系）。 */
export const PLAIN = {hi: '#d2ad70', mid: '#a87a44', lo: '#7a5129', strata: 'rgba(90,55,25,.25)'} as const;
/** 断墙与木件。 */
export const WALLC = {lit: '#f4ead2', dark: '#cdbf9f', side: '#9d8c6c', crack: 'rgba(110,90,60,.55)',
  wood: '#7a4a24', woodL: '#a8703a', branch: '#4a3020'} as const;
/** 石块桌与凳。 */
export const BLOCK = {lit: '#b98754', face: '#b07a46', dark: '#6e4422', stool: '#8a5a32', stoolD: '#4a2c14', top: '#8a5a32'} as const;
/** 软钟金。 */
export const CLOCK = {gold: '#f0d27c', goldD: '#9a7426', dial: '#f6efd6', dialM: '#e8dcb6', dialD: '#bfae84',
  tick: '#3a2a18', hand: '#2a1c10', edge: 'rgba(70,45,10,.5)', hi: 'rgba(255,250,225,.55)', drop: 'rgba(30,15,5,.35)'} as const;
/** 蚂蚁怀表（橙）。 */
export const WATCH = {hi: '#f39a4a', lo: '#9a3a10', crown: '#c9a24a', ant: '#120a06', shadow: 'rgba(30,15,5,.35)'} as const;
/** 软体生物（沉睡的自画像，前景）。 */
export const CREATURE = {lit: '#f0e6cc', dark: '#b7a67e', occl: 'rgba(70,55,30,.5)', lash: '#4a3a22',
  hiSecond: 'rgba(255,252,238,.5)', refl: 'rgba(90,70,40,.25)', bounce: 'rgba(255,190,110,.18)'} as const;
/** 高跷象。 */
export const ELEPHANT = {body: '#5a4a46', saddle: '#c8402c', obelisk: '#e6d6b0', rim: 'rgba(255,235,200,.35)'} as const;

export const W = 1280, H = 720, FPS = 30;
/** 海平线与岸线（世界坐标）。 */
export const HZ = 372, GROUND = 395;
/** 长影子的三条着地线（yg）：墙 / 桌·表 / 生物。 */
export const YG = {wall: 466, table: 603, creature: 620} as const;
/** 影子只落在地面（岸线以下）。 */
export const SHADOW_CLIP_Y = GROUND + 2;

export type CanvasCtx = CanvasRenderingContext2D;

// ---------- 帧锚点（tts_build 实测：365f=12.17s；S01 31-93 / S02 100-174 / S03 181-261 / S04 268-319） ----------
/** 钩子：第一只钟开始下垂的窗口（0.5s 纪律内）。 */
export const HOOK_END = 15;
/** melt 转场窗口（38f≈1.27s）：特写画 → 全景画。 */
export const MELT_FROM = 96, MELT_TO = 134;
/** 长影子 1.2s 主变长段（kx 1.02→1.45），对位 S03「长影子越拉越长」。 */
export const KX_FROM = 196, KX_TO = 232;
/** HERO 锚点：影子达到最长＋高跷象走过荒原中部（365f 的 63.6%，落在 60-75% 窗口 f219-274）。 */
export const HERO_FRAME = 232;
/** sag 达到 1.4 的帧（此后波纹维持 1.4 幅度）。 */
export const SAG_FULL = 330;
/** 结尾定帧：相机钳死（36f=1.2s，0.8-1.2s 纪律上限），钟面波纹＋蚂蚁爬微动效。 */
export const FREEZE_FROM = 330;

export const SENT_S03 = {from: 181, to: 261};
export const SENT_S04 = {from: 268, to: 319};
