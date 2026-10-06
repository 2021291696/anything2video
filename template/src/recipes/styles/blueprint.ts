import type {StyleSkin} from '../types';

/** 风格：工程蓝图（styles/blueprint SPEC 派生）。深蓝晒图底+白工程线+黄唯一强调。
 *  冷峻系（贴用户口味锚），"把系统当造物拆解"的精密工程隐喻。 */
export const BLUEPRINT: StyleSkin = {
  id: 'blueprint',
  name: '工程蓝图',
  accentLegal: ['#ffd23f'],
  palette: {
    accent: '#ffd23f', accentLight: '#ffe37a', accentTech: '#e6b92a', accentDeep: '#b8941f', accentPale: '#24466b',
    secondary: '#7fa8d9', secondaryAlt: '#a8c8e8', warning: '#ff8c5a', correct: '#7fe8a8',
    bg: '#0d2a4a', bgFog: '#123a63', bgPanel: '#16406b', grey: '#7fa8d9', greyMid: '#5f83ad', greyLine: 'rgba(160,200,255,0.25)', greyLight: '#d7e8ff',
    white: '#d7e8ff', magenta: '#e07a9d', cyan: '#7fd7ff',
    glowAccent: '0 0 12px 3px rgba(255,210,63,.28), 0 0 42px 14px rgba(255,210,63,.32)',
    glowAccentS: '0 0 24px 8px rgba(255,210,63,.4)',
    glowSecondary: '0 0 40px rgba(127,168,217,.45), 0 0 100px 10px rgba(127,168,217,.18)',
    glowWarning: '0 0 60px 20px rgba(255,140,90,.3), 0 0 20px 6px rgba(255,140,90,.35)',
    accentGlowRgb: '255,210,63', haloDark: '#16406b', haloLight: '#ffe37a',
    techGlow: '0 0 6px rgba(230,185,42,.5)', bloom: 'drop-shadow(0 0 3px rgba(215,232,255,0.4))',
    bloomSoft: 'drop-shadow(0 0 2px rgba(215,232,255,0.3))',
    textGlow: '0 0 12px rgba(215,232,255,.4), 0 0 4px rgba(215,232,255,.3)',
    pillShadow: 'drop-shadow(0 0 2px rgba(255,210,63,.45))', pillTextOnAccent: '#0d2a4a',
    textShadowOnSolid: '0 1px 0 rgba(8,26,46,.5), 0 -1px 0 rgba(8,26,46,.5), 0 0 10px rgba(255,210,63,.35)',
  },
  chrome: {
    subColor: '#d7e8ff', subStroke: '#0d2a4a', subAccent: '#ffd23f',
    barFill: 'rgba(255,210,63,0.50)', barTrack: 'rgba(127,168,217,0.18)',
    barLabel: 'rgba(215,232,255,0.50)', barDivider: 'rgba(127,168,217,0.35)', barGlow: false,
    endFade: '#0d2a4a',
  },
};
