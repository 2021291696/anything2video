import type {Recipe} from './types';

/**
 * 宣传片配方：深空黑底 #0B0B12 + 电光青主色 #21E6C1、辅助橙 #FF7A45、警示红 #FF3B5C、正确绿 #3DDC84。
 * 光效系全部按主色推导（rgba 基色 = 33,230,193，渐变/柔光沿用 a2e 光效字符串的形状）。
 *
 * accentFromBrand：主色组替换见下方 accent 及随主色推导的 token（accentLight/accentTech/accentDeep/accentPale、glowAccent 系与 accentGlowRgb/haloDark/haloLight/techGlow/pillShadow/pillTextOnAccent）；
 * 完整品牌包接入另需同步 secondary/secondaryAlt/glowSecondary（映射见 brand-assets.md §3），
 * 背景系与语义色不动；ui.tsx / fx.tsx 与镜头代码零改动。本文件是 promo 无品牌包时的内置回退正本
 * （回退对照表见 skill 的 reference/brand-assets.md §4）。
 */
export const PROMO: Recipe = {
  id: 'promo',
  name: '宣传片（promo）',
  overlaySet: 'promo',
  // 发现 10：合法主色集合 = 内置正本电光青；accentFromBrand 换主色时必须同步把品牌色登记进本集合
  // （reference/brand-assets.md §3），否则 getActiveRecipe 渲染前 fail-fast——防换色只换 accent 没同步随主色 token 的静默错配。
  accentFrom: [
    '#21E6C1', // 内置正本：电光青 (33,230,193)
  ],
  palette: {
    // ---- 主色系：电光青 = 当前重点 / 品牌 ----
    accent: '#21E6C1', // 电光青 (33,230,193) —— accentFromBrand：品牌色可整体替换此主色
    accentLight: '#7BF7E2', // 亮青（高光端 / 激活卡边）
    accentTech: '#1FD0AE', // 英文技术词青（比主色略沉，长文可读）
    accentDeep: '#0FA98D', // 深青（曲线 / 硬投影 / 渐变深端）
    accentPale: '#D3F8EF',
    // ---- 语义色 ----
    secondary: '#FF7A45', // 辅助橙：指标数字 / 另一强调位
    secondaryAlt: '#FF9468', // 辅助橙亮变体
    warning: '#FF3B5C', // 警示红
    correct: '#3DDC84', // 正确绿
    // ---- 背景系 ----
    bg: '#0B0B12', // 深空黑底
    bgFog: '#151527', // 雾底末端（深空底略带蓝紫）
    bgPanel: '#1A1A26', // 面板 / 灰块底
    grey: '#9A9AA6', // 非激活文字
    greyMid: '#6E6E7A',
    greyLine: '#3C3C4A', // 网格线
    greyLight: '#C9C9D4',
    white: '#FFFFFF',
    magenta: '#FF2E9A', // glitch 错位副本（电光洋红端）
    cyan: '#21E6C1', // glitch 错位副本（青端 = 主色；common/Glitch 的 tint 滤镜仍为讲解片双色，promo 如需 tint 自行传色）
    // ---- 光效系（按主色 #21E6C1 → rgb(33,230,193) 推导）----
    glowAccent: '0 0 12px 3px rgba(33,230,193,.35), 0 0 42px 14px rgba(33,230,193,.45)',
    glowAccentS: '0 0 24px 8px rgba(33,230,193,.6)',
    glowSecondary: '0 0 40px rgba(255,122,69,.75), 0 0 100px 10px rgba(255,122,69,.25)',
    glowWarning: '0 0 60px 20px rgba(255,59,92,.42), 0 0 20px 6px rgba(255,59,92,.45)',
    accentGlowRgb: '33,230,193', // fx 内联 rgba 光效基色
    haloDark: '#073D33', // 光环渐变深端（深青）
    haloLight: '#8FFCE8', // 光环渐变亮端
    techGlow: '0 0 6px rgba(15,169,141,.7)', // TechText 光（accentDeep 辉光）
    bloom: 'drop-shadow(0 0 3px rgba(255,255,255,0.5))',
    bloomSoft: 'drop-shadow(0 0 2px rgba(255,255,255,0.35))',
    textGlow: '0 0 12px rgba(255,255,255,.55), 0 0 4px rgba(255,255,255,.35)',
    pillShadow: 'drop-shadow(0 0 2px rgba(180,240,230,.6))', // 胶囊描边光（青白端）
    pillTextOnAccent: '#06231D', // 青底胶囊文字 = 深青（accentFromBrand 时随主色一起换）
    textShadowOnSolid: '0 1px 0 rgba(0,0,0,.5), 0 -1px 0 rgba(0,0,0,.5), 0 0 10px rgba(33,230,193,.45)', // 青系（accent 33,230,193 同源）
  },
  // 机身件缺省 = v3.2.0 前硬编码字面量（promo 自身覆盖层不渲这些件，值供风格组合与其他组件兜底）
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
