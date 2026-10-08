// 道具与特效小件：闹钟（三响+音弧）/ 水杯 / 起跳烟尘 / 咖啡滴拖尾 / 拍杯动线 / 冲击放射线 /
// 碎片抛物线 / 咖啡渍 / 涟漪 / 惊呼紧张线。≥3 小件纪律：烟尘、咖啡滴拖尾、冲击放射线（+动线+涟漪）。
// 技法借鉴 huashu-art-motion (MIT) scenes/16_2026.js 杯子/碎裂/紧张线，TSX 重写。
import type {CanvasCtx} from './types';
import {PAL, WORLD} from './types';
import {damped} from './damped';
import {ease, hash2, kf, lerp, path, roundRectPath, seg} from './util';
import {RINGS, ringAt, SWIPES, type CupState} from './state';

/** 闹钟：黄圆身+双铃+小锤。爆发帧锤体高频敲击+音弧 outBack 弹出；机身受击阻尼晃（签名④）。 */
export function drawAlarm(c: CanvasCtx, f: number): void {
  const X = WORLD.clockX;
  const baseY = WORLD.tableY; // 台面
  const ring = ringAt(f);
  let hammerA = Math.sin(f * 2.6) * 0.28;
  if (ring) hammerA = Math.sin((f - RINGS[ring.i]) * 3.4) * 0.55 * ring.strength;
  const bodyRock = damped(f, 62, 0.035, 8, 10) + damped(f, 2, 0.02, 8, 8) + damped(f, 24, 0.02, 8, 8);
  c.save();
  c.translate(X, baseY - 30);
  c.rotate(bodyRock);
  // 音弧（第三遍三道、前两遍两道）
  if (ring) {
    const q = ease.outBack(Math.min(1, ring.q * 2.2));
    const n = ring.strength > 0.8 ? 3 : 2;
    c.strokeStyle = PAL.yellowDk;
    c.lineWidth = 4;
    c.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const a0 = -0.5 - k * 0.28, r0 = 34 + 9 * q, r1 = 50 + 13 * q;
      c.globalAlpha = 1 - ring.q * 0.85;
      c.beginPath();
      c.arc(0, -26, (r0 + r1) / 2, a0 - 0.14, a0 + 0.14);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  // 双铃
  c.fillStyle = PAL.yellowDk;
  [-20, 20].forEach((bx) => {
    c.beginPath();
    c.arc(bx, -34, 11, Math.PI, 0);
    c.closePath();
    c.fill();
  });
  // 小锤（敲击摆动）
  c.save();
  c.translate(0, -30);
  c.rotate(hammerA);
  c.strokeStyle = PAL.navy;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(0, 4);
  c.lineTo(0, -10);
  c.stroke();
  c.fillStyle = PAL.navy;
  c.beginPath();
  c.arc(0, -13, 5.5, 0, 7);
  c.fill();
  c.restore();
  // 机身
  c.fillStyle = PAL.yellow;
  c.beginPath();
  c.arc(0, 0, 27, 0, 7);
  c.fill();
  c.fillStyle = PAL.yellowDk;
  c.beginPath();
  c.arc(0, 0, 27, -0.15 * Math.PI, 0.45 * Math.PI);
  c.fill();
  c.fillStyle = PAL.white;
  c.beginPath();
  c.arc(0, 0, 19, 0, 7);
  c.fill();
  // 表盘指针（微走时）
  const minuteA = -1.2 + (f / 383) * 0.5;
  c.strokeStyle = PAL.navy;
  c.lineWidth = 2.6;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(Math.cos(minuteA) * 13, Math.sin(minuteA) * 13);
  c.stroke();
  c.lineWidth = 3.4;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, -9);
  c.stroke();
  // 支脚
  c.fillStyle = PAL.navy;
  c.beginPath();
  c.roundRect(-18, 24, 9, 7, 3);
  c.fill();
  c.beginPath();
  c.roundRect(9, 24, 9, 7, 3);
  c.fill();
  c.restore();
}

/** 水杯：红身+深一档侧带+把手+咖啡面+茶包标签。桌上/坠落两态。 */
export function drawMug(c: CanvasCtx, x: number, y: number, rot: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.strokeStyle = PAL.cup;
  c.lineWidth = 9;
  c.beginPath();
  c.arc(-34, -2, 15, 0, 7);
  c.stroke();
  c.fillStyle = PAL.cup;
  c.fill(roundRectPath(-30, -32, 60, 66, [6, 6, 14, 14]));
  c.fillStyle = PAL.cupDk;
  c.fill(roundRectPath(12, -32, 18, 66, [0, 6, 14, 0]));
  c.fillStyle = '#7a3a1a';
  c.beginPath();
  c.ellipse(0, -32, 30, 5, 0, 0, 7);
  c.fill();
  c.strokeStyle = '#fff4ea';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-4, -33);
  c.lineTo(-6, -8);
  c.stroke();
  c.fillStyle = '#fff4ea';
  c.fill(roundRectPath(-14, -8, 16, 18, 3));
  c.fillStyle = '#4aa36a';
  c.beginPath();
  c.arc(-6, 1, 4, 0, 7);
  c.fill();
  c.restore();
}

/** 起跳/小跳烟尘：几团米色圆外扩变淡（特效小件①）。 */
export function dust(c: CanvasCtx, x: number, groundY: number, q: number): void {
  if (q <= 0 || q >= 1) return;
  c.save();
  c.fillStyle = `rgba(214,196,170,${0.7 * (1 - q)})`;
  [[-1, 0.8], [-0.5, 1.2], [0.4, 1], [1, 0.7]].forEach(([d, s]) => {
    c.beginPath();
    c.arc(x + d * (30 + 60 * q), groundY - 10 * q * s, (8 + 16 * q) * s, 0, 7);
    c.fill();
  });
  c.restore();
}

/** 咖啡滴拖尾：坠落段身后 6 颗，越早越小（特效小件②）。 */
export function drips(c: CanvasCtx, f: number): void {
  if (f < 251 || f > 266) return;
  for (let k = 1; k <= 6; k++) {
    const ff = f - k * 1.3;
    if (ff < 248) continue;
    const q = seg(ff, 247, 262);
    const x = lerp(766, 748, q), y = lerp(437, 650, q);
    const r = 7 - k * 0.8;
    c.fillStyle = PAL.coffee;
    c.beginPath();
    c.ellipse(x + 10 + k * 3, y - 30 - k * 2, r * 0.8, r * 1.2, 0, 0, 7);
    c.fill();
  }
}

/** 拍杯动线：杯子近侧 3 道短线，击中后 12 帧外扩淡出（特效小件③）。 */
export function motionMarks(c: CanvasCtx, f: number, cupXAt: (ff: number) => number): void {
  for (const f0 of SWIPES) {
    const q = (f - f0) / 12;
    if (q < 0 || q > 1) continue;
    const x = cupXAt(f) + 44;
    const a = 1 - q;
    c.save();
    c.strokeStyle = `rgba(38,42,92,${a})`;
    c.lineWidth = 4;
    c.lineCap = 'round';
    [[-0.6, 0], [0, 6], [0.6, 2]].forEach(([ang]) => {
      const r0 = 12 + q * 10, r1 = 30 + q * 14;
      c.beginPath();
      c.moveTo(x + Math.cos(ang) * r0, 424 + Math.sin(ang) * r0 * 1.5);
      c.lineTo(x + Math.cos(ang) * r1, 424 + Math.sin(ang) * r1 * 1.5);
      c.stroke();
    });
    c.restore();
  }
}

/** 两块大碎片：三点拉格朗日抛物线（f263 起飞、f276 落定）。 */
const quad3 = (f: number, a: [number, number, number], b: [number, number, number], c3: [number, number, number]): [number, number] => {
  const L = (x0: number, x1: number, x2: number, v0: number, v1: number, v2: number): number =>
    (v0 * ((f - x1) * (f - x2))) / ((x0 - x1) * (x0 - x2)) + (v1 * ((f - x0) * (f - x2))) / ((x1 - x0) * (x1 - x2)) + (v2 * ((f - x0) * (f - x1))) / ((x2 - x0) * (x2 - x1));
  return [L(a[0], b[0], c3[0], a[1], b[1], c3[1]), L(a[0], b[0], c3[0], a[2], b[2], c3[2])];
};

const SHARDS = [
  {a: [263, 727, 622] as [number, number, number], b: [269, 687, 580] as [number, number, number], c: [276, 655, 646] as [number, number, number],
    pts: [[-26, -14], [10, -24], [24, 6], [-6, 22], [-22, 10]], rot: -3},
  {a: [263, 776, 618] as [number, number, number], b: [269, 812, 590] as [number, number, number], c: [276, 812, 644] as [number, number, number],
    pts: [[-20, -20], [22, -12], [18, 18], [-14, 16]], rot: 4},
];

const BITS = Array.from({length: 9}, (_, i) => {
  const r = hash2(i, 7, 305);
  const r2 = hash2(i, 13, 306);
  const r3 = hash2(i, 29, 307);
  return {
    vx: (r - 0.5) * 9, vy: -4 - r2 * 6, s: 6 + r3 * 7,
    col: [PAL.cup, PAL.cup, PAL.coffee, '#fff4ea', PAL.cupDk][i % 5],
    spin: (hash2(i, 41, 308) - 0.5) * 0.6,
    land: 644 + r2 * 15,
  };
});

/** 碎裂全套：咖啡渍扩散+涟漪+冲击放射线+小碎屑+大碎片+把手茶包残留。 */
export function shatter(c: CanvasCtx, f: number): void {
  if (f < 263) return;
  const X = WORLD.smash.x, Y = WORLD.smash.y;
  // 咖啡渍（263:30 → 266:140 → 270:220 → 274:235）
  const sw = kf(f, [[263, 30], [266, 130], [270, 185], [274, 195]], ease.out);
  c.fillStyle = PAL.coffee;
  c.beginPath();
  c.ellipse(X + 8, Y + 4, sw / 2, sw * 0.07 + 3, 0, 0, 7);
  c.fill();
  c.fillStyle = PAL.coffeeLt;
  c.beginPath();
  c.ellipse(X - 10, Y + 1, sw * 0.18, sw * 0.022 + 1, 0, 0, 7);
  c.fill();
  // 两圈灰色涟漪
  [[263, 286], [267, 289]].forEach(([a, b], i) => {
    const q = seg(f, a, b);
    if (q <= 0 || q >= 1) return;
    const w = lerp(160, 460 - i * 90, ease.out(q));
    c.strokeStyle = `rgba(110,105,130,${0.75 * (1 - q)})`;
    c.lineWidth = 3.5;
    c.beginPath();
    c.ellipse(X + 10, Y + 6, w / 2, w * 0.075, 0, 0, 7);
    c.stroke();
  });
  // 冲击放射线（263-271）
  const iq = seg(f, 263, 271);
  if (iq < 1) {
    c.save();
    c.strokeStyle = `rgba(38,42,92,${1 - iq})`;
    c.lineWidth = 5;
    c.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI + ((k + 0.5) / 7) * Math.PI;
      const r0 = 30 + iq * 40, r1 = 58 + iq * 52;
      c.beginPath();
      c.moveTo(X + Math.cos(a) * r0, Y - 6 + Math.sin(a) * r0 * 0.75);
      c.lineTo(X + Math.cos(a) * r1, Y - 6 + Math.sin(a) * r1 * 0.75);
      c.stroke();
    }
    c.restore();
  }
  // 小碎屑：抛物线落地停住
  BITS.forEach((b) => {
    const tt = Math.max(0, f - 263);
    let x = X + b.vx * tt;
    let y = Y - 10 + b.vy * tt + 0.45 * tt * tt;
    if (y > b.land) {
      const tl = (-b.vy + Math.sqrt(b.vy * b.vy + 0.9 * (b.land - Y + 10))) / 0.45;
      x = X + b.vx * Math.max(0, tl);
      y = b.land;
    }
    c.save();
    c.translate(x, y);
    c.rotate(b.spin * Math.min(tt, 18));
    c.fillStyle = b.col;
    c.beginPath();
    c.moveTo(-b.s / 2, -b.s / 3);
    c.lineTo(b.s / 2, -b.s / 2);
    c.lineTo(b.s / 3, b.s / 2);
    c.lineTo(-b.s / 2, b.s / 3);
    c.closePath();
    c.fill();
    c.restore();
  });
  // 两块大碎片
  SHARDS.forEach((s) => {
    const ff = Math.min(f, 276);
    const [x, y] = ff < 263
      ? [lerp(X, s.a[1], seg(ff, 263, 265)), lerp(Y - 10, s.a[2], seg(ff, 263, 265))]
      : quad3(ff, s.a, s.b, s.c);
    c.save();
    c.translate(x, y);
    c.rotate(s.rot * seg(ff, 263, 276) * 0.6);
    c.fillStyle = PAL.cup;
    c.beginPath();
    s.pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.closePath();
    c.fill();
    c.fillStyle = PAL.cupDk;
    c.beginPath();
    c.moveTo(s.pts[0][0], s.pts[0][1]);
    c.lineTo(s.pts[1][0], s.pts[1][1]);
    c.lineTo(0, 0);
    c.closePath();
    c.fill();
    c.restore();
  });
  // 把手（半圆）与茶包标签留在地上
  if (f > 265) {
    c.strokeStyle = PAL.cup;
    c.lineWidth = 8;
    c.beginPath();
    c.arc(X + 30, Y - 4, 13, Math.PI, 0);
    c.stroke();
    c.fillStyle = '#fff4ea';
    c.save();
    c.translate(X - 12, Y - 4);
    c.rotate(0.5);
    c.fillRect(-8, -8, 16, 16);
    c.fillStyle = '#4aa36a';
    c.beginPath();
    c.arc(0, 0, 4, 0, 7);
    c.fill();
    c.restore();
  }
}

/** 惊呼紧张线：头顶前上 3 道，outBack 弹出，随后轻抖。 */
export function tension(c: CanvasCtx, f: number, headTop: [number, number]): void {
  if (f < 264 || f > 290) return;
  const q = seg(f, 264, 269);
  const j = f > 270 && f < 286 ? (hash2(Math.floor(f / 2), 9, 93) - 0.5) * 5 : 0;
  const o: [number, number] = [headTop[0] - 18, headTop[1] + 40];
  c.save();
  c.strokeStyle = '#e5463e';
  c.lineWidth = 7;
  c.lineCap = 'round';
  [[-2.6, 60, 26], [-2.05, 66, 30], [-1.5, 72, 30]].forEach(([a, r0, L], i) => {
    const r1 = r0 + L * ease.outBack(q);
    const aa = a + j * 0.01 * (i - 1);
    c.beginPath();
    c.moveTo(o[0] + Math.cos(aa) * r0 + j, o[1] + Math.sin(aa) * r0);
    c.lineTo(o[0] + Math.cos(aa) * r1 + j, o[1] + Math.sin(aa) * r1);
    c.stroke();
  });
  c.restore();
}

export function cupCenterOnTable(f: number, cs: CupState): {x: number; y: number; rot: number; on: boolean} | null {
  if (!cs) return null;
  if (cs.phase === 'table') return {x: cs.x, y: WORLD.tableY - 33, rot: cs.rot, on: true};
  return {x: cs.x, y: cs.y, rot: cs.rot, on: false};
}

export function pathSample(f: number, tab: Array<[number, number, number]>): [number, number] {
  return path(f, tab);
}
