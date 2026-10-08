import React from 'react';
import {useVideoConfig} from 'remotion';
import {clamp01} from '../common';
import {LA, EASE, polyLen} from './kit';

/**
 * line-art 竞品技法增补（opt-in，默认不启用；不触碰 kit.tsx 任何现有导出与默认输出）。
 * 技法借鉴 lanshu-create-ai-presenter-video（MIT, cclank）——explainer/kits/v3-notebook 的
 * 便利贴拍入/逐行书写/撕走、橡皮搓擦、方格纸/索引卡、书写窗口（Uncover）、荧光笔，
 * 以 React/TSX + useCurrentFrame 纯帧函数重写（源为 DOM/JS 惯用法，未拷代码结构）。
 *
 * 纪律说明：本文件组件引入纸品道具色（便利贴黄/胶带/方格线等），是 opt-in 道具的局部色，
 * 不进 SPEC 双色上限（双色纪律只约束一笔画本体与标注）；动画全部是 N 的一元函数，可 seek。
 */

// ---- 道具色 token（opt-in 道具专用） ----
export const LA_PAPER = '#f4ede0'; // 方格纸底
export const LA_INDEX = '#fbf8f1'; // 索引卡底
export const LA_STICKY = '#ffe68a'; // 便利贴黄
export const LA_TAPE = 'rgba(233, 217, 168, 0.85)'; // 胶带
export const LA_GRID = 'rgba(190, 172, 140, 0.42)'; // 方格线
export const LA_MARGIN = 'rgba(214, 120, 104, 0.7)'; // 红边线
export const LA_PENCIL = '#9c9186'; // 铅笔灰（toPencil 褪色目标）
export const LA_HL = 'rgba(255, 210, 63, 0.62)'; // 荧光笔（multiply）
export const LA_HL_WARN = 'rgba(240, 132, 52, 0.42)'; // 荧光笔 warn 变体

// ---- 局部缓动（v3-notebook 手感：easeInQuad 拍入/撕走、easeInOutQuad 搓擦、easeOutQuad 滑入） ----
const easeInQuad = (t: number): number => { const c = clamp01(t); return c * c; };
const easeOutQuad = (t: number): number => { const c = clamp01(t); return 1 - (1 - c) * (1 - c); };
const easeInOutQuad = (t: number): number => {
  const c = clamp01(t);
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
};

/** #rrggbb 线性插值（toPixel 语义的配套工具：被擦内容 stroke/fill 褪向铅笔灰）。 */
export const mixHex = (a: string, b: string, t: number): string => {
  const p = (s: string): [number, number, number] => [
    parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const u = clamp01(t);
  const m = (x: number, y: number) => Math.round(x + (y - x) * u).toString(16).padStart(2, '0');
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
};

// ---- Uncover 书写窗口：外层 overflow:hidden margin:-0.22em -0.14em + 内层 padding 互偿； ----
// reveal=外层 translateX((u-1)*100%)+内层 translateX((1-u)*100%) 反向对滑（linear）——整段文本
// "被写出来"的最廉价实现，不拆字符。落定后无 transform（零逐帧开销）。
export const Uncover: React.FC<{
  N: number; at: number; dur: number; text?: string; children?: React.ReactNode; style?: React.CSSProperties;
}> = ({N, at, dur, text, children, style}) => {
  const u = clamp01((N - at) / Math.max(1, dur));
  if (u <= 0) return null;
  const settled = u >= 1;
  return (
    <span style={{display: 'inline-block', overflow: 'hidden', margin: '-0.22em -0.14em', verticalAlign: 'bottom',
      whiteSpace: 'nowrap', transform: settled ? undefined : `translateX(${((u - 1) * 100).toFixed(2)}%)`, ...style}}>
      <span style={{display: 'block', padding: '0.22em 0.14em', whiteSpace: 'nowrap',
        transform: settled ? undefined : `translateX(${((1 - u) * 100).toFixed(2)}%)`}}>
        {text ?? children}
      </span>
    </span>
  );
};

// ---- Highlighter 荧光笔：multiply 叠在纸面上、不对称圆角、scaleX 0→1 origin left；warn 变体橙色 ----
export const Highlighter: React.FC<{
  N: number; at: number; dur?: number; x?: number | string; y?: number | string; w: number | string;
  h?: number | string; tone?: 'hl' | 'warn'; out?: readonly [number, number]; z?: number;
}> = ({N, at, dur, x = 0, y = 0, w, h = '0.66em', tone = 'hl', out, z}) => {
  const {fps} = useVideoConfig();
  const D = dur ?? Math.max(1, Math.round(fps * 0.4));
  const u = easeInOutQuad(clamp01((N - at) / D));
  const gone = out ? clamp01((N - out[0]) / Math.max(1, out[1])) : 0;
  if (u <= 0 || gone >= 1) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, zIndex: z,
      background: tone === 'warn' ? LA_HL_WARN : LA_HL, mixBlendMode: 'multiply',
      borderRadius: '12px 20px 14px 22px', transformOrigin: '0% 50%',
      transform: `scaleX(${u.toFixed(3)})`, opacity: 1 - gone}} />
  );
};

// ---- 便利贴折行（贪心：标点后断、行首禁闭合标点）——与 DP 折行（chalk 卡）分工：纸品短句用贪心 ----
export const noteLines = (text: string, maxEm: number): string[] => {
  const toks = text.match(/[A-Za-z0-9.%+\-/·×÷]+|\s+|./gu) ?? [];
  const isCJK = (ch: string): boolean => ch.charCodeAt(0) >= 0x2e80;
  const width = (s: string): number => Array.from(s).reduce((a, ch) => a + (isCJK(ch) ? 1 : ch === ' ' ? 0.3 : 0.52), 0);
  const out: string[] = [];
  let cur = '', w = 0, lastPunct = -1;
  for (const tk of toks) {
    const tw = width(tk);
    if (w + tw > maxEm && cur.trim() && !/^[，。；：、！？,.;:!?）)]$/.test(tk)) {
      if (lastPunct > cur.length * 0.3) { out.push(cur.slice(0, lastPunct).trim()); cur = cur.slice(lastPunct).replace(/^\s+/, ''); }
      else { out.push(cur.trim()); cur = ''; }
      w = width(cur);
      lastPunct = -1;
      if (/^\s+$/.test(tk) && !cur) continue;
    }
    cur += tk;
    w += tw;
    if (/[，。；：！？,;]/.test(tk)) lastPunct = cur.length;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};

/**
 * StickyNote 便利贴：拍入（slap dur 0.16s easeInQuad，起始 scale1.16/rot+7°/y-22px，opacity 半程内出现，
 * 落定即静止无回弹）→ 逐行书写（at+0.2s 等落定才开始；每行 dur=clamp(非空白字符数*speed, 0.14..0.75s)，
 * 行间隔 0.06s）→ peel 撕走（out 时刻 v=easeInQuad：y-=80v, x+=120v, r+=14°, opacity=1-v）。
 */
export const StickyNote: React.FC<{
  N: number; at: number; x: number; y: number; width?: number; rot?: number; size?: number;
  text?: string; maxEm?: number; speed?: number; out?: readonly [number, number];
  tape?: boolean; z?: number; children?: React.ReactNode;
}> = ({N, at, x, y, width = 520, rot = -1.6, size = 22, text, maxEm, speed = 0.05, out, tape = true, z, children}) => {
  const {fps} = useVideoConfig();
  const S = (s: number): number => Math.max(1, Math.round(fps * s));
  const dur = S(0.16);
  const u = easeInQuad(clamp01((N - at) / dur));
  const op = clamp01((N - at) / Math.max(1, Math.round(dur * 0.5)));
  const v = out ? easeInQuad(clamp01((N - out[0]) / Math.max(1, out[1]))) : 0;
  if (op <= 0 || v >= 1) return null;
  const r = rot + 7 * (1 - u); // 落定后静止于 rot（无回弹）
  const dx = 120 * v, dy = -80 * v;
  const rr = r + 14 * v;
  const oo = op * (1 - v);
  const transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${rr.toFixed(2)}deg) scale(${(1 + 0.16 * (1 - u)).toFixed(3)})`;
  const lines = text ? noteLines(text, maxEm ?? Math.floor((width - 64) / (size * 0.86))) : [];
  let tt = at + S(0.2); // 等落定才开始写
  return (
    <div style={{position: 'absolute', left: x, top: y, width, padding: '30px 30px 30px 34px', boxSizing: 'border-box',
      background: LA_STICKY, boxShadow: '0 16px 22px rgba(42, 35, 32, .2), 0 2px 3px rgba(42, 35, 32, .1)',
      color: LA.ink, fontFamily: "'Noto Sans SC', sans-serif", fontSize: size, lineHeight: 1.5,
      opacity: oo, transform, zIndex: z}}>
      {tape ? (
        <div style={{position: 'absolute', left: '50%', top: -20, width: 140, height: 42, marginLeft: -70, borderRadius: 2,
          background: LA_TAPE, transform: 'rotate(-3deg)', boxShadow: '0 2px 4px rgba(42, 35, 32, .12)'}} />
      ) : null}
      {text
        ? lines.map((ln, i) => {
          const non = ln.replace(/\s/g, '').length;
          const d = Math.max(S(0.14), Math.min(S(0.75), Math.round(non * speed * fps)));
          const el = <Uncover N={N} at={tt} dur={d}>{ln}</Uncover>;
          tt += d + S(0.06);
          return <div key={i} style={{display: 'block'}}>{el}</div>;
        })
        : children}
    </div>
  );
};

// ---- Eraser 橡皮：120×60 圆角 10 双色（粉 #eba7a0 62% + 蓝 #2e5a9c）固定 rotate(-24deg)； ----
// rub 沿折线点列匀速分段行进、段内 easeInOutQuad（一下一下搓擦）；擦前 0.14s 从 (+160,+140) 斜向
// 滑入 easeOutQuad 淡入、擦完 0.2s 同向滑出。toPencil=true 擦过处留铅笔灰底痕；被擦内容自身
// 褪色用 mixHex(原色, LA_PENCIL, p)（内容与橡皮解耦，纯帧函数可 seek）。
export type RubRun = {t0: number; t1: number; pts: [number, number][]};
const rubD = (pts: [number, number][]): string => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
/** 搓擦进行中的橡皮中心位置；不在任何 run 期间返回 null。 */
export const eraserAt = (N: number, runs: RubRun[]): {x: number; y: number} | null => {
  for (const r of runs) {
    if (N < r.t0 || N > r.t1) continue;
    const segs = r.pts.length - 1;
    const s = clamp01((N - r.t0) / Math.max(1, r.t1 - r.t0)) * segs;
    const i = Math.min(segs - 1, Math.floor(s));
    const f = easeInOutQuad(s - i);
    return {x: r.pts[i][0] + (r.pts[i + 1][0] - r.pts[i][0]) * f, y: r.pts[i][1] + (r.pts[i + 1][1] - r.pts[i][1]) * f};
  }
  return null;
};
export const Eraser: React.FC<{N: number; runs: RubRun[]; toPencil?: boolean}> = ({N, runs, toPencil = false}) => {
  const {fps} = useVideoConfig();
  const PRE = Math.max(1, Math.round(fps * 0.14));
  const POST = Math.max(1, Math.round(fps * 0.2));
  let phase: {p: {x: number; y: number}; o: number} | null = null;
  for (const r of runs) {
    if (N < r.t0 - PRE || N > r.t1 + POST) continue;
    if (N < r.t0) {
      const u = easeOutQuad(clamp01((N - (r.t0 - PRE)) / PRE));
      phase = {p: {x: r.pts[0][0] + 160 * (1 - u), y: r.pts[0][1] + 140 * (1 - u)}, o: u};
    } else if (N <= r.t1) {
      phase = {p: eraserAt(N, [r]) ?? {x: r.pts[0][0], y: r.pts[0][1]}, o: 1};
    } else {
      const u = clamp01((N - r.t1) / POST);
      const last = r.pts[r.pts.length - 1];
      phase = {p: {x: last[0] + 160 * u, y: last[1] + 140 * u}, o: 1 - u};
    }
    break;
  }
  if (!phase || phase.o <= 0) return null;
  return (
    <>
      {toPencil ? (
        <svg width={1280} height={720} style={{position: 'absolute', inset: 0}}>
          {runs.map((r, i) => {
            if (N < r.t0) return null;
            const len = polyLen(r.pts);
            const e = EASE(clamp01((N - r.t0) / Math.max(1, r.t1 - r.t0)));
            return (
              <path key={i} d={rubD(r.pts)} fill="none" stroke={LA_PENCIL} strokeWidth={56} strokeLinecap="round"
                strokeLinejoin="round" opacity={0.14} style={{filter: 'blur(6px)'}}
                strokeDasharray={`${e * len} ${len + 100}`} />
            );
          })}
        </svg>
      ) : null}
      <div style={{position: 'absolute', left: phase.p.x - 60, top: phase.p.y - 30, width: 120, height: 60, borderRadius: 10,
        background: 'linear-gradient(90deg, #eba7a0 0 62%, #2e5a9c 62%)', boxShadow: '0 8px 10px rgba(42, 35, 32, .25)',
        transform: 'rotate(-24deg)', opacity: phase.o, pointerEvents: 'none'}} />
    </>
  );
};

// ---- GridPaper 方格纸底容器：48px 方格 + 左红边线 + 装订孔；variant='index' 索引卡（蓝横线 + 红竖线） ----
export const GridPaper: React.FC<{
  x?: number; y?: number; w: number; h: number; variant?: 'grid' | 'index'; marginX?: number;
  holes?: number[]; holeX?: number; elevation?: boolean; z?: number;
}> = ({x = 0, y = 0, w, h, variant = 'grid', marginX = 92, holes, holeX = 58, elevation = true, z}) => {
  const holeYs = holes ?? (variant === 'grid' ? [Math.round(h * 0.25), Math.round(h * 0.5), Math.round(h * 0.75)] : undefined);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, zIndex: z,
      background: variant === 'grid' ? LA_PAPER : LA_INDEX,
      backgroundImage: variant === 'grid'
        ? `linear-gradient(${LA_GRID} 1.5px, rgba(0,0,0,0) 1.5px), linear-gradient(90deg, ${LA_GRID} 1.5px, rgba(0,0,0,0) 1.5px)`
        : 'repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 58px, rgba(46, 90, 156, 0.26) 58px 60px)',
      backgroundSize: variant === 'grid' ? '48px 48px' : undefined,
      boxShadow: elevation ? '0 10px 18px rgba(42, 35, 32, 0.08)' : undefined}}>
      <div style={{position: 'absolute', top: 0, bottom: 0, left: marginX, width: 3, background: LA_MARGIN}} />
      {holeYs?.map((hy, i) => (
        <div key={i} style={{position: 'absolute', left: holeX - 22, top: hy - 22, width: 44, height: 44, borderRadius: '50%',
          background: '#e2d6c1', boxShadow: 'inset 0 4px 6px rgba(42, 35, 32, 0.28)'}} />
      ))}
    </div>
  );
};
