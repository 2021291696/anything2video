// ink-plate · kit.tsx — 丝印图元库：Plate 版层 / Passkreuz 预告十字 / GridKit 钢线 / 模数题头横幅 / 纸牙颗粒
// 技法借鉴 mg-styles-15 demos/09-bauhaus (MIT, Vincentwei1021), TSX 重写（双版错位用多层偏移 SVG + mix-blend-mode multiply 近似源 WebGL press pass）
// 版式定案：题头栏置顶边距（y0-60，10×0.5 模数）——底边距让位给群转后的 L 队（底排形状 y420-660 与底部题头栏冲突，见 report 权衡记录）。
import React from 'react';
import {
  BEATS,
  beatNo,
  CROSSES,
  EV,
  gridLineAt,
  gridStrokeW,
  H,
  INK_HEX,
  gx,
  gy,
  in2,
  M,
  PAPER,
  PLATE_ORDER,
  prog,
  TRIM,
  turnAngleDeg,
  TURN,
  W,
  type Ink,
} from './world';

const BANNER = {x0: TRIM.x0, y0: 0, x1: TRIM.x1, y1: 60} as const; // 顶边距题头横幅
const TITLE_BASE = 43; // 40px/900 字面 cap≈29px，60px 横幅视觉居中
// 题头墨迹总宽 = 4 模数（x400-880）：8 字槽 × 0.5 模数（60px），textLength 锁定

// ---------------------------------------------------------------- 滤镜/蒙版 defs（全文档一次）
export const PlateDefs: React.FC<{counter: string}> = ({counter}) => (
  <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
    <defs>
      {/* 印边粗糙：双频噪声位移（源 rough = vnoise(p/5)·1.3 + vnoise(p/1.6)·0.35 的近似） */}
      {PLATE_ORDER.map((ink) => (
        <filter key={ink} id={`inkRough-${ink}`} x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves="2" seed={41 + ink.charCodeAt(0)} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      ))}
      {/* 纸牙：大尺度纤维斑驳（tooth/mottle） */}
      <filter id="toothCoarse" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.0035" numOctaves="2" seed={11} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <filter id="toothFine" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed={13} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      {/* 颗粒：静态种子噪声 + 逐帧滚筒位移（确定性 boil） */}
      <filter id="grainF" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={17} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      {/* 题头横幅挖孔蒙版：题头墨迹总宽恰 8 模数（x160→1120，textLength 锁定——源 measureType 度量反推的模数版式）
          + 拍计数器/片目 slug/顶部套准标/色标让位孔（黑版动态文字同版挖孔，随帧重算） */}
      <mask id="bannerKnock" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
        <rect x={BANNER.x0} y={BANNER.y0} width={BANNER.x1 - BANNER.x0} height={BANNER.y1 - BANNER.y0} fill="#fff" />
        <g fill="#000">
          <TitleText part1 />
          <TitleText part2 />
          <text x={64} y={38} fontFamily="'Noto Sans SC'" fontWeight={700} fontSize={13} letterSpacing={2.6} fill="#000">
            {counter}
          </text>
          <text x={1216} y={38} textAnchor="end" fontFamily="'Noto Sans SC'" fontWeight={500} fontSize={12} letterSpacing={2} fill="#000">
            {'BOGEN 09 · 120 BPM · M = 240 PX'}
          </text>
        </g>
      </mask>
    </defs>
  </svg>
);

// ---------------------------------------------------------------- 模数版式：题头字（段宽 = 字数×120：三个形状的=5 模数，排队学=3 模数）
const TitleText: React.FC<{part1?: boolean; part2?: boolean; fill?: string; stroke?: string; strokeWidth?: number}> = ({
  part1,
  part2,
  fill = '#000',
  stroke = 'none',
  strokeWidth = 0,
}) => (
  <>
    {part1 && (
      <text
        x={400} y={TITLE_BASE} textLength={5 * 60} lengthAdjust="spacing"
        fontFamily="'Noto Sans SC'" fontWeight={900} fontSize={40} letterSpacing={4}
        fill={fill} stroke={stroke} strokeWidth={strokeWidth} paintOrder="stroke"
      >
        三个形状的
      </text>
    )}
    {part2 && (
      <text
        x={700} y={TITLE_BASE} textLength={3 * 60} lengthAdjust="spacing"
        fontFamily="'Noto Sans SC'" fontWeight={900} fontSize={40} letterSpacing={4}
        fill={fill} stroke={stroke} strokeWidth={strokeWidth} paintOrder="stroke"
      >
        排队学
      </text>
    )}
  </>
);

// ---------------------------------------------------------------- Passkreuz 预告十字（源 target() 移植：环+四刻+心点，黑版）
export const Passkreuz: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g fill="none" stroke={INK_HEX.K}>
    <circle cx={x} cy={y} r={23} strokeWidth={4} />
    <rect x={x - 44} y={y - 2} width={32} height={4} fill={INK_HEX.K} stroke="none" />
    <rect x={x + 12} y={y - 2} width={32} height={4} fill={INK_HEX.K} stroke="none" />
    <rect x={x - 2} y={y - 44} width={4} height={32} fill={INK_HEX.K} stroke="none" />
    <rect x={x - 2} y={y + 12} width={4} height={32} fill={INK_HEX.K} stroke="none" />
    <circle cx={x} cy={y} r={4} fill={INK_HEX.K} stroke="none" />
  </g>
);

// ---------------------------------------------------------------- GridKit：钢线落规（竖 11 × 横 6，从中轴对按 16 分音符向外落）
export const GridRuling: React.FC<{f: number}> = ({f}) => {
  const els: React.ReactNode[] = [];
  const cy = (TRIM.y0 + TRIM.y1) / 2; // 360：竖线生长原点
  const cx = W / 2; // 640 = gx(5)：横线生长原点
  for (let k = 0; k <= 10; k++) {
    const st = gridLineAt(f, Math.abs(k - 5), k === 5);
    if (st.e <= 0.001) continue;
    const half = (st.e * (TRIM.y1 - TRIM.y0)) / 2;
    els.push(<rect key={`v${k}`} x={gx(k) - gridStrokeW(st) / 2} y={cy - half} width={gridStrokeW(st)} height={half * 2} fill={INK_HEX.K} opacity={st.alpha} />);
  }
  for (let j = 0; j <= 5; j++) {
    const st = gridLineAt(f, Math.abs(j - 2.5), false);
    if (st.e <= 0.001) continue;
    const half = (st.e * (TRIM.x1 - TRIM.x0)) / 2;
    els.push(<rect key={`h${j}`} x={cx - half} y={gy(j) - gridStrokeW(st) / 2} width={half * 2} height={gridStrokeW(st)} fill={INK_HEX.K} opacity={st.alpha} />);
  }
  return <g>{els}</g>;
};

// ---------------------------------------------------------------- 套准标 / 角线（黑版；顶部套准标在横幅内挖孔呈现）
export const RegMarkAt: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g>
    <circle cx={x} cy={y} r={10.75} fill="none" stroke="#000" strokeWidth={1.5} />
    <rect x={x - 18} y={y - 0.75} width={36} height={1.5} fill="#000" />
    <rect x={x - 0.75} y={y - 18} width={1.5} height={36} fill="#000" />
  </g>
);

export const SheetMarks: React.FC = () => {
  const els: React.ReactNode[] = [];
  // 底边距套准标（纸面直印）
  els.push(<RegMarkAt key="reg-b" x={W / 2} y={H - 30} />);
  // 裁切角线（四角，臂全部指向版心内）
  for (const [x, y] of [
    [TRIM.x0, TRIM.y0],
    [TRIM.x1, TRIM.y0],
    [TRIM.x0, TRIM.y1],
    [TRIM.x1, TRIM.y1],
  ] as Array<[number, number]>) {
    const sxIn = x === TRIM.x0;
    const syIn = y === TRIM.y0;
    els.push(<rect key={`c${x}${y}h`} x={sxIn ? x + 12 : x - 40} y={y - 0.75} width={28} height={1.5} fill={INK_HEX.K} />);
    els.push(<rect key={`c${x}${y}v`} x={x - 0.75} y={syIn ? y + 12 : y - 40} width={1.5} height={28} fill={INK_HEX.K} />);
  }
  return <g>{els}</g>;
};

/** 色标 chip：底边距中段（字幕与 slug 之间），各墨首次落版时印上——版次记录的印刷惯例。 */
export const InkChips: React.FC<{f: number; ink: Ink}> = ({f, ink}) => {
  const firsts: Array<[Ink, number]> = [
    ['Y', EV.triIn],
    ['R', EV.circleLand],
    ['B', EV.sqIn],
    ['K', EV.bar0],
  ];
  const idx = firsts.findIndex(([i]) => i === ink);
  const at = firsts[idx][1];
  if (f < at) return null;
  return <rect x={700 + idx * 30} y={691} width={24} height={14} fill={INK_HEX[ink]} />;
};

/** 题头横幅：黑版栏体（动态挖孔）+ 黄版强调字。scaleY in2 盖印。 */
export const Banner: React.FC<{f: number; ink: Ink; counter: string}> = ({f, ink, counter}) => {
  const ts = in2(prog(f, EV.title0, EV.title1));
  if (ts <= 0.001) return null;
  return (
    <g transform={ts < 0.999 ? `scale(1 ${ts})` : undefined}>
      {ink === 'K' ? <rect x={BANNER.x0} y={BANNER.y0} width={BANNER.x1 - BANNER.x0} height={BANNER.y1 - BANNER.y0} fill={INK_HEX.K} mask="url(#bannerKnock)" /> : null}
      {ink === 'Y' ? <TitleText part2 fill={INK_HEX.Y} stroke={INK_HEX.Y} strokeWidth={3} /> : null}
    </g>
  );
};

/** 康定斯基钥匙 ▲■●（1923）：黄三角/红方/蓝圆，版面左下、题头横幅之下，不入群转。 */
export const KandinskyKey: React.FC<{f: number; ink: Ink}> = ({f, ink}) => {
  if (f < EV.title1) return null;
  const trap = {stroke: INK_HEX[ink], strokeWidth: 4, paintOrder: 'stroke' as const};
  return (
    <g>
      {ink === 'Y' && <polygon points={`60,525 100,525 80,485`} fill={INK_HEX.Y} {...trap} />}
      {ink === 'R' && <rect x={110} y={485} width={40} height={40} fill={INK_HEX.R} {...trap} />}
      {ink === 'B' && <circle cx={175} cy={505} r={20} fill={INK_HEX.B} {...trap} />}
    </g>
  );
};

// ---------------------------------------------------------------- 纸基完成层：奶油纸 + 纸牙斑驳 + 逐帧颗粒 + 暗角
export const PaperBase: React.FC = () => (
  <>
    <div style={{position: 'absolute', inset: 0, background: PAPER}} />
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.07}} aria-hidden>
      <rect width={W} height={H} filter="url(#toothCoarse)" />
    </svg>
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, mixBlendMode: 'soft-light', opacity: 0.32}} aria-hidden>
      <rect width={W} height={H} filter="url(#toothFine)" />
    </svg>
  </>
);

/** 颗粒：噪声纹理整体按帧 seeded 平移（±256px 包裹），视觉即逐帧重掷（源 grain go=frame hash 移植）。 */
export const GrainLayer: React.FC<{f: number; hash: (a: number, b: number) => number}> = ({f, hash}) => {
  const dx = Math.floor(hash(f, 17) * 512) - 256;
  const dy = Math.floor(hash(f, 29) * 512) - 256;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', mixBlendMode: 'overlay', opacity: 0.14, pointerEvents: 'none'}} aria-hidden>
      <svg width={W + 512} height={H + 512} style={{position: 'absolute', left: -256 + dx, top: -256 + dy}}>
        <rect width={W + 512} height={H + 512} filter="url(#grainF)" />
      </svg>
    </div>
  );
};

export const Vignette: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: `radial-gradient(ellipse ${W * 0.72}px ${H * 0.72}px at 50% 50%, rgba(0,0,0,0) 58%, rgba(46,36,18,0.10) 100%)`,
      pointerEvents: 'none',
    }}
  />
);

// ---------------------------------------------------------------- 群转包裹器（12 棘齿；十字/钢线/横幅不入组）
export const TurnGroup: React.FC<{f: number; children: React.ReactNode}> = ({f, children}) => {
  const ang = turnAngleDeg(f);
  if (ang === 0) return <>{children}</>;
  return <g transform={`rotate(${ang} ${TURN.px} ${TURN.py})`}>{children}</g>;
};

/** 旁白字幕（底边距，黑版印刷语言：墨方块+黑字，逐块硬切）。 */
export const CaptionPlate: React.FC<{text: string | null; ink: Ink}> = ({text, ink}) => {
  if (ink !== 'K' || !text) return null;
  return (
    <g>
      <rect x={TRIM.x0} y={690} width={9} height={9} fill={INK_HEX.K} />
      <text x={TRIM.x0 + 18} y={700} fontFamily="'Noto Sans SC'" fontWeight={700} fontSize={17} letterSpacing={1} fill={INK_HEX.K}>
        {text}
      </text>
    </g>
  );
};

/** 底边距右侧 slug。 */
export const SlugBottom: React.FC = () => (
  <text x={TRIM.x1} y={H - 18} textAnchor="end" fontFamily="'Noto Sans SC'" fontWeight={500} fontSize={12} letterSpacing={2.2} fill={INK_HEX.K} opacity={0.85}>
    {'四色套印 R·Y·B·K — OFFSET PRESS · 排错一格 重来'}
  </text>
);

/** 全部十字（黑版，时间窗内可见）。 */
export const Crosses: React.FC<{f: number}> = ({f}) => (
  <g>
    {CROSSES.map((c) => (f >= c.from && f < c.until ? <Passkreuz key={c.id} x={c.x} y={c.y} /> : null))}
  </g>
);

export const beatCounterText = (f: number) => `BEAT ${String(beatNo(f)).padStart(2, '0')}/${BEATS}`;
