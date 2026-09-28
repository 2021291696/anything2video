import React from 'react';
import {FONT_HEAVY} from '../../common';
import {BigNumber} from '../../fx';
import {Box, SoftIn, WHITE, abs} from '../../ui';
import {PROMO} from '../../recipes';

// promo 专属组件恒定走 PROMO 配方，不随 config.recipe 漂移（演示合成才能稳定预览宣传视觉）
const PAL = PROMO.palette;

/**
 * 证明卡（promo）：大数字（Orbitron + 主色硬投影，fx.BigNumber 默认光效已随配方派生）+ 来源小字（灰，前置主色刻度）。
 * 计数由调用方传 countTo(n, a, b) 的结果；active 无（证明卡整卡就是焦点）。
 */
export const ProofCard: React.FC<{
  N: number; f0: number; x: number; y: number; w?: number; h?: number; value: string | number; unit?: string; label?: string; source?: string; opacity?: number;
}> = ({N, f0, x, y, w = 800, h = 288, value, unit, label, source, opacity = 1}) => (
  <SoftIn N={N} f0={f0} len={10} dy={16} style={{opacity}}>
    <Box x={x} y={y} w={w} h={h} r={18} fill="rgba(0,0,0,.72)" stroke={WHITE} sw={2}>
      {label ? (
        <div style={{...abs(0, 30, w, 26), textAlign: 'center', fontFamily: FONT_HEAVY, fontWeight: 700, fontSize: 24, color: PAL.accent, letterSpacing: 4}}>{label}</div>
      ) : null}
      {/* 大数字 + 单位小字（BigNumber 的 unit 挂在数字下方居中） */}
      <BigNumber cx={w / 2} cy={h * (label ? 0.46 : 0.42)} value={value} size={110} unit={unit} unitColor={PAL.grey} />
      {source ? (
        <div style={{...abs(0, h - 52, w, 24), textAlign: 'center', fontFamily: FONT_HEAVY, fontWeight: 500, fontSize: 22, color: PAL.grey, letterSpacing: 1}}>
          <span style={{display: 'inline-block', width: 18, height: 3, background: PAL.accent, marginRight: 10, verticalAlign: 'middle'}} />
          {source}
        </div>
      ) : null}
    </Box>
  </SoftIn>
);
