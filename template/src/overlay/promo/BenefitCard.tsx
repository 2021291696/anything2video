import React from 'react';
import {FONT_HEAVY} from '../../common';
import {Box, SoftIn, WHITE, abs} from '../../ui';
import {PROMO} from '../../recipes';

// promo 专属组件恒定走 PROMO 配方，不随 config.recipe 漂移（演示合成才能稳定预览宣传视觉）
const PAL = PROMO.palette;

/** 图标位默认图元：主色描边圆角方块 + 实心菱形（卖点卡缺省图标；传 icon 可覆盖为任意 logo/SVG）。 */
const DiamondIcon: React.FC<{size?: number}> = ({size = 88}) => (
  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{position: 'absolute', left: 0, top: 0}}>
    <rect x={size * 0.08} y={size * 0.08} width={size * 0.84} height={size * 0.84} rx={size * 0.2} fill="none" stroke={PAL.accent} strokeWidth={3} />
    <path d={`M${size / 2},${size * 0.3} L${size * 0.7},${size / 2} L${size / 2},${size * 0.7} L${size * 0.3},${size / 2} Z`} fill={PAL.accent} />
  </svg>
);

/**
 * 卖点卡（promo）：图标位（左上 88px，可传 icon）+ 大标（900 压窄）+ 一句副标（灰）。
 * 深底白边圆角卡（a2e Box 体系），SoftIn 入场；active 时主色边 + 主色柔光（一帧只给一张卡）。
 */
export const BenefitCard: React.FC<{
  N: number; f0: number; x: number; y: number; w?: number; h?: number; title: string; sub: string; icon?: React.ReactNode; active?: boolean; opacity?: number;
}> = ({N, f0, x, y, w = 460, h = 200, title, sub, icon, active = false, opacity = 1}) => (
  <SoftIn N={N} f0={f0} len={10} dy={16} style={{opacity}}>
    <Box x={x} y={y} w={w} h={h} r={18} fill="rgba(0,0,0,.72)" stroke={active ? PAL.accent : WHITE} sw={2} glow={active ? PAL.glowAccentS : undefined}>
      <div style={{...abs(26, 30, 88, 88)}}>{icon ?? <DiamondIcon />}</div>
      <div style={{...abs(140, 48, w - 168, 52), fontFamily: FONT_HEAVY, fontWeight: 900, fontSize: 44, color: WHITE, lineHeight: 1, letterSpacing: 1, transform: 'scaleX(0.86)', transformOrigin: '0 50%', whiteSpace: 'nowrap'}}>{title}</div>
      <div style={{...abs(140, 118, w - 168, 62), fontFamily: FONT_HEAVY, fontWeight: 500, fontSize: 24, color: PAL.grey, lineHeight: 1.35}}>{sub}</div>
    </Box>
  </SoftIn>
);
