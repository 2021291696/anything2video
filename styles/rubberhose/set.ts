// 布景：纸色单色底（缓存）+ 窗外太阳脸（签名⑤）+ 圆点窗帘 + 床头柜/床/铜锣架 + 片名字幕。
// 机制借鉴 huashu-art-motion 33_rubberhose.js（MIT），TSX 重写；场景内容为本卡原创（卧室+闹钟+猫）。
import {DOT, DK, FLOOR, FRAME, H, INK, LT, MID, PAPER, SEAM, SKY, STRIPE, W, WHITE, type CanvasCtx} from './types';
import {bnc, boing, circ, ell, F, hash2, ink, smooth} from './prims';

let BG: HTMLCanvasElement | null = null;
/** 静态底（缓存一次）：墙纸竖条+菱点、地板砖缝、踢脚线、角落水彩压暗 */
export function roomBg(): HTMLCanvasElement {
  if (BG) return BG;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  // 墙纸：竖条 + 小菱点
  for (let x = 0; x < W; x += 43) {
    g.fillStyle = STRIPE;
    g.fillRect(x, 0, 20, 466);
  }
  g.fillStyle = DOT;
  for (let y = 20; y < 456; y += 47) {
    for (let x = 31; x < W; x += 43) {
      g.beginPath();
      g.moveTo(x, y - 5);
      g.lineTo(x + 4, y);
      g.lineTo(x, y + 5);
      g.lineTo(x - 4, y);
      g.fill();
    }
  }
  // 地板 + 砖缝
  g.fillStyle = FLOOR;
  g.fillRect(0, 476, W, H - 476);
  ink(g, 3);
  g.strokeStyle = SEAM;
  for (let y = 508; y < H; y += 40) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  for (let k = 0; k < 32; k++) {
    const row = Math.floor(k / 8);
    const y = 476 + row * 40;
    const x = (k % 8) * 170 + (row % 2) * 85;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x, y + 40);
    g.stroke();
  }
  // 踢脚线
  g.fillStyle = DK;
  g.fillRect(0, 460, W, 17);
  ink(g, 5);
  g.beginPath();
  g.moveTo(0, 460);
  g.lineTo(W, 460);
  g.moveTo(0, 477);
  g.lineTo(W, 477);
  g.stroke();
  // 水彩式角落压暗
  const vg = g.createRadialGradient(600, 320, 220, 600, 350, 820);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(60,50,35,.35)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  BG = cv;
  return cv;
}

/** 签名⑤ 太阳脸：光芒 12 齿旋转 1.6rad/s（随 tq 步进），脸随拍点头 */
function sunFace(c: CanvasCtx, tq: number): void {
  const sx = 455;
  const sy = 150;
  const rot = tq * 1.6;
  c.save();
  c.translate(sx, sy);
  c.rotate(rot);
  c.fillStyle = WHITE;
  for (let k = 0; k < 12; k++) {
    c.rotate(Math.PI / 6);
    c.beginPath();
    c.moveTo(-8, -44);
    c.lineTo(0, -72 - (k % 2) * 11);
    c.lineTo(8, -44);
    c.closePath();
    c.fill();
    ink(c, 4);
    c.stroke();
  }
  c.restore();
  boing(c, sx, sy + 39, bnc(tq, 0), 8, () => {
    F(c, circ(sx, sy, 40), WHITE, 5);
    // 眼睛向左瞟（看屋里闹钟捣乱）
    for (const ex of [-13, 11]) {
      F(c, ell(sx + ex, sy - 7, 7.5, 11, 0), WHITE, 4);
      c.save();
      c.clip(ell(sx + ex, sy - 7, 7.5, 11, 0));
      c.fillStyle = INK;
      c.beginPath();
      c.arc(sx + ex - 3, sy - 4, 5.5, 0, 7);
      c.fill();
      c.restore();
    }
    ink(c, 5);
    c.beginPath();
    c.arc(sx - 2, sy + 8, 17, 0.35, Math.PI - 0.35);
    c.stroke();
    c.fillStyle = MID;
    c.beginPath();
    c.arc(sx - 24, sy + 10, 6, 0, 7);
    c.arc(sx + 21, sy + 10, 6, 0, 7);
    c.fill();
  });
}

/** 窗 + 窗外天 + 树/云（随拍弹）+ 圆点窗帘（下摆随拍甩） */
export function drawWindow(c: CanvasCtx, tq: number): void {
  // 窗洞里的天
  c.save();
  c.beginPath();
  c.rect(240, 86, 294, 280);
  c.clip();
  c.fillStyle = SKY;
  c.fillRect(240, 86, 294, 280);
  // 远山
  c.fillStyle = LT;
  c.beginPath();
  c.moveTo(240, 320);
  c.quadraticCurveTo(313, 274, 387, 314);
  c.quadraticCurveTo(460, 281, 534, 314);
  c.lineTo(534, 366);
  c.lineTo(240, 366);
  c.fill();
  ink(c, 4);
  c.stroke();
  // 树随拍点弹（相位 0.25）
  boing(c, 300, 334, bnc(tq, 0.25), 10, () => {
    F(c, smooth([[297, 334], [300, 294], [308, 294], [311, 334]]), DK, 4);
    F(c, smooth([[271, 294], [285, 254], [303, 240], [328, 254], [338, 288], [315, 304], [288, 304]]), MID, 5);
  });
  sunFace(c, tq);
  // 云：随拍伸缩并慢慢飘
  ([[313 + tq * 20, 133, 0.1], [373 + tq * 15, 200, 0.6]] as Array<[number, number, number]>).forEach(([x, y, ph]) =>
    boing(c, x, y + 20, bnc(tq, ph), 7, () => {
      F(c, smooth([[x - 40, y + 20], [x - 47, y + 4], [x - 27, y - 12], [x - 4, y - 20], [x + 20, y - 15], [x + 42, y - 3], [x + 44, y + 17]]), WHITE, 5);
    }));
  c.restore();
  // 窗框（白漆粗框+十字）
  ink(c, 6);
  c.fillStyle = FRAME;
  ([[233, 80, 307, 12], [233, 361, 307, 12], [233, 80, 12, 293], [528, 80, 12, 293], [376, 80, 12, 293], [233, 219, 307, 11]] as Array<[number, number, number, number]>)
    .forEach((r) => {
      c.fillRect(...r);
      c.strokeRect(...r);
    });
  c.fillStyle = FRAME;
  c.fillRect(213, 371, 347, 17);
  c.strokeRect(213, 371, 347, 17);
  // 圆点窗帘：系起，下摆随拍甩
  ([[213, 1], [560, -1]] as Array<[number, number]>).forEach(([x, sgn], k) => {
    const sw = (bnc(tq, 0.5 + k * 0.5) - 0.5) * 18 * sgn;
    const p = smooth([[x, 64], [x + sgn * 47, 64], [x + sgn * 36, 173], [x + sgn * 17, 220], [x + sgn * 47 + sw, 347], [x + sgn * 20 + sw, 400], [x - sgn * 3, 400]]);
    c.fillStyle = MID;
    c.fill(p);
    c.save();
    c.clip(p);
    c.fillStyle = PAPER;
    for (let yy = 67; yy < 410; yy += 23) {
      for (let xx = x - 55; xx < x + 55; xx += 23) {
        c.beginPath();
        c.arc(xx + ((yy / 23) % 2) * 11, yy, 4, 0, 7);
        c.fill();
      }
    }
    c.restore();
    ink(c, 5);
    c.stroke(p);
    c.fillStyle = INK;
    c.fillRect(x + sgn * 7 - 7, 212, 33, 10);
  });
  ink(c, 8);
  c.beginPath();
  c.moveTo(200, 64);
  c.lineTo(573, 64);
  c.stroke();
}

/** 床头柜：弯橡皮管腿，落拍压扁（ph 0.5）——闹钟初始站在柜顶 */
export function drawNightstand(c: CanvasCtx, tq: number): void {
  boing(c, 715, 620, bnc(tq, 0.5), 10, () => {
    ([[668, 1], [762, -1]] as Array<[number, number]>).forEach(([x, s]) => {
      ink(c, 20);
      c.beginPath();
      c.moveTo(x, 428);
      c.quadraticCurveTo(x + s * 17, 514, x - s * 4, 618);
      c.stroke();
      c.strokeStyle = '#8f8670';
      c.lineWidth = 11;
      c.stroke();
    });
    F(c, smooth([[660, 412], [715, 404], [772, 412], [775, 430], [715, 438], [657, 430]]), '#bdb399', 6);
    ink(c, 3);
    c.beginPath();
    c.moveTo(676, 425);
    c.quadraticCurveTo(715, 432, 756, 425);
    c.stroke();
    // 抽屉面 + 小圆钮
    c.fillStyle = '#bdb399';
    c.fillRect(678, 452, 74, 64);
    ink(c, 4);
    c.strokeRect(678, 452, 74, 64);
    F(c, circ(715, 484, 6), DK, 3.5);
  });
}

/** 床：右侧，床垫随拍微弹（ph 0.9）；猫的地板在床垫上 */
export function drawBed(c: CanvasCtx, tq: number): void {
  boing(c, 1060, 640, bnc(tq, 0.9), 6, () => {
    // 床头板（弧形）
    F(c, smooth([[1180, 470], [1218, 400], [1226, 330], [1196, 292], [1160, 318], [1150, 380], [1156, 470]]), '#8f8670', 6);
    // 床腿
    [[900, 1], [1148, -1]].forEach(([x, s]) => {
      ink(c, 16);
      c.beginPath();
      c.moveTo(x, 540);
      c.quadraticCurveTo(x + s * 10, 596, x - s * 3, 638);
      c.stroke();
      c.strokeStyle = '#8f8670';
      c.lineWidth = 9;
      c.stroke();
    });
    // 床垫 + 被子
    F(c, smooth([[872, 470], [1050, 452], [1200, 466], [1206, 520], [1188, 540], [1050, 552], [900, 544], [868, 522]]), WHITE, 6);
    F(c, smooth([[872, 492], [1050, 476], [1200, 490], [1204, 522], [1186, 540], [1050, 550], [898, 544], [870, 522]]), LT, 5);
    ink(c, 3);
    for (let i = 0; i < 4; i++) {
      const x = 930 + i * 70;
      c.beginPath();
      c.moveTo(x, 486 + i * 3);
      c.quadraticCurveTo(x + 6, 516, x, 544 - i * 2);
      c.stroke();
    }
  });
}

/** 铜锣架：弯杆吊一面锣，锣面随拍微颤；敲击时 wobble 由 cast 层叠画 */
export function drawGong(c: CanvasCtx, tq: number, hitT: number): void {
  boing(c, 545, 655, bnc(tq, 0.35), 8, () => {
    ink(c, 14);
    c.beginPath();
    c.moveTo(545, 655);
    c.quadraticCurveTo(542, 540, 560, 468);
    c.stroke();
    c.strokeStyle = '#8f8670';
    c.lineWidth = 9;
    c.stroke();
    // 吊绳
    ink(c, 3);
    c.beginPath();
    c.moveTo(560, 468);
    c.lineTo(548, 500);
    c.stroke();
    // 锣面（敲击后 wobble：横向椭圆振荡衰减）
    const since = hitT >= 0 ? hitT : 99;
    const wob = since < 1.2 ? Math.sin(since * 42) * (1 - since / 1.2) * 0.16 : 0;
    c.save();
    c.translate(548, 540);
    c.rotate(wob);
    F(c, ell(0, 0, 52, 52 + Math.abs(wob) * 30, 0), LT, 5);
    F(c, circ(0, 0, 14), MID, 4);
    c.restore();
    // 底座
    F(c, smooth([[505, 652], [585, 652], [592, 666], [498, 666]]), DK, 5);
  });
}

/** 片名「闹钟的抗议」：f331-352 逐字 12fps 步进拍入（scale 过冲+微旋），白描边光晕衬读 */
export function drawTitleCard(c: CanvasCtx, f: number): void {
  if (f < 331) return;
  const TITLE = '闹钟的抗议';
  const cx = 640;
  const cy = 236;
  c.save();
  c.translate(cx, cy);
  c.rotate(-0.02);
  c.font = '900 84px "Noto Serif SC", serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const chars = [...TITLE];
  const widths = chars.map((ch) => c.measureText(ch).width);
  const gap = 14;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let x = -total / 2;
  chars.forEach((ch, i) => {
    const step = Math.floor((f - 331) / 2.5); // 12fps 步进：每 2.5 帧允许一个新字拍入
    const k = Math.max(0, Math.min(1, (step - i) / 2));
    if (k > 0) {
      const over = 1 + 0.24 * Math.sin(Math.PI * Math.min(1, k));
      c.save();
      c.translate(x + widths[i] / 2, 0);
      c.rotate((hash2(i, 7) - 0.5) * 0.12);
      c.scale(over, over);
      c.lineJoin = 'round';
      c.strokeStyle = WHITE;
      c.lineWidth = 12;
      c.globalAlpha = k;
      c.strokeText(ch, 0, 0);
      c.fillStyle = INK;
      c.fillText(ch, 0, 0);
      c.restore();
    }
    x += widths[i] + gap;
  });
  // 下划线 swash 随最后一字画出
  const done = f - 331 > 20;
  if (done) {
    ink(c, 6);
    c.beginPath();
    c.moveTo(-total / 2, 58);
    c.quadraticCurveTo(0, 70, total / 2, 56);
    c.stroke();
  }
  c.restore();
}

/** 字幕条（纸底墨字，12fps 微倾）：画在胶片层之上保可读 */
export function drawSubs(c: CanvasCtx, f: number, subs: Array<{from: number; to: number; text: string}>): void {
  const hit = subs.find((s) => f >= s.from && f <= s.to);
  if (!hit) return;
  const tq = Math.floor((f / 30) * 12) / 12;
  c.save();
  c.translate(W / 2, 664);
  c.rotate(Math.sin(tq * 2.1) * 0.006);
  c.font = '600 30px "Noto Sans SC", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const w = c.measureText(hit.text).width + 44;
  c.fillStyle = 'rgba(251,247,236,.92)';
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.beginPath();
  c.roundRect(-w / 2, -25, w, 50, 10);
  c.fill();
  c.stroke();
  c.fillStyle = INK;
  c.fillText(hit.text, 0, 2);
  c.restore();
}

/** 便签化 ZZZ（猫睡）；f1-125 猫睡时飘 */
export function drawZzz(c: CanvasCtx, tq: number, x: number, y: number, on: boolean): void {
  if (!on) return;
  for (let k = 0; k < 3; k++) {
    const q = ((tq / 0.9375) + k / 3) % 1;
    const s = 14 + q * 22;
    c.save();
    c.translate(x + q * 40 + k * 8, y - q * 66 - k * 6);
    c.rotate(-0.2 + Math.sin(q * 5) * 0.1);
    c.globalAlpha = 1 - q;
    c.font = `900 ${Math.round(s)}px "Noto Sans SC", sans-serif`;
    c.fillStyle = DK;
    c.strokeStyle = WHITE;
    c.lineWidth = 4;
    c.strokeText('Z', 0, 0);
    c.fillText('Z', 0, 0);
    c.restore();
  }
  c.globalAlpha = 1;
}
