import type {Recipe} from './types';

/**
 * 讲解片配方（默认）：调色板与光效 = a2e ui.tsx 原实测常量的原值（一个都不能变）。
 * 这是 explainer 老片像素级不回归的锚点，也是所有 promo 光效字符串的形状模板——改值前先对照 a2e/src/ui.tsx。
 */
export const EXPLAINER: Recipe = {
  id: 'explainer',
  name: '讲解片（a2e 视觉）',
  overlaySet: 'explainer',
  // 发现 10：合法主色集合 = 模板正本 + styles/ 各 SPEC 声明的主色抄录（各风格正本工程都跑 explainer 配方，主色随 SPEC 换）。
  accentFrom: [
    '#6630F8', // 模板正本：标准胶囊紫 (102,48,248)
    '#e63329', // styles/swiss-print SPEC：red（唯一强调）
    '#33ff66', // styles/crt-terminal SPEC：phosphor
    '#ffd23f', // styles/blueprint SPEC：accent（唯一强调）
    '#a06a28', // styles/sand SPEC：amber（唯一点缀色）
  ],
  palette: {
    // ---- 主色系：紫 = 当前重点 / 激活 / 品牌 ----
    accent: '#6630F8', // 标准胶囊紫 (102,48,248)
    accentLight: '#A175F1', // 亮紫（高光端 / 穿过进度条后）
    accentTech: '#6530F4', // 英文科技字紫
    accentDeep: '#5A3AD5', // 深紫（曲线 / 硬投影）
    accentPale: '#E6DCFF',
    // ---- 语义色 ----
    secondary: '#F05F41', // 橙红：指标数字 / 另一方 / 强调
    secondaryAlt: '#F16043',
    warning: '#EC081F', // 深红警示块
    correct: '#8FF740', // 绿勾
    // ---- 背景系 ----
    bg: '#000000', // 全幅黑底（Main 唯一不透明底）
    bgFog: '#212121', // 雾底渐变末端
    bgPanel: '#2A2A2A', // 流程轨"已过"灰块底
    grey: '#A0A0A1', // 非激活
    greyMid: '#747474',
    greyLine: '#4A4A4A', // 网格线
    greyLight: '#D4D4D4',
    white: '#FFFFFF',
    magenta: '#D100D6', // glitch 错位副本（品红端）
    cyan: '#58FFEE', // glitch 错位副本（青端）
    // ---- 光效系（与 a2e 原值逐字符相等）----
    glowAccent: '0 0 12px 3px rgba(102,45,248,.35), 0 0 42px 14px rgba(102,45,248,.45)',
    glowAccentS: '0 0 24px 8px rgba(102,45,248,.6)',
    glowSecondary: '0 0 40px rgba(243,95,69,.75), 0 0 100px 10px rgba(243,95,69,.25)',
    glowWarning: '0 0 60px 20px rgba(236,8,31,.42), 0 0 20px 6px rgba(236,8,31,.45)',
    accentGlowRgb: '102,45,248', // fx 内联 rgba 光效基色（实测与 PURPLE 差 3，勿"顺手改齐"）
    haloDark: '#3A1E8C', // 光环渐变深端
    haloLight: '#8F62F5', // 光环渐变亮端
    techGlow: '0 0 6px rgba(80,30,200,.7)', // TechText 光
    bloom: 'drop-shadow(0 0 3px rgba(255,255,255,0.5))',
    bloomSoft: 'drop-shadow(0 0 2px rgba(255,255,255,0.35))',
    textGlow: '0 0 12px rgba(255,255,255,.55), 0 0 4px rgba(255,255,255,.35)',
    pillShadow: 'drop-shadow(0 0 2px rgba(200,180,255,.6))',
    pillTextOnAccent: '#FFFFFF', // 紫底胶囊文字 = 白（explainer 一贯做法）
    textShadowOnSolid: '0 1px 0 rgba(0,0,0,.5), 0 -1px 0 rgba(0,0,0,.5), 0 0 10px rgba(102,45,248,.45)', // 紫系（accentGlowRgb 102,45,248 同源）
  },
  // 机身件缺省 = v3.2.0 前硬编码字面量（逐值等价；subAccent/barHair/barLabelActive 缺省走 arcAccent）
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
