import {VIDEO} from '../config';
import {EXPLAINER} from './explainer';
import {PROMO} from './promo';
import type {Recipe, RecipeId} from './types';

/** promo 配方直出：promo 专属组件/演示合成恒定用它，不随 config.recipe 漂移。 */
export {PROMO} from './promo';

/** 配方体系入口：ui.tsx / fx.tsx 的调色板与光效常量经 getActiveRecipe() 从这里派生；镜头代码零改动。 */
export type {Recipe, RecipePalette, RecipeId, OverlaySet} from './types';

/** 十六进制色 → 'r,g,b'（fx 内联 rgba 光效用；输入须为 #RRGGBB）。 */
export const rgbOf = (hex: string): string => {
  const v = hex.replace('#', '');
  return `${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)}`;
};

export const RECIPES: Record<RecipeId, Recipe> = {explainer: EXPLAINER, promo: PROMO};

/** 当前生效配方（config.VIDEO.recipe 切换；explainer 为默认，取值与 a2e 原常量逐值相等）。
 *  发现 10（accentFrom 断言）：palette.accent 必须落在配方声明的合法主色集合内（ui.tsx/fx.tsx 在模块加载期
 *  就调本函数，抛错即渲染前拦截）；不在集合 = console.error + 抛错，不允许静默渲出。 */
export const getActiveRecipe = (): Recipe => {
  const r = RECIPES[VIDEO.recipe];
  if (r.accentFrom && !r.accentFrom.includes(r.palette.accent)) {
    console.error(`[recipes] 配方 ${r.id} 的 palette.accent=${r.palette.accent} 不在 accentFrom 合法集合 [${r.accentFrom.join(', ')}] 内——主色替换未登记（reference/brand-assets.md §3，需同步 accentFromBrand 随主色 token），拒绝渲染`);
    throw new Error(`palette.accent 不在配方 ${r.id} 的 accentFrom 集合内：${r.palette.accent}`);
  }
  return r;
};
