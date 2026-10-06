import type {StyleSkin} from '../types';

/** 风格：粉笔黑板（styles/chalk SPEC 派生）。深绿板+白垩+黄重点。 */
export const CHALK: StyleSkin = {
  id: 'chalk',
  name: '粉笔黑板',
  accentLegal: ['#e8d48b'],
  palette: {
    accent: '#e8d48b', accentLight: '#f2e3ad', accentTech: '#d4c078', accentDeep: '#b8a260', accentPale: '#33544a',
    secondary: '#a8c8e8', secondaryAlt: '#e8a8b0', warning: '#e8a8b0', correct: '#a8e8b8',
    bg: '#1e3b2f', bgFog: '#152b23', bgPanel: '#24473a', grey: '#9ab8a8', greyMid: '#6f9484', greyLine: '#3a5a4c', greyLight: '#c8dccf',
    white: '#f5f2e8', magenta: '#e8a8b0', cyan: '#a8c8e8',
    glowAccent: '0 0 12px 3px rgba(232,212,139,.28), 0 0 42px 14px rgba(232,212,139,.35)',
    glowAccentS: '0 0 24px 8px rgba(232,212,139,.45)',
    glowSecondary: '0 0 40px rgba(168,200,232,.5), 0 0 100px 10px rgba(168,200,232,.2)',
    glowWarning: '0 0 60px 20px rgba(232,168,176,.32), 0 0 20px 6px rgba(232,168,176,.4)',
    accentGlowRgb: '232,212,139', haloDark: '#33544a', haloLight: '#f2e3ad',
    techGlow: '0 0 6px rgba(212,192,120,.5)', bloom: 'drop-shadow(0 0 3px rgba(245,242,232,0.4))',
    bloomSoft: 'drop-shadow(0 0 2px rgba(245,242,232,0.3))',
    textGlow: '0 0 12px rgba(245,242,232,.4), 0 0 4px rgba(245,242,232,.3)',
    pillShadow: 'drop-shadow(0 0 2px rgba(232,212,139,.5))', pillTextOnAccent: '#1e3b2f',
    textShadowOnSolid: '0 1px 0 rgba(15,32,25,.5), 0 -1px 0 rgba(15,32,25,.5), 0 0 10px rgba(232,212,139,.35)',
  },
  chrome: {
    subColor: '#f5f2e8', subStroke: '#0f2019', subAccent: '#e8d48b',
    barFill: 'rgba(232,212,139,0.50)', barTrack: 'rgba(21,43,35,0.50)',
    barLabel: 'rgba(245,242,232,0.50)', barDivider: 'rgba(245,242,232,0.30)', barGlow: false,
    endFade: '#1e3b2f',
  },
};
