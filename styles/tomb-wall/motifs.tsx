import React from 'react';

// ============================================================================
// tomb-wall 动态母题（阿顿光线末端小手／圣甲虫推日球／埃及程式人物／金框标题）
// 技法借鉴 huashu-art-motion scripts/engine/scenes/02_egypt.js (MIT)，Remotion/TSX 重写：
// · 小手开合 0.4s 周期（open=0.5+0.5·sin(2πf/12+k·0.9)，手指张角随 open）
// · 光线沿扇形依次伸缩（0.45s，相位 −0.55k）＋末端 ±2px 微颤
// · 圣甲虫推日球：匀速循环＋滚动角=球心x/半径＋腿两套姿态 floor(f/2)%2
// · 人物埃及程式：侧脸＋正面眼（kohl 眼线 3.2px 后拖 18px）＋正面双肩；近臂 ik2 肩点=前肩、
//   手托杯脚（短板修正：静帧肘自然下垂）
// 全解析时间函数，确定性；帧号 1 起含端点。
// ============================================================================
import {TW, W, H, clamp01, mx, mulberry32, GlyphSprite, type GlyphInst} from './kit';

// ---------------- 阿顿小手（局部坐标，group scale 出 720p 尺寸） ----------------
export const RayHand: React.FC<{ x: number; y: number; ang: number; open: number; s?: number }> = ({x, y, ang, open, s = 0.62}) => {
  const fing: React.ReactNode[] = [];
  for (let k = 0; k < 4; k++) {
    const a = (k - 1.5) * (0.03 + open * 0.42);
    const x1 = Math.cos(a) * 5, y1 = Math.sin(a) * 5;
    const x2 = Math.cos(a) * (12.5 + open * 1.5), y2 = Math.sin(a) * (12.5 + open * 1.5);
    fing.push(<line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={TW.handDark} strokeWidth={8.4} strokeLinecap="round" />);
    fing.push(<line key={`c${k}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={TW.hand} strokeWidth={5} strokeLinecap="round" />);
  }
  const hs = 0.9 + 0.3 * open;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((ang * 180) / Math.PI).toFixed(1)}) scale(${s})`}>
      <g transform={`scale(${hs.toFixed(3)})`}>
        {fing}
        <line x1={1} y1={-5} x2={5} y2={-10 - open * 3} stroke={TW.handDark} strokeWidth={8} strokeLinecap="round" />
        <line x1={1} y1={-5} x2={5} y2={-10 - open * 3} stroke={TW.hand} strokeWidth={4.8} strokeLinecap="round" />
        <ellipse cx={0} cy={0} rx={8} ry={6.6} fill={TW.hand} stroke={TW.handDark} strokeWidth={1.8} />
        <line x1={-9} y1={0} x2={-14} y2={0} stroke={TW.hand} strokeWidth={6} strokeLinecap="round" />
      </g>
    </g>
  );
};

// ---------------- 窗内：日盘脉动＋13 条光线＋末端小手开合（0.4s） ----------------
const DISK: [number, number] = [387, 177];
const HANDS: Array<[number, number]> = [
  [296, 215], [291, 239], [285, 268], [293, 308], [297, 339], [328, 341], [359, 332],
  [408, 313], [453, 301], [475, 283], [488, 260], [497, 237], [499, 217],
];
const ankhAt = (x: number, y: number, s: number, col: string, glow = 0): React.ReactNode =>
  <GlyphSprite q={{n: 'ankh', x, y, s, col, ph: 0} as GlyphInst} glow={glow} />;

export const AtenRays: React.FC<{ f: number; fromF?: number; flareF?: number }> = ({f, fromF, flareF}) => {
  const pu = 0.5 + 0.5 * Math.sin((f * Math.PI * 2) / 13.5);          // 日盘脉动 0.45s
  let fl = 0;
  if (flareF !== undefined) fl = clamp01((f - flareF) / 2) * (1 - clamp01((f - flareF - 14) / 12));
  const t = f / 30;
  const rays: React.ReactNode[] = [];
  HANDS.forEach(([hx, hy], k) => {
    const grow = fromF === undefined ? 1 : clamp01((f - (fromF + k * 1.1)) / 7);
    if (grow <= 0) return;
    const ext = (1 + 0.09 * Math.sin((f * Math.PI * 2) / 13.5 - k * 0.55)) * grow;
    let ex = DISK[0] + (hx - DISK[0]) * ext, ey = DISK[1] + (hy - DISK[1]) * ext;
    ex = Math.min(Math.max(ex, 285), 501); ey = Math.min(ey, 341);
    const wx = ex + Math.sin(t * 7 + k * 1.3) * 2, wy = ey + Math.cos(t * 6 + k) * 1.4;
    const ang = Math.atan2(wy - DISK[1], wx - DISK[0]);
    let open = 0.5 + 0.5 * Math.sin((f * Math.PI * 2) / 12 + k * 0.9);  // 小手开合 0.4s
    open = open + (1 - open) * fl;
    rays.push(
      <g key={k}>
        <line x1={DISK[0] + Math.cos(ang) * 29.3} y1={DISK[1] + Math.sin(ang) * 29.3}
          x2={wx - Math.cos(ang) * 4} y2={wy - Math.sin(ang) * 4}
          stroke={TW.rayRed} strokeWidth={Math.max(1.2, 1.5 + 1.05 * ((ext - 0.91) / 0.18)).toFixed(2)} strokeLinecap="round" />
        <RayHand x={wx} y={wy} ang={ang} open={clamp01(open)} />
      </g>,
    );
  });
  const spark: React.ReactNode[] = [];
  const rs = mulberry32(245);
  for (let i = 0; i < 16; i++) {
    const sx = 285 + rs() * 215, sy = 150 + rs() * 190;
    const tw = Math.sin(f * 0.7 + i * 2.3);
    spark.push(<circle key={i} cx={sx} cy={sy} r={1.2 + rs() * 1.3} fill={TW.goldL} opacity={(fl * (0.4 + 0.6 * Math.abs(tw))).toFixed(2)} />);
  }
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <radialGradient id="tw-halo">
          <stop offset="0%" stopColor="#ffb450" stopOpacity={Number((0.5 * pu + 0.12 + 0.3 * fl).toFixed(3))} />
          <stop offset="100%" stopColor="#ffaa46" stopOpacity={0} />
        </radialGradient>
      </defs>
      <clipPath id="tw-win"><rect x={272} y={133} width={243} height={220} /></clipPath>
      <g clipPath="url(#tw-win)">
        <circle cx={DISK[0]} cy={DISK[1]} r={(44.7 + 20 * pu + 26 * fl).toFixed(1)} fill="url(#tw-halo)" />
        <circle cx={DISK[0]} cy={DISK[1]} r={(34.7 + 4 * pu + 40 * fl).toFixed(1)} fill="none"
          stroke={`rgba(255,214,110,${(0.75 * pu + 0.25 * fl).toFixed(2)})`} strokeWidth={3.3} />
        <circle cx={DISK[0]} cy={DISK[1]} r={31} fill={TW.diskRed} stroke={TW.diskDark} strokeWidth={2} />
        <circle cx={DISK[0]} cy={DISK[1]} r={25.3} fill="none" stroke="rgba(255,200,150,.35)" strokeWidth={1.3} />
        <ellipse cx={387} cy={200} rx={4.7} ry={6.7} fill={TW.gold} stroke={TW.black} strokeWidth={1.1} />
        <path d="M 387 193 Q 395 203 387 212" fill="none" stroke={TW.gold} strokeWidth={2.7} strokeLinecap="round" />
        {rays}
        {ankhAt(387, 221, 0.28, TW.blue)}
        {fl > 0.02 ? ankhAt(387, 221, 0.3 + 0.1 * fl, TW.goldL, fl) : null}
        {spark}
      </g>
    </svg>
  );
};

// ---------------- 两条长光线（伸到供桌上方，末端小手＋安卡） ----------------
const LONG: Array<[number, number, number]> = [[300, 470, 20], [748, 410, 21]];
export const LongRays: React.FC<{ f: number }> = ({f}) => {
  const t = f / 30;
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
      {LONG.map(([x, y, k]) => {
        const wx = x + Math.sin(t * 7 + k * 1.3) * 2, wy = y + Math.cos(t * 6 + k) * 1.4;
        const ang = Math.atan2(wy - DISK[1], wx - DISK[0]);
        const open = clamp01(0.5 + 0.5 * Math.sin((f * Math.PI * 2) / 12 + k * 0.9));
        return (
          <g key={k}>
            <line x1={mx(DISK[0], wx, 0.62)} y1={mx(DISK[1], wy, 0.62)} x2={wx - Math.cos(ang) * 4} y2={wy - Math.sin(ang) * 4}
              stroke={TW.rayRed} strokeWidth={1.7} strokeLinecap="round" />
            <RayHand x={wx} y={wy} ang={ang} open={open} />
            {ankhAt(wx + Math.cos(ang) * 10.7, wy + Math.sin(ang) * 10.7 + 2.7, 0.24, TW.blue)}
          </g>
        );
      })}
    </svg>
  );
};

// ---------------- 圣甲虫推日球（青金石蓝＋绿松石鞘翅；红日球黄点滚动） ----------------
export const scarabX = (f: number) => {
  const raw = -80 + 7.1 * (f - 100);
  return ((((raw + 120) % 1520) + 1520) % 1520) - 120;
};
export const Scarab: React.FC<{ f: number }> = ({f}) => {
  if (f < 108) return null;
  const x = scarabX(f);
  if (x < -110 || x > 1300) return null;
  const y = 700, br = 18.7, bx = x + 36, rot = bx / br, pose = Math.floor(f / 2) % 2, S = 0.813;
  const legs = pose
    ? [[-14, -16, -26], [0, -18, -6], [14, -14, 18]]
    : [[-14, -14, -32], [0, -19, 2], [14, -18, 24]];
  const dots: React.ReactNode[] = [];
  for (let k = 0; k < 9; k++) {
    if (k % 3 === 0 && k) continue;
    const a = rot + k * 0.698, rr = k % 3 === 0 ? 0 : 14;
    dots.push(<circle key={k} cx={(54 + Math.cos(a) * rr).toFixed(1)} cy={(-2 + Math.sin(a) * rr * 0.9).toFixed(1)} r={3.6} fill="#f2c23a" />);
  }
  const legPaths: React.ReactNode[] = [];
  legs.forEach(([lx, ly, ex], i) => {
    for (const s of [-1, 1]) {
      const q = s * (i === 1 ? 1 : pose ? 1 : -1);
      legPaths.push(<path key={`${i}${s}`} d={`M ${lx} 0 L ${lx + (ex - lx) * 0.5} ${s * (ly - 4)} L ${ex + q * 2} ${s * (ly + 4)}`}
        fill="none" stroke="#141a30" strokeWidth={4.5} strokeLinecap="round" />);
    }
  });
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
      <g transform={`translate(${x.toFixed(1)} ${y}) scale(${S})`}>
        {/* 日球：红底＋黄点随滚动（clip 在球内） */}
        <clipPath id="tw-ball"><circle cx={54} cy={-2} r={br / 0.813} /></clipPath>
        <circle cx={54} cy={-2} r={br / 0.813} fill="#c8302a" stroke="#3a0c08" strokeWidth={3.3} />
        <g clipPath="url(#tw-ball)">{dots}</g>
        {legPaths}
        <path d={`M 26 -4 L ${54 - br / 0.813 + 2} ${-12 + pose * 3} M 26 4 L ${54 - br / 0.813 + 1} ${8 - pose * 3}`}
          fill="none" stroke="#141a30" strokeWidth={4.5} strokeLinecap="round" />
        {/* 身体：青金石蓝＋绿松石鞘翅高光 */}
        <ellipse cx={-4} cy={0} rx={24} ry={17} fill={TW.lapis} stroke="#0d1430" strokeWidth={3.3} />
        <line x1={-28} y1={0} x2={18} y2={0} stroke="#0d1430" strokeWidth={3.3} strokeLinecap="round" />
        <ellipse cx={-8} cy={-8} rx={12} ry={4} fill={TW.turq} />
        <ellipse cx={-8} cy={8} rx={12} ry={4} fill={TW.turq} />
        <ellipse cx={22} cy={0} rx={8} ry={11} fill="#3a68c4" stroke="#0d1430" strokeWidth={3.3} />
        <circle cx={25} cy={0} r={3} fill={TW.gold} />
      </g>
    </svg>
  );
};

// ---------------- 埃及程式人物（侧脸正面眼＋正面双肩；端杯肘下垂＝短板修正） ----------------
const ik2 = (S: number[], Hd: number[], L1: number, L2: number, side: number): number[] => {
  const dx = Hd[0] - S[0], dy = Hd[1] - S[1];
  let d = Math.hypot(dx, dy);
  d = Math.min(Math.max(d, Math.abs(L1 - L2) + 1), L1 + L2 - 1);
  const a1 = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const dir = Math.atan2(dy, dx) + side * a1;
  return [S[0] + Math.cos(dir) * L1, S[1] + Math.sin(dir) * L1];
};
const taper = (A: number[], B: number[], w1: number, w2: number) => {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  return `M ${(A[0] + nx * w1).toFixed(1)} ${(A[1] + ny * w1).toFixed(1)} L ${(B[0] + nx * w2).toFixed(1)} ${(B[1] + ny * w2).toFixed(1)} L ${(B[0] - nx * w2).toFixed(1)} ${(B[1] - ny * w2).toFixed(1)} L ${(A[0] - nx * w1).toFixed(1)} ${(A[1] - ny * w1).toFixed(1)} Z`;
};
const armBand = (A: number[], B: number[], q: number, w: number) => {
  const x = mx(A[0], B[0], q), y = mx(A[1], B[1], q);
  const a = Math.atan2(B[1] - A[1], B[0] - A[0]) + Math.PI / 2;
  return {x1: x + Math.cos(a) * w, y1: y + Math.sin(a) * w, x2: x - Math.cos(a) * w, y2: y - Math.sin(a) * w};
};
const FX = 870, FY = 599; // 人物脚底锚点（地面线上）

export const Priestess: React.FC<{ f: number }> = ({f}) => {
  const bb = -1.2 * Math.sin((f * Math.PI * 2) / 100);          // 呼吸
  const bob = 1.5 * Math.sin((f * Math.PI * 2) / 80);           // 杯微浮
  const blink = ((f + 60) % 137) < 4;
  const S = [-38, -276 + bb];
  const Hd = [-80, -248 + bob];                                  // 手托杯脚
  const E = ik2(S, Hd, 48, 52, 1);                               // 肘自然下垂（肩点=前肩）
  const tilt = -0.08 + 0.02 * Math.sin((f * Math.PI * 2) / 80);
  const P_SKIRT = 'M -42 -195 C -60 -160 -88 -90 -92 -10 L -78 0 L 70 0 L 80 -12 C 74 -80 62 -150 52 -195 Z';
  const P_TORSO = 'M -46 -283 L 62 -287 C 66 -258 60 -225 52 -197 L -44 -197 C -52 -226 -52 -256 -46 -283 Z';
  const P_WIG = 'M -18 -366 C -28 -340 -26 -300 -14 -262 L -4 -248 L 44 -240 C 54 -284 52 -330 40 -356 C 28 -372 6 -377 -6 -372 Z';
  const wigLines: React.ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    const x0 = -16 + i * 7.3;
    const yEnd = (i < 3 ? -280 : -240) - ((i * 37) % 23) * 0.7;
    const pts: string[] = [];
    for (let y = -368; y <= yEnd; y += 6) pts.push(`L ${(x0 + (y > -280 ? (y + 280) * 0.06 : 0)).toFixed(1)} ${y}`);
    const pd = `M ${x0} -368 ` + pts.join(' ');
    wigLines.push(<g key={i}>
      <path d={pd} fill="none" stroke={TW.wigD} strokeWidth={7.7} strokeLinecap="round" />
      <path d={pd} fill="none" stroke={i % 3 === 1 ? TW.goldL : TW.gold} strokeWidth={5.7} strokeLinecap="round" />
      {pts.map((_, k) => {
        if (k === 0) return null;
        const yy = -368 + k * 6, xx = x0 + (yy > -280 ? (yy + 280) * 0.06 : 0);
        const side = k % 2 ? 1 : -1;
        return <line key={k} x1={(xx - 2.8).toFixed(1)} y1={(yy - 2 * side).toFixed(1)} x2={(xx + 2.8).toFixed(1)} y2={(yy + 2 * side).toFixed(1)} stroke="#8a5a12" strokeWidth={0.9} />;
      })}
    </g>);
  }
  const bands: Array<[string, number, number]> = [[TW.blue, 33, 16], [TW.red, 40, 21], [TW.green, 47, 26], [TW.gold, 53, 32], [TW.blue, 59, 37]];
  const drops: React.ReactNode[] = [];
  for (let a = 0.2; a < Math.PI - 0.15; a += 0.32) {
    const x = 6 + Math.cos(a) * 66, y = -270 + Math.sin(a) * 44;
    drops.push(<path key={a.toFixed(2)} d={`M ${x - 2.7} ${y - 4} Q ${x - 3.3} ${y + 2.7} ${x} ${y + 4.7} Q ${x + 3.3} ${y + 2.7} ${x + 2.7} ${y - 4} Z`}
      fill={Math.round(a / 0.32) % 2 ? TW.red : TW.blue} stroke={TW.line} strokeWidth={0.7} />);
  }
  const b1 = armBand(S, E, 0.4, 12.7), b2 = armBand(E, Hd, 0.8, 8.7);
  const ex = -6, ey = -338 + bb; // 正面眼
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
      <g transform={`translate(${FX} ${FY})`}>
        {/* 远侧臂（ viewer 右侧，搭在身前） */}
        <path d={taper([52, -272 + bb], [58, -196 + bb], 12, 9)} fill={TW.skin} stroke={TW.line} strokeWidth={1.6} />
        <path d={taper([58, -196 + bb], [20, -142 + bb], 9, 6.5)} fill={TW.skin} stroke={TW.line} strokeWidth={1.6} />
        <ellipse cx={16} cy={-138 + bb} rx={9} ry={6} fill={TW.skin} stroke={TW.line} strokeWidth={1.4} />
        {/* 裙＋躯干：肤色打底，罩白亚麻（alpha .9 透肤色） */}
        <path d={P_SKIRT} fill={TW.skin} />
        <path d={P_TORSO} fill={TW.skin} />
        <g fill={TW.white} opacity={0.9}><path d={P_SKIRT} /><path d={P_TORSO} /></g>
        {/* 裙身扇形细褶（clip 在裙里） */}
        <clipPath id="tw-skirt"><path d={P_SKIRT} /></clipPath>
        <g clipPath="url(#tw-skirt)">
          {[...Array(18)].map((_, i) => {
            const a = i / 17;
            const x0 = mx(-40, 50, a);
            return <path key={i} d={`M ${x0.toFixed(1)} -195 C ${(x0 - 26).toFixed(1)} -140 ${(x0 - 52).toFixed(1)} -70 ${(x0 - 70).toFixed(1)} -2`} fill="none" stroke="rgba(120,96,70,.5)" strokeWidth={0.9} />;
          })}
          <path d="M -55 -142 Q 4 -132 58 -146" fill="none" stroke="rgba(90,60,40,.55)" strokeWidth={1.2} />
        </g>
        <clipPath id="tw-torso"><path d={P_TORSO} /></clipPath>
        <g clipPath="url(#tw-torso)">
          {[...Array(16)].map((_, i) => {
            const x = -40 + i * 6;
            return <path key={i} d={`M ${x} -283 Q ${x + 4} -240 ${x + 1.3} -199`} fill="none" stroke="rgba(120,96,70,.45)" strokeWidth={0.8} />;
          })}
        </g>
        <path d={P_SKIRT} fill="none" stroke={TW.line} strokeWidth={1.6} />
        <path d={P_TORSO} fill="none" stroke={TW.line} strokeWidth={1.6} />
        {/* 腰带＋垂尾 */}
        <path d="M -44 -197 Q 4 -187 52 -199" fill="none" stroke={TW.red} strokeWidth={4} />
        <path d="M -36 -194 L -44 -150 M -26 -192 L -32 -146" fill="none" stroke={TW.red} strokeWidth={2.7} strokeLinecap="round" />
        {/* 颈 */}
        <path d="M -8 -300 L 12 -300 L 16 -282 L -12 -282 Z" fill={TW.skin} stroke={TW.line} strokeWidth={1.5} />
        {/* 宽领项圈（同心色带＋水滴坠） */}
        {bands.slice().reverse().map(([col, rx, ry], i) => (
          <path key={i} d={`M ${6 - rx} -270 A ${rx} ${ry} 0 0 1 ${6 + rx} -270 Z`} fill={col} stroke={TW.line} strokeWidth={0.6} />
        ))}
        {drops}
        {/* 假发＋分节编发 */}
        <path d={P_WIG} fill={TW.wig} />
        <clipPath id="tw-wig"><path d={P_WIG} /></clipPath>
        <g clipPath="url(#tw-wig)">{wigLines}</g>
        <path d={P_WIG} fill="none" stroke={TW.line} strokeWidth={1.6} />
        {/* 金发箍＋后垂带 */}
        <path d="M -18 -360 Q 2 -370 36 -352" fill="none" stroke={TW.line} strokeWidth={10} strokeLinecap="round" />
        <path d="M -18 -360 Q 2 -370 36 -352" fill="none" stroke={TW.gold} strokeWidth={7.3} strokeLinecap="round" />
        <path d="M -18 -360 Q 2 -370 36 -352" fill="none" stroke={TW.goldL} strokeWidth={2} strokeLinecap="round" />
        <polygon points="36,-352 50,-306 42,-300 30,-344" fill={TW.gold} stroke={TW.line} strokeWidth={1.2} />
        {/* 脸（侧脸轮廓）＋耳＋金耳环 */}
        <path d="M -2 -368 C -12 -364 -16 -356 -18 -348 L -16 -344 L -20 -338 L -26 -326 L -18 -322 L -19 -318 L -17 -314 L -14 -308 L -4 -300 L 10 -304 L 22 -306 L 28 -336 C 30 -352 16 -366 -2 -368 Z"
          fill={TW.skin} stroke={TW.line} strokeWidth={1.6} strokeLinejoin="round" />
        <ellipse cx={16} cy={-330} rx={4.5} ry={7} fill={TW.skin} stroke={TW.line} strokeWidth={1.2} />
        <circle cx={16} cy={-310} r={6} fill={TW.gold} stroke={TW.line} strokeWidth={1.2} />
        <circle cx={16} cy={-310} r={2.3} fill={TW.red} />
        {/* 正面眼＋kohl 眼线 3.2px 后拖 18px＋长眉＋唇 */}
        {blink
          ? <path d={`M ${ex - 11} ${ey} Q ${ex} ${ey + 4} ${ex + 12} ${ey}`} fill="none" stroke={TW.line} strokeWidth={2} strokeLinecap="round" />
          : <g>
            <path d={`M ${ex - 11} ${ey} Q ${ex} ${ey - 9} ${ex + 12} ${ey - 1} Q ${ex} ${ey + 6} ${ex - 11} ${ey} Z`} fill="#fbf7ee" />
            <circle cx={ex - 1} cy={ey - 1.5} r={2.8} fill="#1a120c" />
          </g>}
        <path d={`M ${ex - 12} ${ey} Q ${ex} ${ey - 10} ${ex + 12} ${ey - 1} L ${ex + 30} ${ey - 3}`} fill="none" stroke="#140c08" strokeWidth={3.2} strokeLinecap="round" />
        <path d={`M ${ex - 10} ${ey + 1} Q ${ex} ${ey + 6} ${ex + 14} ${ey + 1}`} fill="none" stroke="#140c08" strokeWidth={1.2} strokeLinecap="round" />
        <path d={`M ${ex - 12} ${ey - 12} Q ${ex + 4} ${ey - 19} ${ex + 26} ${ey - 12}`} fill="none" stroke="#140c08" strokeWidth={2} strokeLinecap="round" />
        <polygon points="-20,-316 -14,-317 -15,-312" fill={TW.lip} />
        {/* 近侧臂：前肩→肘（自然下垂）→手托杯脚 */}
        <path d={taper(S, E, 14, 10)} fill={TW.skin} stroke={TW.line} strokeWidth={2.2} />
        <path d={taper(E, Hd, 10, 7)} fill={TW.skin} stroke={TW.line} strokeWidth={2.2} />
        <line x1={b1.x1} y1={b1.y1} x2={b1.x2} y2={b1.y2} stroke={TW.gold} strokeWidth={5.3} strokeLinecap="round" />
        <line x1={b1.x1} y1={b1.y1} x2={b1.x2} y2={b1.y2} stroke={TW.blue} strokeWidth={1.7} strokeLinecap="round" />
        <line x1={b2.x1} y1={b2.y1} x2={b2.x2} y2={b2.y2} stroke={TW.gold} strokeWidth={4} strokeLinecap="round" />
        <line x1={b2.x1} y1={b2.y1} x2={b2.x2} y2={b2.y2} stroke={TW.blue} strokeWidth={1.4} strokeLinecap="round" />
        {/* 手（托杯脚）＋蓝莲花杯 */}
        <ellipse cx={Hd[0] + 1} cy={Hd[1] - 1} rx={11} ry={8} fill={TW.skin} stroke={TW.line} strokeWidth={1.5} />
        <line x1={Hd[0] - 8} y1={Hd[1] + 1} x2={Hd[0] + 8} y2={Hd[1] + 2} stroke={TW.line} strokeWidth={0.8} />
        <g transform={`translate(${Hd[0]} ${Hd[1] - 33}) rotate(${((tilt * 180) / Math.PI).toFixed(1)})`}>
          <path d="M -17 0 Q -15 17 -3 23 L -2.7 29 Q -9 30.7 -9 33 L 9 33 Q 9 30.7 2.7 29 L 3 23 Q 15 17 17 0 Z"
            fill="#2f62c4" stroke={TW.line} strokeWidth={1.5} />
          {[[-14, 1, -4, 20], [0, 0.7, 0, 21.3], [14, 1, 4, 20]].map(([a, b, x2, y2], i) => (
            <path key={i} d={`M ${a} ${b} Q ${(a + x2) / 2 + (a < 0 ? -2.7 : a > 0 ? 2.7 : 0)} 12 ${x2} ${y2}`} fill="none" stroke="#8ab8f0" strokeWidth={1.1} />
          ))}
          <ellipse cx={0} cy={0} rx={17} ry={3} fill="#1c3f8a" stroke={TW.line} strokeWidth={1.2} />
        </g>
        {/* 赤足 */}
        <path d="M -60 -14 C -62 -6 -58 0 -48 0 L -30 0 C -26 -4 -30 -12 -38 -16 Z" fill={TW.skin} stroke={TW.line} strokeWidth={1.5} />
        <path d="M -42 -16 C -45 -9 -41 -4 -32 -4 L -18 -4 C -14 -8 -18 -14 -24 -18 Z" fill={TW.skinD} stroke={TW.line} strokeWidth={1.4} />
      </g>
    </svg>
  );
};

// ---------------- 金框标题（SC01 钩子后拍入） ----------------
export const Title: React.FC<{ f: number }> = ({f}) => {
  const u1 = clamp01((f - 14) / 6), u2 = clamp01((f - 18) / 5);
  if (f < 14) return null;
  const scale = (0.86 + 0.14 * u1).toFixed(3);
  return (
    <div style={{position: 'absolute', left: 700, top: 172, width: 335, transform: `scale(${scale})`, transformOrigin: '50% 50%', zIndex: 30}}>
      <div style={{position: 'absolute', inset: 0, background: 'rgba(242,234,214,.94)', border: `3px solid ${TW.goldD}`, borderRadius: 14, boxShadow: `inset 0 0 0 3px ${TW.goldL}`}} />
      <svg width={30} height={56} style={{position: 'absolute', left: 10, top: 12, opacity: u2}}>
        <GlyphSprite q={{n: 'ankh', x: 15, y: 26, s: 0.42, col: TW.blue, ph: 0} as GlyphInst} />
      </svg>
      <svg width={30} height={56} style={{position: 'absolute', right: 10, top: 12, opacity: u2}}>
        <GlyphSprite q={{n: 'scarab', x: 15, y: 27, s: 0.55, col: TW.lapis, ph: 0} as GlyphInst} />
      </svg>
      <div style={{position: 'relative', textAlign: 'center', padding: '14px 10px 12px'}}>
        <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900, fontSize: 38, letterSpacing: 3, color: TW.line, lineHeight: 1.2, whiteSpace: 'nowrap'}}>
          推太阳的圣甲虫
        </div>
        <div style={{marginTop: 4, fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 6, color: TW.rule, opacity: u2}}>
          古埃及神话 · 日出由来
        </div>
      </div>
    </div>
  );
};

// ---------------- 挂毯竖条落下回弹转场（章节缝唯一转场；借鉴源挂毯条隐喻，TSX 重写） ----------------
const STRIP_N = 14, STRIP_W = W / STRIP_N, STRIP_H = H * 1.16;
const backInStrip = (u: number) => { const c1 = 1.5, c3 = c1 + 1; return c3 * u * u * u - c1 * u * u; };
const Strip: React.FC<{ i: number; y: number; squash: number }> = ({i, y, squash}) => (
  <div style={{position: 'absolute', left: i * STRIP_W, top: 0, width: STRIP_W + 0.6, height: STRIP_H,
    transform: `translateY(${y.toFixed(1)}px) scaleY(${squash.toFixed(3)})`, transformOrigin: '50% 100%'}}>
    <div style={{position: 'absolute', inset: 0, background: i % 2 ? TW.navy : TW.navy2}} />
    <div style={{position: 'absolute', left: '30%', top: 0, bottom: 0, width: 2, background: 'rgba(0,0,0,.35)'}} />
    <div style={{position: 'absolute', left: '68%', top: 0, bottom: 0, width: 2, background: 'rgba(90,100,140,.25)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 12, height: 2.5, background: TW.goldD}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 9, background: TW.gold}} />
  </div>
);
/** s=盖满帧：f∈[s-11,s] 竖条依次落下回弹盖入；f∈[s+1,s+20] 依次回落揭走 */
export const TapestryWipe: React.FC<{ f: number; s: number }> = ({f, s}) => {
  if (f < s - 11 || f > s + 20) return null;
  const strips: React.ReactNode[] = [];
  for (let i = 0; i < STRIP_N; i++) {
    const cs = s - 11 + Math.floor(i * 0.5);
    const uc = clamp01((f - cs) / 6);
    const landed = f >= cs + 6;
    const squash = landed ? 1 + 0.04 * Math.sin(Math.PI * clamp01((f - cs - 6) / 4)) : 1;
    const yCover = -STRIP_H * (1 - (1 - Math.pow(1 - uc, 3)));
    const rs = s + 1 + Math.floor(i * 0.5);
    const ur = clamp01((f - rs) / 8);
    const yReveal = STRIP_H * 1.04 * backInStrip(ur);
    strips.push(<Strip key={i} i={i} squash={squash} y={f < rs ? yCover : yReveal} />);
  }
  return <div style={{position: 'absolute', inset: 0, zIndex: 50, overflow: 'hidden'}}>{strips}</div>;
};
