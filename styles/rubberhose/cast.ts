// 演员：闹钟（会唱歌→跳下→敲锣跳舞）与猫（被吵醒→枕头扣头→坐起面条臂拍打）。
// 机制借鉴 huashu-art-motion 33_rubberhose.js（MIT），TSX 重写；角色为本卡原创。
// 纪律：猫身体轮廓必须过 smooth（折线在卡通里一眼直边）；一切动作吃 12fps 步进 tq。
import {BEAT, DK, INK, LT, MID, WHITE, type CanvasCtx} from './types';
import {bnc, boingLocal, circ, ell, F, glove, hash2, hose, ink, mulberry32, noteGlyph, pieEye, smooth, burstStar} from './prims';

export type ClockState = 'ring' | 'jump' | 'dance';
export type CatState = 'sleep' | 'flop' | 'slap';

/** 表盘面（纸白一档） */
const DIAL = '#f8f3e6';

/** 闹钟本体（在 boing 变换内画）：脸朝 faceDir（−1 左 / 1 右），excite 0..1 表情幅度 */
function clockBody(c: CanvasCtx, tq: number, faceDir: number, excite: number, holdMallet: number, strikeK: number, handUp: number): void {
  const bx = 0;
  const by = -46; // 本体圆心相对着地点
  // 腿：两根小橡皮管 + 大圆鞋
  for (const s of [-1, 1]) {
    const kick = handUp * s * 16;
    ink(c, 10);
    c.beginPath();
    c.moveTo(bx + s * 18, -16);
    c.quadraticCurveTo(bx + s * 24, -6, bx + s * (20 + kick), 2 - handUp * s * 8);
    c.stroke();
    c.strokeStyle = MID;
    c.lineWidth = 6;
    c.stroke();
    F(c, ell(bx + s * (22 + kick), 4 - handUp * s * 8, 14, 8), INK, 3.5);
  }
  // 远臂（不持槌，在背侧）：随拍挥
  const armA = -2.4 + Math.sin(Math.PI * (tq / BEAT)) * 0.5 * excite - handUp * 0.6;
  hose(c, [bx - 38 * faceDir, by + 6], [bx - 74 * faceDir, by + 6 + Math.sin(armA) * 34], 26 * faceDir, 13, MID);
  glove(c, bx - 74 * faceDir, by + 6 + Math.sin(armA) * 34 + 8, armA + 1.2, 0.85);
  // 顶铃双碗 + 小锤
  const shake = excite * Math.sin(tq * 42) * 0.28;
  for (const s of [-1, 1]) {
    c.save();
    c.translate(bx + s * 30, by - 40);
    c.rotate(s * (0.5 + shake));
    F(c, ell(0, 0, 13, 10), LT, 4);
    c.restore();
  }
  ink(c, 5);
  c.beginPath();
  c.moveTo(bx, by - 44);
  c.lineTo(bx, by - 52 + excite * 2);
  c.stroke();
  F(c, circ(bx, by - 56 - excite * 2, 6), DK, 3.5);
  // 本体
  F(c, circ(bx, by, 44), WHITE, 5);
  F(c, circ(bx, by, 35), DIAL, 3.5);
  // 表盘刻度
  ink(c, 3);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    c.beginPath();
    c.moveTo(bx + Math.cos(a) * 31, by + Math.sin(a) * 31);
    c.lineTo(bx + Math.cos(a) * 34, by + Math.sin(a) * 34);
    c.stroke();
  }
  // 指针：ring 时疯转（12fps 步进），dance 时悠闲
  const spin = excite > 0.6 ? tq * 10 : tq * 0.8;
  ink(c, 4);
  c.beginPath();
  c.moveTo(bx, by);
  c.lineTo(bx + Math.cos(spin) * 20, by + Math.sin(spin) * 20);
  c.stroke();
  ink(c, 3);
  c.beginPath();
  c.moveTo(bx, by);
  c.lineTo(bx + Math.cos(spin * 1.7 + 1) * 13, by + Math.sin(spin * 1.7 + 1) * 13);
  c.stroke();
  F(c, circ(bx, by, 3.5), INK, 2);
  // 脸：派切眼 + 嘴（ring=惊 O，dance=咧嘴）
  const ex = faceDir * 8;
  pieEye(c, bx - 12 + ex, by - 12, 8, 12, faceDir * 0.6, false, false);
  pieEye(c, bx + 14 + ex, by - 13, 8, 12, faceDir * 0.6, false, false);
  ink(c, 4.5);
  if (excite > 0.6) {
    c.beginPath();
    c.ellipse(bx + ex, by + 12, 7, 9, 0, 0, 7);
    c.stroke();
  } else {
    c.beginPath();
    c.arc(bx + ex, by + 4, 13, 0.3, Math.PI - 0.3);
    c.stroke();
  }
  // 近臂（持槌侧）：strikeK 1 = 槌敲在锣面上
  const S: [number, number] = [bx + 38 * faceDir, by + 6];
  const rest: [number, number] = [bx + 66 * faceDir, by + 40 + handUp * -26];
  const hit: [number, number] = [bx + 150 * faceDir, by + 6];
  const Hd: [number, number] = [
    rest[0] + (hit[0] - rest[0]) * strikeK,
    rest[1] + (hit[1] - rest[1]) * strikeK,
  ];
  F(c, ell(S[0], S[1], 20, 16), WHITE, 4.5);
  hose(c, S, Hd, (34 - strikeK * 44) * faceDir, 13, MID);
  glove(c, Hd[0], Hd[1], faceDir > 0 ? -1.4 : -1.7, 0.9);
  if (holdMallet > 0) {
    const mx = Hd[0] + faceDir * 10;
    const my = Hd[1] + 4;
    const a = -0.9 + strikeK * 1.5;
    ink(c, 7);
    c.beginPath();
    c.moveTo(mx, my);
    c.lineTo(mx + Math.cos(a) * 34 * faceDir, my + Math.sin(a) * 34);
    c.stroke();
    F(c, circ(mx + Math.cos(a) * 36 * faceDir, my + Math.sin(a) * 36, 10), LT, 4);
  }
}
/** 闹钟总画：state + 相位 + 位置由 Scene 编排 */
export function drawClock(c: CanvasCtx, tq: number, state: ClockState, gx: number, gy: number, opts: {excite: number; holdMallet: number; strikeK: number; k?: number}): void {
  const b = bnc(tq, 0.25);
  boingLocal(c, gx, gy, b, state === 'dance' ? 20 : 13, () => {
    if (opts.k !== undefined && opts.k < 1) {
      c.globalAlpha = opts.k;
    }
    // 振动横移（ring 态 12fps 步进抖）
    const jx = state === 'ring' ? (hash2(Math.floor(tq * 12), 3) - 0.5) * 6 * opts.excite : 0;
    c.translate(jx, 0);
    clockBody(c, tq, state === 'dance' ? -1 : 1, opts.excite, opts.holdMallet, opts.strikeK, b * (state === 'dance' ? 0.5 : 0));
    c.globalAlpha = 1;
  }, 1.15);
}

/** 闹铃炸响弧：铃两侧同芯弧按拍弹出（12fps 步进） */
export function drawRingArcs(c: CanvasCtx, tq: number, gx: number, gy: number, on: boolean): void {
  if (!on) return;
  const beatQ = (tq / BEAT) % 1;
  ink(c, 4.5);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const q = (beatQ + k * 0.5) % 1;
      const r = 18 + q * 34;
      c.globalAlpha = 1 - q;
      c.beginPath();
      c.arc(gx + s * 36, gy - 96, r, s > 0 ? -1.15 : Math.PI - 2.05, s > 0 ? -0.15 : Math.PI - 1.05);
      c.stroke();
    }
  }
  c.globalAlpha = 1;
}

/** 音符：闹钟唱歌时按拍弹出 3 只轮播 */
export function drawNotes(c: CanvasCtx, tq: number, x: number, y: number, on: boolean): void {
  if (!on) return;
  for (let k = 0; k < 3; k++) {
    const q = ((tq / BEAT) + k / 3) % 1;
    c.globalAlpha = 1 - q;
    noteGlyph(c, x + Math.sin(q * 6 + k * 2) * 14 + 30, y - 70 - q * 80, 0.9 + q * 0.5, Math.sin(q * 7) * 0.25);
  }
  c.globalAlpha = 1;
}

/** 锣锤击打冲击星（敲击后 0.35s 内亮） */
export function drawGongBurst(c: CanvasCtx, sinceStrike: number, x: number, y: number): void {
  if (sinceStrike < 0 || sinceStrike > 0.35) return;
  const k = 1 - sinceStrike / 0.35;
  c.save();
  c.translate(x, y);
  c.rotate(sinceStrike * 6);
  c.globalAlpha = k;
  burstStar(c, 0, 0, 30 + (1 - k) * 26, 8, 0.42, WHITE, 4);
  c.restore();
  c.globalAlpha = 1;
}

/** 猫：身体轮廓全部 smooth（含尾巴波浪橡皮管） */
function catBody(c: CanvasCtx, tq: number, state: CatState, flop: number): void {
  const angryTail = state === 'flop' ? 14 : state === 'slap' ? 11 : 9;
  // 尾巴：波浪橡皮管 sin(7q − 9tq)·26q（flop 态甩得更凶）
  const base: [number, number] = [66, -30];
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 20; i++) {
    const q = i / 20;
    pts.push([base[0] + q * 118, base[1] - q * 118 + Math.sin(q * 7 - tq * 9) * 20 * q * (angryTail / 9)]);
  }
  c.lineCap = 'round';
  c.strokeStyle = INK;
  c.lineWidth = 24;
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.stroke();
  c.strokeStyle = MID;
  c.lineWidth = 15;
  c.stroke();
  F(c, circ(pts[20][0], pts[20][1], 9), WHITE, 3.5);
  // 身体：smooth 闭轮廓（卧姿→坐姿由 flop 插值抬升前半）
  const lift = state === 'slap' ? 46 : 0;
  const body = smooth([
    [30, -8 + lift * 0.1], [-6, -34 - lift * 0.5], [-44, -40 - lift], [-76, -20 - lift * 0.8],
    [-86, 2 - lift * 0.2], [-60, 12], [-10, 14], [36, 6],
  ]);
  F(c, body, MID, 6);
  // 白胸 + 虎斑（clip 内画，防溢出轮廓）
  c.save();
  c.clip(body);
  c.fillStyle = WHITE;
  c.fill(smooth([[-20, -6 + lift * 0.3], [8, -16 - lift * 0.4], [26, 4], [18, 14], [-12, 14]]));
  ink(c, 7);
  c.strokeStyle = DK;
  const stripes: Array<[number, number][]> = [
    [[-52, -44 - lift], [-46, -16 - lift * 0.7]],
    [[-26, -50 - lift * 0.9], [-22, -20 - lift * 0.5]],
    [[0, -46 - lift * 0.6], [4, -18 - lift * 0.3]],
    [[26, -34 - lift * 0.3], [30, -10]],
  ];
  stripes.forEach((s) => {
    c.beginPath();
    c.moveTo(s[0][0], s[0][1]);
    c.lineTo(s[1][0], s[1][1]);
    c.stroke();
  });
  c.restore();
  ink(c, 6);
  c.stroke(body);
  // 后脚白手套脚 ×2
  F(c, ell(-64, 10, 20, 11), WHITE, 4.5);
  F(c, ell(-22, 13, 20, 11), WHITE, 4.5);
  // 头（睡→扣枕头→坐起抬头）
  const hy = state === 'sleep' ? -26 : state === 'flop' ? -30 : -66 - lift * 0.4;
  const hx = state === 'slap' ? -58 : -46;
  const hb = bnc(tq, 0.95) * (state === 'sleep' ? 3 : 7);
  c.save();
  c.translate(hx, hy - hb);
  if (state === 'slap') c.rotate(-0.08 + Math.sin(tq * 5) * 0.03);
  // 耳 ×2（flop 时被枕头压平贴两侧）
  const earFlat = flop;
  for (const s of [-1, 1]) {
    c.save();
    c.translate(s * 26, -18 - (1 - earFlat) * 6);
    c.rotate(s * (0.3 + earFlat * 0.9));
    F(c, smooth([[0, 6], [s * 12, -14], [s * 22, 4]]), MID, 4.5);
    F(c, smooth([[s * 5, 2], [s * 11, -8], [s * 16, 2]]), '#e8ddc4', 3);
    c.restore();
  }
  F(c, circ(0, 0, 34), MID, 6);
  c.save();
  c.clip(circ(0, 0, 33));
  ink(c, 6);
  c.strokeStyle = DK;
  ([[8, -30, 12, -8], [20, -24, 24, -4], [-2, -32, 0, -10]] as Array<[number, number, number, number]>).forEach(([a, b2, c2, d]) => {
    c.beginPath();
    c.moveTo(a, b2);
    c.lineTo(c2, d);
    c.stroke();
  });
  c.restore();
  // 白口鼻
  F(c, ell(6, 12, 20, 14), WHITE, 4.5);
  if (state === 'sleep' || flop > 0.5) {
    // 闭眼弧
    ink(c, 4.5);
    c.beginPath();
    c.arc(-12, -2, 8, 0.15, Math.PI - 0.15);
    c.stroke();
    c.beginPath();
    c.arc(14, -3, 8, 0.15, Math.PI - 0.15);
    c.stroke();
  } else {
    // 派切大眼怒视左方（闹钟方向）
    pieEye(c, -12, -2, 10, 14, -0.7, false, false);
    pieEye(c, 15, -3, 10, 14, -0.7, false, false);
    // 怒眉
    ink(c, 4);
    c.beginPath();
    c.moveTo(-22, -18);
    c.lineTo(-4, -12);
    c.moveTo(26, -19);
    c.lineTo(8, -13);
    c.stroke();
  }
  F(c, ell(16, 8, 5, 4), INK, 2.5);
  ink(c, 4);
  c.beginPath();
  c.moveTo(2, 16);
  c.quadraticCurveTo(14, 24, 26, 14);
  c.stroke();
  // 胡须
  ink(c, 2.5);
  ([[26, 8, 56, 2], [27, 14, 56, 16], [-14, 10, -44, 4]] as Array<[number, number, number, number]>).forEach(([a, b2, c2, d]) => {
    c.beginPath();
    c.moveTo(a, b2);
    c.lineTo(c2, d);
    c.stroke();
  });
  c.restore();
}

/** 猫总画 + 手臂层（睡=无臂外露；flop=双手套举枕头扣头；slap=近臂面条拍打远臂撑床） */
export function drawCat(c: CanvasCtx, tq: number, state: CatState, gx: number, gy: number, flop: number): void {
  const amp = state === 'sleep' ? 4 : state === 'flop' ? 26 : 16;
  const ph = state === 'flop' ? 0.75 : 0.75;
  boingLocal(c, gx, gy, bnc(tq, ph), amp, () => {
    catBody(c, tq, state, flop);
    if (state === 'flop') {
      // 双臂（面条+手套）举枕头扣在头上
      const S1: [number, number] = [-30, -50];
      const S2: [number, number] = [-58, -44];
      const wob = Math.sin(tq * 7) * 3;
      hose(c, S1, [-62 + wob, -84], 24, 12, MID);
      glove(c, -62 + wob, -84, -2.2, 0.8);
      hose(c, S2, [-30 + wob, -92], -22, 12, MID);
      glove(c, -30 + wob, -92, -0.9, 0.8);
      // 枕头（圆角长枕，微旋）
      c.save();
      c.translate(-46 + wob * 0.6, -84);
      c.rotate(-0.12 + Math.sin(tq * 5) * 0.04);
      F(c, smooth([[-52, -6], [-30, -26], [10, -30], [48, -20], [56, 2], [36, 22], [-6, 26], [-44, 16]]), WHITE, 5.5);
      ink(c, 3);
      c.beginPath();
      c.moveTo(-34, -8);
      c.quadraticCurveTo(0, -18, 36, -6);
      c.stroke();
      c.restore();
    }
    if (state === 'slap') {
      // 远臂撑床
      hose(c, [-70, -50], [-96, -2], 18, 12, MID);
      glove(c, -96, -2, 2.4, 0.8);
      // 近臂：按拍甩打（半拍出去打到最远，半拍收回），12fps 步进
      const half = (tq / (BEAT / 2)) % 1;
      const outK = half < 0.5 ? 1 : 0;
      const reach = outK === 1 ? 1 : 0.15;
      const S: [number, number] = [-52, -46];
      const up: [number, number] = [-120, -110];
      const fwd: [number, number] = [-238, -62];
      const Hd: [number, number] = [
        up[0] + (fwd[0] - up[0]) * reach,
        up[1] + (fwd[1] - up[1]) * reach,
      ];
      hose(c, S, Hd, -30 - reach * 30, 13, MID);
      glove(c, Hd[0], Hd[1], -2.5 + reach * 0.5, 1);
      if (outK === 1 && reach === 1) {
        // 拍击冲击线（拍面三道短促线）
        ink(c, 3.5);
        for (let k = 0; k < 3; k++) {
          const a = -0.6 + k * 0.5;
          c.beginPath();
          c.moveTo(Hd[0] - 14 + Math.cos(a) * 16, Hd[1] + Math.sin(a) * 16);
          c.lineTo(Hd[0] - 14 + Math.cos(a) * 30, Hd[1] + Math.sin(a) * 30);
          c.stroke();
        }
      }
    }
  }, 1.3);
}

/** 枕头静置（睡态时猫抱着的枕头放在床垫上） */
export function drawPillowRest(c: CanvasCtx, x: number, y: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(-0.1);
  F(c, smooth([[-40, -4], [-22, -20], [12, -22], [38, -14], [44, 4], [26, 18], [-8, 20], [-34, 12]]), WHITE, 5);
  ink(c, 3);
  c.beginPath();
  c.moveTo(-26, -6);
  c.quadraticCurveTo(4, -14, 28, -4);
  c.stroke();
  c.restore();
}

/** 猫爪印抖动（flop 态床垫抗议的爆星，低频） */
export function drawFlopShake(c: CanvasCtx, tq: number, x: number, y: number, on: boolean): void {
  if (!on) return;
  const r = mulberry32(Math.floor(tq * 12) * 17 + 3);
  const k = r();
  if (k > 0.4) return;
  burstStar(c, x + (k - 0.2) * 30, y, 10 + k * 14, 6, 0.45, WHITE, 3);
}
