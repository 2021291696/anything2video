import React from 'react';
import {CX, CY, MAG, CYA, AMB, BLU, octPath, frac, prog, lerp, breathDir, S03, S05, T_FREEZE} from './kit';

/**
 * 隧道（签名②透视恒速穿行）：14 层正八边形环，深度 z_i = frac(i/N + t·v) 线性推进（恒速，可 seek）；
 * 屏幕半径 = 透视投影（近大远小，z 向速度恒定），色 i%4 ∈ {品红,青,蓝,琥珀}；双层辉光组滤镜。
 * 近端淡出（穿过镜头）远端淡入，旋转随深度线性扭转（螺隧道）；定帧后冻结（α→0 早于 S05 收束完成）。
 */
const N = 14, V = 0.392, ROT = 24, T_COL = [MAG, CYA, BLU, AMB];

export const Tunnel: React.FC<{f: number}> = ({f}) => {
  const aIn = prog(f, S03, 26);                       // f150 起 26 帧淡入
  const aOut = 1 - prog(f, S05, 22);                  // S05 收束淡出
  const alpha = aIn * aOut;
  const spd = lerp(1, 0.12, prog(f, T_FREEZE, 30));   // 定帧残余
  if (alpha <= 0.01) return null;
  const t = (f / 30) * V * spd;
  return (
    <g opacity={alpha} filter="url(#hyp-glow)">
      {Array.from({length: N}, (_, i) => {
        const z = frac(i / N + t);                    // 0=远端（洞底）→1=近端（镜头）
        const r = 6 + Math.pow(z, 2.35) * 1500;       // 透视：恒定 z 速度 → 屏幕半径自然加速
        const fadeIn = prog(z, 0, 0.1);
        const fadeOut = 1 - prog(z, 0.78, 0.22);
        const a = fadeIn * fadeOut * (0.32 + 0.5 * z);
        const rot = z * ROT + f * 0.05 * spd;
        return (
          <path key={i} d={octPath(r, rot)} fill="none"
            stroke={T_COL[i % 4]} strokeWidth={1 + z * 4.5} opacity={a} strokeLinejoin="round" />
        );
      })}
      {/* 洞底光斑（呼吸亮度 0.25Hz 合规档，线性往复） */}
      <circle cx={CX} cy={CY} r={16 + 6 * (breathDir(f) * 0.5 + 0.5)}
        fill="#EAF6FF" opacity={0.5 * aIn * aOut} filter="url(#hyp-soft)" />
    </g>
  );
};
