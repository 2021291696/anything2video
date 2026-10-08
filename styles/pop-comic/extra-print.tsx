import React from 'react';
import {clamp01} from '../common/easing';
import {PK, LINE_B, W, H} from './kit';

// ============================================================================
// pop-comic opt-in 增强包：comic-print 复古印刷（v4.0.0 战役 Wave B/B1）
// 全部组件 opt-in——不被任何既有文件 import，默认渲染路径与 v4.0.0 前逐值等价。
// 技法借鉴 huashu-art-motion 13_pop/27_kirby (MIT, alchaincyf), TSX 重写：
//   13_pop：Benday 网屏角本戴点 / WarholGrid 四格换色 / ThoughtBubble / fieldWiggle
//   27_kirby：KirbyShade 黑块阴影+羽化排线 / Krackle 能量点 / Misregister 套色错位
// 参数照抄 RECON-huashu §13_pop/§27_kirby 与 lib/render.js 正本；禁 Math.random/Date/网络。
// ============================================================================

const withAlpha = (hex: string, a: number) => {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

/** 序列版 mulberry32（状态持久，逐调用推进）。注意：kit 的 mulberry32 是单值 hash（每次调用同值），
 *  适合 hash1 式取一个数；Krackle 一簇点需要真随机序列，必须用本函数。同样禁 Math.random。 */
const rng32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ============================================================================
// 1. Benday：带网屏角的本戴点（Benday dots）。huashu P.dotPattern 的 TSX 重写：
//    CSS radial-gradient 网点 tile 装进旋转容器实现加网角（pattern 对齐容器、不随内容「游泳」）。
//    分区 pitch/半径/角度/底色/点色全部独立可配；不挂载即无网角（默认输出不变）。
// ============================================================================
export type BendaySpec = {pitch: number; r: number; color: string; bg?: string; angleDeg: number; alpha?: number};
/** 分区参数照抄：13_pop 墙蓝底白点 45° pitch24/r5.6｜皮肤红点 pitch13/r3.3｜黄地隐点 α0.18；27_kirby 四色胶印 C15°/M75°（点色默认映射 pop-comic PK） */
export const BENDAY_PRESETS = {
  popWall: {pitch: 24, r: 5.6, color: '#FFFFFF', bg: '#2f5cc8', angleDeg: 45},
  popSkin: {pitch: 13, r: 3.3, color: '#e2483c', bg: '#fae0cc', angleDeg: 45},
  popGround: {pitch: 14, r: 2.2, color: '#141414', angleDeg: 45, alpha: 0.18},
  kirbyPlateC: {pitch: 9, r: 2.7, color: PK.cyan, angleDeg: 15},
  kirbyPlateM: {pitch: 9, r: 3.2, color: PK.pink, angleDeg: 75},
  kirbySkin: {pitch: 7, r: 1.5, color: PK.red, angleDeg: 75},
} as const satisfies Record<string, BendaySpec>;

export const Benday: React.FC<{x: number; y: number; w: number; h: number} & BendaySpec & {z?: number; style?: React.CSSProperties}> =
({x, y, w, h, pitch, r, color, bg, angleDeg, alpha = 1, z, style}) => {
  const d = Math.ceil(Math.hypot(w, h)); // 旋转后仍盖满矩形的正方形边长
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', zIndex: z, pointerEvents: 'none', ...style}}>
      <div style={{position: 'absolute', left: '50%', top: '50%', width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2,
        transform: `rotate(${angleDeg}deg)`, backgroundColor: bg,
        backgroundImage: `radial-gradient(circle, ${withAlpha(color, alpha)} ${r}px, ${withAlpha(color, 0)} ${(r + 1.1).toFixed(1)}px)`,
        backgroundSize: `${pitch}px ${pitch}px`}} />
    </div>
  );
};

// ============================================================================
// 2. WarholGrid：四格配色轮换。13_pop 正本机制：step=floor(lt·11)（≈5.5 帧一换），
//    格 i 用第 (i+step)%4 套配色；四套=沃霍尔底色（#9ccf3a/#e0359a/#2fc0b0/#f08a2a），
//    脸/眼影/口红取 13_pop 色板（皮 #fae0cc、蓝 #2f5cc8、红 #d8232a），下半脸=同系深一档推导。
//    内容经 renderCell 交给调用方（组件只负责轮换机制与白画框格子）。
// ============================================================================
export type WarholSet = {base: string; face: string; half: string; eye: string; lip: string};
export const WARHOL_SETS: WarholSet[] = (['#9ccf3a', '#e0359a', '#2fc0b0', '#f08a2a'] as const).map((base) => ({
  base, face: '#fae0cc', half: '#c4561a', eye: '#2f5cc8', lip: '#d8232a',
}));

export const WarholGrid: React.FC<{
  lt: number; x: number; y: number; cellW: number; cellH: number; gap?: number; stepFps?: number; sets?: WarholSet[];
  z?: number; style?: React.CSSProperties;
  renderCell: (palIdx: number, set: WarholSet, cell: number) => React.ReactNode;
}> = ({lt, x, y, cellW, cellH, gap = 10, stepFps = 11, sets = WARHOL_SETS, z = 2, style, renderCell}) => {
  const step = Math.floor(lt * stepFps);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: cellW * 2 + gap, height: cellH * 2 + gap, zIndex: z, ...style}}>
      {[0, 1, 2, 3].map((i) => {
        const palIdx = (i + step) % sets.length;
        return (
          <div key={i} style={{position: 'absolute', left: (i % 2) * (cellW + gap), top: Math.floor(i / 2) * (cellH + gap),
            width: cellW, height: cellH, background: '#FFFFFF', border: `${LINE_B}px solid #FFFFFF`,
            outline: `2px solid ${PK.ink}`, overflow: 'hidden'}}>
            {renderCell(palIdx, sets[palIdx], i)}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// 3. ThoughtBubble：思考泡。13_pop 正本：泡体 10 圆「先统一描 11px 黑、再统一填白」=并集轮廓；
//    尾部 3 点序贯闪 ((f-2k) mod 12) < 4 时亮（r20、上跳 6px），否则 r12，12 帧一循环。
//    默认云形为 TSX 重写的通用造型（中心 1 大圆 + 周圈 9 圆，确定性生成）。
// ============================================================================
export const thoughtLit = (f: number, k: number, period = 12, phaseStep = 2) =>
  (((f - phaseStep * k) % period) + period) % period < 4;

const bubbleCloud = (w: number, h: number): Array<[number, number, number]> => {
  const cx = w / 2, cy = h * 0.46, rx = w * 0.5 - 18, ry = h * 0.46 - 14;
  const arr: Array<[number, number, number]> = [[cx, cy, Math.min(rx, ry) * 0.74]];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 - Math.PI / 2;
    arr.push([cx + Math.cos(a) * rx * 0.84, cy + Math.sin(a) * ry * 0.8, Math.min(w, h) * (0.13 + 0.018 * (i % 4))]);
  }
  return arr;
};

export const ThoughtBubble: React.FC<{
  x: number; y: number; w: number; h: number; f: number; outline?: number; fill?: string; ink?: string;
  dots?: number; dotGap?: [number, number]; flashPeriod?: number; dotR?: [number, number];
  children?: React.ReactNode; z?: number; style?: React.CSSProperties;
}> = ({x, y, w, h, f, outline = 11, fill = PK.surface, ink = PK.ink, dots = 3, dotGap = [-30, 26], flashPeriod = 12,
  dotR = [20, 12], children, z = 6, style}) => {
  const cloud = bubbleCloud(w, h);
  const trailH = Math.abs(dotGap[1]) * dots + 30;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h + trailH, zIndex: z, ...style}}>
      <svg width={w} height={h + trailH} viewBox={`0 0 ${w} ${h + trailH}`} style={{overflow: 'visible', display: 'block'}}>
        <g fill="none" stroke={ink} strokeWidth={outline}>
          {cloud.map(([cx, cy, r], i) => <circle key={`s${i}`} cx={cx} cy={cy} r={r} />)}
        </g>
        <g fill={fill}>
          {cloud.map(([cx, cy, r], i) => <circle key={`f${i}`} cx={cx} cy={cy} r={r} />)}
        </g>
        {[...Array(dots)].map((_, k) => {
          const lit = thoughtLit(f, k, flashPeriod);
          const r = lit ? dotR[0] : dotR[1];
          return (
            <g key={`d${k}`}>
              <circle cx={w * 0.3 + dotGap[0] * k} cy={h * 0.9 + dotGap[1] * k - (lit ? 6 : 0)} r={r} fill="none" stroke={ink} strokeWidth={6} />
              <circle cx={w * 0.3 + dotGap[0] * k} cy={h * 0.9 + dotGap[1] * k - (lit ? 6 : 0)} r={r} fill={fill} />
            </g>
          );
        })}
      </svg>
      <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// 4. fieldWiggle：权重场局部形变 util。13_pop 正本：wig=sin(lt·2π·6)·16（6Hz），
//    权重 clamp((560-x)/140)——越靠 anchorX 远端位移越大，同时上翘 |wig|·0.6。
//    纯函数、无随机；默认参数=原片（6Hz/16px/锚 560/程 140）。
// ============================================================================
export type WiggleOpts = {anchorX?: number; range?: number; amp?: number; hz?: number; lift?: number};
export const fieldWiggle = (x: number, t: number, o: WiggleOpts = {}): [number, number] => {
  const anchorX = o.anchorX ?? 560, range = o.range ?? 140, amp = o.amp ?? 16, hz = o.hz ?? 6, lift = o.lift ?? 0.6;
  const wig = Math.sin(t * Math.PI * 2 * hz) * amp;
  const wgt = clamp01((anchorX - x) / range);
  return [wig * wgt, -Math.abs(wig) * lift * wgt];
};

// ============================================================================
// 5. KirbyShade：黑块阴影 + 羽化排线（spotted blacks + feathering）。27_kirby 正本
//    P.kirbyShade 的 SVG 重写：clipBeside 数学（clip ∩ ¬translate evenodd）用
//    clipPath + mask（白底减平移后的黑 path）实现。
//    黑月牙 = shape ∩ ¬shift(light·d1)；羽化带 = shape ∩ ¬shift(light·d2) 内沿光方向
//    平行线间距 gap=9px；参数照抄：d1=14/d2=30/gap=9/light=[-0.86,-0.5]/ink=#141212/lw=2.6。
// ============================================================================
export type KirbyOpts = {d1?: number; d2?: number; gap?: number; light?: [number, number]; ink?: string; lw?: number};
export const KIRBY_DEF = {d1: 14, d2: 30, gap: 9, light: [-0.86, -0.5] as [number, number], ink: '#141212', lw: 2.6};

/** 排线扇生成（纯函数，供组件与数学断言共用）：沿光方向平行线，法向间距=gap，覆盖整个 w×h */
export const kirbyFan = (w: number, h: number, gap: number, light: [number, number]) => {
  const a = Math.atan2(light[1], light[0]);
  const nx = -Math.sin(a), ny = Math.cos(a);
  const cx = w / 2, cy = h / 2;
  const L = Math.hypot(w, h);
  const kHalf = Math.ceil((L / 2 + 4) / gap);
  const lines: Array<[number, number, number, number]> = [];
  for (let k = -kHalf; k <= kHalf; k++) {
    const ox = cx + nx * k * gap, oy = cy + ny * k * gap;
    lines.push([ox - light[0] * L, oy - light[1] * L, ox + light[0] * L, oy + light[1] * L]);
  }
  return {lines, normal: [nx, ny] as [number, number], center: [cx, cy] as [number, number]};
};

export const KirbyShade: React.FC<{path: string; w: number; h: number} & KirbyOpts & {style?: React.CSSProperties}> =
({path, w, h, d1 = KIRBY_DEF.d1, d2 = KIRBY_DEF.d2, gap = KIRBY_DEF.gap, light = KIRBY_DEF.light,
  ink = KIRBY_DEF.ink, lw = KIRBY_DEF.lw, style}) => {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const fan = kirbyFan(w, h, gap, light);
  const [lx, ly] = light;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', ...style}}>
      <defs>
        <clipPath id={`${uid}cp`}><path d={path} /></clipPath>
        <mask id={`${uid}m2`} maskUnits="userSpaceOnUse" x={0} y={0} width={w} height={h}>
          <rect width={w} height={h} fill="#fff" />
          <path d={path} transform={`translate(${(lx * d2).toFixed(2)} ${(ly * d2).toFixed(2)})`} fill="#000" />
        </mask>
        <mask id={`${uid}m1`} maskUnits="userSpaceOnUse" x={0} y={0} width={w} height={h}>
          <rect width={w} height={h} fill="#fff" />
          <path d={path} transform={`translate(${(lx * d1).toFixed(2)} ${(ly * d1).toFixed(2)})`} fill="#000" />
        </mask>
      </defs>
      <g clipPath={`url(#${uid}cp)`} mask={`url(#${uid}m2)`}>
        {fan.lines.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke={ink} strokeWidth={lw} strokeLinecap="butt" />
        ))}
      </g>
      <g clipPath={`url(#${uid}cp)`} mask={`url(#${uid}m1)`}>
        <rect width={w} height={h} fill={ink} />
      </g>
    </svg>
  );
};

// ============================================================================
// 6. Krackle：能量点。27_kirby 正本：一簇 16–26 个黑圆，距心 R·rnd^0.7（中心密）、
//    半径 R·(0.05+0.2·(1-d/R))（中心大），12fps 换种子，半径按 sin(18t+i) 脉动。
//    技术题材可当「能量/算力」视觉词。seeded mulberry32，禁 Math.random。
// ============================================================================
export const Krackle: React.FC<{
  f: number; cx: number; cy: number; R?: number; count?: number; seed?: number; fps?: number; color?: string;
  pulse?: number; z?: number; style?: React.CSSProperties;
}> = ({f, cx, cy, R = 120, count = 21, seed = 7, fps = 12, color = PK.ink, pulse = 0.2, z, style}) => {
  const t = f / 30;
  const step = Math.floor((f * fps) / 30);
  const rnd = rng32((seed * 7919 + step * 104729 + 17) >>> 0);
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const d = R * Math.pow(rnd(), 0.7);
    const ang = rnd() * Math.PI * 2;
    const base = R * (0.05 + 0.2 * (1 - d / R));
    const r = base * (1 - pulse / 2 + (pulse / 2) * Math.sin(18 * t + i * 0.73));
    if (r < 0.5) continue;
    dots.push(<circle key={i} cx={(cx + Math.cos(ang) * d).toFixed(1)} cy={(cy + Math.sin(ang) * d).toFixed(1)} r={r.toFixed(2)} fill={color} />);
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
      style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', zIndex: z, ...style}}>
      {dots}
    </svg>
  );
};

// ============================================================================
// 7. Misregister：套色错位（老四色胶印味）。27_kirby 正本：色版层整体偏移 (4,3)px，
//    墨线层不动。用法：把平涂+网点组成的「色版层」包进 <Misregister>，墨线层画在外层。
// ============================================================================
export const Misregister: React.FC<{dx?: number; dy?: number; children?: React.ReactNode; style?: React.CSSProperties}> =
({dx = 4, dy = 3, children, style}) => (
  <div style={{transform: `translate(${dx}px, ${dy}px)`, ...style}}>{children}</div>
);
