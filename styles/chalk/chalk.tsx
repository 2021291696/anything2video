import React from 'react';
import {useCurrentFrame, useVideoConfig, staticFile} from 'remotion';
import {getStroke} from 'perfect-freehand';
import {clamp01, easeInOutPow} from './common';

/**
 * 粉笔黑板图元库（chalk-math 专用，主脚本维护）。
 * 黑板底 + 粉笔压力笔触（颗粒质感 + 粉尘）+ 板书字 + 擦除转场。
 * 镜头组件 N = useCurrentFrame() + F0（F0 = ShotDef.from）。
 */
export const CHALK = {
  board: '#1e3b2f', boardDeep: '#152b23', boardEdge: '#0f2019',
  white: '#f5f2e8', yellow: '#e8d48b', blue: '#a8c8e8', pink: '#e8a8b0',
};

const DUST_URL = staticFile('assets/chalk-math/dust.png');

/** 黑板底：深绿板面 + 使用磨损痕 */
export const Board: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0,
    background: `radial-gradient(ellipse 70% 60% at 50% 45%, #24473a, ${CHALK.board} 62%, ${CHALK.boardDeep} 100%)`,
  }} />
);

/** 全局收尾：粉笔灰（screen 漂移）+ 板缘木框色压暗（挂 Main） */
export const ChalkPost: React.FC = () => {
  const N = useCurrentFrame() + 1;
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `url(${DUST_URL})`, backgroundSize: '512px 512px',
        backgroundPosition: `${(N * 4) % 512}px ${(N * 7) % 512}px`,
        mixBlendMode: 'screen', opacity: 0.35,
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 94% 86% at 50% 46%, transparent 66%, rgba(8,18,12,.4) 100%)',
        border: '14px solid #5a4632', boxSizing: 'border-box',
      }} />
    </>
  );
};

/** 水墨幕的对应物：黑板幕包装（整幕淡入淡出） */
export const ChalkScene: React.FC<{N: number; f0: number; end: number; children: React.ReactNode}> = ({N, f0, end, children}) => {
  const inOp = clamp01((N - f0) / 12);
  const outOp = 1 - clamp01((N - (end - 14)) / 14);
  return <div style={{position: 'absolute', inset: 0, opacity: Math.min(inOp, outOp)}}>{children}</div>;
};

const svgPathFromStroke = (stroke: number[][]): string => {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q'],
  );
  d.push('Z');
  return d.join(' ');
};

/**
 * 粉笔笔触：perfect-freehand 压力轮廓 + 渐进画入 + 双层（白垩核心 + 灰尘晕）+ dust 裁剪颗粒。
 * chalk=true 时叠加第二遍略偏移的描边（粉笔的粗糙双影）。
 */
export const ChalkStroke: React.FC<{
  points: [number, number][]; N: number; f0: number; len?: number; size?: number; color?: string; opacity?: number; delay?: number; chalk2?: boolean;
}> = ({points, N, f0, len = 26, size = 10, color = CHALK.white, opacity = 0.95, delay = 0, chalk2 = true}) => {
  const n = N - f0 - delay;
  if (n <= 0) return null;
  const t = clamp01(n / len);
  const vis = points.slice(0, Math.max(2, Math.ceil(points.length * t)));
  const outline = getStroke(vis, {
    size, thinning: 0.4, smoothing: 0.55, streamline: 0.35,
    simulatePressure: true, easing: easeInOutPow(1.3), last: t >= 1,
  });
  const d = svgPathFromStroke(outline);
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity}}>
      {/* 灰尘晕 */}
      <path d={d} fill={color} opacity={0.14 * t} style={{filter: 'blur(3.5px)'}} />
      {/* 白垩核心 */}
      <path d={d} fill={color} opacity={0.9 * t} style={{filter: 'blur(0.6px)'}} />
      {/* 粉笔双影：第二遍偏移细描 */}
      {chalk2 && <path d={d} fill="none" stroke={color} strokeWidth={1.6} opacity={0.35 * t}
        transform="translate(2 -1.5)" style={{filter: 'blur(0.7px)'}} />}
    </svg>
  );
};

/** 点列生成器（导出给场景用） */
export const ptsLine = (x0: number, y0: number, x1: number, y1: number, n = 28): [number, number][] =>
  Array.from({length: n}, (_, i) => [x0 + (x1 - x0) * (i / (n - 1)), y0 + (y1 - y0) * (i / (n - 1))]);
export const ptsPoly = (...xy: [number, number][]): [number, number][] => {
  const pts: [number, number][] = [];
  for (let i = 0; i < xy.length; i++) {
    const [x0, y0] = xy[i];
    const [x1, y1] = xy[(i + 1) % xy.length];
    const seg = 18;
    for (let k = 0; k < seg; k++) pts.push([x0 + (x1 - x0) * (k / seg), y0 + (y1 - y0) * (k / seg)]);
  }
  return pts;
};

/** 板书字：白垩字 + 轻微歪斜（手写感） */
export const ChalkText: React.FC<{
  text: string; N: number; f0: number; x?: number; y?: number; size?: number; color?: string; spacing?: number; rotate?: number; opacity?: number;
}> = ({text, N, f0, x = 640, y = 200, size = 64, color = CHALK.white, spacing = 8, rotate = -0.8, opacity = 0.96}) => {
  const t = clamp01((N - f0) / 14);
  if (t <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rotate}deg)`, opacity: t * opacity,
      fontFamily: `'Noto Sans SC', 'PingFang SC', sans-serif`, fontWeight: 900, fontSize: size, color,
      letterSpacing: spacing, whiteSpace: 'nowrap', filter: 'blur(0.5px)',
      textShadow: '0 0 1px rgba(245,242,232,.6)',
    }}>{text}</div>
  );
};

/** 板擦转场：整幕擦除淡出（ChalkScene 已含淡出，这里给硬擦的横向板擦痕） */
export const EraseMark: React.FC<{N: number; f0: number; y?: number}> = ({N, f0, y = 300}) => {
  const n = N - f0;
  if (n < 0 || n > 16) return null;
  const x = (n / 16) * 1400 - 200;
  return <div style={{
    position: 'absolute', left: x - 160, top: y - 40, width: 320, height: 80, borderRadius: 8,
    background: 'rgba(240,234,217,.14)', filter: 'blur(2px)',
  }} />;
};

// ==================== 竞品技法增补（opt-in，默认不启用；以下均为新增导出，不触碰上方默认词汇） ====================
// 技法借鉴 lanshu-create-ai-presenter-video（MIT, cclank）——explainer/kits/v8-chalkboard 的
// 手绘几何（hash 抖动）/笔划 dash 写出/逐字符现写/板擦三横带蛇形擦除/cps 配速/DP 折行，
// 以 React/TSX + useCurrentFrame 纯帧函数重写（源为 DOM/JS 惯用法，未拷代码结构）。

// ---- 确定性抖动：hash=fract(sin(n*127.1+311.7)*43758.5453)，jit=(hash-0.5)*2a ----
const fract = (v: number): number => v - Math.floor(v);
export const geoHash = (n: number): number => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
let GEO_SEED = 1;
/** 抖动种子分配：每调用自增 7.31。只允许在组件外（模块/常量层）调用——渲染保持纯帧函数，可 seek、可并行。 */
export const nextGeoSeed = (): number => (GEO_SEED += 7.31);
const geoJit = (s: number, a: number): number => (geoHash(s) - 0.5) * 2 * a;
const f1 = (v: number): string => (Math.round(v * 10) / 10).toFixed(1);

// ---- ChalkGeo 手绘几何生成器（全部返回 SVG path d；seed 显式传入，同 seed 恒同形） ----
/** 手绘直线：端点各抖 ±2px，单 Q 控制点在中点处偏移 wob（默认 5）。 */
export const geoLine = (x1: number, y1: number, x2: number, y2: number, seed: number, wob = 5): string => {
  const s = seed;
  return `M ${f1(x1 + geoJit(s, 2))} ${f1(y1 + geoJit(s + 1, 2))}` +
    ` Q ${f1((x1 + x2) / 2 + geoJit(s + 2, wob))} ${f1((y1 + y2) / 2 + geoJit(s + 3, wob))}` +
    ` ${f1(x2 + geoJit(s + 4, 2))} ${f1(y2 + geoJit(s + 5, 2))}`;
};
/** 手绘矩形：四角各抖 2px、每边 Q 控制点抖 min(4, w/12)（纵向用 h/12）、收笔越过起点 4-5px（手绘闭合搭口）。 */
export const geoRect = (x: number, y: number, w: number, h: number, seed: number): string => {
  const s = seed;
  const corners: [number, number][] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x + 4, y + 5]];
  let d = `M ${f1(x + geoJit(s, 2))} ${f1(y + geoJit(s + 1, 2))}`;
  for (let i = 1; i < corners.length; i++) {
    const [ax, ay] = corners[i - 1];
    const [bx, by] = corners[i];
    d += ` Q ${f1((ax + bx) / 2 + geoJit(s + i * 3, Math.min(4, w / 12)))} ${f1((ay + by) / 2 + geoJit(s + i * 3 + 1, Math.min(4, h / 12)))}` +
      ` ${f1(bx + geoJit(s + i * 5, 1.5))} ${f1(by + geoJit(s + i * 5 + 1, 1.5))}`;
  }
  return d;
};
/** 手绘圆：44 段折线、起始角 -0.6π+jit(±0.3)、扫过 1.12 圈（搭接口）、半径抖 3.5%（尾段 +5% 螺旋出）。 */
export const geoCirc = (cx: number, cy: number, rx: number, ry: number, seed: number, turn = 1.12): string => {
  const s = seed, n = 44, t0 = -Math.PI * 0.6 + geoJit(s, 0.3);
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = t0 + (i / n) * turn * Math.PI * 2;
    const r = 1 + geoJit(s + i, 0.035) + 0.05 * (i / n);
    d += (i ? ' L ' : 'M ') + f1(cx + Math.cos(a) * rx * r) + ' ' + f1(cy + Math.sin(a) * ry * r);
  }
  return d;
};
/** 45° 斜线排线（粉笔"填充"）：step 12-13，解析裁剪到矩形，无抖动。 */
export const geoHatch = (x: number, y: number, w: number, h: number, step = 12): string => {
  let d = '';
  for (let c = -h; c < w; c += step) {
    const s0 = Math.max(0, -c / h), s1 = Math.min(1, (w - c) / h);
    if (s1 <= s0) continue;
    d += ` M ${f1(x + c + h * s0)} ${f1(y + h - h * s0)} L ${f1(x + c + h * s1)} ${f1(y + h - h * s1)}`;
  }
  return d.trim();
};
/** 弓形箭头：Q 弓形主线（cx,cy 为控制点）+ 两条箭头短线（与末端切线夹 ±0.82π，head 默认 26）。 */
export const geoArrow = (x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, head = 26): string => {
  const ang = Math.atan2(y2 - cy, x2 - cx);
  const a1 = ang + Math.PI * 0.82, a2 = ang - Math.PI * 0.82;
  return `M ${f1(x1)} ${f1(y1)} Q ${f1(cx)} ${f1(cy)} ${f1(x2)} ${f1(y2)}` +
    ` M ${f1(x2 + Math.cos(a1) * head)} ${f1(y2 + Math.sin(a1) * head)} L ${f1(x2)} ${f1(y2)}` +
    ` L ${f1(x2 + Math.cos(a2) * head)} ${f1(y2 + Math.sin(a2) * head)}`;
};
/** 命名空间入口：ChalkGeo.line / .rect / .circ / .hatch / .arrow。 */
export const ChalkGeo = {line: geoLine, rect: geoRect, circ: geoCirc, hatch: geoHatch, arrow: geoArrow} as const;

// ---- 路径弧长（等价 getTotalLength，纯 JS 解析 M/L/Q + Map 缓存：build 时一次、无 DOM、并行渲染安全） ----
const D_LEN_CACHE = new Map<string, number>();
export const dLen = (d: string): number => {
  const hit = D_LEN_CACHE.get(d);
  if (hit != null) return hit;
  const toks = d.match(/[MLQ]|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g) ?? [];
  let x = 0, y = 0, cmd = '', len = 0;
  let i = 0;
  const num = (): number => Number(toks[i++]);
  while (i < toks.length) {
    const tk = toks[i];
    if (tk === 'M' || tk === 'L' || tk === 'Q') { cmd = tk; i++; continue; }
    if (cmd === 'M') { x = num(); y = num(); cmd = 'L'; }
    else if (cmd === 'L') { const nx = num(), ny = num(); len += Math.hypot(nx - x, ny - y); x = nx; y = ny; }
    else if (cmd === 'Q') {
      const qx = num(), qy = num(), nx = num(), ny = num();
      const px = x, py = y;
      for (let k = 1; k <= 16; k++) { // Q 弧长 16 段采样（误差 <0.01px）
        const u = k / 16, iu = 1 - u;
        const ax = iu * iu * px + 2 * iu * u * qx + u * u * nx;
        const ay = iu * iu * py + 2 * iu * u * qy + u * u * ny;
        len += Math.hypot(ax - x, ay - y);
        x = ax; y = ay;
      }
    } else break; // 本库生成器只产 M/L/Q；未知记号即停
  }
  D_LEN_CACHE.set(d, len);
  return len;
};
const strHash = (s: string): string => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
};

/**
 * ChalkDash 笔画 dash-reveal：从起点"写出来"。len=dLen(d)（build 时一次），
 * 每帧 dashoffset=len*(1-easedU)。dashStyle（虚线笔画）时 reveal 由 SVG mask 承载
 * （白 path 宽 +10；直接对虚线 path 做 dashoffset 动画会变蚂蚁线）。
 * 粉笔质感同 ChalkStroke 三层（灰尘晕/白垩核心/双影）。多子路径 d（hatch）按 SVG 语义各子路径并行写出。
 */
export const ChalkDash: React.FC<{
  d: string; N: number; f0: number; dur?: number; delay?: number; width?: number; color?: string; opacity?: number;
  dashStyle?: string; chalk2?: boolean; ease?: (t: number) => number;
}> = ({d, N, f0, dur = 18, delay = 0, width = 4.5, color = CHALK.white, opacity = 0.95, dashStyle, chalk2 = true, ease}) => {
  const n = N - f0 - delay;
  if (n <= 0) return null;
  const len = dLen(d);
  const u = clamp01(n / Math.max(1, dur));
  const e = ease ? ease(u) : u;
  const reveal = len * (1 - e);
  const maskId = `chalkmask-${strHash(`${d}|${f0}|${dur}|${delay}|${width}|${dashStyle ?? ''}`)}`;
  const cap = {strokeLinecap: 'round', strokeLinejoin: 'round'} as const;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity}}>
      {dashStyle ? (
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x={-50} y={-50} width={1380} height={820}>
            <path d={d} fill="none" stroke="#fff" strokeWidth={width + 10} {...cap}
              strokeDasharray={`${len} ${len + 40}`} strokeDashoffset={reveal} />
          </mask>
        </defs>
      ) : null}
      <g mask={dashStyle ? `url(#${maskId})` : undefined}>
        {/* 灰尘晕 */}
        <path d={d} fill="none" stroke={color} strokeWidth={width * 1.9} {...cap}
          strokeDasharray={dashStyle ? undefined : `${len} ${len + 40}`} strokeDashoffset={dashStyle ? undefined : reveal}
          opacity={0.14 * e} style={{filter: 'blur(3.5px)'}} />
        {/* 白垩核心 */}
        <path d={d} fill="none" stroke={color} strokeWidth={width} {...cap}
          strokeDasharray={dashStyle ?? `${len} ${len + 40}`} strokeDashoffset={dashStyle ? undefined : reveal}
          opacity={0.9 * e} style={{filter: 'blur(0.4px)'}} />
        {/* 粉笔双影 */}
        {chalk2 ? (
          <path d={d} fill="none" stroke={color} strokeWidth={1.6} {...cap} transform="translate(2 -1.5)"
            strokeDasharray={dashStyle ? undefined : `${len} ${len + 40}`} strokeDashoffset={dashStyle ? undefined : reveal}
            opacity={0.35 * e} style={{filter: 'blur(0.7px)'}} />
        ) : null}
      </g>
    </svg>
  );
};

// ---- em 宽度（CJK=1、拉丁/数字≈0.48、空格 0.3）——cps 配速与折行的度量单位 ----
export const wlen = (s: string): number =>
  Array.from(s).reduce((n, ch) => n + (ch === ' ' ? 0.3 : ch.charCodeAt(0) < 0x2000 ? 0.48 : 1), 0);

/**
 * WriteText 逐字符现写：每字符 clip-path inset(-12% ((1-u)*100)% -22% -4%) 现写（负值上下边距防裁
 * ascend/descend，是踩过坑的参数，原样保留）。字符 j 出场 at=a+(b-a)*j/n，单字时长
 * clamp((b-a)/n+0.04s, 0.08..0.2s)；给 cps（em/秒，配 paceCps）则按字宽匀速：每段时长=字宽/cps。
 * x/y 为文本左上角（书写锚点，非 ChalkText 的居中锚）。
 */
export const WriteText: React.FC<{
  text: string; N: number; f0: number; x?: number; y?: number; size?: number; color?: string; spacing?: number;
  rotate?: number; opacity?: number; a: number; b?: number; cps?: number;
}> = ({text, N, f0, x = 200, y = 160, size = 64, color = CHALK.white, spacing = 8, rotate = -0.8, opacity = 0.96, a, b, cps}) => {
  const {fps} = useVideoConfig();
  const sec = (s: number): number => s * fps;
  const chars = Array.from(text);
  const local = N - f0;
  const span = Math.max(1, (b ?? a) - a);
  // 每字出场（局部帧）与单字时长（帧）
  const atDur = chars.map((ch, j) => {
    if (cps != null) {
      const at = a + sec(wlen(chars.slice(0, j).join('')) / cps);
      const dur = Math.max(sec(0.08), Math.min(sec(0.2), sec(wlen(ch) / cps) + sec(0.04)));
      return {at, dur: Math.max(1, dur)};
    }
    return {
      at: a + (span * j) / chars.length,
      dur: Math.max(1, Math.max(sec(0.08), Math.min(sec(0.2), sec(span / chars.length) + sec(0.04)))),
    };
  });
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: `rotate(${rotate}deg)`, opacity,
      fontFamily: `'Noto Sans SC', 'PingFang SC', sans-serif`, fontWeight: 900, fontSize: size, color,
      letterSpacing: spacing, whiteSpace: 'nowrap', filter: 'blur(0.5px)',
      textShadow: '0 0 1px rgba(245,242,232,.6)',
    }}>
      {chars.map((ch, j) => {
        if (ch === ' ') return <span key={j}>{' '}</span>;
        const u = clamp01((local - atDur[j].at) / atDur[j].dur);
        const hidden = u <= 0;
        const clip = u >= 1 ? 'none' : `inset(-12% ${((1 - u) * 100).toFixed(1)}% -22% -4%)`;
        return (
          <span key={j} style={{display: 'inline-block', visibility: hidden ? 'hidden' : 'visible',
            clipPath: hidden ? undefined : clip}}>{ch}</span>
        );
      })}
    </div>
  );
};

// ---- ChalkErase 板擦：三横带蛇形擦除（中带反向）；目标消失时刻由其中心位置反推（eraseAt），淡出 0.12s ----
export type EraseRect = {x: number; y: number; w: number; h: number};
/** 中心 (cx,cy) 的目标开始淡出的局部帧（N-f0 空间）：band=clamp01((cy-y)/h)，along 同带翻转，at=(r+along)/3*dur。 */
export const eraseAt = (cx: number, cy: number, rect: EraseRect, f0: number, dur: number): number => {
  const band = clamp01((cy - rect.y) / rect.h);
  const r = Math.min(2, Math.floor(band * 3));
  let along = clamp01((cx - rect.x) / rect.w);
  if (r % 2 === 1) along = 1 - along;
  return f0 + ((r + along) / 3) * dur;
};
/** 目标淡出帧数（0.12s）。用法：opacity *= 1-clamp01((N-f0-eraseAt(...))/eraseFadeF(fps))。 */
export const eraseFadeF = (fps: number): number => Math.max(1, Math.round(fps * 0.12));
/** 板擦本体 + 擦痕残留。本体只在擦除进行中可见：蛇形位置 + rotate(-8+6sin(t*30))≈4.8Hz 手腕抖。 */
export const ChalkErase: React.FC<{N: number; f0: number; x: number; y: number; w: number; h: number; dur: number; residue?: boolean}> =
  ({N, f0, x, y, w, h, dur, residue = true}) => {
    const {fps} = useVideoConfig();
    const local = N - f0;
    const u = clamp01(local / Math.max(1, dur));
    const r = Math.min(2, Math.floor(u * 3));
    let along = u * 3 - r;
    if (r % 2 === 1) along = 1 - along;
    const rot = -8 + 6 * Math.sin((local / fps) * 30);
    return (
      <>
        {/* 擦痕残留：3 个圆角矩形（高 h/3*0.6、x 抖 ±30）feGaussianBlur 下，opacity=u */}
        {residue && u > 0 ? (
          <div style={{position: 'absolute', inset: 0, filter: 'blur(18px)', opacity: u, pointerEvents: 'none'}}>
            {[0, 1, 2].map((q) => (
              <div key={q} style={{
                position: 'absolute',
                left: x + 20 + (geoHash(q * 17.31) - 0.5) * 60, top: y + ((q + 0.2) / 3) * h,
                width: Math.max(10, w - 40), height: (h / 3) * 0.6, borderRadius: 30,
                background: `rgba(225,235,228,${(0.05 + 0.02 * q).toFixed(3)})`,
              }} />
            ))}
          </div>
        ) : null}
        {local > 0 && local < dur ? (
          <div style={{
            position: 'absolute', left: x + along * w - 95, top: y + ((r + 0.5) / 3) * h - 40,
            width: 190, height: 80, transform: `rotate(${rot.toFixed(1)}deg)`, transformOrigin: 'center', pointerEvents: 'none',
          }}>
            <div style={{position: 'absolute', left: 0, top: 0, width: 190, height: 58, borderRadius: 8,
              background: '#3d4d63', boxShadow: '8px 14px 10px rgba(0,0,0,.5)'}} />
            <div style={{position: 'absolute', left: 0, top: 50, width: 190, height: 22, borderRadius: 4, background: '#d9d4c7'}} />
          </div>
        ) : null}
      </>
    );
  };

// ---- 配速书写：任意长文本恰好在给定时间段写完（cps=totalEm/(t1-hold-t0)，下限 10；秒域） ----
export const paceCps = (totalEm: number, t0: number, t1: number, hold = 1.2): number =>
  Math.max(10, totalEm / Math.max(0.5, t1 - hold - t0));

// ---- DP 折行：先切原子（，：；后断、「 · 」分隔），超长原子在空格/顿号二分，DP 最小化最长行；行永不跨 ：； ----
export const wrapLines = (text: string, maxEm: number): string[] => {
  const src = text.replace(/[。.]\s*$/, '');
  type Atom = {s: string; sep: string};
  const atoms: Atom[] = [];
  let cur = '';
  const chs = Array.from(src);
  for (let i = 0; i < chs.length; i++) {
    const ch = chs[i];
    if (ch === '·' && chs[i - 1] === ' ' && chs[i + 1] === ' ') { atoms.push({s: cur.replace(/\s+$/, ''), sep: ' · '}); cur = ''; i++; continue; }
    cur += ch;
    if ('，：；'.includes(ch)) { atoms.push({s: cur, sep: ''}); cur = ''; }
  }
  if (cur) atoms.push({s: cur, sep: ''});
  const rowW = (s: string): number => wlen(s.replace(/[，：；、]$/, ''));
  const fit = maxEm * 1.06;
  for (let i = 0; i < atoms.length; i++) { // 超长原子：优先空格/顿号后切，再不行才居中硬切
    if (rowW(atoms[i].s) <= fit) continue;
    const arr = Array.from(atoms[i].s);
    let best = -1, sep = '';
    for (let j = 1; j < arr.length - 1; j++) {
      const cut = arr[j] === ' ' ? j : arr[j - 1] === '、' ? j : -1;
      if (cut > 0 && wlen(arr.slice(0, cut).join('')) <= fit) { best = cut; sep = arr[j] === ' ' ? ' ' : ''; }
    }
    if (best < 0) { best = Math.max(1, Math.floor(arr.length / 2)); sep = ''; }
    const left = arr.slice(0, best).join('').replace(/\s+$/, '');
    const right = arr.slice(best).join('').replace(/^\s+/, '');
    const tail = atoms[i].sep;
    atoms.splice(i, 1, {s: left, sep}, {s: right, sep: tail});
    if (rowW(left) > fit) i--;
  }
  const join = (lo: number, hi: number): string => {
    let s = '';
    for (let k = lo; k <= hi; k++) s += (k > lo ? atoms[k - 1].sep : '') + atoms[k].s;
    return s;
  };
  // 行不跨 ：；（它们终结一个意思）→ 跨越的行宽记 Infinity
  const wr = (lo: number, hi: number): number => {
    for (let k = lo; k < hi; k++) if (/[：；]$/.test(atoms[k].s)) return Infinity;
    return rowW(join(lo, hi));
  };
  const total = wlen(join(0, atoms.length - 1));
  const nMin = Math.min(atoms.length, Math.max(1, Math.ceil(total / maxEm), total > 8 && atoms.length > 1 ? 2 : 1));
  for (let nRows = nMin; nRows <= atoms.length; nRows++) { // DP：n 行内最小化最长行
    const memo = new Map<string, {w: number; cuts: number[]}>();
    const best = (i: number, k: number): {w: number; cuts: number[]} => {
      if (k === 1) return {w: wr(i, atoms.length - 1), cuts: []};
      const key = `${i},${k}`;
      const hit = memo.get(key);
      if (hit) return hit;
      let r = {w: Infinity, cuts: [] as number[]};
      for (let j = i; j <= atoms.length - k; j++) {
        const rest = best(j + 1, k - 1);
        const w = Math.max(wr(i, j), rest.w);
        if (w < r.w) r = {w, cuts: [j, ...rest.cuts]};
      }
      memo.set(key, r);
      return r;
    };
    const top = best(0, nRows);
    if (Number.isFinite(top.w)) {
      const cuts = [...top.cuts, atoms.length - 1];
      const rows: string[] = [];
      let lo = 0;
      for (const c of cuts) { rows.push(join(lo, c)); lo = c + 1; }
      return rows;
    }
  }
  return [src];
};
