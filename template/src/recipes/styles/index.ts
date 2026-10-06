import type {StyleId, StyleSkin} from '../types';
import {DEEP_SPACE} from './deep-space';
import {MG_PURPLE} from './mg-purple';
import {EPIC_PAPER} from './epic-paper';
import {SAND} from './sand';
import {CHALK} from './chalk';
import {BLUEPRINT} from './blueprint';
import {NEON} from './neon';
import {PIXEL_ARCADE} from './pixel-arcade';
import {PAPER_COLLAGE} from './paper-collage';
import {SWISS_PRINT} from './swiss-print';
import {CRT_TERMINAL} from './crt-terminal';

/** 皮肤注册表（v3.3.0 起，11 个 = 3 配方正本脸 + 8 SKU）。
 *  SKU 皮肤的 token 为各 SPEC 锁死色的派生近似——类型 × 风格组合首用时按该 SKU 的 sample.jpg 做回归（spec §2 约束）。
 *  选型流程与判例：SKILL.md「确认与授权」+ reference/style-ledger.md；样片库 samples/index.html。 */
export const STYLE_SKINS: Partial<Record<StyleId, StyleSkin>> = {
  'deep-space': DEEP_SPACE,
  'mg-purple': MG_PURPLE,
  'epic-paper': EPIC_PAPER,
  sand: SAND,
  chalk: CHALK,
  blueprint: BLUEPRINT,
  neon: NEON,
  'pixel-arcade': PIXEL_ARCADE,
  'paper-collage': PAPER_COLLAGE,
  'swiss-print': SWISS_PRINT,
  'crt-terminal': CRT_TERMINAL,
};

export const styleSkinOf = (id?: StyleId): StyleSkin | undefined => (id ? STYLE_SKINS[id] : undefined);
