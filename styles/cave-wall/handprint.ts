// 签名④：负形手印/爪印 —— 高斯喷点 → destination-out 实心手形蒙版（挖出岩壁色）→ α0.3 补蒙版色。
// 技法借鉴 huashu-art-motion scenes/01_cave.js（MIT, alchaincyf），TS 重写。
// 踩坑继承：手形必须逐块 fill——把手掌/手指 addPath 进单个 Path2D 一次 fill，
// 子路径绕向相反处 nonzero 会抵消出缺口；手指胶囊各自闭合、逐块 fill。
import {type CanvasCtx} from './types';
import {spray, sprayBurst} from './charcoal';

/** 手形（中心原点、指尖朝上），返回若干块（逐块 fill）。 */
export function handBlocks(s = 1): Path2D[] {
  const out: Path2D[] = [];
  const palm = new Path2D();
  palm.ellipse(0, 8 * s, 26 * s, 31 * s, 0, 0, Math.PI * 2);
  out.push(palm);
  // 4 指 + 拇指：角度/长度/偏移（-0.5/-0.17/0.14/0.46 与拇指 -1.25）
  const fingers: Array<[number, number, number]> = [[-0.5, 54, -17], [-0.17, 64, -6], [0.14, 62, 6], [0.46, 50, 17], [-1.25, 46, -20]];
  fingers.forEach(([a, l, ox], k) => {
    const A: [number, number] = k < 4 ? [ox * s, -8 * s] : [-18 * s, 18 * s];
    const B: [number, number] = [A[0] + Math.sin(a) * l * s, A[1] - Math.cos(a) * l * s];
    const n = Math.atan2(B[1] - A[1], B[0] - A[0]) + Math.PI / 2;
    const w = (k < 4 ? 7 : 8) * s;
    const p = new Path2D();
    p.moveTo(A[0] + Math.cos(n) * w, A[1] + Math.sin(n) * w);
    p.lineTo(B[0] + Math.cos(n) * w * 0.85, B[1] + Math.sin(n) * w * 0.85);
    p.arc(B[0], B[1], w * 0.85, n, n + Math.PI, true);
    p.lineTo(A[0] - Math.cos(n) * w, A[1] - Math.sin(n) * w);
    p.closePath();
    out.push(p);
  });
  const wrist = new Path2D();
  wrist.rect(-16 * s, 26 * s, 32 * s, 46 * s);
  out.push(wrist);
  return out;
}

/** 爪印（掌垫 + 四趾）。 */
export function pawBlocks(s = 1): Path2D[] {
  const out: Path2D[] = [];
  const pad = new Path2D();
  pad.ellipse(0, 8 * s, 15 * s, 12 * s, 0, 0, Math.PI * 2);
  out.push(pad);
  [[-16, -10], [-6, -19], [6, -19], [16, -10]].forEach(([x, y]) => {
    const q = new Path2D();
    q.ellipse(x * s, y * s, 6 * s, 7.5 * s, 0, 0, Math.PI * 2);
    out.push(q);
  });
  return out;
}

/**
 * 负形喷绘：320² 临时层高斯喷点两层（σ46·3200 + σ28·1400）→ destination-out 手形蒙版 → α0.3 补色。
 * grow∈(0,1]：蒙版从掌心长出（拍上岩壁的显形动画）。
 */
export function stencil(
  g: CanvasCtx, x: number, y: number, rot: number, s: number, col: string, seed: number,
  blocks: (s: number) => Path2D[], grow = 1,
): void {
  const tmp = document.createElement('canvas');
  tmp.width = 320; tmp.height = 320;
  const tg = tmp.getContext('2d')!;
  spray(tg, 160, 160, 46 * s, 3200, col, seed, 0.8, 3.2, 0.15, 0.6);
  spray(tg, 160, 160, 28 * s, 1400, col, seed + 1, 1, 3.5, 0.3, 0.75);
  const mk = document.createElement('canvas');
  mk.width = 320; mk.height = 320;
  const mg = mk.getContext('2d')!;
  mg.translate(160, 160);
  mg.rotate(rot);
  mg.scale(grow, grow);
  mg.fillStyle = '#f6e2bc';
  blocks(s).forEach((p) => mg.fill(p)); // 逐块 fill，防 nonzero 抵消缺口
  tg.globalCompositeOperation = 'destination-out';
  tg.globalAlpha = 0.95;
  tg.drawImage(mk, 0, 0);
  tg.globalCompositeOperation = 'source-over';
  tg.globalAlpha = 0.3;
  tg.drawImage(mk, 0, 0);
  tg.globalAlpha = 1;
  g.drawImage(tmp, x - 160, y - 160);
}

/** 静态旧印（底版用）：5 手印 + 1 爪印 + 红点弧 + 更淡的远古炭涂鸦。 */
export function staticHands(g: CanvasCtx): void {
  const HANDS: Array<[number, number, number, number]> = [
    [180, 260, -0.35, 0.95], [290, 480, 0.25, 0.9], [1290, 160, 0.05, 0.95],
    [1900, 470, -0.2, 1.0], [1980, 700, 0.3, 0.92],
  ];
  HANDS.forEach(([x, y, a, s], k) => stencil(g, x, y, a, s, '#8e2a1a', 31 + k * 17, handBlocks));
  stencil(g, 150, 930, 0, 0.5, '#7d2818', 77, pawBlocks);
  // 红点弧（沿世界底部）
  for (let k = 0; k < 16; k++) {
    const x = 560 + k * 52, y = 986 - Math.sin((k / 15) * Math.PI) * 60;
    spray(g, x, y, 3.5, 40, '#9a2e1c', 200 + k, 0.8, 2, 0.4, 0.8);
    g.globalAlpha = 0.75;
    g.fillStyle = '#9a2e1c';
    g.beginPath();
    g.ellipse(x, y, 5.5, 5.2, (x + y) * 0.1, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }
  // 远古淡炭涂鸦（更早的失败尝试：一只残缺兽形）
  g.strokeStyle = 'rgba(40,26,16,.38)';
  g.lineWidth = 3.4;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const old: Array<[number, number]> = [[1560, 640], [1620, 600], [1700, 590], [1760, 620], [1770, 680], [1720, 710], [1640, 700], [1580, 690]];
  g.beginPath();
  old.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
  g.stroke();
  [[1700, 640, 1730, 700], [1730, 640, 1750, 690], [1620, 700, 1610, 750]].forEach(([x0, y0, x1, y1]) => {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  });
}

/** 手印位置表（活手印 + 呼吸暖光用，世界坐标）。 */
export const LIVE_HAND: [number, number] = [1430, 285];
export const GLOW_HANDS: Array<[number, number]> = [[180, 260], [290, 480], [1290, 160], [1900, 470], [1980, 700], [1430, 285]];

/** 活手印（HERO 拍壁）：spray → destination-out 手形，k∈[0,1] 显形进度。 */
export function drawLiveHand(g: CanvasCtx, f: number): void {
  const F0 = 240;
  if (f < F0) return;
  const q = Math.min(1, (f - F0) / 9);
  const grow = 0.55 + 0.45 * Math.min(1, q * 1.4);
  const a = q < 1 ? q : 1;
  g.save();
  g.globalAlpha = a;
  stencil(g, LIVE_HAND[0], LIVE_HAND[1], -0.28, 0.98, '#8e2a1a', 311, handBlocks, grow);
  g.restore();
  if (f - F0 < 8) sprayBurst(g, LIVE_HAND[0], LIVE_HAND[1], 313, 1 + (f - F0) * 0.2);
}
