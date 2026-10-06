import type {StyleSkin} from '../types';

/** 风格：像素街机（styles/pixel-arcade SPEC 派生）。8px 网格+CRT 扫描线+品红/荧绿/金有限色。 */
export const PIXEL_ARCADE: StyleSkin = {
  id: 'pixel-arcade',
  name: '像素街机',
  accentLegal: ['#2ee6a8', '#ff3d81', '#ffc93c'],
  palette: {
    accent: '#2ee6a8', accentLight: '#6ff2c8', accentTech: '#29c795', accentDeep: '#1f9a74', accentPale: '#1a1f3a',
    secondary: '#ff3d81', secondaryAlt: '#ffc93c', warning: '#ff3d5a', correct: '#2ee6a8',
    bg: '#0d0f1c', bgFog: '#12142a', bgPanel: '#1a1f3a', grey: '#a2a2a6', greyMid: '#3c3c44', greyLine: '#3c3c44', greyLight: '#f4f6ff',
    white: '#f4f6ff', magenta: '#ff3d81', cyan: '#2ee6a8',
    glowAccent: '0 0 12px 3px rgba(46,230,168,.3), 0 0 42px 14px rgba(46,230,168,.35)',
    glowAccentS: '0 0 24px 8px rgba(46,230,168,.5)',
    glowSecondary: '0 0 40px rgba(255,61,129,.5), 0 0 100px 10px rgba(255,61,129,.2)',
    glowWarning: '0 0 60px 20px rgba(255,61,90,.32), 0 0 20px 6px rgba(255,61,90,.4)',
    accentGlowRgb: '46,230,168', haloDark: '#1a1f3a', haloLight: '#6ff2c8',
    techGlow: '0 0 6px rgba(41,199,149,.6)', bloom: 'drop-shadow(0 0 3px rgba(244,246,255,0.45))',
    bloomSoft: 'drop-shadow(0 0 2px rgba(244,246,255,0.35))',
    textGlow: '0 0 12px rgba(244,246,255,.45), 0 0 4px rgba(244,246,255,.35)',
    pillShadow: 'drop-shadow(0 0 2px rgba(111,242,200,.55))', pillTextOnAccent: '#0d0f1c',
    textShadowOnSolid: '0 1px 0 rgba(6,8,16,.5), 0 -1px 0 rgba(6,8,16,.5), 0 0 10px rgba(46,230,168,.4)',
  },
  chrome: {
    subColor: '#f4f6ff', subStroke: '#0d0f1c', subAccent: '#ffc93c',
    barFill: 'rgba(46,230,168,0.50)', barTrack: 'rgba(60,60,68,0.50)',
    barLabel: 'rgba(162,162,166,0.70)', barDivider: 'rgba(60,60,68,0.90)', barGlow: true,
    endFade: '#0d0f1c',
  },
};
