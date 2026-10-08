// 猫角色绘制（无描边色块 + 同色系深一档分体块，签名⑥）。
// 拍杯对准走签名⑦：先施前倾变换，再用 c.getTransform().invertSelf().transformPoint(杯沿)
// 把世界目标换回局部坐标当爪子目标——否则前倾后爪子会戳进桌面。
// 技法借鉴 huashu-art-motion (MIT) scenes/16_2026.js drawCat，TSX 重写（姿势/分镜全新排布）。
import type {CanvasCtx} from './types';
import {PAL, WORLD} from './types';
import {clamp, ease, hash2, lerp, seg, smoothPath, taper} from './util';
import {applyCatTransform, type CatTransform} from './pose';
import {pawReach, type CatState} from './state';

/** 拍杯段身体前倾量：按「肩到杯沿的世界距离」定这一拍要趴多低。 */
function leanFor(dist: number): number {
  return 0.1 + 0.28 * clamp((dist - 40) / 130);
}

export function drawCat(c: CanvasCtx, s: CatState, f: number, t: number, cupXAt: (ff: number) => number): void {
  const p = s.pose;
  c.save();
  applyCatTransform(c, s as CatTransform & CatState, p.gy);

  // —— 拍杯：前倾 + 目标反算（签名⑦）——
  let front = p.front.map((l) => l.slice() as [number, number, number, number]);
  const pr = f >= 197 && f < 246 ? pawReach(f) : null;
  const watch = f >= 184 && f < 197 ? seg(f, 184, 190) * 0.08 : f >= 246 && f < 264 ? 0.16 : 0;
  let lean = s.lean;
  if (pr) {
    const rimWorld: [number, number] = [cupXAt(Math.min(f, pr.f0 + 3)) + 30, 414]; // 杯近侧沿（世界）
    const shoulderWorldDist = Math.abs(rimWorld[0] - (s.x - 80));
    const Lmax = leanFor(shoulderWorldDist);
    lean = pr.k === 'wind' ? lerp(0.08, Lmax * 0.45, pr.q)
      : pr.k === 'hit' ? lerp(Lmax * 0.45, Lmax, pr.q)
      : pr.k === 'hold' ? Lmax
      : lerp(Lmax, 0.08, pr.q);
    // 先施前倾，再拿当前全变换的逆矩阵把杯沿换回局部坐标
    const gy = p.gy;
    c.translate(0, gy);
    c.rotate(lean);
    c.scale(1, 1 - lean * 0.35);
    c.translate(0, -gy);
    const m = c.getTransform().invertSelf();
    const tw = m.transformPoint(new DOMPoint(rimWorld[0], rimWorld[1]));
    const tgt: [number, number] = [tw.x, tw.y];
    const rest: [number, number] = [p.front[0][2], p.front[0][3]];
    const up: [number, number] = [p.front[0][0] + 34, p.front[0][1] - 42];
    let pt: [number, number];
    if (pr.k === 'wind') pt = [lerp(rest[0], up[0], pr.q), lerp(rest[1], up[1], pr.q)];
    else if (pr.k === 'hit') pt = [lerp(up[0], tgt[0], pr.q), lerp(up[1], tgt[1], pr.q)];
    else if (pr.k === 'hold') pt = tgt;
    else pt = [lerp(tgt[0], rest[0], pr.q), lerp(tgt[1], rest[1], pr.q)];
    front[0] = [p.front[0][0] + 8, p.front[0][1] - 10, pt[0], pt[1]];
  } else if (watch) {
    const gy = p.gy;
    c.translate(0, gy);
    c.rotate(watch);
    c.scale(1, 1 - watch * 0.35);
    c.translate(0, -gy);
  }

  // —— 尾巴：粗线 + 虚线环纹 + 白尖；常时慢摆，定帧段保留尾尖微摆（结尾纪律）——
  const idleSway = Math.sin(t * 4.4) * 14 + (pr ? Math.sin(t * 14) * 10 : 0);
  const tl = p.tail.map((q) => q.slice() as [number, number]);
  tl[3][0] += idleSway * 0.6;
  tl[3][1] += idleSway;
  tl[2][0] += idleSway * 0.3;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const tailP = new Path2D();
  tailP.moveTo(tl[0][0], tl[0][1]);
  tailP.bezierCurveTo(tl[1][0], tl[1][1], tl[2][0], tl[2][1], tl[3][0], tl[3][1]);
  c.strokeStyle = PAL.orange;
  c.lineWidth = 30;
  c.stroke(tailP);
  c.save();
  c.setLineDash([9, 16]);
  c.lineDashOffset = 4;
  c.strokeStyle = PAL.orangeDk;
  c.lineWidth = 30;
  c.lineCap = 'butt';
  c.stroke(tailP);
  c.restore();
  if (p.tipW > 0.05) {
    c.save();
    c.globalAlpha = p.tipW;
    const q = new Path2D();
    q.arc(tl[3][0], tl[3][1], 26, 0, 7);
    c.clip(q);
    c.strokeStyle = PAL.catWhite;
    c.lineWidth = 30;
    c.stroke(tailP);
    c.restore();
  }

  // —— 后腿（腾空可见）——
  c.fillStyle = PAL.orangeDk;
  c.fill(taper([p.hind[0], p.hind[1]], [p.hind[2], p.hind[3]], 46, 30, 6));

  // —— 远侧前腿（奶色）——
  const leg = (l: [number, number, number, number], col: string, pawCol: string): void => {
    c.fillStyle = col;
    c.fill(taper([l[0], l[1]], [l[2], l[3]], 32, 28));
    c.fillStyle = pawCol;
    c.beginPath();
    c.ellipse(l[2], l[3] - 2, 21, 13, 0, 0, 7);
    c.fill();
  };
  leg(front[1], PAL.catCream, PAL.catWhite);

  // —— 身体（无描边平涂）+ 白胸 + 虎斑 + 大腿分体块（签名⑥）——
  const body = smoothPath(p.body);
  c.fillStyle = PAL.orange;
  c.fill(body);
  c.save();
  c.clip(body);
  c.fillStyle = PAL.catWhite;
  c.fill(smoothPath(p.chest));
  c.strokeStyle = PAL.orangeDk;
  c.lineWidth = 10;
  c.lineCap = 'round';
  p.stripes.forEach((st) => {
    c.beginPath();
    c.moveTo(st[0], st[1]);
    c.lineTo(st[2], st[3]);
    c.stroke();
  });
  const [hX, hY, hrx, hry] = p.haunch;
  c.fillStyle = PAL.orangeLt; // 大腿亮块 + 一道深色弧边 = 扁平插画的体块语言
  c.beginPath();
  c.ellipse(hX, hY, hrx, hry, 0, 0, 7);
  c.fill();
  c.strokeStyle = PAL.orangeDk;
  c.lineWidth = 6;
  c.beginPath();
  c.ellipse(hX, hY, hrx, hry, 0, -0.2 * Math.PI, 0.75 * Math.PI, true);
  c.stroke();
  c.lineWidth = 8;
  [[-0.5, 0.15], [-0.15, 0.2]].forEach(([a0, w]) => {
    c.beginPath();
    c.moveTo(hX + Math.cos(Math.PI + a0) * hrx * 0.95, hY + Math.sin(Math.PI + a0) * hry * 0.95);
    c.lineTo(hX + Math.cos(Math.PI + a0) * hrx * 0.55, hY + Math.sin(Math.PI + a0) * hry * 0.55);
    c.stroke();
  });
  c.restore();
  c.fillStyle = PAL.catWhite;
  c.beginPath();
  c.ellipse(p.hind[2], p.hind[3], 20, 12, 0, 0, 7);
  c.fill();

  // —— 近侧前腿（拍杯/舔爪那只，白）——
  leg(front[0], PAL.catWhite, PAL.catWhite);

  // —— 头 ——
  const [hx, hy0, rx, ry] = p.head;
  const hy = hy0 + s.headDy;
  c.save();
  c.translate(hx, hy);
  c.rotate(s.headTilt + (pr ? -0.08 : 0));
  const ea = p.ear;
  const flat = s.earFlat;
  const ear = (x: number, sgn: number): void => {
    const tipX = x + sgn * (4 - ea * 20) + sgn * flat * 38;
    const tipY = -ry - 30 + ea * 22 + flat * 30;
    c.fillStyle = PAL.orange;
    c.beginPath();
    c.moveTo(x - 26, -ry * 0.55);
    c.lineTo(tipX, tipY);
    c.lineTo(x + 26, -ry * 0.62);
    c.closePath();
    c.fill();
    c.fillStyle = PAL.earIn;
    c.beginPath();
    c.moveTo(x - 13, -ry * 0.62);
    c.lineTo(lerp(tipX, x, 0.35) - sgn * 4, lerp(tipY, -ry * 0.6, 0.5));
    c.lineTo(x + 13, -ry * 0.66);
    c.closePath();
    c.fill();
  };
  ear(-30, -1);
  ear(32, 1);
  c.fillStyle = PAL.orange;
  c.beginPath();
  c.ellipse(0, 0, rx, ry, 0, 0, 7);
  c.fill();
  c.fillStyle = PAL.catWhite;
  c.beginPath();
  c.ellipse(10, ry * 0.42, rx * 0.55, ry * 0.42, 0, 0, 7);
  c.fill();
  c.strokeStyle = PAL.orangeDk;
  c.lineWidth = 6;
  c.lineCap = 'round';
  [-10, 4, 18].forEach((x) => {
    c.beginPath();
    c.moveTo(x, -ry + 8);
    c.lineTo(x, -ry + 26);
    c.stroke();
  });
  // 腮红（惊呼/得意加大）
  const blushBig = s.eyes === 'happy' || s.eyes === 'gasp';
  c.fillStyle = PAL.blush;
  c.globalAlpha = blushBig ? 0.95 : 0.7;
  [[-28, 18], [50, 18]].forEach(([x, y]) => {
    c.beginPath();
    c.ellipse(x, y, blushBig ? 15 : 12, 9, 0, 0, 7);
    c.fill();
  });
  c.globalAlpha = 1;
  // 五官
  const E1: [number, number] = [-14 + s.look, -4];
  const E2: [number, number] = [32 + s.look, -4];
  c.strokeStyle = PAL.navy;
  c.fillStyle = PAL.navy;
  c.lineWidth = 4.5;
  [E1, E2].forEach(([x, y]) => {
    if (s.eyes === 'closed' || s.eyes === 'happy') {
      c.beginPath();
      c.arc(x, y + (s.eyes === 'happy' ? 4 : -6), 10, s.eyes === 'happy' ? 1.1 * Math.PI : 0.2 * Math.PI, s.eyes === 'happy' ? 1.9 * Math.PI : 0.8 * Math.PI);
      c.stroke();
    } else if (s.eyes === 'gasp') {
      c.fillStyle = '#fff';
      c.beginPath();
      c.ellipse(x, y, 11, 13, 0, 0, 7);
      c.fill();
      c.fillStyle = PAL.navy;
      c.beginPath();
      c.arc(x + 1, y + 3, 4, 0, 7);
      c.fill();
    } else {
      const r = s.eyes === 'wide' ? 9.5 : 8;
      c.beginPath();
      c.ellipse(x, y, r * 0.85, r, 0, 0, 7);
      c.fill();
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(x - 2, y - 3, 2.6, 0, 7);
      c.fill();
      c.fillStyle = PAL.navy;
    }
  });
  // 鼻 + 嘴
  c.fillStyle = '#e8706a';
  c.beginPath();
  c.moveTo(4, 12);
  c.lineTo(14, 12);
  c.lineTo(9, 18);
  c.closePath();
  c.fill();
  c.strokeStyle = PAL.navy;
  c.lineWidth = 2.6;
  if (s.eyes === 'gasp') { // 惊呼大张嘴
    const o = ease.outBack(seg(f, 264, 268));
    c.fillStyle = '#7a2a3a';
    c.beginPath();
    c.ellipse(10, 26, 10 + 5 * o, 8 + 10 * o, 0.08, 0, 7);
    c.fill();
    c.fillStyle = '#ec7a86';
    c.beginPath();
    c.ellipse(11, 30 + 11 * o, 7 * o, 4.5 * o, 0, 0, 7);
    c.fill();
  } else if (s.tongue > 0.02) { // 舔爪吐舌
    c.fillStyle = '#ec7a86';
    c.beginPath();
    c.ellipse(11, 22 + 10 * s.tongue, 6, 9 * s.tongue, 0.2, 0, 7);
    c.fill();
    c.strokeStyle = PAL.navy;
    c.beginPath();
    c.moveTo(-1, 19);
    c.quadraticCurveTo(4, 25, 9, 19);
    c.stroke();
  } else {
    c.beginPath();
    c.moveTo(-1, 19);
    c.quadraticCurveTo(4, 25, 9, 19);
    c.quadraticCurveTo(14, 25, 19, 19);
    c.stroke();
  }
  // 胡须（白色，落在橙脸上可见）
  c.strokeStyle = '#ffffff';
  c.lineWidth = 2.2;
  [[-40, 10, -78, 2], [-40, 18, -80, 22], [58, 10, 98, 2], [58, 18, 100, 22]].forEach(([a, b, x2, y2]) => {
    c.beginPath();
    c.moveTo(a, b);
    c.lineTo(x2, y2);
    c.stroke();
  });
  c.restore();
  c.restore();
}

/** 耳抖（钩子/第三遍闹铃/定帧微动效）：返回头部附加小转角。 */
export function earFlick(f: number): number {
  const bursts: Array<[number, number]> = [[2, 6], [24, 28], [62, 68], [358, 361]];
  for (const [a, b] of bursts) {
    if (f >= a && f < b) return Math.sin((f - a) * 2.4) * 0.09 * (1 - seg(f, a, b));
  }
  return 0;
}

/** 惊呼发抖抖动量（身体层）。 */
export function shiverJit(f: number): [number, number] {
  if (f < 265 || f > 284) return [0, 0];
  const k = (1 - seg(f, 278, 284)) * 2.2;
  return [(hash2(Math.floor(f / 2), 3, 91) - 0.5) * 2 * k, (hash2(Math.floor(f / 2), 4, 92) - 0.5) * 2 * k];
}

export const CAT_WORLD = WORLD;
