import React from 'react';
import {AbsoluteFill} from 'remotion';
import {cubicBezier, clamp01} from '../common';

/**
 * line-art 线条动画 · 图元库（自研风格卡，笔触纪律对标 mg demos/02-line-art「一笔画」）
 *
 * 签名特征（SPEC 锁死项，评审依据）：
 * 1. SVG stroke-dasharray/dashoffset 描绘（AE Trim Paths 等价），线宽全片恒定 2.6px，round cap/join
 * 2. 转角描绘速度略减速：全片唯一描绘缓动 EASE = cubic-bezier(0.65,0,0.35,1)，逐段施加（段界=转角）
 * 3. 「一笔画」叙事：主体是一条预先连通的折线路径（桥面→回滑→塔→鞍座→索面往复），
 *    笔尖全程不提笔；至少两处无缝续接：桥面尾线滑回=塔起线（f93/94 交接）、塔顶鞍座=每根斜索起线
 *    （索间沿既有索线滑回，回滑段叠在已绘墨线上=零新增墨迹，只见笔尖滑行）
 * 4. 线转面：索力路径自锚点 A2 扩展填充（金线宽带 stroke swell 沿路径揭示 + 力三角面自锚点长出）
 * 5. 双色：墨线 + 唯一暖金强调，米白纸底，大量负空间（构图集中在中带 y190-470，上下留白）
 *
 * 纯函数纪律：全部动画是绝对帧号 N 的一元函数（镜头组件只做 N = useCurrentFrame() + F0 平移），
 * 三镜头共用同一 Scene，镜头边界零接缝——「一笔画」天然要求连续画布。
 */

// ---- 色 token（SPEC 锁死项）----
export const LA = {
  bg: '#f7f4ec', // 米白纸底
  ink: '#23262e', // 墨线（唯一造型语言）
  inkSoft: 'rgba(35,38,46,0.72)',
  dim: 'rgba(35,38,46,0.45)',
  gold: '#b8862b', // 唯一暖金强调（索力/标题线/笔锋晕）
  goldSoft: 'rgba(184,134,43,0.26)',
} as const;

/** 线宽全片恒定（SPEC 特征 1：2-4px 恒定）。 */
export const LINE_W = 2.6;
/** 全片唯一描绘缓动（SPEC 特征 2）：easeInOut cubic-bezier(0.65,0,0.35,1)。 */
export const EASE = cubicBezier(0.65, 0, 0.35, 1);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

// ---- 几何（世界坐标 = 画布 px，1280×720）----
type Pt = [number, number];
const DECK_Y = 468;
const DECK_X0 = 150;
const DECK_X1 = 1130; // 主跨长（左）+ 边跨短（右），塔不在中点——参考真实斜拉桥形态（示意）
const TWR_X = 860;
const SADDLE = {c: [TWR_X, 192] as Pt, r: 7}; // 塔顶鞍座小圆（缆索锚固点，一笔画转角件）
const SADDLE_BOT: Pt = [TWR_X, SADDLE.c[1] + SADDLE.r]; // (860,199) 索与塔的续接点
/** 主跨锚点（左扇，远→近）与边跨锚点（右扇）。A2 为索力填充锚点。 */
export const ANCHORS = {
  A1: [430, DECK_Y] as Pt, A2: [552, DECK_Y] as Pt, A3: [674, DECK_Y] as Pt, A4: [796, DECK_Y] as Pt,
  B1: [958, DECK_Y] as Pt, B2: [1056, DECK_Y] as Pt,
};
const LOAD_X = 640; // 荷载作用点（A2/A3 之间主跨中）

// ---- 帧号表（拍点唯一事实源；已按 tts_build 实测时间轴校准，S01 f86-132 / S02 f143-232 / S03 f251-341）----
export const T = {
  deckA: [1, 32] as const, // 桥面起笔段（快起：f12 已绘≈115px+笔锋金晕=0.37s 钩子；f15≈163px=0.5s 纪律）
  deckB: [33, 84] as const, // 桥面续段至梁端
  deckRet: [85, 93] as const, // 笔沿既有桥面滑回塔基（无缝续接点①：尾线滑回=塔起线）
  pylon: [94, 126] as const, // 塔自桥面立起（S02「塔竖起」口播前 17f 完成，视觉先行）
  saddle: [127, 138] as const, // 塔顶鞍座小圆（转角件，减速）
  cA1: [139, 150] as const, gA1: [151, 157] as const, // 索面往复：画索（新墨）→沿索滑回（零墨）
  cA2: [158, 169] as const, gA2: [170, 176] as const,
  cA3: [177, 188] as const, gA3: [189, 195] as const,
  cA4: [196, 207] as const, gA4: [208, 214] as const,
  cB1: [215, 222] as const, gB1: [223, 226] as const,
  cB2: [227, 234] as const, gB2: [235, 238] as const,
  hold: [239, 244] as const, // 收笔驻留（标点休止，参考片 punctuation hold 纪律）
  arrowShaft: [245, 258] as const, // 荷载箭头杆（S03「荷载压下」f251 口播，压落 f263 对位）
  arrowHead: [258, 265] as const, // 箭头双翼
  press: [263, 269] as const, // 压落（箭头整体下沉 5px=桥面受载挠曲暗示）+ 涟漪
  fill: [263, 323] as const, // 线转面：索力路径自锚点 A2 扩展填充（hero）
  ripple2: [269, 289] as const, // 第二道涟漪
  labelLoad: 255, labelCable: 295, labelNote: 327,
  titleRule: [348, 358] as const, titleMain: 350, titleSub: 368, titleEn: 374,
  tipFade: [323, 337] as const, // 笔锋在塔基收笔淡出
} as const;
export const TOTAL_DRAW_END = T.hold[1]; // 一笔画收笔帧

// ---- 折线段表（一笔画主体，顺序 = 描绘顺序；glide 段与既有线几何重合=零新增墨迹）----
type Seg = {id: string; pts: Pt[]; f0: number; f1: number};
const circlePts = (c: Pt, r: number, n = 10): Pt[] =>
  Array.from({length: n + 1}, (_, i) => {
    const a = Math.PI / 2 + (i / n) * Math.PI * 2; // 自底部逆时针整圆（笔从下方到达，继续向上过顶）
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)] as Pt;
  });

const SEG_DEFS: Array<{id: keyof typeof T | string; pts: Pt[]; win: readonly [number, number]}> = [
  {id: 'deckA', pts: [[DECK_X0, DECK_Y], [560, DECK_Y]], win: T.deckA},
  {id: 'deckB', pts: [[560, DECK_Y], [DECK_X1, DECK_Y]], win: T.deckB},
  {id: 'deckRet', pts: [[DECK_X1, DECK_Y], [TWR_X, DECK_Y]], win: T.deckRet},
  {id: 'pylon', pts: [[TWR_X, DECK_Y], SADDLE_BOT], win: T.pylon},
  {id: 'saddle', pts: circlePts(SADDLE.c, SADDLE.r), win: T.saddle},
  {id: 'cA1', pts: [SADDLE_BOT, ANCHORS.A1], win: T.cA1}, {id: 'gA1', pts: [ANCHORS.A1, SADDLE_BOT], win: T.gA1},
  {id: 'cA2', pts: [SADDLE_BOT, ANCHORS.A2], win: T.cA2}, {id: 'gA2', pts: [ANCHORS.A2, SADDLE_BOT], win: T.gA2},
  {id: 'cA3', pts: [SADDLE_BOT, ANCHORS.A3], win: T.cA3}, {id: 'gA3', pts: [ANCHORS.A3, SADDLE_BOT], win: T.gA3},
  {id: 'cA4', pts: [SADDLE_BOT, ANCHORS.A4], win: T.cA4}, {id: 'gA4', pts: [ANCHORS.A4, SADDLE_BOT], win: T.gA4},
  {id: 'cB1', pts: [SADDLE_BOT, ANCHORS.B1], win: T.cB1}, {id: 'gB1', pts: [ANCHORS.B1, SADDLE_BOT], win: T.gB1},
  {id: 'cB2', pts: [SADDLE_BOT, ANCHORS.B2], win: T.cB2}, {id: 'gB2', pts: [ANCHORS.B2, SADDLE_BOT], win: T.gB2},
];

export const SEGS: Seg[] = SEG_DEFS.map((s) => ({id: String(s.id), pts: s.pts, f0: s.win[0], f1: s.win[1]}));

// ---- 折线几何工具（纯 JS 求长度/弧长取点，不依赖 DOM getTotalLength）----
export const polyPts = (segs: Seg[]): Pt[] => {
  const out: Pt[] = [];
  for (const s of segs) for (const p of s.pts) {
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out;
};
const cumLen = (pts: Pt[]): number[] => {
  const c = [0];
  for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return c;
};
export const polyLen = (pts: Pt[]): number => cumLen(pts)[pts.length - 1];
/** 弧长取点：s∈[0,len] → [x,y]（线性插值）。 */
export const ptAtLen = (pts: Pt[], s: number): Pt => {
  const c = cumLen(pts), total = c[c.length - 1];
  const q = clamp01(s / total) * total;
  for (let i = 1; i < pts.length; i++) {
    if (q <= c[i]) {
      const f = c[i] === c[i - 1] ? 0 : (q - c[i - 1]) / (c[i] - c[i - 1]);
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
    }
  }
  return pts[pts.length - 1];
};
const toD = (pts: Pt[]): string => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');

// ---- 一笔画主路径与描绘进度 ----
export const MASTER_PTS = polyPts(SEGS);
export const MASTER_D = toD(MASTER_PTS);
export const MASTER_LEN = polyLen(MASTER_PTS);

/** 逐段施加 EASE 的描绘进度：返回已绘弧长（px）。glide 段与既有墨线重合，dash 揭示无新增墨迹。 */
export const drawnAt = (N: number): number => {
  let len = 0;
  for (const s of SEGS) {
    const segLen = polyLen(s.pts);
    if (N >= s.f1) { len += segLen; continue; }
    if (N <= s.f0) break;
    len += EASE((N - s.f0) / (s.f1 - s.f0)) * segLen;
    break;
  }
  return len;
};

// ---- 荷载箭头 / 索力填充路径 ----
const ARROW_PTS: Pt[] = [[LOAD_X, 318], [LOAD_X, 456]];
const HEAD_L: Pt[] = [[626, 432], [LOAD_X, 456]];
const HEAD_R: Pt[] = [[654, 432], [LOAD_X, 456]];
export const FILL_PTS: Pt[] = [ANCHORS.A2, SADDLE_BOT, [TWR_X, DECK_Y]]; // 锚点→塔顶→顺塔下至塔基
export const FILL_D = toD(FILL_PTS);
export const FILL_LEN = polyLen(FILL_PTS);

/** 笔锋状态：只跟随一笔画主体（荷载箭头/索力填充为标注类笔画，笔不跟画——笔在收笔驻留后提笔离场）。
 *  返回 null=不可见。 */
export const penAt = (N: number): {x: number; y: number; a: number} | null => {
  const fade = 1 - clamp01((N - T.hold[1]) / 14); // f244-258 提笔淡出
  if (fade <= 0.01) return null;
  const s = Math.min(drawnAt(N), MASTER_LEN);
  const p = ptAtLen(MASTER_PTS, s);
  return {x: p[0], y: p[1], a: fade};
};

// ---- 幕底：纯米白纸底（负空间纪律：全片无幕底装饰）----
export const LABackdrop: React.FC = () => <AbsoluteFill style={{background: LA.bg}} />;

// ---- 一笔画主体（SPEC 特征 1/3：dasharray/dashoffset 描绘 + 预连通路径）----
export const OneStroke: React.FC<{N: number}> = ({N}) => {
  const drawn = Math.min(drawnAt(N), MASTER_LEN);
  return (
    <svg width={1280} height={720} style={{position: 'absolute', inset: 0}}>
      <path d={MASTER_D} fill="none" stroke={LA.ink} strokeWidth={LINE_W}
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={`${drawn} ${MASTER_LEN + 200}`} />
    </svg>
  );
};

// ---- 笔锋（热墨点 + 暖金晕，绘制时可见；参考片 nib 纪律）----
export const PenTip: React.FC<{N: number}> = ({N}) => {
  const pen = penAt(N);
  if (!pen) return null;
  return (
    <svg width={1280} height={720} style={{position: 'absolute', inset: 0}}>
      <circle cx={pen.x} cy={pen.y} r={16} fill={LA.gold} opacity={0.10 * pen.a} />
      <circle cx={pen.x} cy={pen.y} r={8} fill={LA.gold} opacity={0.22 * pen.a} />
      <circle cx={pen.x} cy={pen.y} r={3} fill={LA.ink} opacity={0.95 * pen.a} />
    </svg>
  );
};

// ---- 荷载箭头（标注类笔注：独立短笔画，非一笔画主体）----
export const LoadArrow: React.FC<{N: number}> = ({N}) => {
  const shaft = EASE(clamp01((N - T.arrowShaft[0]) / (T.arrowShaft[1] - T.arrowShaft[0])));
  if (shaft <= 0) return null;
  const head = EASE(clamp01((N - T.arrowHead[0]) / (T.arrowHead[1] - T.arrowHead[0])));
  const pressP = clamp01((N - T.press[0]) / (T.press[1] - T.press[0]));
  const drop = pressP * 5; // 压落下沉（受载暗示）
  const shaftLen = polyLen(ARROW_PTS);
  return (
    <svg width={1280} height={720} style={{position: 'absolute', inset: 0}}>
      <g transform={`translate(0 ${drop})`}>
        <path d={toD(ARROW_PTS)} fill="none" stroke={LA.ink} strokeWidth={LINE_W} strokeLinecap="round"
          strokeDasharray={`${EASE(shaft) * shaftLen} ${shaftLen + 40}`} />
        {head > 0 ? (
          <g opacity={Math.min(1, head * 1.4)}>
            <path d={toD(HEAD_L)} fill="none" stroke={LA.ink} strokeWidth={LINE_W} strokeLinecap="round"
              strokeDasharray={`${head * polyLen(HEAD_L)} ${polyLen(HEAD_L) + 40}`} />
            <path d={toD(HEAD_R)} fill="none" stroke={LA.ink} strokeWidth={LINE_W} strokeLinecap="round"
              strokeDasharray={`${head * polyLen(HEAD_R)} ${polyLen(HEAD_R) + 40}`} />
          </g>
        ) : null}
        {/* 压落涟漪：沿桥面摊开的两道扁椭圆（线宽恒定纪律：同为 LINE_W） */}
        {[T.press, T.ripple2].map((win, i) => {
          const rp = clamp01((N - win[0]) / (win[1] - win[0]));
          if (rp <= 0 || rp >= 1) return null;
          const rx = 14 + easeOutCubic(rp) * (i === 0 ? 40 : 26);
          return <ellipse key={i} cx={LOAD_X} cy={DECK_Y} rx={rx} ry={4.5} fill="none"
            stroke={LA.ink} strokeWidth={LINE_W} opacity={0.35 * (1 - rp)} />;
        })}
      </g>
    </svg>
  );
};

// ---- 线转面（SPEC 特征 4）：索力路径自锚点 A2 扩展填充 ----
export const ForceFill: React.FC<{N: number}> = ({N}) => {
  const p = clamp01((N - T.fill[0]) / (T.fill[1] - T.fill[0]));
  if (p <= 0) return null;
  const e = EASE(p);
  const settled = N > T.fill[1]; // 定帧微呼吸（合法微动效）
  const breath = settled ? Math.sin((N - T.fill[1]) * 0.085) : 0;
  const swell = LINE_W + 13.4 * easeOutCubic(clamp01(p * 1.5)); // 线宽带：2.6 → 16（线→面）
  const bandA = Math.min(1, p * 2.2) * (0.26 + 0.035 * breath);
  const triA = 0.07 * easeOutCubic(p) * (1 + 0.16 * breath);
  const A2 = FILL_PTS[0];
  return (
    <svg width={1280} height={720} style={{position: 'absolute', inset: 0}}>
      {/* 力三角面：自锚点长出（scale-from-anchor = fill 从锚点扩展） */}
      <polygon points={`${FILL_PTS[0]},${FILL_PTS[1]},${FILL_PTS[2]}`} fill={LA.gold} opacity={triA}
        transform={`translate(${A2[0]} ${A2[1]}) scale(${0.18 + 0.82 * e}) translate(${-A2[0]} ${-A2[1]})`} />
      {/* 索力宽带：同路径 stroke swell，自锚点（路径起点）dash 揭示 */}
      <path d={FILL_D} fill="none" stroke={LA.gold} strokeWidth={swell} strokeLinecap="round"
        opacity={bandA} strokeDasharray={`${e * FILL_LEN} ${FILL_LEN + 200}`} />
      {/* 力源点：锚点处金色墨点 */}
      <circle cx={A2[0]} cy={A2[1]} r={4 + 0.6 * (breath + 1)} fill={LA.gold} opacity={0.85} />
    </svg>
  );
};

// ---- 标注（讲解向：文字 + 引线皆描绘式入场；线宽恒定纪律——引线同为 LINE_W）----
export const Annot: React.FC<{N: number; from: number; x: number; y: number; text: string;
  leader?: [Pt, Pt]; anchor?: 'start' | 'middle' | 'end'; size?: number; color?: string}> = ({
  N, from, x, y, text, leader, anchor = 'start', size = 13, color = LA.inkSoft,
}) => {
  const tP = clamp01((N - from - 4) / 12);
  if (tP <= 0 && !leader) return null;
  const lP = leader ? EASE(clamp01((N - from) / 8)) : 0;
  return (
    <svg width={1280} height={720} style={{position: 'absolute', inset: 0}}>
      {leader && lP > 0 ? (
        <path d={toD(leader)} fill="none" stroke={color} strokeWidth={LINE_W} strokeLinecap="round"
          opacity={0.5} strokeDasharray={`${lP * polyLen(leader)} ${polyLen(leader) + 40}`} />
      ) : null}
      <text x={x} y={y + (1 - easeOutCubic(tP)) * 6} fill={color} fontSize={size} textAnchor={anchor}
        fontFamily="'Noto Sans SC', sans-serif" fontWeight={400} opacity={tP}
        style={{letterSpacing: 1}}>{text}</text>
    </svg>
  );
};

/** 角注「受力示意」（任务硬性要求：力学示意标注"示意"）。 */
export const CornerNote: React.FC<{N: number}> = ({N}) => {
  const p = clamp01((N - T.labelNote) / 14);
  if (p <= 0) return null;
  return (
    <div style={{position: 'absolute', right: 44, bottom: 30, opacity: p * 0.55,
      fontFamily: "'Noto Sans SC', sans-serif", fontSize: 11, letterSpacing: 2, color: LA.ink}}>
      受力示意 · 非精确比例
    </div>
  );
};

// ---- 收尾定帧标题（SPEC：定帧 0.8-1.2s 带微动效——微呼吸已在 ForceFill，此处为版式）----
export const TitleCard: React.FC<{N: number}> = ({N}) => {
  const rule = EASE(clamp01((N - T.titleRule[0]) / (T.titleRule[1] - T.titleRule[0])));
  if (rule <= 0) return null;
  const ruleLen = 168;
  const main = '一座桥的受力';
  const sub = '一条线，扛住千钧';
  const en = 'ONE-LINE STATICS · CABLE-STAYED BRIDGE';
  return (
    <div style={{position: 'absolute', left: 0, top: 546, width: '100%', textAlign: 'center'}}>
      <svg width={1280} height={14} style={{position: 'absolute', left: 0, top: 0}}>
        <line x1={556} y1={7} x2={724} y2={7} stroke={LA.gold} strokeWidth={LINE_W} strokeLinecap="round"
          strokeDasharray={`${rule * ruleLen} ${ruleLen + 40}`} />
      </svg>
      <div style={{position: 'absolute', left: 0, top: 22, width: '100%'}}>
        {main.split('').map((ch, i) => {
          const cp = clamp01((N - T.titleMain - i * 4) / 12);
          return (
            <span key={i} style={{display: 'inline-block', opacity: cp,
              transform: `translateY(${(1 - easeOutCubic(cp)) * 8}px)`,
              fontFamily: "'Noto Serif SC', serif", fontWeight: 600, fontSize: 40,
              letterSpacing: 6, color: LA.ink, marginLeft: i === 0 ? 0 : 0}}>{ch}</span>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 0, top: 84, width: '100%', opacity: clamp01((N - T.titleSub) / 14) * 0.78,
        fontFamily: "'Noto Sans SC', sans-serif", fontSize: 14, letterSpacing: 4, color: LA.inkSoft}}>{sub}</div>
      <div style={{position: 'absolute', left: 0, top: 112, width: '100%', opacity: clamp01((N - T.titleEn) / 14) * 0.42,
        fontFamily: "'Noto Sans SC', sans-serif", fontSize: 9.5, letterSpacing: 3, color: LA.ink}}>{en}</div>
    </div>
  );
};
