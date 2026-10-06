import {PROMO} from '../promo';
import type {StyleSkin} from '../types';

/** 风格：深空电光青（吸收自 promo 配方默认脸）。palette 整体取 PROMO 正本——
 *  promo + deep-space 组合 = 逐值等价 no-op；其他类型 + deep-space = 换上深空青视觉。 */
export const DEEP_SPACE: StyleSkin = {
  id: 'deep-space',
  name: '深空电光青',
  accentLegal: ['#21E6C1'],
  palette: {...PROMO.palette},
  // 机身件取深空脸口径（青系进度条/暗底渐隐）；promo 自身不渲这些件，值供跨类型组合使用
  chrome: {
    subColor: '#FFFFFF',
    subStroke: '#000000',
    barFill: 'rgba(33,230,193,0.45)',
    barTrack: 'rgba(60,60,74,0.50)',
    barLabel: 'rgba(154,154,166,0.70)',
    barDivider: 'rgba(154,154,166,0.40)',
    barGlow: true,
    endFade: '#000000',
  },
};
