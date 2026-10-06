import type {StyleSkin} from '../types';

/** 风格：瑞士版式（styles/swiss-print SPEC 派生）。严格四色 white/black/red/grey，纯平无回弹。
 *  ⚠ SPEC 锁死"无辉光/无渐变"——皮肤已关 barGlow，但动效词汇的过冲/落定判例仍需镜头层自律（SPEC 优先于卡判例）。 */
export const SWISS_PRINT: StyleSkin = {
  id: 'swiss-print',
  name: '瑞士版式',
  accentLegal: ['#e63329'],
  palette: {
    accent: '#e63329', accentLight: '#f06055', accentTech: '#cc2e25', accentDeep: '#a8251e', accentPale: '#f2d7d5',
    secondary: '#9a9a9a', secondaryAlt: '#c4c4c4', warning: '#e63329', correct: '#4a7c59',
    bg: '#fafafa', bgFog: '#f0f0f0', bgPanel: '#eaeaea', grey: '#9a9a9a', greyMid: '#c4c4c4', greyLine: '#d9d9d9', greyLight: '#111111',
    white: '#ffffff', magenta: '#e63329', cyan: '#9a9a9a',
    glowAccent: 'none', glowAccentS: 'none', glowSecondary: 'none', glowWarning: 'none',
    accentGlowRgb: '230,51,41', haloDark: '#d9d9d9', haloLight: '#ffffff',
    techGlow: 'none', bloom: 'none', bloomSoft: 'none', textGlow: 'none',
    pillShadow: 'none', pillTextOnAccent: '#ffffff',
    textShadowOnSolid: '0 1px 0 rgba(0,0,0,.35), 0 -1px 0 rgba(0,0,0,.35)',
  },
  chrome: {
    subColor: '#111111', subStroke: '#fafafa', subAccent: '#e63329',
    barFill: 'rgba(230,51,41,0.85)', barTrack: 'rgba(154,154,154,0.30)',
    barLabel: 'rgba(17,17,17,0.55)', barDivider: 'rgba(17,17,17,0.30)', barHair: '#111111', barGlow: false,
    endFade: '#fafafa',
  },
};
