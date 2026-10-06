import type {StyleSkin} from '../types';

/** 风格：霓虹夜城（styles/neon SPEC 派生）。夜幕+白芯彩晕霓虹（青主粉辅）。
 *  ⚠ 辉光系与口味锚"不贴科技标签"相悖，慎选（style-ledger 判例）。 */
export const NEON: StyleSkin = {
  id: 'neon',
  name: '霓虹夜城',
  accentLegal: ['#33e0ff', '#ff4d9d'],
  palette: {
    accent: '#33e0ff', accentLight: '#7deaff', accentTech: '#2ac2dd', accentDeep: '#1f96ad', accentPale: '#12253a',
    secondary: '#ff4d9d', secondaryAlt: '#ffe14d', warning: '#ff4d6a', correct: '#2ee6a8',
    bg: '#07070f', bgFog: '#12101f', bgPanel: '#181626', grey: '#9a97b0', greyMid: '#6a6880', greyLine: '#2c2a40', greyLight: '#c9c6dc',
    white: '#ffffff', magenta: '#ff4d9d', cyan: '#33e0ff',
    glowAccent: '0 0 12px 3px rgba(51,224,255,.4), 0 0 42px 14px rgba(51,224,255,.5)',
    glowAccentS: '0 0 24px 8px rgba(51,224,255,.65)',
    glowSecondary: '0 0 40px rgba(255,77,157,.6), 0 0 100px 10px rgba(255,77,157,.25)',
    glowWarning: '0 0 60px 20px rgba(255,77,106,.4), 0 0 20px 6px rgba(255,77,106,.45)',
    accentGlowRgb: '51,224,255', haloDark: '#12253a', haloLight: '#7deaff',
    techGlow: '0 0 6px rgba(42,194,221,.7)', bloom: 'drop-shadow(0 0 3px rgba(255,255,255,0.55))',
    bloomSoft: 'drop-shadow(0 0 2px rgba(255,255,255,0.4))',
    textGlow: '0 0 12px rgba(255,255,255,.6), 0 0 4px rgba(255,255,255,.4)',
    pillShadow: 'drop-shadow(0 0 2px rgba(125,234,255,.6))', pillTextOnAccent: '#06231f',
    textShadowOnSolid: '0 1px 0 rgba(4,4,10,.5), 0 -1px 0 rgba(4,4,10,.5), 0 0 10px rgba(51,224,255,.45)',
  },
  chrome: {
    subColor: '#ffffff', subStroke: '#07070f', subAccent: '#33e0ff',
    barFill: 'rgba(51,224,255,0.45)', barTrack: 'rgba(30,28,48,0.50)',
    barLabel: 'rgba(201,198,220,0.50)', barDivider: 'rgba(51,224,255,0.30)', barGlow: true,
    endFade: '#07070f',
  },
};
