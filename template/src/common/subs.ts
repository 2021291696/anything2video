// 由 scripts/tts_build.py 生成（占位）。帧号 1 起含端点。en/cn 为 @EN:/@CN: 双语对照（config.subs='bilingual' 时渲染两行）。
// emphasis（U5）：重点句标记。为真时该块字幕走 54px 大字 + 色彩弧线主色 + 辉光档（见 common/Subtitle.tsx）；
// tts_build.py 未产出该标记时全为 undefined（缺省 false），渲染与现状逐值等价。
export type SubEntry = {from: number; to: number; text: string; en?: string; cn?: string; emphasis?: boolean};
export const SUBS: SubEntry[] = [];
