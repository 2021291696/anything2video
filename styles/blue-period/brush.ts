// 宽而干的笔触引擎（签名②）+ 单色辅助件。P.strokes 机制移植（huashu-art-motion MIT, alchaincyf，
// scripts/engine/lib/paint.js）TS 重写：抖动网格取底稿色 → 沿 angle 画短笔 → 区域色板抽色。
// 本卡锁死：墙笔 cell34/len110/w34（1920 基准，1280×720 下等比 2/3 = cell23/len73/w23，
// 宽/长/低对比——cell16 短笔满墙会读成「下雨毛毯」= 印象派不是蓝色时期）、
// **lineCap 'butt'（宽笔圆头密排会连成「人头阵」，36 号踩坑回流参数）**、blur 7px 叠 α0.8。
import type {CanvasCtx} from './types';

export type RGB = [number, number, number];
export type Rng = () => number;

export function hex(h: string): RGB {
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((x) => x + x).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgb = (c: RGB, a = 1): string => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** 色组抽色：给一组 hex，返回 (底稿色, rng) → 混底后的颜色（mixBase 大=保底稿明暗多）。 */
export function swatch(hexes: string[], mixBase = 0.35): (base: RGB, r: Rng) => RGB {
  const cs = hexes.map(hex);
  return (base, r) => mix(cs[(r() * cs.length) | 0], base, mixBase);
}

export type StrokeOpts = {
  cell: number;
  len: number;
  width: number;
  seed: number;
  /** 笔向（弧度）；墙竖刷/地横刷由回调按区域决定。 */
  angle?: (x: number, y: number) => number;
  /** 区域色板：从色组抽色混底稿。 */
  palette?: (x: number, y: number, base: RGB, r: Rng) => RGB | null;
  mask?: (x: number, y: number) => boolean;
  /** 只画在 src 不透明区（角色小笔触肌理用）。 */
  alphaMask?: boolean;
  jitterCol?: number;
  outline?: number;
  outlineCol?: RGB;
  outlineMix?: number;
  /** 锁死 'butt'：宽笔密排圆头会成「人头阵」。 */
  cap?: CanvasLineCap;
  /** 只处理该矩形（角色层小笔触提速），坐标仍为全图坐标。 */
  region?: {x: number; y: number; w: number; h: number};
};

/** 流场笔触重画：在抖动网格上取 src 底稿颜色画短笔。boil=0（本卡轮廓与笔触都不沸腾）。 */
export function strokes(dst: CanvasCtx, src: HTMLCanvasElement, srcW: number, srcH: number, o: StrokeOpts): void {
  const reg = o.region ?? {x: 0, y: 0, w: srcW, h: srcH};
  const img = src.getContext('2d')!.getImageData(reg.x, reg.y, reg.w, reg.h).data;
  const r = (() => {
    let a = (o.seed * 1000) >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  dst.save();
  dst.lineCap = o.cap ?? 'butt';
  const jit = o.jitterCol ?? 18;
  const sample = (px: number, py: number): RGB | null => {
    const ix = Math.max(reg.x, Math.min(reg.x + reg.w - 1, px | 0));
    const iy = Math.max(reg.y, Math.min(reg.y + reg.h - 1, py | 0));
    const i = ((iy - reg.y) * reg.w + (ix - reg.x)) * 4;
    if (o.alphaMask && img[i + 3] < 200) return null;
    return [img[i], img[i + 1], img[i + 2]];
  };
  for (let y = reg.y; y < reg.y + reg.h + o.cell; y += o.cell) {
    for (let x = reg.x; x < reg.x + reg.w + o.cell; x += o.cell) {
      const px = x + (r() - 0.5) * o.cell, py = y + (r() - 0.5) * o.cell;
      if (o.mask && !o.mask(px, py)) continue;
      const col = sample(px, py);
      if (!col) continue;
      const pc = o.palette ? o.palette(px, py, col, r) : null;
      const a = o.angle ? o.angle(px, py) : 0;
      const l = o.len * (0.7 + r() * 0.6);
      const dx = (Math.cos(a) * l) / 2, dy = (Math.sin(a) * l) / 2;
      if (o.outline && o.outline > 0 && o.outlineCol) {
        dst.strokeStyle = rgb(mix(pc ?? col, o.outlineCol, o.outlineMix ?? 0.55), o.outline);
        dst.lineWidth = o.width + 2.5;
        dst.beginPath();
        dst.moveTo(px - dx, py - dy);
        dst.lineTo(px + dx, py + dy);
        dst.stroke();
      }
      let c = pc ?? col;
      if (!pc) c = [c[0] + (r() - 0.5) * jit, c[1] + (r() - 0.5) * jit, c[2] + (r() - 0.5) * jit];
      dst.strokeStyle = rgb(c);
      dst.lineWidth = o.width;
      dst.beginPath();
      dst.moveTo(px - dx, py - dy);
      dst.lineTo(px + dx, py + dy);
      dst.stroke();
    }
  }
  dst.restore();
}

/** 把 canvas 自身糊 px 后叠 α（蓝色时期墙面的「宽长低对比再糊」一步）。 */
export function blurOverlay(dst: CanvasCtx, canvas: HTMLCanvasElement, px: number, alpha: number): void {
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width;
  tmp.height = canvas.height;
  const tg = tmp.getContext('2d')!;
  tg.filter = `blur(${px}px)`;
  tg.drawImage(canvas, 0, 0);
  dst.save();
  dst.globalAlpha = alpha;
  dst.drawImage(tmp, 0, 0);
  dst.restore();
}

/** 干刷细丝：笔触末端露底的淡丝（静态，seeded）。 */
export function dryFilaments(dst: CanvasCtx, w: number, h: number, floor: number, seed: number, count: number): void {
  const r = (() => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  dst.save();
  dst.globalAlpha = 0.045;
  dst.strokeStyle = '#a8c0d6';
  dst.lineWidth = 1.2;
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h;
    if (x > 213 && x < 561 && y > 60 && y < 400) continue; // 窗区不给丝
    const a = y > floor ? 0 : -Math.PI / 2;
    const L = 14 + r() * 26;
    dst.beginPath();
    dst.moveTo(x, y);
    dst.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
    dst.stroke();
  }
  dst.restore();
}

/** 慢热气（签名⑤：按 0.5 倍相时升——调用方传 phase 已含慢时）。两缕细丝，正弦摆。 */
export function steam(c: CanvasCtx, phase: number, x: number, y: number, h: number): void {
  c.save();
  c.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const rise = (phase * 0.24 + i * 0.5) % 1;
    const py = y - rise * h;
    const al = (1 - rise) * 0.5;
    if (al <= 0.02) continue;
    c.strokeStyle = `rgba(200,215,230,${al.toFixed(3)})`;
    c.lineWidth = 2.4;
    c.beginPath();
    const wob = Math.sin(rise * 6.2 + i * 2.4) * 7 * (0.3 + rise);
    c.moveTo(x + wob * 0.4, py + 16);
    c.quadraticCurveTo(x + wob + 3, py + 8, x + wob * 0.6, py);
    c.quadraticCurveTo(x + wob - 4, py - 8, x + wob * 0.8, py - 15);
    c.stroke();
  }
  c.restore();
}
