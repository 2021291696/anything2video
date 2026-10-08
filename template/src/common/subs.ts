// 由 scripts/tts_build.py 生成（占位）。帧号 1 起含端点。en/cn 为 @EN:/@CN: 双语对照（config.subs='bilingual' 时渲染两行）。
// emphasis（U5）：重点句标记。为真时该块字幕走 54px 大字 + 色彩弧线主色 + 辉光档（见 common/Subtitle.tsx）；
// tts_build.py 未产出该标记时全为 undefined（缺省 false），渲染与现状逐值等价。
// chars（v3.9.0）：逐字符起始帧（词级点亮字幕 WordLitCaption 的底料）。edge=实测词边界，kokoro=块内线性估计；
// 旧数据（跑过配音但未重跑 v3.9.0 tts_build 的工程）缺省 undefined——WordLitCaption 退化为整块淡入，与旧渲染逐值等价。
export type SubEntry = {from: number; to: number; text: string; en?: string; cn?: string; emphasis?: boolean; chars?: number[]};
export const SUBS: SubEntry[] = [];
