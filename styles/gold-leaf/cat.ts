// ============================================================================
// cat.ts — 人脸猫静态主体（烘焙）＋运行时动态（抬爪拎鼠钟摆/眨胡须由 marginalia.ts 画鼠）
// 技法借鉴 huashu-art-motion 05_gothic（MIT）「稚拙人脸猫」画法，TSX 重写。
// 猫为动态层（画在高光扫之后），橘色不被「金色度」掩膜误当金（源片同序）。
// ============================================================================
import {dot, F, GOLD, INK, smooth, WHITE} from './world';

// ---- 猫（人脸猫，烘焙静态主体；悬挂老鼠运行时画）----
export function catBody(g: CanvasRenderingContext2D) {
  const O = '#e3913e', ODk = '#b45a18', Wt = WHITE;
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // 尾巴（环纹）
  F(g, null, INK, 13, () =>
    smooth(g, [[292, 585], [270, 560], [252, 534], [248, 508], [258, 490]], false));
  F(g, null, O, 8, () =>
    smooth(g, [[292, 585], [270, 560], [252, 534], [248, 508], [258, 490]], false));
  g.strokeStyle = ODk;
  g.lineWidth = 4;
  const tp: Array<[number, number]> = [[292, 585], [270, 560], [252, 534], [248, 508], [258, 490]];
  for (let i = 1; i < tp.length - 1; i += 1) {
    const a = Math.atan2(tp[i + 1][1] - tp[i][1], tp[i + 1][0] - tp[i][0]) + Math.PI / 2;
    g.beginPath();
    g.moveTo(tp[i][0] - Math.cos(a) * 7.4, tp[i][1] - Math.sin(a) * 7.4);
    g.lineTo(tp[i][0] + Math.cos(a) * 7.4, tp[i][1] + Math.sin(a) * 7.4);
    g.stroke();
  }
  // 身体（坐姿）
  F(g, O, INK, 2.4, () =>
    smooth(g, [
      [300, 588], [292, 540], [296, 500], [312, 474], [344, 462], [366, 470], [376, 486],
      [380, 512], [378, 546], [374, 588],
    ]));
  g.save();
  g.beginPath();
  smooth(g, [
    [300, 588], [292, 540], [296, 500], [312, 474], [344, 462], [366, 470], [376, 486],
    [380, 512], [378, 546], [374, 588],
  ]);
  g.clip();
  g.strokeStyle = ODk;
  g.lineWidth = 4.6;
  for (let k = 0; k < 6; k++) {
    const y = 492 + k * 18;
    g.beginPath();
    g.moveTo(288, y + 5);
    g.quadraticCurveTo(322, y - 7, 356, y + 9);
    g.stroke();
  }
  g.fillStyle = Wt;
  g.beginPath();
  g.ellipse(352, 560, 26, 34, 0.2, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // 后腿团
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(322, 560, 34, Math.PI * 1.05, Math.PI * 1.9);
  g.stroke();
  // 耳
  for (const [ex, ey, s] of [[368, 470, -1], [404, 468, 1]]) {
    F(g, O, INK, 2, () => {
      g.moveTo(ex - 10, ey + 8);
      g.lineTo(ex + 2 * s, ey - 16);
      g.lineTo(ex + 12, ey + 6);
      g.closePath();
    });
    g.fillStyle = '#f2a8a0';
    g.beginPath();
    g.moveTo(ex - 5, ey + 5);
    g.lineTo(ex + 2 * s, ey - 9);
    g.lineTo(ex + 7, ey + 4);
    g.closePath();
    g.fill();
  }
  // 头（橘色）
  F(g, O, INK, 2.4, () => g.arc(388, 502, 33, 0, Math.PI * 2));
  g.save();
  g.beginPath();
  g.arc(388, 502, 33, 0, Math.PI * 2);
  g.clip();
  g.strokeStyle = ODk;
  g.lineWidth = 4;
  for (const s of [[362, 474, 372, 484], [390, 468, 390, 480], [414, 474, 406, 484]] as Array<[number, number, number, number]>) {
    g.beginPath();
    g.moveTo(s[0], s[1]);
    g.lineTo(s[2], s[3]);
    g.stroke();
  }
  // 人脸：奶油色椭圆脸
  g.fillStyle = '#f7e6cc';
  g.beginPath();
  g.ellipse(390, 508, 26, 21, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // 腮红
  dot(g, 368, 518, 6, 'rgba(232,110,110,0.45)');
  dot(g, 412, 516, 6, 'rgba(232,110,110,0.45)');
  // 杏眼斜睨（瞳孔挤右看少女）+ 厚上眼皮 + 挑眉
  for (const [x, y] of [[376, 502], [404, 500]]) {
    g.fillStyle = '#fff';
    g.beginPath();
    g.ellipse(x, y, 7.4, 4.6, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.stroke();
    dot(g, x + 3.4, y + 0.6, 2.8, '#2a1c12');
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x - 8, y - 1.4);
    g.quadraticCurveTo(x, y - 6, x + 8, y - 2);
    g.stroke();
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(x - 6.6, y - 10);
    g.quadraticCurveTo(x, y - 13.4, x + 7.4, y - 10);
    g.stroke();
  }
  // 鼻、撇嘴、胡须
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(390, 510);
  g.quadraticCurveTo(393, 517, 389, 519);
  g.stroke();
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(382, 527);
  g.quadraticCurveTo(390, 521, 398, 526);
  g.stroke();
  g.lineWidth = 1;
  for (const [a, b] of [
    [[412, 514], [444, 509]], [[412, 519], [442, 523]], [[368, 515], [338, 510]], [[368, 520], [340, 524]],
  ] as Array<[[number, number], [number, number]]>) {
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.stroke();
  }
  // 抬起的前爪（从胸口斜向前下方伸出，白肢 + 爪尖；拎老鼠点 CAT_PAW=(428,540)）
  F(g, Wt, INK, 2, () => {
    g.moveTo(376, 548);
    g.quadraticCurveTo(400, 546, 420, 538);
    g.quadraticCurveTo(432, 534, 434, 542);
    g.quadraticCurveTo(424, 550, 402, 556);
    g.quadraticCurveTo(384, 558, 374, 556);
    g.closePath();
  });
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  for (const [a, b] of [[[420, 540], [426, 548]], [[410, 543], [414, 552]], [[399, 546], [401, 554]]] as Array<[[number, number], [number, number]]>) {
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.stroke();
  }
  g.restore();
}

