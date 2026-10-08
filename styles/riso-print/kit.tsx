// riso-print · kit.tsx — 机台图元库：纸基完成层 / 双滚筒 / 版纸翻动 / 成品叠放 / 床条界面 / 半调网点图案
// 机制借鉴：mg-styles-15 demos/09-bauhaus 的纸牙颗粒/印边粗糙思路（MIT, Vincentwei1021，经 ink-plate 转译）
// 与 pop-comic 的 CSS 网点平铺（samples-l1）——本卡一律改走 SVG pattern（网点需随帧呼吸缩放、且要参与 multiply 叠印），TSX 重写非拷贝。
import React from 'react';
import {Fonts} from '../common/lib';
import {SUBS} from '../common/subs';
import {
  BED,
  BLUE,
  EV,
  H,
  INK,
  PAPER,
  PINK,
  META,
  SHEET,
  SHEET_H,
  SHEET_W,
  W,
  drumAt,
  halftoneScale,
  hash2,
  in2,
  io2,
  phaseText,
  pressExtent,
  prog,
  stackProg,
  type PlateInk,
} from './world';

// ---------------------------------------------------------------- 全文档 defs：滤镜 / 网点与 hatch 图案 / 扫印裁剪
const DOT_BANDS: Array<[string, number, number]> = [
  // [patternId, 波段半径, 点半径]——同心 4 波段近似「单色版内渐变靠网点大小」的孔版半调
  ['dotA', 45, 6.4],
  ['dotB', 90, 4.7],
  ['dotC', 135, 3.2],
  ['dotD', 175, 2.1],
];

export const RisoDefs: React.FC<{f: number}> = ({f}) => {
  const s = halftoneScale(f); // 定帧网点呼吸：点半径整体缩放
  return (
    <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
      <defs>
        {/* 印边粗糙：版膜边缘毛吸（双版独立 seed） */}
        {(['P', 'B'] as PlateInk[]).map((ink) => (
          <filter key={ink} id={`inkRough-${ink}`} x="-3%" y="-3%" width="106%" height="106%">
            <feTurbulence type="fractalNoise" baseFrequency="0.14" numOctaves={2} seed={ink === 'P' ? 43 : 47} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        ))}
        {/* 纸张纤维（粗）+ 纸纹（细）+ 逐帧颗粒 + 床噪 */}
        <filter id="paperFiber" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0028" numOctaves={2} seed={23} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id="toothFine" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves={3} seed={29} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id="grainF" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={31} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id="bedNoise" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves={2} seed={37} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        {/* 半调网点 4 波段（粉版太阳）+ 斜纹 hatch（蓝绦带）+ 竖纹 hatch（蓝面板） */}
        {DOT_BANDS.map(([id, , r]) => (
          <pattern key={id} id={id} width={16} height={16} patternUnits="userSpaceOnUse">
            <circle cx={8} cy={8} r={(r * s).toFixed(2)} fill={PINK} />
          </pattern>
        ))}
        <pattern id="hatchDg" width={18} height={18} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect x={0} y={0} width={7.4} height={18} fill={BLUE} />
        </pattern>
        <pattern id="hatchVt" width={14} height={14} patternUnits="userSpaceOnUse">
          <rect x={0} y={0} width={5.6} height={14} fill={BLUE} />
        </pattern>
        {/* 扫印裁剪：滚筒已压过的纸面才显墨（clip 于引用元素的局部系 = 纸面局部系）+ 纸界裁剪（墨只落纸面） */}
        <clipPath id="pressClip-P" clipPathUnits="userSpaceOnUse">
          <rect x={0} y={0} width={SHEET_W} height={pressExtent(1, f)} />
        </clipPath>
        <clipPath id="pressClip-B" clipPathUnits="userSpaceOnUse">
          <rect x={0} y={0} width={SHEET_W} height={pressExtent(2, f)} />
        </clipPath>
        <clipPath id="sheetClip" clipPathUnits="userSpaceOnUse">
          <rect x={0} y={0} width={SHEET_W} height={SHEET_H} />
        </clipPath>
      </defs>
    </svg>
  );
};

// ---------------------------------------------------------------- 机台床 + 纸基完成层
export const BedBase: React.FC = () => (
  <>
    <div style={{position: 'absolute', inset: 0, background: BED}} />
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: 0.05}} aria-hidden>
      <rect width={W} height={H} filter="url(#bedNoise)" />
    </svg>
  </>
);

/** 成品叠放（吐纸后从右侧滑入、垫在纸面下缘）：第 k 张偏移 (7k,7k) 微旋。 */
export const StackSheets: React.FC<{f: number}> = ({f}) => {
  const p1 = stackProg(1, f);
  const p2 = stackProg(2, f);
  const sheet = (k: 1 | 2, p: number, rot: number) => {
    if (p <= 0.001) return null;
    const dx = 240 * (1 - p);
    return (
      <div
        key={k}
        style={{
          position: 'absolute',
          left: SHEET.x0 + 7 * k,
          top: SHEET.y0 + 7 * k,
          width: SHEET_W,
          height: SHEET_H,
          background: PAPER,
          opacity: 0.96,
          transform: `translateX(${dx.toFixed(1)}px) rotate(${rot}deg)`,
          transformOrigin: '20% 80%',
          boxShadow: '0 2px 0 rgba(0,0,0,0.30)',
        }}
      />
    );
  };
  return (
    <>
      {sheet(2, p2, 0.9)}
      {sheet(1, p1, 0.4)}
    </>
  );
};

/** 纸面本体：本白 + 纤维 + 纸纹 + 下缘阴影（垫在床上的纸）。 */
export const SheetBase: React.FC = () => (
  <>
    <div
      style={{
        position: 'absolute',
        left: SHEET.x0,
        top: SHEET.y0,
        width: SHEET_W,
        height: SHEET_H,
        background: PAPER,
        boxShadow: '0 3px 0 rgba(0,0,0,0.32), 0 12px 26px rgba(0,0,0,0.38)',
      }}
    />
    <svg width={SHEET_W} height={SHEET_H} style={{position: 'absolute', left: SHEET.x0, top: SHEET.y0, mixBlendMode: 'multiply', opacity: 0.07}} aria-hidden>
      <rect width={SHEET_W} height={SHEET_H} filter="url(#paperFiber)" />
    </svg>
    <svg width={SHEET_W} height={SHEET_H} style={{position: 'absolute', left: SHEET.x0, top: SHEET.y0, mixBlendMode: 'soft-light', opacity: 0.30}} aria-hidden>
      <rect width={SHEET_W} height={SHEET_H} filter="url(#toothFine)" />
    </svg>
  </>
);

/** 角线（纸面四角，机台炭灰划线——印前划样惯例，f1 即在）。 */
export const CornerMarks: React.FC = () => {
  const m = 24;
  const arm = 18;
  const cs: Array<[number, number, number, number]> = [
    [m, m, 1, 1],
    [SHEET_W - m, m, -1, 1],
    [m, SHEET_H - m, 1, -1],
    [SHEET_W - m, SHEET_H - m, -1, -1],
  ];
  return (
    <svg width={SHEET_W} height={SHEET_H} style={{position: 'absolute', left: SHEET.x0, top: SHEET.y0, opacity: 0.5}} aria-hidden>
      {cs.map(([x, y, sx, sy], i) => (
        <g key={i} stroke={META} strokeWidth={1.6}>
          <rect x={sx > 0 ? x : x - arm} y={y - 0.8} width={arm} height={1.6} fill={META} />
          <rect x={x - 0.8} y={sy > 0 ? y : y - arm} width={1.6} height={arm} fill={META} />
        </g>
      ))}
    </svg>
  );
};

// ---------------------------------------------------------------- 滚筒（印刷动作语义①：压下→扫印→抬离）
export const Drum: React.FC<{f: number}> = ({f}) => {
  const d = drumAt(f);
  if (!d.active && f >= EV.drum2Gone) return null;
  const ink = INK[d.pass === 1 ? 'P' : 'B'];
  const onSheet = d.y > SHEET.y0 - 20 && d.y < SHEET.y1 + 24;
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}} aria-hidden>
      {d.active && onSheet ? <rect x={SHEET.x0} y={d.y + 20} width={SHEET_W} height={9} fill="#000" opacity={0.10} /> : null}
      <g>
        <rect x={-30} y={d.y - 24} width={W + 60} height={48} rx={24} fill={META} />
        <rect x={-30} y={d.y - 19} width={W + 60} height={7} rx={3.5} fill={PAPER} opacity={0.13} />
        {/* 滚筒表面墨带：当前装载的专色；扫印期间带滚筒条纹（不匀位移，seeded） */}
        <rect x={-30} y={d.y - 5} width={W + 60} height={10} fill={ink} opacity={0.95} />
        {d.active
          ? [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const bx = ((hash2(i, Math.floor(f / 4)) * W) | 0) % (W + 60);
              return <rect key={i} x={bx - 30} y={d.y - 5} width={26} height={10} fill={PAPER} opacity={0.18} />;
            })
          : null}
        <circle cx={22} cy={d.y} r={17} fill="#1E1C1A" />
        <circle cx={W - 22} cy={d.y} r={17} fill="#1E1C1A" />
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------- 版纸翻动（印刷动作语义②：装版）
// 版膜=卷装窄条（孔版版纸绕滚筒装版的形制），翻落在顶部床条区（盖床沿+纸面上缘少量，
// 不遮海报主体）；无整面填充只描边+线稿 ghost，避免在纸面上留色渍。
export const PlateFlip: React.FC<{f: number}> = ({f}) => {
  if (f < EV.flip0 || f >= EV.flipGone) return null;
  const p = io2(prog(f, EV.flip0, EV.flip1));
  const fade = f < EV.flip1 ? 1 : 1 - in2(prog(f, EV.flip1, EV.flipGone));
  return (
    <div style={{position: 'absolute', left: 380, top: -14, width: 520, height: 118, perspective: 800, pointerEvents: 'none', opacity: fade}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `rotateY(${(-86 + 86 * p).toFixed(2)}deg)`,
          transformOrigin: 'left center',
          background: 'rgba(244,239,228,0.55)',
          border: `2px solid ${BLUE}`,
          boxShadow: '8px 0 18px rgba(0,0,0,0.30)',
        }}
      >
        <svg width={520} height={118} style={{position: 'absolute', inset: 0, opacity: 0.5}} aria-hidden>
          <circle cx={64} cy={50} r={32} fill="none" stroke={BLUE} strokeWidth={4} />
          <rect x={118} y={30} width={188} height={40} fill="none" stroke={BLUE} strokeWidth={2} strokeDasharray="7 6" />
          <text x={118} y={100} fontFamily="'Noto Sans SC'" fontWeight={600} fontSize={15} letterSpacing={2} fill={BLUE}>
            {'PLATE 2 · RISO BLUE · 蓝版 待装'}
          </text>
        </svg>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 进纸辊（印刷动作语义③：成品吐出）
export const FeedRollers: React.FC<{f: number}> = ({f}) => {
  const p = io2(prog(f, EV.eject0, EV.eject0 + 10));
  if (p <= 0.001) return null;
  const spin = (f * 6) % 26;
  const roller = (x: number) => (
    <svg width={92} height={22} style={{position: 'absolute', left: x, top: 5, opacity: p}} aria-hidden>
      <rect x={0} y={0} width={92} height={22} rx={11} fill="#3B3733" />
      <rect x={3} y={2} width={86} height={4} rx={2} fill={PAPER} opacity={0.15} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={4 + ((spin + i * 26) % 84)} y={4} width={4} height={14} fill="#1E1C1A" opacity={0.55} />
      ))}
    </svg>
  );
  return (
    <>
      {roller(210)}
      {roller(700)}
      {roller(1040)}
    </>
  );
};

// ---------------------------------------------------------------- 床条界面（机台炭灰体系：字幕 / 状态 slug；纸面之外）
export const CaptionPlate: React.FC<{f: number}> = ({f}) => {
  const sub = SUBS.find((s) => f >= s.from && f <= s.to);
  if (!sub) return null;
  return (
    <g>
      <rect x={44} y={692} width={10} height={10} fill={PINK} />
      <text x={64} y={702} fontFamily="'Noto Sans SC'" fontWeight={600} fontSize={15} letterSpacing={1.2} fill="rgba(244,239,228,0.95)">
        {sub.text}
      </text>
    </g>
  );
};

export const BedSlug: React.FC<{f: number}> = ({f}) => (
  <text x={1236} y={702} textAnchor="end" fontFamily="'Noto Sans SC'" fontWeight={500} fontSize={13} letterSpacing={2} fill="rgba(244,239,228,0.72)">
    {`RISO-PRINT · 工作室的印刷日 · ${phaseText(f)}`}
  </text>
);

// ---------------------------------------------------------------- 颗粒（逐帧 seeded 平移）+ 暗角
export const GrainLayer: React.FC<{f: number}> = ({f}) => {
  const dx = Math.floor(hash2(f, 17) * 384) - 192;
  const dy = Math.floor(hash2(f, 29) * 384) - 192;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', mixBlendMode: 'overlay', opacity: 0.12, pointerEvents: 'none'}} aria-hidden>
      <svg width={W + 384} height={H + 384} style={{position: 'absolute', left: -192 + dx, top: -192 + dy}}>
        <rect width={W + 384} height={H + 384} filter="url(#grainF)" />
      </svg>
    </div>
  );
};

export const Vignette: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: `radial-gradient(ellipse ${W * 0.74}px ${H * 0.74}px at 50% 50%, rgba(0,0,0,0) 60%, rgba(12,10,8,0.16) 100%)`,
      pointerEvents: 'none',
    }}
  />
);

// ---------------------------------------------------------------- 印刷不匀：扫印期间滚筒条纹/压力斑（版内 lighten 条，确定性）
/** 版内条纹：纸色细条压过已印区域（滚筒供墨不匀），只在扫印相位内可见。 */
export const RollerStreaks: React.FC<{pass: 1 | 2; f: number}> = ({pass, f}) => {
  const [a, b] = pass === 1 ? [EV.sweep1a, EV.sweep1b] : [EV.sweep2a, EV.sweep2b];
  if (f < a || f > b + 6) return null;
  const fade = f > b ? 1 - in2(prog(f, b, b + 6)) : 1;
  return (
    <svg width={SHEET_W} height={SHEET_H} style={{position: 'absolute', left: SHEET.x0, top: SHEET.y0, mixBlendMode: 'screen', opacity: 0.16 * fade}} aria-hidden>
      {[0, 1, 2, 3].map((i) => {
        const x = hash2(pass * 31 + i, 7) * SHEET_W;
        const w = 34 + hash2(pass * 47 + i, 11) * 66;
        return <rect key={i} x={x} y={0} width={w} height={SHEET_H} fill={PAPER} opacity={0.5} />;
      })}
    </svg>
  );
};
