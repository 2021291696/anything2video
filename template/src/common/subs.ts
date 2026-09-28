// 由 scripts/tts_build.py 生成（占位）。帧号 1 起含端点。en/cn 为 @EN:/@CN: 双语对照（config.subs='bilingual' 时渲染两行）。
export type SubEntry = {from: number; to: number; text: string; en?: string; cn?: string};
export const SUBS: SubEntry[] = [];
