// 橡皮管图元库（签名 ①②③）。
// 机制借鉴 huashu-art-motion 33_rubberhose (MIT)，Remotion/TSX 重写：
// stepTime 12fps 步进 / bnc 拍子弹跳 / boing 落地压扁 / Catmull-Rom smooth /
// pieEye 派切眼 / hose 恒粗面条臂 / glove 白手套 4 指。
import {BEAT, INK, WHITE, type CanvasCtx} from './types';

/** 确定性随机：mulberry32（禁 Math.random/Date） */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** 格点哈希：同一 (x,y) 恒定，用于「每物一相」类确定性抖动 */
export function hash2(x: number, y: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}
export const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v));

/** 签名①：12fps 步进时基（一拍二）——角色与母题全部吃 tq，端枕头也步进：「一顿一顿」是风格的一半不是卡顿 */
export const stepTime = (t: number, fps = 12): number => Math.floor(t * fps) / fps;

/** 签名③：拍子弹跳。0 = 落地，1 = 最高点；ph 各物错 0.25 拍 */
export const bnc = (tq: number, ph = 0): number => Math.abs(Math.sin(Math.PI * (tq / BEAT + ph)));

/**
 * 以着地点 (ax,ay) 为轴上弹 amp 像素：落地压扁 sx+0.09k / sy−0.09k，腾空拉长 5%k。
 * 【世界坐标约定】fn 里用绝对坐标画（布景/家具用这个——与源码 33_rubberhose 语义一致）。
 */
export function boing(c: CanvasCtx, ax: number, ay: number, b: number, amp: number, fn: () => void, k = 1): void {
  c.save();
  c.translate(ax, ay - b * amp);
  const sq = (1 - b) * 0.09 * k;
  const st = b * 0.05 * k;
  c.scale(1 + sq - st * 0.6, 1 - sq + st);
  c.translate(-ax, -ay);
  fn();
  c.restore();
}

/**
 * boing 的【本地坐标】版：fn 以 (0,0) 为着地点画本体（演员用这个）。
 * 平移到提起后的着地点，再绕该点挤压/拉伸——地面点映射到 (ax, ay − b·amp)。
 */
export function boingLocal(c: CanvasCtx, ax: number, ay: number, b: number, amp: number, fn: () => void, k = 1): void {
  c.save();
  c.translate(ax, ay - b * amp);
  const sq = (1 - b) * 0.09 * k;
  const st = b * 0.05 * k;
  c.scale(1 + sq - st * 0.6, 1 - sq + st);
  fn();
  c.restore();
}

/** 墨线笔（圆角连接——卡通线没有尖角） */
export function ink(c: CanvasCtx, w = 6): void {
  c.strokeStyle = INK;
  c.lineWidth = w;
  c.lineJoin = 'round';
  c.lineCap = 'round';
}
/** 填色 + 描墨边一步 */
export function F(c: CanvasCtx, p: Path2D, col: string, w = 6): void {
  c.fillStyle = col;
  c.fill(p);
  ink(c, w);
  c.stroke(p);
}
export const circ = (x: number, y: number, r: number): Path2D => {
  const p = new Path2D();
  p.arc(x, y, r, 0, Math.PI * 2);
  return p;
};
export const ell = (x: number, y: number, rx: number, ry: number, a = 0): Path2D => {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, a, 0, Math.PI * 2);
  return p;
};

/** Catmull-Rom → 三次贝塞尔。卡通里折线一眼直边，一切身体轮廓必须过 smooth */
export function smooth(pts: Array<[number, number]>, closed = true): Path2D {
  const p = new Path2D();
  const n = pts.length;
  if (n < 2) return p;
  const at = (i: number): [number, number] => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  p.moveTo(pts[0][0], pts[0][1]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    p.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1],
    );
  }
  if (closed) p.closePath();
  return p;
}

/** 签名②·派切眼：白眼眶 + 黑瞳，黑瞳上切掉一块楔形（arc −1.45..−0.85）——30 年代的标志 */
export function pieEye(c: CanvasCtx, x: number, y: number, rx: number, ry: number, look: number, blink: boolean, lash: boolean): void {
  if (blink) {
    ink(c, 5);
    c.beginPath();
    c.ellipse(x, y + ry * 0.2, rx, ry * 0.5, 0, 0.15, Math.PI - 0.15);
    c.stroke();
    return;
  }
  F(c, ell(x, y, rx, ry), WHITE, 4.5);
  const px = x + look * rx * 0.35;
  const py = y + ry * 0.25;
  c.save();
  c.clip(ell(x, y, rx, ry));
  c.fillStyle = INK;
  c.beginPath();
  c.ellipse(px, py, rx * 0.62, ry * 0.7, 0, 0, Math.PI * 2);
  c.fill();
  // 派切：瞳上切楔形，读作「上眼睑压下来」
  c.fillStyle = WHITE;
  c.beginPath();
  c.moveTo(px + rx * 0.05, py - ry * 0.05);
  c.arc(px, py, ry, -1.45, -0.85);
  c.closePath();
  c.fill();
  c.restore();
  if (lash) {
    ink(c, 4);
    for (let k = 0; k < 3; k++) {
      const a = -2.5 + k * 0.45;
      c.beginPath();
      c.moveTo(x + Math.cos(a) * rx, y + Math.sin(a) * ry);
      c.lineTo(x + Math.cos(a) * (rx + 14), y + Math.sin(a) * (ry + 14));
      c.stroke();
    }
  }
}

/** 签名②·橡皮管臂：没有肘的一根面条（二次贝塞尔），粗细恒定，黑边 +10px */
export function hose(c: CanvasCtx, A: [number, number], B: [number, number], bend: number, w: number, col: string): void {
  const mx = (A[0] + B[0]) / 2;
  const my = (A[1] + B[1]) / 2;
  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  const L = Math.hypot(dx, dy) || 1;
  const C: [number, number] = [mx - (dy / L) * bend, my + (dx / L) * bend];
  c.lineCap = 'round';
  c.strokeStyle = INK;
  c.lineWidth = w + 10;
  c.beginPath();
  c.moveTo(A[0], A[1]);
  c.quadraticCurveTo(C[0], C[1], B[0], B[1]);
  c.stroke();
  c.strokeStyle = col;
  c.lineWidth = w;
  c.stroke();
}

/** 签名②·白手套：四指、外翻袖口、手背三道线 */
export function glove(c: CanvasCtx, x: number, y: number, ang: number, s = 1): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);
  F(c, smooth([[-30, -14], [-8, -24], [16, -22], [30, -12], [34, 4], [24, 20], [4, 24], [-20, 18], [-32, 4]]), WHITE, 5);
  ([[22, -18], [30, -6], [30, 8]] as Array<[number, number]>).forEach(([fx, fy]) => F(c, ell(fx + 6, fy, 11, 8, 0.2), WHITE, 5));
  F(c, smooth([[-30, -20], [-46, -26], [-50, 0], [-46, 26], [-30, 20], [-26, 0]]), WHITE, 5);
  ink(c, 3);
  [-6, 2, 10].forEach((xx) => {
    c.beginPath();
    c.moveTo(xx - 10, xx * 0.2 - 2);
    c.lineTo(xx + 2, xx * 0.2 - 4);
    c.stroke();
  });
  c.restore();
}

/** 锯齿爆炸星（敲锣冲击/闹铃炸响共用） */
export function burstStar(c: CanvasCtx, x: number, y: number, r: number, spikes = 8, inner = 0.45, col = WHITE, w = 4): void {
  const p = new Path2D();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const rr = i % 2 ? r * inner : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) p.moveTo(px, py);
    else p.lineTo(px, py);
  }
  p.closePath();
  F(c, p, col, w);
}

/** 卡通音符（♪ 全音符加杆）：随拍从声源弹出 */
export function noteGlyph(c: CanvasCtx, x: number, y: number, s: number, rot: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(s, s);
  const head = ell(0, 0, 9, 6.5, -0.4);
  F(c, head, INK, 3.5);
  ink(c, 4);
  c.beginPath();
  c.moveTo(8, -2);
  c.lineTo(8, -26);
  c.stroke();
  F(c, ell(15, -26, 6, 4.5, -0.3), INK, 3);
  c.restore();
}
