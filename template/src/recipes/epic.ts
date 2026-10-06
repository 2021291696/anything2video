import type {Recipe} from './types';

/**
 * 史诗品牌片配方：信息层默认色系 = 暖纸白底（家谱章纸面）+ 印章红主色 + 描金辅色。
 * 世界底色温不入 palette（每章 AI 世界帧自带，取色进分镜表）——本 palette 只管信息层：
 * 角标描金/诗行分隔、印章红强调、纸面底（收口端板/纯信息章用）。
 *
 * accentFromBrand：主色组替换见下方 accent 及随主色推导的 token（accentLight/accentTech/accentDeep/accentPale、
 * glowAccent 系与 accentGlowRgb/haloDark/haloLight/techGlow/pillShadow/textShadowOnSolid）；
 * secondary（描金）来自 OPUS 金芒/分隔行取色，品牌接入映射见 brand-assets.md §3。
 * 配方规范见 recipes/epic.md。
 */
export const EPIC: Recipe = {
  id: 'epic',
  name: '史诗品牌片（epic）',
  overlaySet: 'epic',
  // 发现 10：合法主色集合 = 内置正本印章红；accentFromBrand 换主色时同步登记（reference/brand-assets.md §3）
  accentFrom: [
    '#C43C2E', // 内置正本：印章红 (196,60,46)
  ],
  palette: {
    // ---- 主色系：印章红 = 当前重点 / 贯穿符号暖端 ----
    accent: '#C43C2E', // 印章红 (196,60,46) —— accentFromBrand：品牌色可整体替换此主色
    accentLight: '#E06A55', // 亮红（高光端）
    accentTech: '#A83226', // 沉红（长文可读）
    accentDeep: '#8E2A20', // 深红（曲线 / 硬投影）
    accentPale: '#F3D5CE',
    // ---- 语义色：描金为 epic 第二身份色（分隔行 ✦ / 贯穿符号金芒） ----
    secondary: '#C9A86A', // 描金（OPUS 金芒/字幕分隔行取色）
    secondaryAlt: '#DDBE85', // 描金亮变体
    warning: '#B3261E', // 警示深红
    correct: '#4A7C59', // 墨绿（纸面语境的正确色）
    // ---- 背景系：暖纸白（世界底缺席的纯信息章 / 收口端板底） ----
    bg: '#F2EDDF', // 暖纸白（家谱章纸面取色）
    bgFog: '#E8E1CE', // 雾底末端
    bgPanel: '#E5DECB', // 面板 / 灰块底
    grey: '#8A8375', // 非激活文字（暖灰）
    greyMid: '#A9A290',
    greyLine: '#D6CFBC', // 网格线（纸纹）
    greyLight: '#C4BCA8',
    white: '#FFFFFF',
    magenta: '#D24A3A', // glitch 错位副本（暖红端）
    cyan: '#7A9E9F', // glitch 错位副本（青灰端——epic 冷章的呼应色）
    // ---- 光效系（按主色 #C43C2E → rgb(196,60,46) 推导；金系按 #C9A86A 推导）----
    glowAccent: '0 0 12px 3px rgba(196,60,46,.35), 0 0 42px 14px rgba(196,60,46,.45)',
    glowAccentS: '0 0 24px 8px rgba(196,60,46,.6)',
    glowSecondary: '0 0 40px rgba(201,168,106,.75), 0 0 100px 10px rgba(201,168,106,.25)', // 金芒（贯穿符号主光效）
    glowWarning: '0 0 60px 20px rgba(179,38,30,.42), 0 0 20px 6px rgba(179,38,30,.45)',
    accentGlowRgb: '196,60,46', // fx 内联 rgba 光效基色
    haloDark: '#5E1B14', // 光环渐变深端（深红）
    haloLight: '#F5B7A8', // 光环渐变亮端
    techGlow: '0 0 6px rgba(168,50,38,.7)', // TechText 光（accentDeep 辉光）
    bloom: 'drop-shadow(0 0 3px rgba(255,255,255,0.5))',
    bloomSoft: 'drop-shadow(0 0 2px rgba(255,255,255,0.35))',
    textGlow: '0 0 12px rgba(255,255,255,.55), 0 0 4px rgba(255,255,255,.35)',
    pillShadow: 'drop-shadow(0 0 2px rgba(245,214,200,.6))', // 胶囊描边光（纸感暖白端）
    pillTextOnAccent: '#FFF6EE', // 红底胶囊文字 = 米白（纸感，accentFromBrand 时随主色明度重估）
    textShadowOnSolid: '0 1px 0 rgba(0,0,0,.4), 0 -1px 0 rgba(0,0,0,.4), 0 0 10px rgba(196,60,46,.45)', // 红系（accent 196,60,46 同源）
  },
  // 机身件缺省 = v3.2.0 前硬编码字面量（epic 用诗行字幕/无进度条；Ending 渐隐现值 #000000，正本脸 epic-paper 同值保等价）
  chrome: {
    subColor: '#FFFFFF',
    subStroke: '#000000',
    barFill: 'rgba(190,170,250,0.52)',
    barTrack: 'rgba(243,243,243,0.32)',
    barLabel: 'rgba(255,255,255,0.55)',
    barDivider: 'rgba(255,255,255,0.55)',
    barGlow: true,
    endFade: '#000000',
  },
};
