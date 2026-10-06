import {EXPLAINER} from '../explainer';
import type {StyleSkin} from '../types';

/** 风格：紫调黑底 MG（吸收自 explainer 配方默认脸）。palette 整体取 EXPLAINER 正本——
 *  explainer + mg-purple = 逐值等价 no-op；chrome 不覆写（沿用配方机身件缺省）。 */
export const MG_PURPLE: StyleSkin = {
  id: 'mg-purple',
  name: '紫调黑底 MG',
  accentLegal: ['#6630F8', '#e63329', '#33ff66', '#ffd23f', '#a06a28'],
  palette: {...EXPLAINER.palette},
  chrome: {},
};
