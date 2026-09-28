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

/** 当前生效配方（config.VIDEO.recipe 切换；explainer 为默认，取值与 a2e 原常量逐值相等）。 */
export const getActiveRecipe = (): Recipe => RECIPES[VIDEO.recipe];
