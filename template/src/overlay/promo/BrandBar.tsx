import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FONT_HEAVY, TOTAL_FRAMES, W} from '../../common';
import {abs} from '../../ui';
import {PROMO} from '../../recipes';

// promo 专属组件恒定走 PROMO 配方，不随 config.recipe 漂移（演示合成才能稳定预览宣传视觉）
const PAL = PROMO.palette;

/** 品牌条几何：与讲解片章节进度条同槽位 y687–720（BrandBar 替代之，Main 里与 ProgressBar 互斥切换）。 */
export const BRAND_BAR_TOP = 687;
export const BRAND_BAR_H = 33;

/**
 * 底部品牌条（promo 常驻覆盖层，替代讲解片的章节进度条）：深空黑半透明条体 + 左侧 logo 位（22px 主色圆角方块，可传 logo 覆盖）+ 品牌名 + 右侧 slogan，
 * 顶部 2px 主色发丝进度线随播放生长。常驻层自取 useCurrentFrame，调用方不传 N。
 */
export const BrandBar: React.FC<{brand?: string; slogan?: string; logo?: React.ReactNode; total?: number}> = ({brand = 'ANYTHING2VIDEO', slogan = '', logo, total = TOTAL_FRAMES}) => {
  const N = useCurrentFrame() + 1;
  const fillW = W * Math.min(1, N / total);
  return (
    <div style={{position: 'absolute', left: 0, top: BRAND_BAR_TOP, width: W, height: BRAND_BAR_H, pointerEvents: 'none'}}>
      {/* 深空黑条体（半透明，同进度条槽位） */}
      <div style={{position: 'absolute', inset: 0, background: PAL.bg, opacity: 0.85}} />
      {/* 主色发丝进度线 */}
      <div style={{position: 'absolute', left: 0, top: 0, width: fillW, height: 2, background: PAL.accent, boxShadow: `0 0 8px 1px rgba(${PAL.accentGlowRgb},.55)`}} />
      {/* logo 位 + 品牌名 */}
      <div style={{...abs(28, 6, 22, 22), borderRadius: 6, background: logo ? undefined : `linear-gradient(145deg, ${PAL.accent}, ${PAL.accentDeep})`}}>{logo}</div>
      <div style={{...abs(60, 0, 420, BRAND_BAR_H), display: 'flex', alignItems: 'center', fontFamily: FONT_HEAVY, fontWeight: 900, fontSize: 22, color: PAL.white, letterSpacing: 3}}>{brand}</div>
      {/* slogan 右对齐 */}
      {slogan ? (
        <div style={{...abs(W - 640, 0, 612, BRAND_BAR_H), display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontFamily: FONT_HEAVY, fontWeight: 500, fontSize: 22, color: PAL.grey, letterSpacing: 2}}>{slogan}</div>
      ) : null}
    </div>
  );
};
