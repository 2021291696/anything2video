import React from 'react';
import {CX, CY, CYA, MAG, tri, prog, lerp, S03} from './kit';

/**
 * 摩尔纹（签名④ 双层细环干涉）：A/B 两族同心细环，环距 24 vs 25.2px（4.8% 差频），
 * 反向极缓漂移（三角波 480f 周期 = 0.0625Hz）→ 差频干涉环缓慢游走。
 * 防闪屏参数化（SPEC 锁死）：环距 ≥24px、描边 1.5px、层 α ≤0.55、漂移 ≤0.07Hz——720p 下干涉纹连续可辨，
 * 无逐帧闪烁（干涉纹移动速度 <0.5px/帧）。前段贴眼背衬 α0.2，曼陀罗段升 0.55 作收束主纹。
 */
const GAP_A = 24, GAP_B = 25.2, N = 15, DRIFT_P = 480;

export const Moire: React.FC<{f: number; boost?: number}> = ({f, boost = 0}) => {
  const base = lerp(0.2, 0.28, prog(f, S03, 60)); // 前段背衬
  const alpha = Math.min(0.55, base + boost * prog(f, S03 + 40, 40));
  const dA = 3 * tri(f / DRIFT_P);                  // 极缓漂移 0.0625Hz（<0.5px/帧，防闪屏）
  const dB = 3 * tri((f + DRIFT_P * 0.25) / DRIFT_P);
  return (
    <g opacity={alpha} style={{mixBlendMode: 'screen'}}>
      <g filter="url(#hyp-glow)">
        {Array.from({length: N}, (_, k) => (
          <circle key={k} cx={CX} cy={CY} r={40 + k * GAP_A + dA}
            fill="none" stroke={CYA} strokeWidth={1.5} opacity={0.5 * (1 - k / (N + 3))} />
        ))}
        {Array.from({length: N}, (_, k) => (
          <circle key={`b${k}`} cx={CX} cy={CY} r={40 + k * GAP_B + dB}
            fill="none" stroke={MAG} strokeWidth={1.5} opacity={0.42 * (1 - k / (N + 3))} />
        ))}
      </g>
    </g>
  );
};
