import React from 'react';
import {AM, W, mulberry32, WhiteDotRow, DotFlower, Rosette, Palmette, GreekText, PurpleBand} from './kit';

// ============================================================================
// amphora 器形与母题图元（黑釉剪影 + 陶土刻线 + 附加色三件套）
// 技法借鉴 huashu-art-motion scenes/03_greek 配方（MIT），TSX 重写。
// 剪影不描边；黑叠黑处靠 clip 刻线分界（手臂对头部/躯干做刻线，否则糊成一团）。
// ============================================================================

export const CX = 640; // 瓶中轴
/** 瓶身右半轮廓关键点（x 为绝对屏幕坐标；左半镜像）——肩部快速鼓起，腹最大宽 y290-500 */
const PROFILE_R: [number, number][] = [
  [768, 76], [774, 94], [766, 110], [704, 120], [696, 168], [838, 226], [872, 300],
  [868, 420], [860, 502], [780, 566], [706, 590], [698, 624], [748, 640], [758, 662], [744, 674],
];

/** Catmull-Rom → 三次贝塞尔路径（open：不闭合，用于对称拼合） */
export const catmullPath = (pts: [number, number][]): string => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
};

/** 全瓶轮廓（左右镜像闭合） */
export const vaseOutlinePath = (): string => {
  const right = PROFILE_R;
  const left = [...right].reverse().map(([x, y]) => [2 * CX - x, y] as [number, number]);
  return catmullPath([...left, ...right]) + ' Z';
};

/** 瓶面板（鼓面窗口）路径：顶部平直 + 底部随瓶形内收 */
export const panelPath = (): string =>
  'M 446 258 H 834 Q 846 258 846 270 V 408 C 846 474 816 516 754 532 Q 640 550 526 532 C 464 516 434 474 434 408 V 270 Q 434 258 446 258 Z';

/** 双耳（黑釉，左右各一：外弧粗 + 内弧细） */
export const Handle: React.FC<{side: 1 | -1}> = ({side}) => {
  const s = side;
  return (
    <g>
      <path d={`M ${CX + s * 118} 104 C ${CX + s * 208} 118, ${CX + s * 224} 178, ${CX + s * 186} 234`}
        fill="none" stroke={AM.GLAZE} strokeWidth={22} strokeLinecap="round" />
      <path d={`M ${CX + s * 130} 116 C ${CX + s * 196} 132, ${CX + s * 208} 180, ${CX + s * 180} 222`}
        fill="none" stroke={AM.CLAY_LIT} strokeWidth={4} opacity={0.55} />
    </g>
  );
};

/** 瓶口（黑釉口沿椭圆）+ 颈部紫红带 + 白点 */
export const NeckDeco: React.FC = () => (
  <g>
    <ellipse cx={CX} cy={80} rx={126} ry={13} fill={AM.GLAZE} />
    <rect x={CX - 66} y={124} width={132} height={16} fill={AM.PURPLE} />
    <WhiteDotRow x={CX - 52} y={132} n={8} spacing={15} seed={31} />
    <path d={`M ${CX - 62} 176 H ${CX + 62}`} stroke={AM.INCISE} strokeWidth={1.6} opacity={0.8} />
  </g>
);

/** 瓶足射线纹（刻线放射） */
export const FootRays: React.FC = () => (
  <g>
    {Array.from({length: 9}, (_, i) => {
      const a = Math.PI * (0.15 + (0.7 * i) / 8);
      const x1 = CX - 64 * Math.cos(a), y1 = 640 - 16 * Math.sin(a);
      const x2 = CX - 100 * Math.cos(a), y2 = 640 + 6 * Math.sin(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={AM.INCISE} strokeWidth={1.8} />;
    })}
  </g>
);

/** 瓶身竖向光泽（圆柱感，配方 0.09 级；SVG 渐变非滤镜，clip 进瓶轮廓由调用方做） */
export const VaseGloss: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="glossL" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#1b120d" stopOpacity="0" />
        <stop offset="1" stopColor="#1b120d" stopOpacity="0.13" />
      </linearGradient>
      <linearGradient id="glossR" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#1b120d" stopOpacity="0.13" />
        <stop offset="1" stopColor="#1b120d" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="glossHi" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff0d2" stopOpacity="0" />
        <stop offset="0.5" stopColor="#fff0d2" stopOpacity="0.06" />
        <stop offset="1" stopColor="#fff0d2" stopOpacity="0" />
      </linearGradient>
    </defs>
    <rect x={CX - 240} y={60} width={90} height={620} fill="url(#glossL)" />
    <rect x={CX + 152} y={60} width={92} height={620} fill="url(#glossR)" />
    <rect x={CX - 118} y={70} width={60} height={600} fill="url(#glossHi)" />
  </g>
);

// ============================================================================
// 海豚（贝塞尔剪影：喙/背鳍/腹鳍/尾叉 + 腹部刻线 + 白眼点；朝右，局部原点=体中心）
// ============================================================================
export const Dolphin: React.FC<{ x: number; y: number; s?: number; rot?: number; flip?: boolean; eye?: boolean }> =
  ({x, y, s = 1, rot = 0, flip = false, eye = true}) => (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((flip ? 180 : 0) + rot).toFixed(2)}) scale(${s})`}>
      <path d="M 36 0 C 30 -7 20 -10 12 -9 C 8 -14 2 -17 -2 -15 C -1 -12 -2 -10 -4 -9
               C -14 -8 -24 -4 -32 -2 L -42 -10 L -37 -1 L -44 5 L -33 3
               C -24 7 -12 9 0 9 C 12 9 22 8 28 5 L 12 6 L 16 14 L 20 6
               C 26 5 32 3 36 0 Z" fill={AM.GLAZE} />
      <path d="M 28 3 C 16 6 -6 6 -26 1" fill="none" stroke={AM.INCISE} strokeWidth={1.7} />
      {eye ? <circle cx={22} cy={-4} r={2.1} fill={AM.WHITE} /> : null}
    </g>
  );

// ============================================================================
// 斜倚人形（短板修正件：INDEX「裙摆偏厚」→ 剪影模式下人物重画薄化、放大 1.45 倍；
// 验收=侧脸剪影下五官刻线可读。直鼻梁连额、细下巴；黑叠黑处（臂对躯干）clip 刻线分界。
// 局部原点=臀部着甲板点；头朝右，身体沿 -x 方向躺）
// ============================================================================
export const Recliner: React.FC<{ x: number; y: number; s?: number; rot?: number }> = ({x, y, s = 1, rot = 0}) => {
  const cid = 'reclinerClip';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot.toFixed(2)}) scale(${s})`}>
      <defs>
        <clipPath id={cid}>
          <path d="M -64 -6 L -60 -18 L -40 -22 L -6 -22 L 22 -44 C 30 -50 40 -48 44 -40
                   C 47 -34 45 -28 40 -24 L 16 -6 Z" />
        </clipPath>
      </defs>
      {/* 腿（薄袍覆盖，贴体收薄）+ 臀 */}
      <path d="M -64 -6 L -60 -18 L -40 -22 L -6 -22 L -8 -6 Z" fill={AM.GLAZE} />
      {/* 上身直立 + 头（希腊侧脸：直鼻梁连额、细下巴、后脑发髻） */}
      <path d="M -40 -22 L -8 -22 C -4 -26 -2 -32 -2 -38 C -2 -46 4 -52 12 -52
               C 20 -52 26 -47 26 -40 L 26 -38 L 22 -36 C 21 -30 18 -26 12 -24
               C 8 -22 2 -20 -2 -18 L -6 -6 L -40 -6 Z" fill={AM.GLAZE} />
      {/* 支撑臂（肘撑膝/甲板，前臂托腮方向）——与躯干重叠处靠刻线分界 */}
      <path d="M -34 -22 C -28 -34 -16 -40 -2 -40 L 2 -32 C -10 -33 -22 -30 -28 -20 Z" fill={AM.GLAZE} />
      <g clipPath={`url(#${cid})`}>
        {/* 侧脸五官刻线（验收件：2px 刻线可读）——额鼻线/眉/杏仁眼/唇/颌 */}
        <path d="M 25 -44 L 21 -40 L 25 -33" fill="none" stroke={AM.INCISE} strokeWidth={2.4} />
        <path d="M 8 -41 C 12 -42.5 17 -42 21 -39.5" fill="none" stroke={AM.INCISE} strokeWidth={1.8} />
        <ellipse cx={13} cy={-38.5} rx={5.4} ry={3} fill={AM.WHITE} />
        <circle cx={15} cy={-38.5} r={1.5} fill={AM.GLAZE} />
        <path d="M 22 -31 C 19 -29.5 16 -29.5 14 -31" fill="none" stroke={AM.INCISE} strokeWidth={1.8} />
        <path d="M 22 -26.5 C 18 -24 13 -24 9 -26.5" fill="none" stroke={AM.INCISE} strokeWidth={1.8} />
        {/* 发髻/后脑刻线 */}
        <path d="M 4 -50 C 8 -53 15 -54 20 -52 M 2 -46 C 8 -49 16 -50 22 -47" fill="none" stroke={AM.INCISE} strokeWidth={1.6} />
        {/* 臂对躯干刻线分界（黑叠黑 clip 分界签名） */}
        <path d="M -2 -40 C -16 -40 -28 -34 -34 -22 L -28 -18 C -22 -29 -12 -34 -2 -33" fill="none" stroke={AM.INCISE} strokeWidth={2.4} />
        {/* 衣褶刻线（薄袍 5 条，越靠臂越短） */}
        {[-58, -50, -42, -34, -26].map((px, i) => (
          <line key={i} x1={px} y1={-8} x2={px + 2} y2={-20 + i * 1.4} stroke={AM.INCISE} strokeWidth={1.6} />
        ))}
        {/* 紫红袍摆带+白点（附加色） */}
        <rect x={-64} y={-10} width={54} height={5.5} fill={AM.PURPLE} />
        <circle cx={-55} cy={-7.2} r={1.9} fill={AM.WHITE} />
        <circle cx={-44} cy={-7.2} r={1.9} fill={AM.WHITE} />
        <circle cx={-33} cy={-7.2} r={1.9} fill={AM.WHITE} />
        <circle cx={-22} cy={-7.2} r={1.9} fill={AM.WHITE} />
      </g>
    </g>
  );
};

// ============================================================================
// 帆船（新月船身 + 蝎尾形船尾 + 白帆紫红缝线 + 紫红船舱 + 斜倚人形 + 桨；
// 局部原点=水线中心，朝右航行）
// ============================================================================
export const Ship: React.FC<{ x: number; y: number; s?: number; rock?: number }> = ({x, y, s = 1, rock = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${rock.toFixed(3)}) scale(${s})`}>
    {/* 桨（左右各一，入水） */}
    <path d="M -150 -4 L -196 16 L -193 21 L -148 3 Z" fill={AM.GLAZE} />
    <path d="M 60 -4 L 30 18 L 34 22 L 64 3 Z" fill={AM.GLAZE} />
    {/* 船身（新月形，黑釉不描边；船体加深保剪影量感） */}
    <path d="M -172 -10 C -130 16 130 16 172 -12 L 150 -18 L -158 -16 Z" fill={AM.GLAZE} />
    {/* 蝎尾形船尾（右舷上卷） */}
    <path d="M 150 -14 C 176 -24 188 -44 184 -64 C 182 -72 174 -74 170 -68 C 176 -52 168 -32 146 -24 Z" fill={AM.GLAZE} />
    {/* 船头撞角（左，微翘） */}
    <path d="M -172 -12 L -188 -26 L -178 -10 Z" fill={AM.GLAZE} />
    {/* 紫红船舱 */}
    <rect x={44} y={-44} width={54} height={32} rx={3} fill={AM.PURPLE} />
    <WhiteDotRow x={52} y={-31} n={3} spacing={14} seed={77} />
    {/* 桅杆 + 白帆 + 紫红缝线 */}
    <rect x={-64} y={-150} width={7} height={142} fill={AM.GLAZE} />
    <path d="M -58 -144 C -20 -150 30 -150 66 -142 L 66 -46 C 30 -40 -20 -40 -58 -48 Z" fill={AM.WHITE} />
    <path d="M -58 -48 C -20 -40 30 -40 66 -46" fill="none" stroke={AM.PURPLE} strokeWidth={2.4} strokeDasharray="7 5" />
    <path d="M -18 -146 L -18 -42 M 24 -147 L 24 -41" fill="none" stroke={AM.PURPLE} strokeWidth={1.7} strokeDasharray="4 6" />
    <path d="M -56 -142 C -20 -148 30 -148 64 -140" fill="none" stroke={AM.INCISE} strokeWidth={1.6} />
    {/* 斜倚人形（短板修正验收件：坐前甲板、背靠船头天空区，头在陶土天区刻线可读） */}
    <Recliner x={-114} y={-16} s={0.85} />
    {/* 船头白点浪花 */}
    <circle cx={-184} cy={-8} r={2} fill={AM.WHITE} />
    <circle cx={-192} cy={-2} r={1.7} fill={AM.WHITE} />
    <circle cx={-186} cy={4} r={1.5} fill={AM.WHITE} />
  </g>
);

// ============================================================================
// 里拉琴（龟壳音箱黑圆+刻线圈+5 刻线小圆；双臂对称曲线；弦 4 根刻线；紫红饰带；
// 以 crossbar 中心为摆轴由调用方 rotate）
// ============================================================================
export const Lyre: React.FC<{ x: number; y: number; s?: number }> = ({x, y, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {/* 双臂（对称曲线，黑釉粗臂） */}
    <path d="M -36 128 C -52 92 -50 40 -40 6" fill="none" stroke={AM.GLAZE} strokeWidth={13} strokeLinecap="round" />
    <path d="M 36 128 C 52 92 50 40 40 6" fill="none" stroke={AM.GLAZE} strokeWidth={13} strokeLinecap="round" />
    {/* 横杆 */}
    <rect x={-52} y={-2} width={104} height={9} rx={4.5} fill={AM.GLAZE} />
    {/* 紫红饰带+白点（系在横杆中点） */}
    <path d="M -2 4 L 0 22 L -7 18 L -12 26 L -14 8 Z" fill={AM.PURPLE} />
    <circle cx={4} cy={10} r={2} fill={AM.WHITE} />
    <circle cx={9} cy={16} r={1.8} fill={AM.WHITE} />
    {/* 弦（刻线 4 根） */}
    {[-19, -6.5, 6.5, 19].map((sx, i) => (
      <line key={i} x1={sx} y1={7} x2={sx} y2={112} stroke={AM.INCISE} strokeWidth={1.8} />
    ))}
    {/* 龟壳音箱（黑圆+刻线圈+5 小圆） */}
    <circle cx={0} cy={140} r={44} fill={AM.GLAZE} />
    <circle cx={0} cy={140} r={32} fill="none" stroke={AM.INCISE} strokeWidth={1.8} />
    {[[0, 118], [-18, 132], [18, 132], [-12, 154], [12, 154]].map(([sx, sy], i) => (
      <circle key={i} cx={sx} cy={sy} r={6} fill="none" stroke={AM.INCISE} strokeWidth={1.6} />
    ))}
    {/* 臂根刻线分界（臂对音箱黑叠黑） */}
    <path d="M -36 122 C -30 130 -22 134 -14 136 M 36 122 C 30 130 22 134 14 136" fill="none" stroke={AM.INCISE} strokeWidth={1.7} />
  </g>
);

// ============================================================================
// 浪带（跑波纹单元，黑釉折线绕瓶一周；bob 由调用方 translate）
// ============================================================================
export const WaveBand: React.FC<{ y: number; x0?: number; w: number; unit?: number; t?: number }> =
  ({y, x0 = 0, w, unit = 42, t = 0}) => {
    const n = Math.ceil(w / unit) + 1;
    return (
      <g>
        {Array.from({length: n}, (_, i) => {
          const x = x0 + i * unit - (t % unit);
          return (
            <path key={i} d={`M ${x} ${y} C ${x + 8} ${y - 17}, ${x + 21} ${y - 17}, ${x + 27} ${y - 3}
                              C ${x + 30} ${y + 3}, ${x + 35} ${y + 3}, ${x + 38} ${y - 3}`}
              fill="none" stroke={AM.GLAZE} strokeWidth={4} strokeLinecap="round" />
          );
        })}
      </g>
    );
  };

// ============================================================================
// 鼓面（滚筒）运动：P(f) 累计位移。整片匀速漂移 14px/s + 三次转面 367.9px
// （=面宽 420 − 漂移补偿，使每次转面后新面回中）+ f321-332 easeOut 减速收 2.57px。
// 终点 P≈1260 → 定帧窗口恰对里拉面中心、铭文面（初始面）自右缘回入=「绕瓶一周」。
// ============================================================================
export const FACE_W = 420;
export const STRIP_W = FACE_W * 4; // 四面：0 铭文 / 1 帆船 / 2 海豚 / 3 里拉琴
export const drumP = (f: number): number => {
  const driftEnd = Math.min(f, 321);
  let p = (14 * (driftEnd - 1)) / 30;
  if (f > 321) p += 2.57 * (1 - Math.pow(1 - Math.min(1, (f - 321) / 11), 3)); // 减速尾巴
  const turn = (a: number, b: number, amt: number) =>
    amt * (1 - Math.pow(1 - Math.min(1, Math.max(0, (f - a) / (b - a))), 2));
  // 转面①②=367.9（面宽 420−漂移补偿，转完新面回中）；转面③=405（多转 37px，
  // 让定帧时初始铭文面自面板右缘探入≈29px=「故事绕瓶一周」视觉收拢，里拉面略偏左为构图取舍）
  p += turn(96, 118, 367.9) + turn(210, 222, 367.9) + turn(273, 283, 405);
  return p;
};
/** 面基址 → 屏幕 x（strip 坐标 s → 屏幕 = s − P + 430，面板左缘 434≈430+4） */
export const faceScreenX = (base: number, p: number, k: number) => base + k * STRIP_W - p + 430;

// ============================================================================
// 浪冠 + 溅花白点（HERO 入水）
// ============================================================================
export const Splash: React.FC<{ x: number; y: number; u: number; seed?: number }> = ({x, y, u, seed = 99}) => {
  const rng = mulberry32(seed);
  return (
    <g>
      {Array.from({length: 11}, (_, i) => {
        const a = rng() * Math.PI * 2;
        const r = 5 + u * (18 + rng() * 18);
        return <circle key={i} cx={x + r * Math.cos(a)} cy={y + r * Math.sin(a) - u * 6} r={2.2 * (1 - u * 0.5)} fill={AM.WHITE} opacity={1 - u} />;
      })}
    </g>
  );
};

/** 面间隔条（紫红竖带+白点列，画在每面左缘，随鼓面滚动扫过=转面可读） */
export const FaceDivider: React.FC<{ x: number; y0?: number; y1?: number }> = ({x, y0 = 6, y1 = 282}) => (
  <g>
    <rect x={x} y={y0} width={16} height={y1 - y0} fill={AM.PURPLE} />
    {Array.from({length: Math.floor((y1 - y0 - 12) / 13)}, (_, i) => (
      <circle key={i} cx={x + 8} cy={y0 + 10 + i * 13} r={2} fill={AM.WHITE} />
    ))}
  </g>
);

/** 组合导出便于 shots 使用 */
export {WhiteDotRow, DotFlower, Rosette, Palmette, GreekText, PurpleBand};
export {W};
