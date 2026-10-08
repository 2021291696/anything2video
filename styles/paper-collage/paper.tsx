// 【候选风格·图纸】paper-collage 图元库 —— Vox 式剪纸拼贴
// 原则：所有形体都是"剪出来贴上去的"——不规则撕边多边形 + 每层纸片投影 + 和纸胶带 +
//       白边斜贴照片 + 虚线剪刀线 + 大标题纸条。没有纯数字线条。
// 随机只用 paperRnd（确定性 hash，fract(sin(i*127.1)*43758.5)），同一 seed 撕边固定；
// 禁 Math.random / Date。纹理全部 CSS 渐变叠加，不下载资源、不用 canvas。
// v4.0 升级：12/6fps 步进时基（K/Q12/Q6/ks）+ jit 手摆抖动 + slap 三帧姿势表——「定格式抽帧」是本卡一眼签名。
// 12/6fps 步进时基 + jit + slap：技法借鉴 mg-styles-15 demos/06-collage (MIT, Vincentwei1021), TSX 重写。

import React from 'react';

// ---- 锁死调色板：paper 桌面底纸 | kraft 牛皮纸 | red 剪纸红 | ink 墨蓝 | mustard 芥末黄（另可用黑白灰）----
export const PAPER_TOKENS = {
  paper: '#f6f1e7',
  kraft: '#d9c6a3',
  red: '#d94f3d',
  ink: '#274060',
  mustard: '#e0a63c',
} as const;

export const FONT_PAPER = `'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', sans-serif`;

// ---- 确定性伪随机 [0,1)：paperRnd(i) = fract(sin(i*127.1)*43758.5) ----
export const paperRnd = (i: number) => {
  const x = Math.sin(i * 127.1) * 43758.5;
  return x - Math.floor(x);
};
const rnd2 = (i: number) => paperRnd(i) * 2 - 1; // [-1,1]

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
/** 回弹缓出（贴纸"按上去"的微小过冲），峰值约 1.10 倍。 */
export const easeOutBack = (t: number) => {
  const u = clamp01(t) - 1;
  const c1 = 1.70158;
  return 1 + (c1 + 1) * u * u * u + c1 * u * u;
};

/** 纸片呼吸：±0.3° 极慢旋转摆动，周期 180–270 帧（6–9s）按 seed 错峰，纯函数、贯穿全片。 */
export const breathe = (n: number, seed: number) =>
  0.3 * Math.sin((n * Math.PI * 2) / (180 + ((seed * 37) % 91)) + seed * 1.93);

// ---- 步进时基三件套 + jit + slap（v4.0）：全卡位移/旋转默认过 12/6fps 量化 + jit ----
// 主体运动拍 12 格/秒，静置件 6fps「boil」，无连续缓动观感——定格抽帧（stop-motion）签名。
/** 12fps 步进序号：K(t) = floor(t*12 + 1e-4)。 */
export const K = (t: number) => Math.floor(t * 12 + 1e-4);
/** 12fps 量化时刻 Q12(t) = K(t)/12——把连续缓动的输入时间换成它即得定格观感（静置件用 Q6）。 */
export const Q12 = (t: number) => K(t) / 12;
/** 6fps 量化时刻（静置件 boil / 桌面相机）。 */
export const Q6 = (t: number) => Math.floor(t * 6 + 1e-4) / 6;
/** cue t0 以来的 12fps 步数（slap 查表用；k=0 恰为拍落命中帧）。 */
export const ks = (t: number, t0: number) => K(t) - Math.round(t0 * 12);
/** 连续缓动 → 12fps 定格采样：q12(t, u => lerp(a, b, easeOutCubic(u)))。 */
export const q12 = (t: number, f: (tq: number) => number) => f(Q12(t));
/** 连续缓动 → 6fps 定格采样（静置件）。 */
export const q6 = (t: number, f: (tq: number) => number) => f(Q6(t));
/** 双种子整型 hash → [0,1)：同一 (a,b) 恒定的确定性抖动源（mg15 06-collage 同款 imul 混合）。 */
export const hashStep = (a: number, b = 0) => {
  let h = (a * 374761393 + b * 668265263 + 1013904223) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
/** 手摆抖动 jit：按 (id, fps 步号) 三轴确定性抖动 → [dx px, dy px, dRot°]。
 *  默认 ±2px/±2px/±0.4°（amp=2，第三轴 = 0.2·amp 度，量级照抄源码）；同一 (id,步) 恒定——手摆不闪。 */
export const jit = (id: number, t: number, amp = 2, fps = 12): [number, number, number] => {
  const k = Math.floor(t * fps + 1e-4);
  return [(hashStep(id, k) * 2 - 1) * amp, (hashStep(id + 71, k) * 2 - 1) * amp, (hashStep(id + 913, k) * 2 - 1) * amp * 0.2];
};
/** boil(moving)：运动件 {amp:2, fps:12}，静置件 {amp:1.1, fps:6}——纸片永远在「活」。 */
export const boil = (moving: boolean): {amp: number; fps: number} => (moving ? {amp: 2, fps: 12} : {amp: 1.1, fps: 6});
/** slap 三帧姿势表：纸片从「镜头前」拍落，恰在 t0 命中桌面（替换帧，无连续缓动）。
 *  null = 未入画（k<-pre）；k<0 空中放大悬置（s=1+0.38u²+0.05u，lift 1→0）；k=0 压扁 0.972（投影塌地）；
 *  k=1 回弹 1.01（lift 0.03）；之后静置 1。 */
export const slap = (t: number, t0: number, pre = 3): {s: number; lift: number; k: number} | null => {
  const k = ks(t, t0);
  if (k < -pre) return null;
  if (k < 0) {
    const u = -k / pre;
    return {s: 1 + 0.38 * u * u + 0.05 * u, lift: u, k};
  }
  if (k === 0) return {s: 0.972, lift: 0, k};
  if (k === 1) return {s: 1.01, lift: 0.03, k};
  return {s: 1, lift: 0, k};
};
/** lift>0（slap 空中悬置）时的投影律：偏移/模糊随 lift 拉大、α 随 lift 加深（mg15 shadow() 律，ink 色系）。 */
export const liftShadow = (lift: number) =>
  `drop-shadow(${(3 + lift * 24).toFixed(1)}px ${(7 + lift * 34).toFixed(1)}px ${(10 + lift * 34).toFixed(1)}px rgba(39,64,96,${(0.28 + 0.08 * Math.min(lift, 1)).toFixed(3)}))`;

export type Pt = [number, number];
type TexKind = 'plain' | 'grain' | 'kraft';
export type {TexKind};

// 纸纹理：径向高光 + 边缘冷调阴影 + 交叉细纤维纹（纯 CSS 渐变，色相全部取自调色板/黑白）
const TEX: Record<TexKind, string> = {
  plain: 'none',
  grain: [
    'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.26), rgba(255,255,255,0) 62%)',
    'radial-gradient(ellipse at 78% 86%, rgba(39,64,96,0.09), rgba(39,64,96,0) 55%)',
    'repeating-linear-gradient(94deg, rgba(39,64,96,0.045) 0 1px, rgba(0,0,0,0) 1px 3px)',
    'repeating-linear-gradient(2deg, rgba(255,255,255,0.07) 0 1px, rgba(0,0,0,0) 1px 4px)',
  ].join(', '),
  kraft: [
    'radial-gradient(ellipse at 25% 18%, rgba(255,255,255,0.25), rgba(255,255,255,0) 55%)',
    'radial-gradient(ellipse at 80% 90%, rgba(39,64,96,0.13), rgba(39,64,96,0) 60%)',
    'repeating-linear-gradient(0deg, rgba(39,64,96,0.06) 0 2px, rgba(0,0,0,0) 2px 6px)',
    'repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0 2px, rgba(0,0,0,0) 2px 7px)',
  ].join(', '),
};

// ---- tornPath(seed,w,h)：撕纸多边形生成器（确定性；点数 ≤24）----
// mode 'all'：四边都撕（纸条/纸片）；mode 'top'：山脊锯齿顶 + 微抖左右侧边（撕纸山峦）。
// 'top' 可选 ridgeN（山脊点数，默认 15）/ sideN（左右侧撕痕点数，默认 2）——
// 默认输出与旧版逐点一致；调大 sideN 换更碎的侧缘撕边（注意总点数 ≤24）。
// v4.0 opt-in：cutMode:'scissor' 剪刀边（huashu 30_matisse P.cut 移植，TSX 重写）——
// 沿四边每 14–24px（步距按 seed 确定）取一点 ±2–2.5px 抖动、直线相连；与撕边互补的
// 「剪刀平直小抖」语义。点数由周长/步距决定（≤24 点契约只约束 tear 撕边模式）。
export const tornPath = (
  seed: number,
  w: number,
  h: number,
  opts: {jitter?: number; per?: number; mode?: 'all' | 'top'; ridge?: number; ridgeN?: number; sideN?: number; cutMode?: 'scissor'} = {},
): Pt[] => {
  const jitter = opts.jitter ?? 7;
  const per = opts.per ?? 3;
  const k = (i: number) => rnd2(seed * 91.7 + i * 13.37) * jitter;
  const pts: Pt[] = [];
  if (opts.cutMode === 'scissor' && opts.mode !== 'top') {
    // 剪刀折线（源 brush.js P.cut：n=max(1,round(L/step))、q=k/n、±amp 抖动；amp=2.5）
    const c: Pt[] = [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ];
    for (let e = 0; e < 4; e++) {
      const [x0, y0] = c[e];
      const [x1, y1] = c[(e + 1) % 4];
      const L = Math.hypot(x1 - x0, y1 - y0);
      const step = 14 + 10 * paperRnd(seed * 7.77 + e * 3.3); // 14–24px 步距（源 14–24 档）
      const n = Math.max(1, Math.round(L / step));
      for (let s = 0; s < n; s++) {
        const q = s / n;
        pts.push([
          x0 + (x1 - x0) * q + rnd2(seed * 5.31 + e * 97.1 + s * 7.7) * 2.5,
          y0 + (y1 - y0) * q + rnd2(seed * 9.13 + e * 131.7 + s * 7.7) * 2.5,
        ]);
      }
    }
    return pts;
  }
  if (opts.mode === 'top') {
    const n = opts.ridgeN ?? 15; // 山脊锯齿点数
    const sideN = opts.sideN ?? 2; // 左右侧撕痕点数
    const ridge = opts.ridge ?? 0.12;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      pts.push([t * w + k(i) * 1.8, h * (ridge + 0.6 * paperRnd(seed * 17.3 + i * 3.31))]);
    }
    for (let s = 1; s <= sideN; s++) {
      pts.push([w + k(106 + s) * 2.2, h * (0.4 + (0.32 * (s - 1)) / Math.max(1, sideN - 1))]); // 右侧撕痕（自脊末下行）
    }
    pts.push([w + k(101) * 0.3, h]); // 右下
    pts.push([w * 0.72 + k(102) * 0.5, h + k(103) * 0.3]);
    pts.push([w * 0.38 + k(104) * 0.5, h + k(105) * 0.3]);
    pts.push([k(106) * 0.3, h]); // 左下
    for (let s = 1; s <= sideN; s++) {
      pts.push([k(108 + s) * 2.2, h * (0.72 - (0.32 * (s - 1)) / Math.max(1, sideN - 1))]); // 左侧撕痕（向脊首闭合）
    }
  } else {
    const c: Pt[] = [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ];
    for (let e = 0; e < 4; e++) {
      const [x0, y0] = c[e];
      const [x1, y1] = c[(e + 1) % 4];
      for (let s = 0; s < per; s++) {
        const t = s / per;
        pts.push([x0 + (x1 - x0) * t + k(e * 10 + s), y0 + (y1 - y0) * t + k(e * 10 + s + 50)]);
      }
    }
  }
  return pts;
};

// ---- zigCircle(seed, box, spikes)：锯齿圆（剪纸太阳）。box = 外接正方形边长，点数 = spikes*2 ----
export const zigCircle = (seed: number, box: number, spikes = 11): Pt[] => {
  const c = box / 2;
  const ro = box * 0.46;
  const ri = box * 0.365;
  const pts: Pt[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const outer = i % 2 === 0;
    const r = (outer ? ro * (1 + 0.045 * paperRnd(seed * 5.7 + i * 2.9)) : ri * (1 + 0.06 * paperRnd(seed * 3.1 + i * 7.7)));
    pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
  }
  return pts;
};

// ---- tornBlob(seed, w, h, n)：撕纸团（云朵），径向抖动椭圆，点数默认 14 ----
export const tornBlob = (seed: number, w: number, h: number, n = 14): Pt[] => {
  const cx = w / 2;
  const cy = h / 2;
  const rx = (w / 2) * 0.9;
  const ry = (h / 2) * 0.82;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const j = 0.86 + 0.22 * paperRnd(seed * 7.7 + i * 5.13);
    pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
  }
  return pts;
};

// ---- triPts(seed, w, h)：撕纸三角形（屋顶），顶点朝上，6 点 ----
export const triPts = (seed: number, w: number, h: number): Pt[] => {
  const k = (i: number) => rnd2(seed * 31.7 + i * 7.77) * 3;
  return [
    [w / 2 + k(1), k(2)],
    [w * 0.74 + k(3) * 0.7, h * 0.5 + k(4)],
    [w + k(5), h + k(6) * 0.7],
    [w * 0.5 + k(7), h + k(8) * 0.7],
    [k(9), h + k(10) * 0.7],
    [w * 0.26 + k(11) * 0.7, h * 0.52 + k(12)],
  ];
};

// ---- clipPoly：像素点 → CSS clip-path polygon（百分比）----
export const clipPoly = (pts: Pt[], w: number, h: number): string =>
  `polygon(${pts.map(([px, py]) => `${((px / w) * 100).toFixed(2)}% ${((py / h) * 100).toFixed(2)}%`).join(', ')})`;

// ---- PaperLayer：纸片组件（任意多边形 + 投影 + 可旋转/缩放/定位，x,y 为画布坐标中心）----
// v4.0：传 t+id 即叠加 jit 手摆抖动（12/6fps 步进恒定）；enter=t0 走 slap 三帧姿势表（定格拍落，
// 替换 easeOutBack 连续 pop）；lift 期间上提 40px·lift、投影走 liftShadow 律。位移连续缓动请把输入时间过 q12(t,…)。
export const PaperLayer: React.FC<{
  pts: Pt[];
  w: number;
  h: number;
  color: string;
  x?: number;
  y?: number;
  rotate?: number;
  scale?: number;
  opacity?: number;
  shadow?: string;
  tex?: TexKind;
  blend?: React.CSSProperties['mixBlendMode'];
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** 当前秒；与 id 配用即启用 jit 手摆 */
  t?: number;
  /** jit 种子（同 id 同步恒定） */
  id?: number;
  /** jit 幅度 px，默认 2（运动件）；静置件 1.1 */
  amp?: number;
  /** jit 步进帧率，默认 12；静置件 6 */
  fps?: number;
  /** slap 入场命中秒 t0；k<-pre 时整片不渲染（尚未拍落） */
  enter?: number;
}> = ({pts, w, h, color, x = w / 2, y = h / 2, rotate = 0, scale = 1, opacity = 1, shadow, tex = 'grain', blend, style, children, t, id, amp = 2, fps = 12, enter}) => {
  const sl = enter !== undefined && t !== undefined ? slap(t, enter) : null;
  if (enter !== undefined && t !== undefined && sl === null) return null;
  const [jx, jy, jr] = t !== undefined && id !== undefined ? jit(id, t, amp, fps) : [0, 0, 0];
  const lift = sl ? sl.lift : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        transform: `translate(${jx}px, ${jy - 40 * lift}px) rotate(${rotate + jr}deg) scale(${scale * (sl ? sl.s : 1)})`,
        filter: shadow ?? (lift > 0 ? liftShadow(lift) : 'drop-shadow(0 7px 10px rgba(39,64,96,0.28))'),
        opacity,
        ...style,
      }}
    >
      <div style={{position: 'absolute', inset: 0, clipPath: clipPoly(pts, w, h), backgroundColor: color, backgroundImage: TEX[tex], mixBlendMode: blend}}>{children}</div>
    </div>
  );
};

// ---- Tape：和纸胶带条（left/top 为中心点；半透明白 + 纤维纹 + 撕边）----
// v4.0：传 t+id 即按「静置件」6fps boil（amp 1.1）微抖——贴死的胶带也在手摆。
export const Tape: React.FC<{
  left: number | string;
  top: number | string;
  w?: number;
  h?: number;
  rotate?: number;
  seed?: number;
  tint?: string;
  opacity?: number;
  /** 当前秒（启用 6fps 静置 boil） */
  t?: number;
  /** jit 种子 */
  id?: number;
}> = ({left, top, w = 92, h = 28, rotate = 0, seed = 1, tint = 'rgba(255,255,255,0.55)', opacity = 1, t, id}) => {
  const pts = React.useMemo(() => tornPath(seed * 3 + 1, w, h, {jitter: 3.5, per: 2}), [seed, w, h]);
  const [jx, jy, jr] = t !== undefined && id !== undefined ? jit(id, t, 1.1, 6) : [0, 0, 0];
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: w,
        height: h,
        transform: `translate(calc(-50% + ${jx}px), calc(-50% + ${jy}px)) rotate(${rotate + jr}deg)`,
        opacity,
        filter: 'drop-shadow(0 2px 3px rgba(39,64,96,0.18))',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: clipPoly(pts, w, h),
          backgroundColor: tint,
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0 7px, rgba(39,64,96,0.05) 7px 13px), linear-gradient(rgba(255,255,255,0.28), rgba(255,255,255,0.05))',
        }}
      />
    </div>
  );
};

// ---- PhotoFrame：白边"照片"斜贴（含两角胶带），内容 children 贴在纸底上 ----
// v4.0：t+id 启用 jit；enter=t0 走 slap（照片整框拍落）；两角胶带继承 6fps 静置 boil。
export const PhotoFrame: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  rotate?: number;
  scale?: number;
  opacity?: number;
  border?: number;
  tapeSeeds?: number[];
  shadow?: string;
  children?: React.ReactNode;
  /** 当前秒；与 id 配用即启用 jit */
  t?: number;
  /** jit 种子 */
  id?: number;
  /** jit 幅度 px，默认 2 */
  amp?: number;
  /** jit 步进帧率，默认 12 */
  fps?: number;
  /** slap 入场命中秒 t0 */
  enter?: number;
}> = ({x, y, w = 340, h = 310, rotate = -3, scale = 1, opacity = 1, border = 20, tapeSeeds = [], shadow, children, t, id, amp = 2, fps = 12, enter}) => {
  const sl = enter !== undefined && t !== undefined ? slap(t, enter) : null;
  if (enter !== undefined && t !== undefined && sl === null) return null;
  const [jx, jy, jr] = t !== undefined && id !== undefined ? jit(id, t, amp, fps) : [0, 0, 0];
  const lift = sl ? sl.lift : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        transform: `translate(${jx}px, ${jy - 40 * lift}px) rotate(${rotate + jr}deg) scale(${scale * (sl ? sl.s : 1)})`,
        filter: shadow ?? (lift > 0 ? liftShadow(lift) : 'drop-shadow(0 12px 16px rgba(39,64,96,0.32))'),
        opacity,
      }}
    >
      <div style={{position: 'absolute', inset: 0, backgroundColor: '#ffffff', backgroundImage: TEX.grain}}>
        <div
          style={{
            position: 'absolute',
            left: border,
            top: border,
            width: w - border * 2,
            height: h - border * 2,
            backgroundColor: PAPER_TOKENS.paper,
            backgroundImage: TEX.grain,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </div>
      {tapeSeeds.map((s, i) => (
        <Tape key={s} left={i === 0 ? 6 : w - 6} top={4} w={88} h={30} rotate={i === 0 ? -44 : 44} seed={s} t={t} id={id !== undefined ? id * 31 + s : undefined} />
      ))}
    </div>
  );
};

// ---- DashedCutLine：虚线剪刀线（progress 0→1 沿线揭示，前端带剪纸小剪刀标记）----
// v4.0：传 t+t0+t1 则行进步进 12fps 定格（Q12 采样，剪刀逐格走线），progress 入参失效；否则用传入 progress。
let cutSeq = 0;
export const DashedCutLine: React.FC<{
  progress: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  markerColor?: string;
  width?: number;
  opacity?: number;
  /** 当前秒；与 t0/t1 配用则内部按 Q12(t) 算定格行进 */
  t?: number;
  /** 剪刀起点秒 */
  t0?: number;
  /** 剪刀终点秒 */
  t1?: number;
}> = ({progress, x1, y1, x2, y2, color = PAPER_TOKENS.ink, markerColor = PAPER_TOKENS.red, width = 3.5, opacity = 1, t, t0, t1}) => {
  const idRef = React.useRef<string>('');
  if (!idRef.current) idRef.current = `pc-cut-${++cutSeq}`;
  const p = t !== undefined && t0 !== undefined && t1 !== undefined && t1 > t0 ? clamp01((Q12(t) - t0) / (t1 - t0)) : clamp01(progress);
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const mx = x1 + (x2 - x1) * p;
  const my = y1 + (y2 - y1) * p;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', inset: 0, opacity, pointerEvents: 'none'}}>
      <defs>
        <clipPath id={idRef.current}>
          <rect x={-20} y={0} width={1320 * p} height={720} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${idRef.current})`}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeDasharray="16 13" strokeLinecap="round" />
      </g>
      {p > 0.02 && p < 0.99 ? (
        <g transform={`translate(${mx},${my}) rotate(${ang})`}>
          <line x1={-14} y1={-11} x2={9} y2={3} stroke={markerColor} strokeWidth={4} strokeLinecap="round" />
          <line x1={-14} y1={11} x2={9} y2={-3} stroke={markerColor} strokeWidth={4} strokeLinecap="round" />
          <circle cx={-17} cy={-13} r={5.5} fill="none" stroke={markerColor} strokeWidth={3} />
          <circle cx={-17} cy={13} r={5.5} fill="none" stroke={markerColor} strokeWidth={3} />
        </g>
      ) : null}
    </svg>
  );
};

// ---- PaperText：大字纸条（白纸条 + 投影；left/top 为纸条中心；可选顶部胶带）----
// v4.0：t+id 启用 jit；enter=t0 走 slap（纸条拍落）；lift 期间上提 40px·lift、投影走 liftShadow 律。
export const PaperText: React.FC<{
  text: string;
  x: number;
  y: number;
  fontSize: number;
  strip?: string;
  color?: string;
  rotate?: number;
  scale?: number;
  opacity?: number;
  letterSpacing?: number;
  padX?: number;
  padY?: number;
  fontWeight?: number;
  tapeSeed?: number;
  shadow?: string;
  /** 当前秒；与 id 配用即启用 jit */
  t?: number;
  /** jit 种子 */
  id?: number;
  /** jit 幅度 px，默认 2 */
  amp?: number;
  /** jit 步进帧率，默认 12 */
  fps?: number;
  /** slap 入场命中秒 t0 */
  enter?: number;
}> = ({
  text,
  x,
  y,
  fontSize,
  strip = '#ffffff',
  color = PAPER_TOKENS.ink,
  rotate = 0,
  scale = 1,
  opacity = 1,
  letterSpacing = 4,
  padX = 40,
  padY = 16,
  fontWeight = 900,
  tapeSeed,
  shadow,
  t,
  id,
  amp = 2,
  fps = 12,
  enter,
}) => {
  const sl = enter !== undefined && t !== undefined ? slap(t, enter) : null;
  if (enter !== undefined && t !== undefined && sl === null) return null;
  const [jx, jy, jr] = t !== undefined && id !== undefined ? jit(id, t, amp, fps) : [0, 0, 0];
  const lift = sl ? sl.lift : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 'max-content',
        transform: `translate(calc(-50% + ${jx}px), calc(-50% - ${40 * lift + jy}px)) rotate(${rotate + jr}deg) scale(${scale * (sl ? sl.s : 1)})`,
        filter: shadow ?? (lift > 0 ? liftShadow(lift) : 'drop-shadow(0 12px 14px rgba(39,64,96,0.32))'),
        opacity,
      }}
    >
      <div style={{backgroundColor: strip, backgroundImage: TEX.grain, padding: `${padY}px ${padX}px`}}>
        <span style={{fontFamily: FONT_PAPER, fontWeight, fontSize, letterSpacing, color, whiteSpace: 'nowrap', lineHeight: 1.15, display: 'inline-block'}}>{text}</span>
      </div>
      {tapeSeed !== undefined ? (
        <div style={{position: 'absolute', left: '50%', top: -2}}>
          <Tape left={0} top={0} w={96} h={26} rotate={-5} seed={tapeSeed} />
        </div>
      ) : null}
    </div>
  );
};
