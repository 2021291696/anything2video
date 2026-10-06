import {VIDEO} from '../config';
import {EXPLAINER} from './explainer';
import {PROMO} from './promo';
import {EPIC} from './epic';
import {styleSkinOf} from './styles';
import type {Recipe, RecipeId, StyleId, StyleSkin} from './types';

/** promo 配方直出：promo 专属组件/演示合成恒定用它，不随 config.recipe 漂移。 */
export {PROMO} from './promo';

/** epic 配方直出：epic 专属组件恒定用它，不随 config.recipe 漂移。 */
export {EPIC} from './epic';

/** 皮肤池（v3.3.0 起）：config.VIDEO.style 选皮肤，浅合并覆写配方 palette/chrome。 */
export {STYLE_SKINS, styleSkinOf} from './styles';

/** 配方体系入口：ui.tsx / fx.tsx 的调色板与光效常量经 getActiveRecipe() 从这里派生；镜头代码零改动。 */
export type {Recipe, RecipePalette, RecipeId, OverlaySet, ChromePalette, StyleId, StyleSkin} from './types';

/** 十六进制色 → 'r,g,b'（fx 内联 rgba 光效用；输入须为 #RRGGBB）。 */
export const rgbOf = (hex: string): string => {
  const v = hex.replace('#', '');
  return `${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)}`;
};

export const RECIPES: Record<RecipeId, Recipe> = {explainer: EXPLAINER, promo: PROMO, epic: EPIC};

/** 当前生效配方（config.VIDEO.recipe 切换；explainer 为默认，取值与 a2e 原常量逐值相等）。
 *  发现 10（accentFrom 断言）：palette.accent 必须落在配方或当前风格声明的合法主色集合内
 *  （ui.tsx/fx.tsx 在模块加载期就调本函数，抛错即渲染前拦截）；不在集合 = console.error + 抛错，不允许静默渲出。
 *  v3.3.0 起：VIDEO.style 设置时皮肤浅合并覆写 palette/chrome；缺省（undefined）= 纯配方，逐值等价旧版。 */
export const getActiveRecipe = (): Recipe => {
  const r = RECIPES[VIDEO.recipe];
  const skin = styleSkinOf(VIDEO.style);
  if (VIDEO.style && !skin) {
    throw new Error(`未知风格 skin：${VIDEO.style}（不在 STYLE_SKINS 注册表；SKU 皮肤未入池时按 P3 批次补齐）`);
  }
  const palette = skin ? {...r.palette, ...skin.palette} : r.palette;
  const chrome = skin ? {...r.chrome, ...skin.chrome} : r.chrome;
  const legal = [...(r.accentFrom ?? []), ...((skin as StyleSkin | undefined)?.accentLegal ?? [])];
  if (r.accentFrom && !legal.includes(palette.accent)) {
    console.error(`[recipes] 配方 ${r.id}${skin ? ` + 风格 ${skin.id}` : ''} 的 palette.accent=${palette.accent} 不在合法集合 [${legal.join(', ')}] 内——主色替换未登记（reference/brand-assets.md §3，需同步 accentFromBrand 随主色 token），拒绝渲染`);
    throw new Error(`palette.accent 不在配方 ${r.id} 的合法主色集合内：${palette.accent}`);
  }
  return {...r, palette, chrome};
};
