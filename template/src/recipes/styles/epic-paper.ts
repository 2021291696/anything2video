import {EPIC} from '../epic';
import type {StyleSkin} from '../types';

/** 风格：暖纸白印章红描金（吸收自 epic 配方默认脸）。palette 整体取 EPIC 正本——
 *  epic + epic-paper = 逐值等价 no-op；chrome 不覆写（Ending 现值 #000000 保持等价）。 */
export const EPIC_PAPER: StyleSkin = {
  id: 'epic-paper',
  name: '暖纸白印章红描金',
  accentLegal: ['#C43C2E'],
  palette: {...EPIC.palette},
  chrome: {},
};
