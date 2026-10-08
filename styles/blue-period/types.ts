// blue-period 调色板与世界常量（毕加索蓝色时期样片，战役 v4 批次④ D5）。
// 本卡纪律：**严格单色蓝**——全部颜色都在蓝色色相轴上（六档明度 #132240→#b6c8d8 + 青灰），
// 禁任何第二色相（连一点赭都不留：36 号配方踩坑「猫留赭色被审片打回」，彩色素材一律走
// MONO_MAP 明度映射换算成蓝）。普鲁士蓝 #0c1830 是唯一的「线色」。
export type CanvasCtx = CanvasRenderingContext2D;

/** 六档明度蓝 + 青灰（锁死 token，全片只允许出现这些色相）。 */
export const BLUE = {
  navy: '#132240', // 档1 最深：夜空底/最暗褶皱
  prus: '#1d3866', // 档2 普鲁士：墙基色
  cob: '#2d5a94', // 档3 钴蓝：墙亮笔/裙
  mid: '#4f719a', // 档4 中蓝：地/猫的「橘」映射
  cer: '#6b8fb6', // 档5 天灰蓝：披肩/地亮笔
  pale: '#b6c8d8', // 档6 浅蓝灰：月光/猫的「白」映射
  teal: '#3b6878', // 青灰（仍在蓝轴）：墙笔触冷变化
  line: '#0c1830', // 普鲁士蓝轮廓线（唯一线色，5px，不沸腾）
  skin: '#90a9be', // 肤=中浅蓝灰
  hair: '#cbd8e0', // 发=最亮蓝灰（比肤亮一档才读得出「金」，MONO_MAP 规则）
} as const;

/**
 * 单色明度映射表（签名⑥）：彩色素材 → 蓝色世界的换算。
 * 规则：只保留明度关系，色相全部归蓝；「金发比肤色亮一档」「白毛比橘毛亮两档」这类
 * 相对明度是单色世界可读性的全部来源。
 */
export const MONO_MAP: Record<string, {from: string; to: string; note: string}> = {
  catOrange: {from: '橘猫背', to: BLUE.mid, note: '橘=中蓝（明度中段）'},
  catStripe: {from: '虎斑纹', to: '#273f66', note: '虎斑=深蓝（比橘暗一档半）'},
  catWhite: {from: '白胸/白爪', to: BLUE.pale, note: '白=浅蓝（最亮）'},
  hair: {from: '金发', to: BLUE.hair, note: '金=最亮蓝灰，比肤色亮一档'},
  skin: {from: '肤色', to: BLUE.skin, note: '肤=中浅蓝灰'},
  dress: {from: '布裙', to: '#1e3a6a', note: '深布=暗蓝'},
  shawl: {from: '披肩', to: BLUE.cer, note: '披肩=天灰蓝（比裙亮）'},
};

export const W = 1280, H = 720, FPS = 30;
/** 墙/地分界线。 */
export const FLOOR = 480;
/** 窗（玻璃内可视区 / 整窗含框）。 */
export const WINDOW = {view: {x: 227, y: 73, w: 320, h: 307}, frame: {x: 213, y: 66, w: 348, h: 321}};
/** 桌（矩形参数集中；桌子单独成层画在笔触后——矩形 mask 挖洞会留平涂补丁，36 号踩坑）。 */
export const TABLE = {top: {x: 537, y: 409, w: 272, h: 23}, apron: {x: 551, y: 432, w: 245, h: 27}, legL: {x: 561, y: 459, w: 15, h: 144}, legR: {x: 771, y: 459, w: 15, h: 144}};
/** 右墙搁板。 */
export const SHELF = {a: {x: 953, y: 313, w: 12, h: 293}, b: {x: 985, y: 320, w: 12, h: 287}};
/** 拉长参数（签名③，锁死）：人 0.84×1.12 绕脚轴；猫 0.82×1.14 绕脚底——El Greco 式瘦长。 */
export const STRETCH = {girl: {sx: 0.84, sy: 1.12, anchor: [800, 618] as const}, cat: {sx: 0.82, sy: 1.14, anchor: [360, 603] as const}};
/** 慢时锚点（签名⑤「节奏即情绪」，slowdown 0.5 参数化）：S02 起世界减速，HERO 段全开到 0.5 倍。 */
export const SLOW = {from: 117, to: 225, factor: 0.5};
/** 钩子：f1-15 第一笔宽干笔横扫（0.47s < 0.5s 纪律）。 */
export const HOOK_END = 15;
/** HERO：拉长发生在 f225-262（1.23s），之后定格。f243≈62.3% / f262≈67.2% 都在 60-75% 窗口 f234-292 内。 */
export const STRETCH_FROM = 225, STRETCH_TO = 262;
/** 结尾定帧起点（禁全静止：极慢呼吸/海浪/月光碎影/热气继续）。 */
export const FREEZE_FROM = 358;
