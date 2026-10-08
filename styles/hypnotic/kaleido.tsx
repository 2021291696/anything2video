import React from 'react';
import {CX, CY, MAG, CYA, AMB, BLU, VIO, CORE, hash, prog, lerp, breathDir,
  T_HERO, T_KMAX, S05, T_FREEZE} from './kit';

/**
 * 万花筒（签名③ 8 折镜像对称）：楔形内容 defs 一次定义，8 旋转 × 奇偶镜像 = 二面体对称群 D8；
 * 展开：半径 0→430 线性恒速（f249-282，33f，HERO=BGM drop 8.3s 对位）；整体恒速慢旋 0.3°/f；
 * S05 收拢 430→300（线性）成曼陀罗；定帧后转速 ×0.12。楔内花件（花瓣/弧段/点/细辐）全部 seeded hash 排布。
 */
const WEDGES = 8, ROT = 0.3;

type Petal = {r: number; ang: number; rx: number; ry: number; c: string; op: number};
const PAL5 = [MAG, CYA, AMB, BLU, VIO];
/** 楔内花瓣：8 枚，半径/角度分层铺满 45° 楔（strata + hash 抖动），保证 8 折镜像读感（密曼陀罗而非大风车） */
const PETALS: Petal[] = Array.from({length: 8}, (_, i) => ({
  r: 64 + i * 44 + hash(1, i) * 26,
  ang: 4 + i * 4.6 + hash(2, i) * 5,
  rx: 10 + hash(3, i) * 16,
  ry: 26 + hash(4, i) * 44,
  c: PAL5[(i * 2 + Math.floor(hash(5, i) * 2)) % 5],
  op: 0.45 + hash(6, i) * 0.4,
}));
const ARCS = Array.from({length: 4}, (_, i) => ({
  r: 96 + i * 78 + hash(7, i) * 30, a0: 4 + hash(8, i) * 14, sw: 3 + hash(9, i) * 5,
  c: PAL5[(i + Math.floor(hash(10, i) * 2)) % 5],
}));
const DOTS = Array.from({length: 4}, (_, i) => ({
  r: 50 + hash(11, i) * 260, ang: 8 + hash(12, i) * 34, rad: 4 + hash(13, i) * 7,
  c: [CORE, CYA, MAG, AMB][Math.floor(hash(14, i) * 4)],
}));

const polar = (r: number, angDeg: number): [number, number] => {
  const a = (angDeg * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
};

export const Kaleido: React.FC<{f: number}> = ({f}) => {
  const unfold = prog(f, T_HERO, T_KMAX - T_HERO);      // 0→1 线性（33f 恒速展开）
  const gather = prog(f, S05, 18);                      // S05 收拢成曼陀罗
  const aIn = prog(f, T_HERO, 9);
  if (aIn <= 0.01) return null;
  const spd = lerp(1, 0.12, prog(f, T_FREEZE, 30));
  const R = lerp(0, 430, unfold) * lerp(1, 250 / 430, gather); // 展开半径（线性恒速）
  const rot = f * ROT * spd;
  const bd = breathDir(f);
  const k = R / 430;
  return (
    <g opacity={aIn * (0.85 + 0.15 * (bd * 0.5 + 0.5))} filter="url(#hyp-glow)">
      <g transform={`translate(${CX} ${CY}) rotate(${rot.toFixed(2)}) scale(${k.toFixed(4)})`}>
        <defs>
          <g id="hyp-wedge">
            {PETALS.map((p, i) => {
              const [x, y] = polar(p.r, p.ang);
              return <ellipse key={i} cx={x} cy={y} rx={p.rx} ry={p.ry}
                transform={`rotate(${p.ang + 90} ${x} ${y})`} fill={p.c} opacity={p.op * 0.55} />;
            })}
            {ARCS.map((a, i) => (
              <path key={`a${i}`} d={arcPath(a.r, a.a0)} fill="none" stroke={a.c} strokeWidth={a.sw} opacity={0.6} />
            ))}
            {DOTS.map((d, i) => {
              const [x, y] = polar(d.r, d.ang);
              return <circle key={`d${i}`} cx={x} cy={y} r={d.rad} fill={d.c} opacity={0.8} />;
            })}
            <line x1={polar(30, 10)[0]} y1={polar(30, 10)[1]} x2={polar(280, 10)[0]} y2={polar(280, 10)[1]}
              stroke={CYA} strokeWidth={1.1} opacity={0.4} />
          </g>
        </defs>
        {/* D8 二面体：8 旋转 × 奇偶镜像 */}
        {Array.from({length: WEDGES}, (_, k) => (
          <g key={k} transform={`rotate(${k * (360 / WEDGES)})`}>
            <g transform={k % 2 ? 'scale(1,-1)' : undefined}>
              <use href="#hyp-wedge" />
            </g>
          </g>
        ))}
        {/* 中心核（呼吸微缩放，线性） */}
        <circle r={16 + 3 * (bd * 0.5 + 0.5)} fill={CORE} opacity={0.9} />
        <circle r={26} fill="none" stroke={MAG} strokeWidth={1.6} opacity={0.8} />
      </g>
    </g>
  );
};

const arcPath = (r: number, spanDeg: number): string => {
  const [x0, y0] = polar(r, -spanDeg / 2);
  const [x1, y1] = polar(r, spanDeg / 2);
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};
