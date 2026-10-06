import type {StyleSkin} from '../types';

/** 风格：CRT 终端（styles/crt-terminal SPEC 派生）。黑绿磷光+等宽字+扫描线；amber 全片 ≤1 处语义（此处作 secondary/WARN）。 */
export const CRT_TERMINAL: StyleSkin = {
  id: 'crt-terminal',
  name: 'CRT 终端',
  accentLegal: ['#33ff66'],
  palette: {
    accent: '#33ff66', accentLight: '#7dff9f', accentTech: '#2acc55', accentDeep: '#1a8f3c', accentPale: '#0a2012',
    secondary: '#ffb000', secondaryAlt: '#ffd066', warning: '#ffb000', correct: '#33ff66',
    bg: '#050a06', bgFog: '#071108', bgPanel: '#0a140c', grey: '#3fa85f', greyMid: '#2a7a46', greyLine: '#1a5a32', greyLight: '#7dff9f',
    white: '#c8ffd8', magenta: '#ff66aa', cyan: '#33ffcc',
    glowAccent: '0 0 12px 3px rgba(51,255,102,.4), 0 0 42px 14px rgba(51,255,102,.5)',
    glowAccentS: '0 0 24px 8px rgba(51,255,102,.6)',
    glowSecondary: '0 0 40px rgba(255,176,0,.5), 0 0 100px 10px rgba(255,176,0,.2)',
    glowWarning: '0 0 60px 20px rgba(255,176,0,.35), 0 0 20px 6px rgba(255,176,0,.45)',
    accentGlowRgb: '51,255,102', haloDark: '#0a2012', haloLight: '#7dff9f',
    techGlow: '0 0 6px rgba(42,204,85,.7)', bloom: 'drop-shadow(0 0 3px rgba(200,255,216,0.5))',
    bloomSoft: 'drop-shadow(0 0 2px rgba(200,255,216,0.35))',
    textGlow: '0 0 12px rgba(200,255,216,.55), 0 0 4px rgba(200,255,216,.4)',
    pillShadow: 'drop-shadow(0 0 2px rgba(125,255,159,.55))', pillTextOnAccent: '#050a06',
    textShadowOnSolid: '0 1px 0 rgba(2,6,3,.6), 0 -1px 0 rgba(2,6,3,.6), 0 0 10px rgba(51,255,102,.5)',
  },
  chrome: {
    subColor: '#33ff66', subStroke: '#050a06', subAccent: '#7dff9f',
    barFill: 'rgba(51,255,102,0.45)', barTrack: 'rgba(26,143,60,0.20)',
    barLabel: 'rgba(51,255,102,0.45)', barDivider: 'rgba(26,143,60,0.50)', barGlow: true,
    endFade: '#050a06',
  },
};
