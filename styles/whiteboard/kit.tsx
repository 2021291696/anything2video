import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {getStroke} from 'perfect-freehand';
import {FONT_HEAVY} from '../common';

/**
 * whiteboard 图元库（白板马克笔科普，战役 v4.0.0 Wave E / RECON-pm-watch P0 卡）。
 * 白板白底 + 黑马克笔渐进生长（讲一句画一句）+ 多色批注墨水分工 + 手绘箭头/圈注/下划线
 * + 板上相机 pan/zoom + 笔尖光标 + 错误笔划掉。
 *
 * 技法搭底：chalk 卡的笔画生长引擎媒介反转复用（perfect-freehand 压力轮廓 / dash-reveal /
 * 逐字符现写的机制借鉴后按马克笔语义重写——无粉笔颗粒/双影，改单层平涂墨 + multiply 叠笔变深）。
 * 手法参考 prompt-motion 白板解释器条目（tak3sh8/lemomo/Sarut0bi），零素材搬运、零代码拷贝。
 *
 * 确定性：全部抖动/光标走无状态 hash（fract·sin），帧号驱动，禁 Math.random/Date/网络。
 */

// ==================== token ====================
/** 色语义（SPEC 锁死）：黑=结构笔｜橙=太阳与红光（暖光族）｜蓝=蓝光｜绿=空气分子（对比态）｜红=强调批注（划掉/圈注/下划线） */
export const WB = {
  board: '#fbfaf6', // 白板白（微暖）
  frame: '#d7d7d1', // 铝框
  ink: '#33333b', // 黑马克笔
  red: '#d63a31', // 红墨=强调批注
  blue: '#2456c4', // 蓝墨=蓝光
  green: '#1f9d55', // 绿墨=空气分子
  orange: '#e2762c', // 橙墨=太阳/红光
  wash: 'rgba(36,86,196,0.16)', // 蓝天斜线铺色（半透明马克排线）
  cross: 'rgba(51,51,59,0.42)', // 划掉后文字降饱和
} as const;

export const W = 1280;
export const H = 720;

// ==================== 确定性 hash ====================
/** 无状态 hash（可 seek、可并行）：fract(sin(n*12.9898+78.233)*43758.5453) */
export const wbHash = (n: number): number => {
  const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};
/** 中心对称抖动：±a */
export const wbJit = (seed: number, a: number): number => (wbHash(seed) - 0.5) * 2 * a;
const f1 = (v: number): string => (Math.round(v * 10) / 10).toFixed(1);
export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
/** smoothstep（笔速手感：起笔加速收笔减速） */
export const smooth = (t: number): number => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};

// ==================== 点列与 path 生成器 ====================
/** 折线等距重采样（相邻点距 ≈step，供压力轮廓用） */
export const resample = (verts: [number, number][], step = 8): [number, number][] => {
  if (verts.length < 2) return verts;
  const out: [number, number][] = [verts[0]];
  let prev = verts[0];
  for (let i = 1; i < verts.length; i++) {
    const [ax, ay] = prev;
    const [bx, by] = verts[i];
    const d = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.round(d / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
    prev = verts[i];
  }
  return out;
};

const fJ = (s: number, a: number): number => wbJit(s, a);

/** 手绘直线：端点抖 ±2，Q 控制点在中点偏 wob（笔弓） */
export const gLine = (x1: number, y1: number, x2: number, y2: number, seed: number, wob = 4): string =>
  `M ${f1(x1 + fJ(seed, 2))} ${f1(y1 + fJ(seed + 1, 2))}` +
  ` Q ${f1((x1 + x2) / 2 + fJ(seed + 2, wob))} ${f1((y1 + y2) / 2 + fJ(seed + 3, wob))}` +
  ` ${f1(x2 + fJ(seed + 4, 2))} ${f1(y2 + fJ(seed + 5, 2))}`;

/** 手绘椭圆/圆：40 段折线、起始角 -0.55π±0.25、扫 1.1 圈（搭口）、半径抖 2.5% */
export const gCirc = (cx: number, cy: number, rx: number, ry: number, seed: number, turn = 1.1): string => {
  const n = 40;
  const t0 = -Math.PI * 0.55 + fJ(seed, 0.25);
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = t0 + (i / n) * turn * Math.PI * 2;
    const r = 1 + fJ(seed + i, 0.025);
    d += (i ? ' L ' : 'M ') + f1(cx + Math.cos(a) * rx * r) + ' ' + f1(cy + Math.sin(a) * ry * r);
  }
  return d;
};

/** 弓形弧（大气层带）：Q 曲线，bow=中点拱高（控制点偏移 2×bow），端点抖 ±2 */
export const gBow = (x1: number, y1: number, x2: number, y2: number, bow: number, seed: number): string =>
  `M ${f1(x1 + fJ(seed, 2))} ${f1(y1 + fJ(seed + 1, 2))}` +
  ` Q ${f1((x1 + x2) / 2 + fJ(seed + 2, 5))} ${f1((y1 + y2) / 2 - bow * 2 + fJ(seed + 3, 4))}` +
  ` ${f1(x2 + fJ(seed + 4, 2))} ${f1(y2 + fJ(seed + 5, 2))}`;

/** 斜向排线铺色组：n 根平行斜杆（马克笔侧锋阴影画法），返回 [{d,delay}] 供逐根 stagger 画出 */
export const gHatchSet = (
  x0: number, y0: number, x1: number, y1: number, n: number, step: number, seed: number,
): Array<{d: string; delay: number}> => {
  const out: Array<{d: string; delay: number}> = [];
  for (let i = 0; i < n; i++) {
    const ox = step * i;
    out.push({d: gLine(x0 + ox, y0, x1 + ox, y1, seed + i * 13, 5), delay: i});
  }
  return out;
};

/** 圆/椭圆点列（MarkerStroke 用）：1.1 圈搭口、半径抖 2.5%、等距重采样 */
export const circPts = (cx: number, cy: number, rx: number, ry: number, seed: number): [number, number][] => {
  const n = 40;
  const t0 = -Math.PI * 0.55 + fJ(seed, 0.25);
  const verts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = t0 + (i / n) * 1.1 * Math.PI * 2;
    const r = 1 + fJ(seed + i, 0.025);
    verts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return resample(verts, 8);
};

/** 手绘开口弧（大气层带）：椭圆弧 a0→a1，半径抖 2% */
export const gArc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, seed: number): string => {
  const n = 36;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const r = 1 + fJ(seed + i, 0.02);
    d += (i ? ' L ' : 'M ') + f1(cx + Math.cos(a) * rx * r) + ' ' + f1(cy + Math.sin(a) * ry * r);
  }
  return d;
};

/** 箭头头（两翼）：接在主线末端 (x2,y2)，翼与来向夹 ±0.8π。
 * ⚠ SVG dashoffset 按子路径独立生效——箭头头不可与主线拼进同一 d（头会提前显形），
 * 必须作为独立 InkPath 以 delay=主线 dur-2 补画。 */
export const gHead = (x2: number, y2: number, fromX: number, fromY: number, head = 20): string => {
  const ang = Math.atan2(y2 - fromY, x2 - fromX);
  const a1 = ang + Math.PI * 0.8;
  const a2 = ang - Math.PI * 0.8;
  return `M ${f1(x2 + Math.cos(a1) * head)} ${f1(y2 + Math.sin(a1) * head)} L ${f1(x2)} ${f1(y2)}` +
    ` L ${f1(x2 + Math.cos(a2) * head)} ${f1(y2 + Math.sin(a2) * head)}`;
};

/** 折线（zigzag）：n 折、幅值 amp——弹开路径 / 划掉线 */
export const gZig = (x1: number, y1: number, x2: number, y2: number, n: number, amp: number, seed: number): string => {
  let d = `M ${f1(x1)} ${f1(y1)}`;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const side = i % 2 === 0 ? -1 : 1;
    const a = amp * side * (0.75 + wbHash(seed + i) * 0.5);
    d += ` L ${f1(x1 + dx * t + nx * a)} ${f1(y1 + dy * t + ny * a)}`;
  }
  return d;
};

/** 双道下划线（强调签名）：主道轻弓 + 第二道短一半、右错位 */
export const gUnder = (x1: number, y: number, x2: number, seed: number): string =>
  gLine(x1, y, x2, y, seed, 3) +
  ` M ${f1(x1 + 10 + fJ(seed + 9, 2))} ${f1(y + 7)}` +
  ` Q ${f1((x1 + x2) / 2 + 5)} ${f1(y + 9)} ${f1(x2 - (x2 - x1) * 0.42)} ${f1(y + 6 + fJ(seed + 10, 1.5))}`;

/** 撞击星爆（分子被撞的 4 短刺） */
export const gStar = (cx: number, cy: number, r: number, seed: number): string => {
  let d = '';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + fJ(seed + i, 0.4);
    const r0 = r * 0.55;
    d += ` M ${f1(cx + Math.cos(a) * r0)} ${f1(cy + Math.sin(a) * r0)} L ${f1(cx + Math.cos(a) * r)} ${f1(cy + Math.sin(a) * r)}`;
  }
  return d;
};

/** 斜线排线区域填充（马克笔侧锋铺色）：step 间距 45° 斜线，解析裁剪到矩形 */
export const gHatchRect = (x: number, y: number, w: number, h: number, step = 26): string => {
  let d = '';
  for (let c = -h; c < w; c += step) {
    const s0 = Math.max(0, -c / h);
    const s1 = Math.min(1, (w - c) / h);
    if (s1 <= s0) continue;
    d += ` M ${f1(x + c + h * s0)} ${f1(y + h - h * s0)} L ${f1(x + c + h * s1)} ${f1(y + h - h * s1)}`;
  }
  return d.trim();
};

// ==================== path 弧长 / 弧长定位（纯 JS 解析 M/L/Q，Map 缓存） ====================
type Seg = {cmd: 'L' | 'Q'; x0: number; y0: number; x1: number; y1: number; qx?: number; qy?: number; len: number};
const SEG_CACHE = new Map<string, {segs: Seg[]; total: number}>();

export const dParse = (d: string): {segs: Seg[]; total: number} => {
  const hit = SEG_CACHE.get(d);
  if (hit) return hit;
  const toks = d.match(/[MLQ]|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g) ?? [];
  let x = 0;
  let y = 0;
  let cmd = '';
  let i = 0;
  const segs: Seg[] = [];
  const num = (): number => Number(toks[i++]);
  while (i < toks.length) {
    const tk = toks[i];
    if (tk === 'M' || tk === 'L' || tk === 'Q') {
      cmd = tk;
      i++;
      continue;
    }
    if (cmd === 'M') {
      x = num();
      y = num();
      cmd = 'L';
    } else if (cmd === 'L') {
      const nx = num();
      const ny = num();
      segs.push({cmd: 'L', x0: x, y0: y, x1: nx, y1: ny, len: Math.hypot(nx - x, ny - y)});
      x = nx;
      y = ny;
    } else if (cmd === 'Q') {
      const qx = num();
      const qy = num();
      const nx = num();
      const ny = num();
      let len = 0;
      let px = x;
      let py = y;
      for (let k = 1; k <= 12; k++) {
        const u = k / 12;
        const iu = 1 - u;
        const ax = iu * iu * x + 2 * iu * u * qx + u * u * nx;
        const ay = iu * iu * y + 2 * iu * u * qy + u * u * ny;
        len += Math.hypot(ax - px, ay - py);
        px = ax;
        py = ay;
      }
      segs.push({cmd: 'Q', x0: x, y0: y, x1: nx, y1: ny, qx, qy, len});
      x = nx;
      y = ny;
    } else break;
  }
  const total = segs.reduce((s, g) => s + g.len, 0);
  SEG_CACHE.set(d, {segs, total});
  return {segs, total};
};

export const dLen = (d: string): number => dParse(d).total;

/** 弧长 l 处的笔尖坐标（M/L/Q 线性/二次插值） */
export const dPoint = (d: string, l: number): [number, number] => {
  const {segs, total} = dParse(d);
  let rest = Math.max(0, Math.min(total, l));
  for (const g of segs) {
    if (rest <= g.len || g === segs[segs.length - 1]) {
      const u = g.len > 0 ? clamp01(rest / g.len) : 1;
      if (g.cmd === 'L' || g.qx === undefined || g.qy === undefined) {
        return [g.x0 + (g.x1 - g.x0) * u, g.y0 + (g.y1 - g.y0) * u];
      }
      const iu = 1 - u;
      return [
        iu * iu * g.x0 + 2 * iu * u * g.qx + u * u * g.x1,
        iu * iu * g.y0 + 2 * iu * u * g.qy + u * u * g.y1,
      ];
    }
    rest -= g.len;
  }
  return [0, 0];
};

// ==================== 墨迹层（multiply 叠笔） ====================
/** 单根墨迹 SVG 包装：mixBlendMode multiply——马克笔半透明，叠笔处自然变深（签名件） */
const InkLayer: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
    style={{position: 'absolute', left: 0, top: 0, mixBlendMode: 'multiply', pointerEvents: 'none'}}>
    {children}
  </svg>
);

/** perfect-freehand 轮廓 → path d（官方推荐闭环 Q 中点法，本库通用写法） */
const outlineToPath = (outline: number[][]): string => {
  if (!outline.length) return '';
  const d = outline.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...outline[0], 'Q'],
  );
  d.push('Z');
  return d.join(' ');
};

// ==================== 马克笔点列笔触（渐进生长 + 笔尖光标） ====================
/**
 * MarkerStroke：点列笔画沿路径渐进画入（讲一句画一句的最小单位）。
 * 马克笔参数：低压感（thinning 0.18）、高平滑（smoothing .62 / streamline .5）、收笔 taper。
 * t<1 时在当前笔尖处渲染 PenTip。pen=false 可关光标（宽锋铺色等不露笔杆的笔触）。
 */
export const MarkerStroke: React.FC<{
  pts: [number, number][];
  f: number;
  f0: number;
  dur: number;
  color?: string;
  size?: number;
  opacity?: number;
  pen?: boolean;
  penScale?: number;
}> = ({pts, f, f0, dur, color = WB.ink, size = 8, opacity = 0.88, pen = true, penScale = 1}) => {
  const n = f - f0;
  if (n <= 0) return null;
  const t = clamp01(n / Math.max(1, dur));
  const count = Math.max(2, Math.ceil(pts.length * smooth(t)));
  const vis = pts.slice(0, Math.min(count, pts.length));
  const outline = getStroke(vis, {
    size,
    thinning: 0.18,
    smoothing: 0.62,
    streamline: 0.5,
    simulatePressure: true,
    easing: (k: number) => 1 - Math.pow(1 - k, 1.6),
    last: t >= 1,
  });
  const d = outlineToPath(outline);
  const tip = vis[vis.length - 1];
  return (
    <>
      <InkLayer>
        <path d={d} fill={color} opacity={opacity} />
      </InkLayer>
      {pen && t < 1 ? <PenTip x={tip[0]} y={tip[1]} f={f} color={color} scale={penScale} /> : null}
    </>
  );
};

/**
 * InkPath：path-d 笔画 dash-reveal 从起点写出（手绘几何/箭头/圈注/下划线）。
 * len 解析一次带缓存；每帧 dashoffset = len·(1−easedU)；笔尖沿弧长定位。
 */
export const InkPath: React.FC<{
  d: string;
  f: number;
  f0: number;
  dur: number;
  color?: string;
  width?: number;
  opacity?: number;
  delay?: number;
  pen?: boolean;
  penScale?: number;
}> = ({d, f, f0, dur, color = WB.ink, width = 5.5, opacity = 0.88, delay = 0, pen = true, penScale = 1}) => {
  const n = f - f0 - delay;
  if (n <= 0) return null;
  const len = dLen(d);
  const u = smooth(clamp01(n / Math.max(1, dur)));
  const reveal = len * (1 - u);
  const [px, py] = dPoint(d, len * u);
  return (
    <>
      <InkLayer>
        <path d={d} fill="none" stroke={color} strokeWidth={width} opacity={opacity}
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={`${len} ${len + 60}`} strokeDashoffset={reveal} />
      </InkLayer>
      {pen && u < 1 ? <PenTip x={px} y={py} f={f} color={color} scale={penScale} /> : null}
    </>
  );
};

// ==================== 笔尖光标（白板马克笔道具） ====================
/** 马克笔笔尖：锥形笔头 + 墨色箍 + 笔杆，rotate(-38°) 悬腕；tremble 时 8Hz 微颤（结尾悬停签名） */
export const PenTip: React.FC<{x: number; y: number; f: number; color?: string; scale?: number; tremble?: boolean}> =
  ({x, y, f, color = WB.ink, scale = 1, tremble = false}) => {
    const jx = tremble ? wbJit(Math.floor(f * 3.7), 1.3) : wbJit(f * 0.7, 0.5);
    const jy = tremble ? wbJit(Math.floor(f * 3.7) + 11, 1.1) : wbJit(f * 0.7 + 5, 0.4);
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
        <g transform={`translate(${f1(x + jx)} ${f1(y + jy)}) rotate(-38) scale(${scale})`}>
          <polygon points="0,0 5.2,12 -5.2,12" fill={color} />
          <rect x={-6.5} y={12} width={13} height={7.5} rx={1.5} fill={color} />
          <rect x={-8} y={19.5} width={16} height={42} rx={5.5} fill="#4a4f57" stroke="#2e3238" strokeWidth={1.4} />
          <rect x={-4.5} y={23} width={4.5} height={34} rx={2.2} fill="#7d848e" opacity={0.85} />
          <rect x={-8} y={30} width={16} height={6} fill={color} opacity={0.9} />
          <rect x={-8} y={54} width={16} height={6.5} rx={2.5} fill="#d8dbe0" />
        </g>
      </svg>
    );
  };

// ==================== 手写体字（逐字现写 + 字姿抖动） ====================
const charW = (ch: string, size: number): number =>
  ch.charCodeAt(0) < 0x2000 ? size * 0.56 : size; // 拉丁/标点半宽，CJK 全宽

/**
 * HandText：马克笔手写注记——逐字符 clip 现写（负值上下边距防裁 ascend/descend），
 * 每字确定性歪斜 ±1.1°/漂移 ±1.4px（手写感）；书写中笔尖按累计字宽跟随。
 * x/y 为文本锚点（align left=左上 / center=水平居中）。
 */
export const HandText: React.FC<{
  text: string;
  f: number;
  f0: number;
  dur: number;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  align?: 'left' | 'center';
  jitter?: number;
  weight?: number;
  pen?: boolean;
  opacity?: number;
}> = ({text, f, f0, dur, x = 200, y = 160, size = 40, color = WB.ink, align = 'left', jitter = 1, weight = 900, pen = true, opacity = 0.92}) => {
  const chars = Array.from(text);
  const totalW = chars.reduce((s, c) => s + charW(c, size) + size * 0.06, 0);
  const startX = align === 'center' ? x - totalW / 2 : x;
  const n = f - f0;
  if (n <= 0) return null;
  const per = Math.max(1, dur / chars.length);
  // 笔尖：当前写到第几个字的什么位置
  const prog = clamp01(n / dur) * chars.length;
  const ci = Math.min(chars.length - 1, Math.floor(prog));
  let penX = startX;
  for (let k = 0; k < ci; k++) penX += charW(chars[k], size) + size * 0.06;
  penX += charW(chars[ci], size) * clamp01(prog - ci);
  return (
    <>
      <div style={{
        position: 'absolute',
        left: startX,
        top: y,
        fontFamily: FONT_HEAVY,
        fontWeight: weight,
        fontSize: size,
        color,
        whiteSpace: 'nowrap',
        letterSpacing: size * 0.06,
        lineHeight: 1.15,
        opacity,
      }}>
        {chars.map((ch, j) => {
          const u = clamp01((n - j * per) / Math.max(1, per * 0.7));
          if (u <= 0) return <span key={j} style={{visibility: 'hidden'}}>{ch}</span>;
          const clip = u >= 1 ? undefined : `inset(-12% ${((1 - u) * 100).toFixed(1)}% -22% -4%)`;
          const seed = f0 * 3.1 + j * 7.7;
          return (
            <span key={j} style={{
              display: 'inline-block',
              clipPath: clip,
              transform: `rotate(${wbJit(seed, 1.1 * jitter).toFixed(2)}deg) translate(${wbJit(seed + 1, 1.4 * jitter).toFixed(1)}px, ${wbJit(seed + 2, 1.2 * jitter).toFixed(1)}px)`,
            }}>{ch}</span>
          );
        })}
      </div>
      {pen && n < dur ? <PenTip x={penX} y={y + size * 0.62} f={f} color={color} scale={0.9} /> : null}
    </>
  );
};

// ==================== 白板底与收尾 ====================
/** 白板底：暖白板面 + 静态细颗粒（feTurbulence 固定 seed）+ 铝框 + 轻暗角；children 为板上内容层 */
export const Board: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: WB.board}}>
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: 0.05}}>
      <filter id="wb-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} stitchTiles="stitch" />
      </filter>
      <rect width={W} height={H} filter="url(#wb-grain)" />
    </svg>
    {children}
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'radial-gradient(ellipse 96% 88% at 50% 46%, transparent 68%, rgba(70,70,66,0.10) 100%)',
      border: `12px solid ${WB.frame}`, boxSizing: 'border-box',
      boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.8), inset 0 2px 14px rgba(60,60,60,0.08)',
    }} />
  </AbsoluteFill>
);

// ==================== 板上相机（board pan/zoom，签名件） ====================
export type CamKey = {f: number; s: number; x: number; y: number};

/** 分段 smoothstep 插值的板面相机：scale 围绕画面中心，x/y 平移（px）。逐帧纯函数。 */
export const camAt = (f: number, keys: CamKey[]): {s: number; x: number; y: number} => {
  if (!keys.length) return {s: 1, x: 0, y: 0};
  if (f <= keys[0].f) return {s: keys[0].s, x: keys[0].x, y: keys[0].y};
  for (let i = 1; i < keys.length; i++) {
    if (f <= keys[i].f) {
      const a = keys[i - 1];
      const b = keys[i];
      const u = smooth((f - a.f) / Math.max(1, b.f - a.f));
      return {s: a.s + (b.s - a.s) * u, x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u};
    }
  }
  const last = keys[keys.length - 1];
  return {s: last.s, x: last.x, y: last.y};
};

export const BoardCam: React.FC<{f: number; keys: CamKey[]; children: React.ReactNode}> = ({f, keys, children}) => {
  const cam = camAt(f, keys);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      transform: `translate(${cam.x.toFixed(2)}px, ${cam.y.toFixed(2)}px) scale(${cam.s.toFixed(4)})`,
      transformOrigin: '640px 360px',
      willChange: 'transform',
    }}>{children}</div>
  );
};

// ==================== 字幕条（底部同步字幕，tak3sh8 白板格式签名） ====================
import {SUBS} from '../common/subs';

export const SubBar: React.FC<{f: number}> = ({f}) => {
  const active = SUBS.find((s) => f >= s.from - 3 && f <= s.to + 3);
  if (!active) return null;
  const a = f < active.from ? (f - (active.from - 3)) / 3 : f > active.to ? ((active.to + 3 - f) / 3) : 1;
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 24, zIndex: 60,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      opacity: clamp01(a).toFixed(3),
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.92)', borderRadius: 6,
        border: `1.5px solid rgba(51,51,59,0.55)`, borderBottom: `3px solid ${WB.ink}`,
        padding: '5px 22px', boxShadow: '0 2px 8px rgba(40,40,40,0.10)',
      }}>
        <span style={{fontFamily: FONT_HEAVY, fontWeight: 700, fontSize: 26, color: WB.ink, letterSpacing: 2}}>
          {active.text}
        </span>
      </div>
    </div>
  );
};

// ==================== 划掉组合件（错误笔删除，签名件） ====================
/**
 * CrossOut：对已写文字的划掉——双折红线划过 + 文字降饱和定住。
 * 返回划掉线 d（交给 InkPath 渐进画出）；文字侧用 crossFade 得到划掉后的降饱和透明度。
 */
export const gCrossOut = (x: number, y: number, w: number, seed: number): string =>
  gZig(x - 6, y + 2, x + w + 6, y - 4, 6, 7, seed) + ' ' + gZig(x + w + 4, y + 8, x - 4, y - 8, 6, 6, seed + 31);

/** 划掉后文字透明度：crossF 后降到 0.45（保持可读、宣判作废） */
export const crossFade = (f: number, crossF: number): number => (f < crossF ? 0.92 : 0.45);
