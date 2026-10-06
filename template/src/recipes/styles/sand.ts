import type {StyleSkin} from '../types';

/** 风格：灯箱沙画（styles/sand SPEC 派生）。暖纸底+深沙+琥珀唯一点缀。
 *  token 为 SPEC 锁死色的近似派生，组合首用时按 sample.jpg 回归。 */
export const SAND: StyleSkin = {
  id: 'sand',
  name: '灯箱沙画',
  accentLegal: ['#a06a28'],
  palette: {
    accent: '#a06a28', accentLight: '#c98f4a', accentTech: '#8a5c20', accentDeep: '#6e4a1a', accentPale: '#f0e2c8',
    secondary: '#7d5f36', secondaryAlt: '#c8a76b', warning: '#8f4a1a', correct: '#6b7d36',
    bg: '#e9d9b4', bgFog: '#eedcb6', bgPanel: '#d9c391', grey: '#8a7a58', greyMid: '#a8946c', greyLine: '#c9b384', greyLight: '#f6ecd0',
    white: '#f7edd2', magenta: '#b06a4a', cyan: '#8a9a6a',
    glowAccent: '0 0 12px 3px rgba(247,237,210,.5), 0 0 42px 14px rgba(247,237,210,.4)',
    glowAccentS: '0 0 24px 8px rgba(247,237,210,.55)',
    glowSecondary: '0 0 40px rgba(125,95,54,.5), 0 0 100px 10px rgba(125,95,54,.2)',
    glowWarning: '0 0 60px 20px rgba(143,74,26,.35), 0 0 20px 6px rgba(143,74,26,.4)',
    accentGlowRgb: '247,237,210', haloDark: '#c9b384', haloLight: '#f7edd2',
    techGlow: '0 0 6px rgba(160,106,40,.5)', bloom: 'drop-shadow(0 0 3px rgba(247,237,210,0.5))',
    bloomSoft: 'drop-shadow(0 0 2px rgba(247,237,210,0.35))',
    textGlow: '0 0 12px rgba(247,237,210,.55), 0 0 4px rgba(247,237,210,.35)',
    pillShadow: 'drop-shadow(0 0 2px rgba(240,226,190,.6))', pillTextOnAccent: '#f7edd2',
    textShadowOnSolid: '0 1px 0 rgba(120,90,50,.4), 0 -1px 0 rgba(120,90,50,.4), 0 0 10px rgba(160,106,40,.35)',
  },
  chrome: {
    subColor: '#4a3520', subStroke: '#f6ecd0', subAccent: '#a06a28',
    barFill: 'rgba(160,106,40,0.55)', barTrack: 'rgba(74,53,32,0.18)',
    barLabel: 'rgba(74,53,32,0.55)', barDivider: 'rgba(74,53,32,0.35)', barHair: '#7d5f36', barGlow: false,
    endFade: '#e9d9b4',
  },
};
