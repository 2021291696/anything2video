// 赛璐珞少女（背身 3/4，面向左窗看云）—— cumulus-light。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）scenes/35_shinkai.js girl()/cel 参数纪律与
// 「天使环/逆光暖 rim/动画眼」，Remotion+Canvas2D 重写（几何按 1280×720 背身构图重设计，非拷贝）。
// 构图：头 33px（约 5.3 头身），脸只露左侧月牙（面向窗），后发+丸髻占右后；部件顺序
// 「远臂→裙→上身→水手领→近臂→颈→后发→脸→刘海→五官→风发丝」，遮挡天然正确。
// 光：室内默认光向 lx=-1 ly=-0.55（影落右下）；人物窗前逆光——发缘 lighter 暖 rim
//   （rgba(255,220,160,.55)）+ 天使环 8px 亮弧。
import {CanvasCtx, HEAD, HR, LINE, NV, SK, WT} from './types';
import {backlitEdge, cel, smooth} from './cel';

/** 两端胶囊路径（臂/腿用）。 */
function capsule(p0: [number, number], p1: [number, number], w0: number, w1: number): Path2D {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const p = new Path2D();
  p.moveTo(p0[0] + nx * w0, p0[1] + ny * w0);
  p.lineTo(p1[0] + nx * w1, p1[1] + ny * w1);
  p.arc(p1[0], p1[1], w1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
  p.lineTo(p0[0] - nx * w0, p0[1] - ny * w0);
  p.arc(p0[0], p0[1], w0, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
  p.closePath();
  return p;
}

/**
 * 少女。t=秒；freeze=true 时呼吸/裙摆/眨眼冻结（结尾定帧，发丝仍随风）。
 */
export function drawGirl(c: CanvasCtx, t: number, freeze: boolean): void {
  const tp = freeze ? 1000 : t;
  const breathe = Math.sin(tp * 1.4) * 1.4;
  const hem = freeze ? 0 : Math.sin(t * 2.2) * 2.5;
  const wind = Math.sin(t * 3.2) * 4 + Math.sin(t * 7.1) * 1.5;
  const X = HEAD.x, Y = HEAD.y + breathe, R = HEAD.r;
  const lineHair = '#8a5a2a';
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  // ---- 远侧臂（窗侧，垂在身侧，大部分被躯干遮住）----
  const armFar = capsule([X - 28, Y + 60], [X - 40, Y + 150], 7, 5.5);
  cel(c, armFar, WT.b, WT.s, null, {sd: 14, line: LINE, lw: 2});
  const handFar = new Path2D();
  handFar.arc(X - 42, Y + 164, 5.5, 0, 7);
  cel(c, handFar, SK.b, SK.s, SK.r, {sd: 8, rw: 3, line: LINE, lw: 1.8});
  // ---- 腿与鞋（白袜+乐福鞋）----
  const sockL = capsule([X - 15, 470], [X - 15, 540], 5.5, 4.5);
  const sockR = capsule([X + 15, 470], [X + 15, 540], 5.5, 4.5);
  cel(c, sockL, '#fbfbfe', '#c8cede', null, {sd: 8, line: LINE, lw: 1.8});
  cel(c, sockR, '#fbfbfe', '#c8cede', null, {sd: 8, line: LINE, lw: 1.8});
  cel(c, smooth([[X - 26, 542], [X - 4, 542], [X - 1, 556], [X - 24, 557]]), '#3a2a24', '#22160f', null, {sd: 8, line: LINE, lw: 1.8});
  cel(c, smooth([[X + 5, 542], [X + 27, 542], [X + 30, 556], [X + 7, 557]]), '#3a2a24', '#22160f', null, {sd: 8, line: LINE, lw: 1.8});
  // ---- 裙（藏青百褶，sd 30，rw 4）----
  const skirt = smooth([
    [X - 28, Y + 150], [X + 28, Y + 150],
    [X + 54, 498 + hem], [X - 56, 500 - hem],
  ]);
  cel(c, skirt, NV.b, NV.s, NV.r, {sd: 30, rw: 3, line: LINE});
  c.save();
  c.clip(skirt);
  c.strokeStyle = '#141a33';
  c.lineWidth = 2;
  [[-30, -20], [-15, -7], [0, 0], [15, 7], [30, 20]].forEach(([a, b]) => {
    c.beginPath();
    c.moveTo(X + a, Y + 154);
    c.lineTo(X + b + hem, 496);
    c.stroke();
  });
  c.restore();
  // ---- 上身（白校服上衣，sd 26）----
  const torso = smooth([
    [X - 33, Y + 48], [X + 33, Y + 48],
    [X + 30, Y + 104], [X + 26, Y + 156], [X - 26, Y + 156], [X - 30, Y + 104],
  ]);
  cel(c, torso, WT.b, WT.s, WT.r, {sd: 26, rw: 6, line: LINE});
  // ---- 水手领（背后大方领，藏青 + 白线，sd 14）----
  const col = smooth([
    [X - 8, Y + 40], [X + 20, Y + 40], [X + 42, Y + 58],
    [X + 38, Y + 100], [X + 12, Y + 110], [X - 10, Y + 96], [X - 26, Y + 62],
  ]);
  cel(c, col, NV.b, NV.s, NV.r, {sd: 14, rw: 4, line: LINE});
  c.save();
  c.clip(col);
  c.strokeStyle = '#f2f4fa';
  c.lineWidth = 2.4;
  c.stroke(smooth([
    [X - 3, Y + 47], [X + 18, Y + 47], [X + 35, Y + 62],
    [X + 31, Y + 94], [X + 10, Y + 102],
  ]));
  c.restore();
  // ---- 近侧臂（右后侧，露出半条）----
  const armNear = capsule([X + 29, Y + 60], [X + 40, Y + 152], 7, 5.5);
  cel(c, armNear, WT.b, WT.s, null, {sd: 14, line: LINE, lw: 2});
  const handNear = new Path2D();
  handNear.arc(X + 42, Y + 166, 5.5, 0, 7);
  cel(c, handNear, SK.b, SK.s, SK.r, {sd: 8, rw: 3, line: LINE, lw: 1.8});
  // ---- 颈（藏在后发下）----
  c.fillStyle = SK.b;
  c.fillRect(X - 7, Y + 24, 16, 22);
  c.strokeStyle = LINE;
  c.lineWidth = 1.6;
  c.strokeRect(X - 7, Y + 24, 16, 22);
  // ---- 后发（大面积占右后，sd 26 rw 9，棕线）----
  const hairBack = smooth([
    [X - 6, Y - R - 2], [X + 18, Y - R + 4], [X + R + 6, Y - 16], [X + R + 10, Y + 8],
    [X + R, Y + 30], [X + 16, Y + 46], [X - 4, Y + 50], [X - 24, Y + 42],
    [X - 34, Y + 20], [X - 32, Y - 8], [X - 22, Y - R + 6],
  ]);
  cel(c, hairBack, HR.b, HR.s, HR.r, {sd: 26, rw: 9, line: lineHair});
  // 发内丝缕线
  c.save();
  c.clip(hairBack);
  c.strokeStyle = 'rgba(170,110,50,.7)';
  c.lineWidth = 1.5;
  [[-14, 2], [-2, 12], [10, 20]].forEach(([a, b]) => {
    c.beginPath();
    c.moveTo(X + a, Y - R + 8);
    c.quadraticCurveTo(X + a + 6, Y + 6, X + b + 8, Y + 36);
    c.stroke();
  });
  c.restore();
  // ---- 丸髻（右上，sd 16）----
  const bun = new Path2D();
  bun.arc(X + 32, Y - 28, 13, 0, 7);
  cel(c, bun, HR.b, HR.s, HR.r, {sd: 16, rw: 5, line: lineHair});
  // ---- 颈后发梢（两缕短发梢贴发际，画在脸后免得挡脸/领）----
  for (let k = 0; k < 2; k++) {
    const sx = X + 16 + k * 8, sy = Y + 40;
    const w = wind * (0.6 + k * 0.3);
    c.strokeStyle = lineHair;
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(sx, sy);
    c.quadraticCurveTo(sx + 8 + w, sy + 14, sx + 4 + w * 1.4, sy + 28);
    c.stroke();
    c.strokeStyle = HR.b;
    c.lineWidth = 1.2;
    c.stroke();
  }
  // ---- 脸（左侧月牙，面向窗，sd 10）----
  const face = smooth([
    [X - 4, Y - R + 2], [X - 24, Y - R + 12], [X - R - 1, Y - 8], [X - R + 2, Y + 10],
    [X - R + 12, Y + 24], [X - 8, Y + R - 2], [X + 10, Y + R - 6], [X + 20, Y + 16],
    [X + 22, Y - 6], [X + 16, Y - R + 8],
  ]);
  cel(c, face, SK.b, SK.s, null, {sd: 10, rw: 4, line: LINE, lw: 2});
  // 腮红 + 鼻尖
  c.save();
  c.clip(face);
  c.fillStyle = 'rgba(255,140,140,.32)';
  c.beginPath();
  c.ellipse(X - 16, Y + 16, 7, 4, 0, 0, 7);
  c.fill();
  c.strokeStyle = 'rgba(150,90,60,.5)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(X - R + 5, Y + 4);
  c.lineTo(X - R + 8, Y + 7);
  c.stroke();
  c.restore();
  // ---- 刘海（扫过发际线，sd 12 rw 5）----
  const bangs = smooth([
    [X - 26, Y - 12], [X - 27, Y - 22], [X - 16, Y - R + 6], [X - 2, Y - R + 1],
    [X + 14, Y - R + 4], [X + 26, Y - R + 14], [X + 30, Y - 14], [X + 22, Y - 22],
    [X + 10, Y - 16], [X - 4, Y - 22], [X - 16, Y - 12],
  ]);
  cel(c, bangs, HR.b, HR.s, HR.r, {sd: 12, rw: 5, line: lineHair, lw: 2});
  // ---- 动画眼（纵向渐变虹膜 + 两颗高光 + 粗眼睑 + 睫毛）----
  const e = {x: X - 18, y: Y + 4};
  const blinkCycle = Math.floor(tp * 30) % 111;
  const blink = !freeze && blinkCycle < 4;
  if (blink) {
    c.strokeStyle = '#3a2418';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(e.x - 5, e.y + 2);
    c.quadraticCurveTo(e.x, e.y + 5, e.x + 5, e.y + 1);
    c.stroke();
  } else {
    const ig = c.createLinearGradient(0, e.y - 8, 0, e.y + 8);
    ig.addColorStop(0, '#1f3f7a');
    ig.addColorStop(0.6, '#3f7fd0');
    ig.addColorStop(1, '#9fd4ff');
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(e.x, e.y + 1, 4.8, 7.4, 0, 0, 7);
    c.fill();
    c.fillStyle = ig;
    c.beginPath();
    c.ellipse(e.x - 0.8, e.y + 1.5, 4, 6.6, 0, 0, 7);
    c.fill();
    c.fillStyle = '#1a1a2e';
    c.beginPath();
    c.ellipse(e.x - 1.2, e.y + 1.5, 1.8, 3.2, 0, 0, 7);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(e.x - 2.2, e.y - 1.6, 1.6, 0, 7);
    c.fill();
    c.beginPath();
    c.arc(e.x + 0.6, e.y + 4, 0.9, 0, 7);
    c.fill();
    c.strokeStyle = '#3a2418';
    c.lineWidth = 2.3;
    c.beginPath();
    c.moveTo(e.x - 6, e.y - 4);
    c.quadraticCurveTo(e.x, e.y - 9, e.x + 5.5, e.y - 5);
    c.stroke();
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(e.x - 6, e.y - 4);
    c.lineTo(e.x - 9.5, e.y - 7);
    c.stroke();
  }
  // 眉 + 唇
  c.strokeStyle = '#a07040';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(e.x - 5, e.y - 12);
  c.quadraticCurveTo(e.x + 1, e.y - 15, e.x + 6, e.y - 12);
  c.stroke();
  c.fillStyle = '#e07a78';
  c.beginPath();
  c.moveTo(X - R + 9, Y + 16);
  c.lineTo(X - R + 15, Y + 14.5);
  c.lineTo(X - R + 14, Y + 19);
  c.closePath();
  c.fill();
  // ---- 逆光暖 rim（发缘 lighter）+ 天使环（后脑 8px 亮弧）----
  backlitEdge(c, hairBack, 3, 4, 3.5, 'rgba(255,220,160,.55)');
  backlitEdge(c, torso, 2, 3, 2.5, 'rgba(255,220,160,.35)');
  c.save();
  c.clip(hairBack);
  c.strokeStyle = 'rgba(255,250,226,.85)';
  c.lineWidth = 8;
  c.beginPath();
  c.arc(X + 8, Y + 8, R - 6, -2.3, -0.7);
  c.stroke();
  c.restore();
  c.restore();
}

/** 窗边拉线开关（吊在梁下，随风轻摆；gust 增幅）。 */
export function drawPullCord(c: CanvasCtx, t: number, gust: number): void {
  const sway = Math.sin(t * 2.1) * 4 * (1 + gust * 0.8);
  c.strokeStyle = '#b9b2a2';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(655, 63);
  c.quadraticCurveTo(655 + sway * 0.5, 105, 655 + sway, 148);
  c.stroke();
  c.fillStyle = '#d8d2c2';
  c.beginPath();
  c.arc(655 + sway, 152, 5, 0, 7);
  c.fill();
  c.strokeStyle = '#8f8878';
  c.lineWidth = 1.2;
  c.stroke();
}
