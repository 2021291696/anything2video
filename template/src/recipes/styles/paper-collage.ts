import type {StyleSkin} from '../types';

/** 风格：剪纸拼贴（styles/paper-collage SPEC 派生）。chrome 取 qr-scan v1b（2026-10-06 纸化轮）实战值——判例直接进机制。
 *  ⚠ 暖系手作，不接冷峻产品向（style-ledger 用户判例 2026-10-06）。 */
export const PAPER_COLLAGE: StyleSkin = {
  id: 'paper-collage',
  name: '剪纸拼贴',
  accentLegal: ['#d94f3d'],
  palette: {
    accent: '#d94f3d', accentLight: '#e2705f', accentTech: '#c24434', accentDeep: '#a83a2c', accentPale: '#f3e7d9',
    secondary: '#e0a63c', secondaryAlt: '#d9c6a3', warning: '#a83a2c', correct: '#6b8a4a',
    bg: '#f6f1e7', bgFog: '#efe7d8', bgPanel: '#e5dcc8', grey: '#8a8676', greyMid: '#b0a995', greyLine: '#d9d2bf', greyLight: '#f6f1e7',
    white: '#fbf8f1', magenta: '#d94f8a', cyan: '#5f8a9e',
    glowAccent: '0 0 12px 3px rgba(217,79,61,.18), 0 0 42px 14px rgba(217,79,61,.22)',
    glowAccentS: '0 0 24px 8px rgba(217,79,61,.25)',
    glowSecondary: '0 0 40px rgba(224,166,60,.35), 0 0 100px 10px rgba(224,166,60,.15)',
    glowWarning: '0 0 60px 20px rgba(168,58,44,.28), 0 0 20px 6px rgba(168,58,44,.32)',
    accentGlowRgb: '217,79,61', haloDark: '#d9c6a3', haloLight: '#f3e7d9',
    techGlow: '0 0 6px rgba(194,68,52,.35)', bloom: 'drop-shadow(0 0 3px rgba(251,248,241,0.5))',
    bloomSoft: 'drop-shadow(0 0 2px rgba(251,248,241,0.35))',
    textGlow: '0 0 12px rgba(251,248,241,.5), 0 0 4px rgba(251,248,241,.35)',
    pillShadow: 'drop-shadow(0 2px 3px rgba(39,64,96,.25))', pillTextOnAccent: '#ffffff',
    textShadowOnSolid: '0 1px 0 rgba(39,64,96,.25), 0 -1px 0 rgba(39,64,96,.25), 0 0 10px rgba(217,79,61,.25)',
  },
  chrome: {
    subColor: '#274060', subStroke: '#f6f1e7', subAccent: '#d94f3d',
    barFill: 'rgba(217,79,61,0.82)', barTrack: 'rgba(217,198,163,0.50)',
    barLabel: 'rgba(39,64,96,0.55)', barDivider: 'rgba(39,64,96,0.35)', barHair: '#274060', barGlow: false,
    endFade: '#f6f1e7',
  },
};
