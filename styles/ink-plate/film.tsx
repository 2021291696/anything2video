// ink-plate · film.tsx — 编舞正片：四墨版层语义（ink→版）× 120BPM 一拍一动作 × 群转/敲击/press lock
// 技法借鉴 mg-styles-15 demos/09-bauhaus (MIT, Vincentwei1021), TSX 重写
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Fonts} from '../common/lib';
import {SUBS} from '../common/subs';
import {
  CIRCLE_STOPS,
  cellX,
  cellY,
  densAt,
  EV,
  hash2,
  INK_HEX,
  in2,
  movePos,
  paperJolt,
  PLATE_ORDER,
  plateOffset,
  PAPER,
  prog,
  SQ_STOPS,
  TRI_STOPS,
  W,
  H,
  type Ink,
} from './world';
import {
  Banner,
  beatCounterText,
  CaptionPlate,
  Crosses,
  GrainLayer,
  GridRuling,
  InkChips,
  KandinskyKey,
  PaperBase,
  PlateDefs,
  SheetMarks,
  SlugBottom,
  TurnGroup,
  Vignette,
} from './kit';

// ---------------------------------------------------------------- 形状（trap 惯例：墨边外扩 2px 描边，防露白）
const TRAP = 4;

function CircleInk({f, ink}: {f: number; ink: Ink}) {
  if (ink !== 'R' || f < 1) return null;
  const {x, y} = movePos(f, CIRCLE_STOPS);
  return <circle cx={x} cy={y} r={120} fill={INK_HEX.R} stroke={INK_HEX.R} strokeWidth={TRAP / 2} />;
}

function TriInk({f, ink}: {f: number; ink: Ink}) {
  if (ink !== 'Y') return null;
  // 入场：倒挂生长（s 0→-1）→ b3 翻正（s -1→1，绕自身中心竖直翻面，无 overshoot）
  let s = 0;
  if (f >= EV.triIn && f < EV.triLand) s = -in2(prog(f, EV.triIn, EV.triLand));
  else if (f >= EV.triLand && f < EV.triFlip0) s = -1;
  else if (f >= EV.triFlip0 && f < EV.triFlip1) s = -1 + 2 * in2(prog(f, EV.triFlip0, EV.triFlip1));
  else if (f >= EV.triFlip1) s = 1;
  if (Math.abs(s) < 0.01) return null;
  const {x, y} = movePos(f, TRI_STOPS);
  const pts = `${x - 120},${y + 120 * s} ${x + 120},${y + 120 * s} ${x},${y - 120 * s}`;
  return <polygon points={pts} fill={INK_HEX.Y} stroke={INK_HEX.Y} strokeWidth={TRAP / 2} />;
}

function SqInk({f, ink}: {f: number; ink: Ink}) {
  if (ink !== 'B') return null;
  if (f < EV.sqIn) return null;
  const s = in2(prog(f, EV.sqIn, EV.sqLand));
  if (s < 0.01) return null;
  if (f < EV.sqLand) {
    // 入场：自格顶边向下长出（源 sq_scale 惯例，宽含 4px trap）
    return <rect x={cellX(2) - 120} y={cellY(0) - 120} width={(240 + TRAP) * s} height={240 * s} fill={INK_HEX.B} />;
  }
  const {x, y} = movePos(f, SQ_STOPS);
  return <rect x={x - 120} y={y - 120} width={240 + TRAP} height={240} fill={INK_HEX.B} />;
}

function BarInk({f, ink}: {f: number; ink: Ink}) {
  if (ink !== 'K' || f < EV.bar0) return null;
  const u = in2(prog(f, EV.bar0, EV.bar1));
  return <rect x={cellX(4)} y={60} width={120} height={480 * u} fill={INK_HEX.K} />;
}

/** 地平钢线 y=300（黑版 overprint，源 rule 惯例）。 */
function RuleInk({f, ink}: {f: number; ink: Ink}) {
  if (ink !== 'K' || f < EV.rule) return null;
  const w = 720 * in2(prog(f, EV.rule, EV.rule + 24));
  if (w < 1) return null;
  return <rect x={280} y={297} width={w} height={6} fill={INK_HEX.K} />;
}

/** 轴点：群转前盖印的黑点（源 pivot 惯例）。 */
function PivotInk({f, ink}: {f: number; ink: Ink}) {
  if (ink !== 'K' || f < EV.turn0) return null;
  return <circle cx={640} cy={300} r={20} fill={INK_HEX.K} />;
}

// ---------------------------------------------------------------- 一块版的全部内容（ink('R'|'K'|'Y'|'B', shape) 语义：只画归本版的墨）
function plateEls(ink: Ink, f: number, caption: string | null, counter: string): React.ReactNode {
  return (
    <>
      {ink === 'K' && <GridRuling f={f} />}
      {ink === 'K' && <Crosses f={f} />}
      <TurnGroup f={f}>
        <CircleInk f={f} ink={ink} />
        <TriInk f={f} ink={ink} />
        <SqInk f={f} ink={ink} />
      </TurnGroup>
      <BarInk f={f} ink={ink} />
      <RuleInk f={f} ink={ink} />
      <PivotInk f={f} ink={ink} />
      <Banner f={f} ink={ink} counter={counter} />
      <KandinskyKey f={f} ink={ink} />
      {ink === 'K' && f >= 1 ? <SheetMarks /> : null}
      <InkChips f={f} ink={ink} />
      {ink === 'K' && <SlugBottom />}
      <CaptionPlate text={caption} ink={ink} />
    </>
  );
}

// ---------------------------------------------------------------- 单版层：偏移 + 粗边 + multiply 叠印
const PlateLayer: React.FC<{ink: Ink; f: number; caption: string | null; counter: string}> = ({ink, f, caption, counter}) => {
  const off = plateOffset(ink, f);
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
        opacity: densAt(f),
        transform: `translate(${off.x.toFixed(2)}px, ${off.y.toFixed(2)}px)`,
        filter: `url(#inkRough-${ink})`,
      }}
      aria-hidden
    >
      {plateEls(ink, f, caption, counter)}
    </svg>
  );
};

// ---------------------------------------------------------------- 正片
export const Film: React.FC<{f0: number}> = ({f0}) => {
  const fr = useCurrentFrame();
  const f = fr + f0; // 全片绝对帧（1 起）
  const activeSub = SUBS.find((s) => f >= s.from && f <= s.to);
  const counter = beatCounterText(f);
  const jolt = paperJolt(f);
  return (
    <AbsoluteFill style={{background: PAPER, isolation: 'isolate', overflow: 'hidden', transform: jolt ? `translateY(${jolt}px)` : undefined}}>
      <Fonts />
      <PlateDefs counter={counter} />
      <PaperBase />
      {PLATE_ORDER.map((ink) => (
        <PlateLayer key={ink} ink={ink} f={f} caption={activeSub ? activeSub.text : null} counter={counter} />
      ))}
      <GrainLayer f={f} hash={hash2} />
      <Vignette />
    </AbsoluteFill>
  );
};
