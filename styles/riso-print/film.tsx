// riso-print · film.tsx — 正片装配：粉版 → 蓝版 双专色层 × mix-blend-mode multiply 叠印（交叠处出第三色）
// 技法借鉴 mg-styles-15 demos/09-bauhaus 双版错位叠印思路（MIT, Vincentwei1021），Remotion(React+TSX) 重写为 riso 孔版语义。
// z 序：床 < 成品叠放 < 纸基 < 角线 < 粉版 < 蓝版 < 滚筒条纹 < 版纸翻动 < 滚筒 < 进纸辊 < 颗粒 < 暗角 < 床条界面。
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Fonts} from '../common/lib';
import {
  BLUE,
  densityAt,
  H,
  PINK,
  SHEET,
  W,
  joltY,
  plateOffset,
  pressExtent,
  type PlateInk,
} from './world';
import {
  BedBase,
  BedSlug,
  CaptionPlate,
  CornerMarks,
  Drum,
  FeedRollers,
  GrainLayer,
  PlateFlip,
  RisoDefs,
  RollerStreaks,
  SheetBase,
  StackSheets,
  Vignette,
} from './kit';

// ---------------------------------------------------------------- 粉版 artwork（第一 pass：题头粉影 + 半调太阳 + 强调条 + 进度点前四）
const PinkArt: React.FC<{f: number}> = ({f}) => (
  <g>
    <text x={96} y={238} fontFamily="'Noto Sans SC'" fontWeight={900} fontSize={188} letterSpacing={6} fill={PINK}>
      印刷日
    </text>
    <text x={102} y={292} fontFamily="'Noto Sans SC'" fontWeight={600} fontSize={23} letterSpacing={3.5} fill={PINK}>
      {'STUDIO PRINT DAY · 工作室的印刷日'}
    </text>
    {/* 半调太阳：同心 4 波段，单色版内渐变靠网点大小（签名③） */}
    <circle cx={890} cy={255} r={175} fill="url(#dotD)" />
    <circle cx={890} cy={255} r={135} fill="url(#dotC)" />
    <circle cx={890} cy={255} r={90} fill="url(#dotB)" />
    <circle cx={890} cy={255} r={45} fill="url(#dotA)" />
    {/* 强调短条：伸向绦带，multiply 交叠出第三色 */}
    <rect x={700} y={428} width={120} height={40} fill={PINK} />
    <text x={96} y={562} fontFamily="'Noto Sans SC'" fontWeight={600} fontSize={19} letterSpacing={2.5} fill={PINK}>
      {'TWO PASSES · ONE DRUM EACH'}
    </text>
    {[0, 1, 2, 3].map((i) => (
      <circle key={i} cx={120 + i * 34} cy={600} r={9} fill={PINK} />
    ))}
    {/* 色标 chip：粉版首次落版即印（印刷惯例） */}
    <rect x={1104} y={52} width={26} height={16} fill={PINK} />
  </g>
);

// ---------------------------------------------------------------- 蓝版 artwork（第二 pass：题头蓝主字 + 错位环 + hatch 绦带/面板 + 进度点后四）
const BlueArt: React.FC = () => (
  <g>
    <text x={96} y={238} fontFamily="'Noto Sans SC'" fontWeight={900} fontSize={188} letterSpacing={6} fill={BLUE}>
      印刷日
    </text>
    <text x={102} y={292} fontFamily="'Noto Sans SC'" fontWeight={600} fontSize={23} letterSpacing={3.5} fill={BLUE}>
      {'STUDIO PRINT DAY · 工作室的印刷日'}
    </text>
    {/* 套色错位环：蓝版对粉版太阳的偏移描边环（版偏移由整层 translate 承担，multiply 交叠弧出第三色） */}
    <circle cx={902} cy={249} r={175} fill="none" stroke={BLUE} strokeWidth={10} />
    {/* 斜纹绦带（-7°）+ 竖纹面板：hatch 填充签名 */}
    <g transform="rotate(-7 360 468)">
      <rect x={-20} y={420} width={760} height={96} fill="url(#hatchDg)" />
    </g>
    <rect x={1020} y={372} width={160} height={194} fill="url(#hatchVt)" />
    <text x={1160} y={604} textAnchor="end" fontFamily="'Noto Sans SC'" fontWeight={600} fontSize={16} letterSpacing={2} fill={BLUE}>
      {'RISOGRAPH · TWO DRUMS'}
    </text>
    {[4, 5, 6, 7].map((i) => (
      <circle key={i} cx={120 + i * 34} cy={600} r={9} fill={BLUE} />
    ))}
    <rect x={1136} y={52} width={26} height={16} fill={BLUE} />
  </g>
);

// ---------------------------------------------------------------- 单版层：版偏移 + 扫印裁剪 + 粗边 + multiply 叠印
const PassLayer: React.FC<{ink: PlateInk; f: number}> = ({ink, f}) => {
  const off = plateOffset(ink, f);
  const extent = pressExtent(ink === 'P' ? 1 : 2, f);
  if (extent <= 0.5) return null;
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        mixBlendMode: 'multiply',
        opacity: densityAt(f), // 上墨率：基准 0.93（微透纸 = 孔版墨感），压住/锁版帧 +ink kiss
        transform: `translate(${off.x.toFixed(2)}px, ${off.y.toFixed(2)}px)`,
        filter: `url(#inkRough-${ink})`,
      }}
      aria-hidden
    >
      <g clipPath={`url(#pressClip-${ink})`}>
        <g transform={`translate(${SHEET.x0} ${SHEET.y0})`} clipPath="url(#sheetClip)">
          {ink === 'P' ? <PinkArt f={f} /> : <BlueArt />}
        </g>
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------- 正片
export const Film: React.FC<{f0: number}> = ({f0}) => {
  const fr = useCurrentFrame();
  const f = fr + f0; // 全片绝对帧（1 起）
  const jolt = joltY(f);
  return (
    <AbsoluteFill style={{background: '#292623', isolation: 'isolate', overflow: 'hidden'}}>
      <Fonts />
      <RisoDefs f={f} />
      <BedBase />
      <StackSheets f={f} />
      {/* 纸面组：吐纸 jolt 整组震落（版墨随之，床不动） */}
      <div style={{position: 'absolute', inset: 0, transform: jolt ? `translateY(${jolt}px)` : undefined}}>
        <SheetBase />
        <CornerMarks />
        <PassLayer ink="P" f={f} />
        <RollerStreaks pass={1} f={f} />
        <PassLayer ink="B" f={f} />
        <RollerStreaks pass={2} f={f} />
      </div>
      <PlateFlip f={f} />
      <Drum f={f} />
      <FeedRollers f={f} />
      <GrainLayer f={f} />
      <Vignette />
      {/* 床条界面（不受 jolt，机台侧） */}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}} aria-hidden>
        <CaptionPlate f={f} />
        <BedSlug f={f} />
      </svg>
    </AbsoluteFill>
  );
};
