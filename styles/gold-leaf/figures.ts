// ============================================================================
// figures.ts — 静态场景·人物与文字（拉丁文朱批正文栏 / 小骑士 / 少女 / 人脸猫）
// 技法借鉴 huashu-art-motion 05_gothic（MIT），TSX 重写。
// 短板修正（INDEX「金发像兜帽」）：少女金发轮廓重画——4 个波浪瓣手绘闭合轮廓 + 4 条 S 形发绺，
// 不套默认头形；光环/金发/圣杯/裙摆金线进「金色度」掩膜，高光带经过即被点亮（f248 扫过金发＝验收帧）。
// 句首 Cattus/Nemo/Mus 朱红＝中世纪朱批做法（签名⑦）。
// ============================================================================
import {
  BLUE, BLUE_DK, dot, F, GOLD, GIRL, HAIR, HAIR_DK, INK, RED, RED_DK, RUBRIC, SKIN, smooth, WHITE,
} from './world';

// ---- 正文栏：格线、笔花、蓝底金字首字母 H、哥特体拉丁文（句首朱红＝朱批）----
const LINES: Array<[string, string[]]> = [
  ['hic sedet homo', []],
  ['cum poculo suo', []],
  ['et bibit. Cattus', ['Cattus']],
  ['eum spectat.', []],
  ['Cattus semper', ['Cattus']],
  ['spectat. Nemo', ['Nemo']],
  ['scit quare. Mus', ['Mus']],
  ['autem scit et', []],
  ['tacet in eternum.', []],
];
export function textColumn(g: CanvasRenderingContext2D) {
  g.strokeStyle = 'rgba(150,110,70,0.28)';
  g.lineWidth = 0.8;
  for (let k = 0; k < 10; k++) {
    const y = 200 + k * 41;
    g.beginPath();
    g.moveTo(997, y);
    g.lineTo(1263, y);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(1003, 160);
  g.lineTo(1003, 613);
  g.stroke();
  g.beginPath();
  g.moveTo(1259, 160);
  g.lineTo(1259, 613);
  g.stroke();
  // 笔花
  g.lineWidth = 1.4;
  g.strokeStyle = RED;
  g.beginPath();
  for (let y = 157; y < 333; y += 1.6) {
    const x = 998 + Math.sin(y * 0.09) * 4;
    if (y === 157) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.strokeStyle = BLUE;
  g.beginPath();
  for (let y = 173; y < 220; y += 1.6) {
    const x = 1004 + Math.sin(y * 0.11 + 1) * 3.4;
    if (y === 173) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  // 首字母 H（蓝底金框金字 + 白螺旋）
  g.save();
  g.shadowColor = 'rgba(60,30,0,0.3)';
  g.shadowOffsetX = 2;
  g.shadowOffsetY = 2;
  g.fillStyle = GOLD;
  g.fillRect(1005, 203, 80, 79);
  g.restore();
  g.fillStyle = BLUE;
  g.fillRect(1011, 209, 68, 67);
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  g.strokeRect(1005, 203, 80, 79);
  g.strokeRect(1011, 209, 68, 67);
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 1.1;
  for (const [x, y, s] of [[1067, 220, 1], [1021, 263, -1], [1067, 264, 1]]) {
    g.beginPath();
    for (let a = 0; a < 9; a += 0.25) {
      const rr = 0.7 + a * 0.94;
      const px = x + Math.cos(a * s) * rr, py = y + Math.sin(a * s) * rr;
      if (a) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.stroke();
  }
  for (let k = 0; k < 7; k++) dot(g, 1019 + k * 8.6, 213, 1.1, '#fff');
  g.font = '79px "UnifrakturMaguntia"';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.lineWidth = 4;
  g.strokeStyle = INK;
  g.strokeText('H', 1045, 269);
  g.fillStyle = GOLD;
  g.fillText('H', 1045, 269);
  g.fillStyle = 'rgba(255,245,200,0.6)';
  g.save();
  g.beginPath();
  g.rect(1011, 209, 68, 31);
  g.clip();
  g.fillText('H', 1044.4, 268.4);
  g.restore();
  // 正文（黑letter 29px；句首朱红）
  g.textAlign = 'left';
  g.font = '29px "UnifrakturMaguntia"';
  LINES.forEach(([s, redWords], k) => {
    const y = 233 + k * 41;
    let cx = k < 2 ? 1100 : 1010; // 前两行给首字母 H 让位（源片同构）
    for (const word of s.split(' ')) {
      const red = redWords.some((rw) => word.startsWith(rw));
      g.fillStyle = red ? RUBRIC : '#2a1c12';
      g.fillText(word, cx, y);
      cx += g.measureText(`${word} `).width;
    }
    if (k === 2) {
      g.lineWidth = 1.6;
      g.strokeStyle = RUBRIC;
      g.beginPath();
      for (let i = 0; i <= 10; i++) g.lineTo(cx + 4 + i * 7.4, y - 9.4 + (i % 2) * 8);
      g.stroke();
      g.strokeStyle = BLUE;
      g.beginPath();
      for (let i = 0; i <= 10; i++) g.lineTo(cx + 8 + i * 7.4, y - 9.4 + (i % 2) * 8);
      g.stroke();
    }
  });
}

// ---- 小骑士（页边滑稽画，烘焙静态）----
export function knight(g: CanvasRenderingContext2D) {
  g.save();
  g.translate(507, 673);
  F(g, RED, INK, 1.6, () => {
    g.moveTo(-6.6, -5.4);
    g.lineTo(6.6, -5.4);
    g.lineTo(9.4, 17.4);
    g.lineTo(-9.4, 17.4);
    g.closePath();
  });
  g.lineCap = 'round';
  F(g, null, INK, 4, () => {
    g.moveTo(-4, 16);
    g.lineTo(-9.4, 32);
    g.moveTo(4, 16);
    g.lineTo(12, 29.4);
  });
  F(g, null, '#d0d0d8', 2.4, () => {
    g.moveTo(-4, 16);
    g.lineTo(-9.4, 32);
    g.moveTo(4, 16);
    g.lineTo(12, 29.4);
  });
  F(g, '#c8ccd6', INK, 1.6, () => g.rect(-8, -22.6, 16, 17.4));
  g.fillStyle = INK;
  g.fillRect(-5.4, -16, 10.6, 2);
  F(g, BLUE, INK, 1.6, () => {
    g.moveTo(4, -4);
    g.lineTo(20, -4);
    g.lineTo(20, 9.4);
    g.lineTo(12, 17.4);
    g.lineTo(4, 9.4);
    g.closePath();
  });
  g.strokeStyle = '#fff';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(12, -1.4);
  g.lineTo(12, 13.4);
  g.moveTo(6.6, 4);
  g.lineTo(17.4, 4);
  g.stroke();
  g.restore();
}

// ---- 少女（哥特圣像画法；金发轮廓重画＝短板修正；烘焙静态）----
// 短板修正说明：INDEX「金发像兜帽」——本版头发是显式 quadratic 波浪瓣闭合轮廓（左右对称垂落），
// 不用中点平滑折线（首版折线自交塌成兜帽状）；前额中分刘海 + 脸侧厚发绺，正面杏眼小唇。
export function maiden(g: CanvasRenderingContext2D) {
  const [gx, gy] = GIRL.haloC, hr = GIRL.haloR;
  const hx = GIRL.headC[0], hy = GIRL.headC[1]; // (897, 322)
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // 光环（头后；进掩膜被高光扫到）
  const hg = g.createRadialGradient(gx - 20, gy - 20, 7, gx, gy, hr);
  hg.addColorStop(0, '#fbe597');
  hg.addColorStop(0.6, '#e2b445');
  hg.addColorStop(1, '#b98222');
  F(g, null, INK, 2, () => g.arc(gx, gy, hr, 0, Math.PI * 2));
  g.fillStyle = hg;
  g.fill();
  g.strokeStyle = RED;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(gx, gy, hr - 6, 0, Math.PI * 2);
  g.stroke();
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    dot(g, gx + Math.cos(a) * (hr - 12), gy + Math.sin(a) * (hr - 12), 1.5, '#fff3c0', 'rgba(120,70,10,0.6)', 0.7);
  }
  // === 长金发（签名短板修正：显式波浪瓣轮廓，左右垂落，画在头后） ===
  g.beginPath();
  g.moveTo(hx, hy - 34); // 头顶 (897,288)
  // 右侧外缘：四个波浪瓣（每瓣两段二次曲线）
  g.quadraticCurveTo(hx + 26, hy - 30, hx + 40, hy + 4);   // 右上外缘 (937,326)
  g.quadraticCurveTo(hx + 52, hy + 30, hx + 44, hy + 52);  // 瓣1 内收 (941,374)
  g.quadraticCurveTo(hx + 58, hy + 66, hx + 50, hy + 92);  // 瓣2 外放 (947,414)
  g.quadraticCurveTo(hx + 62, hy + 112, hx + 48, hy + 138);// 瓣3 (945,460)
  g.quadraticCurveTo(hx + 60, hy + 162, hx + 36, hy + 192);// 瓣4 外放到腰 (933,514)
  g.quadraticCurveTo(hx + 26, hy + 210, hx + 8, hy + 218); // 发梢内卷 (905,540)
  g.quadraticCurveTo(hx - 8, hy + 214, hx - 14, hy + 198); // 底部 (883,520)
  // 左侧外缘（向上，镜像四瓣）
  g.quadraticCurveTo(hx - 34, hy + 168, hx - 22, hy + 142);
  g.quadraticCurveTo(hx - 40, hy + 116, hx - 28, hy + 92);
  g.quadraticCurveTo(hx - 42, hy + 66, hx - 32, hy + 48);
  g.quadraticCurveTo(hx - 44, hy + 26, hx - 34, hy + 4);
  g.quadraticCurveTo(hx - 26, hy - 30, hx, hy - 34);
  g.closePath();
  g.fillStyle = HAIR;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.stroke();
  // 发内 S 形发绺（左右各 3 条，深金）
  g.strokeStyle = HAIR_DK;
  g.lineWidth = 1.6;
  for (const sd of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const x0 = hx + sd * (18 + k * 9);
      g.beginPath();
      for (let s2 = 0; s2 <= 14; s2++) {
        const q = s2 / 14;
        const x = x0 + Math.sin(q * 7.5 + k * 1.7 + sd) * 5.5 * q + sd * q * 7;
        const y = hy + 6 + q * 200;
        if (s2) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
    }
  }
  // === 蓝斗篷（肩部两片 + 金边，垂到肘） ===
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(hx + sd * 34, hy + 34);
    g.quadraticCurveTo(hx + sd * 52, hy + 60, hx + sd * 50, hy + 108);
    g.quadraticCurveTo(hx + sd * 48, hy + 130, hx + sd * 38, hy + 136);
    g.quadraticCurveTo(hx + sd * 30, hy + 96, hx + sd * 22, hy + 48);
    g.closePath();
    g.fillStyle = BLUE;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = GOLD;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(hx + sd * 38, hy + 40);
    g.quadraticCurveTo(hx + sd * 50, hy + 76, hx + sd * 44, hy + 130);
    g.stroke();
  }
  // === 裙：红 + 金细竖条 + 金下摆（钟形） ===
  g.beginPath();
  g.moveTo(hx - 32, hy + 134);
  g.quadraticCurveTo(hx - 48, hy + 190, hx - 64, hy + 244);
  g.quadraticCurveTo(hx - 60, hy + 284, hx - 34, hy + 290);
  g.lineTo(hx + 36, hy + 290);
  g.quadraticCurveTo(hx + 62, hy + 284, hx + 66, hy + 244);
  g.quadraticCurveTo(hx + 50, hy + 190, hx + 34, hy + 134);
  g.closePath();
  g.fillStyle = RED;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.stroke();
  g.save();
  g.beginPath();
  g.moveTo(hx - 32, hy + 134);
  g.quadraticCurveTo(hx - 48, hy + 190, hx - 64, hy + 244);
  g.quadraticCurveTo(hx - 60, hy + 284, hx - 34, hy + 290);
  g.lineTo(hx + 36, hy + 290);
  g.quadraticCurveTo(hx + 62, hy + 284, hx + 66, hy + 244);
  g.quadraticCurveTo(hx + 50, hy + 190, hx + 34, hy + 134);
  g.closePath();
  g.clip();
  g.strokeStyle = 'rgba(240,190,80,0.75)';
  g.lineWidth = 1.1;
  for (let x = hx - 58; x <= hx + 60; x += 13) {
    g.beginPath();
    g.moveTo(x, hy + 140);
    g.quadraticCurveTo(x - 6, hy + 210, x - 10, hy + 288);
    g.stroke();
  }
  g.strokeStyle = RED_DK;
  g.lineWidth = 2;
  for (const fx of [hx - 34, hx, hx + 34]) {
    g.beginPath();
    g.moveTo(fx, hy + 142);
    g.quadraticCurveTo(fx - 6, hy + 210, fx - 10, hy + 286);
    g.stroke();
  }
  g.strokeStyle = GOLD;
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(hx - 58, hy + 282);
  g.quadraticCurveTo(hx, hy + 296, hx + 60, hy + 280);
  g.stroke();
  g.restore();
  // === 躯干 + 金领口 ===
  g.beginPath();
  g.moveTo(hx - 30, hy + 32);
  g.quadraticCurveTo(hx - 36, hy + 90, hx - 32, hy + 138);
  g.lineTo(hx + 32, hy + 138);
  g.quadraticCurveTo(hx + 36, hy + 90, hx + 30, hy + 32);
  g.closePath();
  g.fillStyle = RED;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.stroke();
  g.save();
  g.clip();
  g.strokeStyle = 'rgba(240,190,80,0.75)';
  g.lineWidth = 1.1;
  for (let x = hx - 26; x <= hx + 26; x += 13) {
    g.beginPath();
    g.moveTo(x, hy + 36);
    g.lineTo(x + 2, hy + 136);
    g.stroke();
  }
  g.restore();
  // === 手臂：两袖合拢端圣杯 ===
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(hx + sd * 28, hy + 40);
    g.quadraticCurveTo(hx + sd * 34, hy + 74, hx + sd * 14, hy + 104);
    g.quadraticCurveTo(hx + sd * 8, hy + 112, hx + sd * 5, hy + 112);
    g.quadraticCurveTo(hx + sd * 12, hy + 80, hx + sd * 16, hy + 46);
    g.closePath();
    g.fillStyle = RED;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.stroke();
  }
  // 金袖口 + 双手
  F(g, GOLD, INK, 1.6, () => g.rect(hx - 12, hy + 104, 24, 9));
  F(g, SKIN, INK, 1.6, () => g.arc(hx, hy + 118, 7, 0, Math.PI * 2));
  // === 圣杯（居中，金杯进掩膜） ===
  g.save();
  g.translate(hx, hy + 124);
  const w = 34;
  const gg = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  gg.addColorStop(0, '#a87020');
  gg.addColorStop(0.35, '#fbe08a');
  gg.addColorStop(0.6, '#e0ad40');
  gg.addColorStop(1, '#8a5a14');
  F(g, gg, INK, 1.6, () => {
    g.moveTo(-w / 2, 0);
    g.bezierCurveTo(-w / 2, 17, -6.6, 24, 0, 24);
    g.bezierCurveTo(6.6, 24, w / 2, 17, w / 2, 0);
    g.closePath();
  });
  F(g, gg, INK, 1.4, () => {
    g.moveTo(-3.4, 23);
    g.lineTo(3.4, 23);
    g.lineTo(2.6, 39);
    g.lineTo(-2.6, 39);
    g.closePath();
  });
  F(g, '#f0c860', INK, 1.4, () => g.ellipse(0, 31, 6, 3.4, 0, 0, Math.PI * 2));
  F(g, gg, INK, 1.4, () => {
    g.moveTo(-13.4, 44);
    g.quadraticCurveTo(0, 33, 13.4, 44);
    g.closePath();
  });
  F(g, '#7a1018', INK, 1.4, () => g.ellipse(0, 0, w / 2, 4.6, 0, 0, Math.PI * 2));
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.beginPath();
  g.ellipse(-5.4, -1, 6, 1.4, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // === 头（正面） + 中分刘海 + 脸侧厚发绺 ===
  F(g, HAIR, INK, 2, () => g.arc(hx, hy, 26, 0, Math.PI * 2)); // 头底色（金发色，防露边）
  F(g, SKIN, INK, 2, () => g.arc(hx, hy + 3, 22, 0, Math.PI * 2)); // 脸
  // 中分刘海：两片从中心缝向两侧弯
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(hx, hy - 22);
    g.quadraticCurveTo(hx + sd * 16, hy - 20, hx + sd * 22, hy - 6);
    g.quadraticCurveTo(hx + sd * 16, hy - 10, hx + sd * 9, hy - 7);
    g.quadraticCurveTo(hx + sd * 4, hy - 8, hx, hy - 4);
    g.closePath();
    g.fillStyle = HAIR;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.stroke();
  }
  // 脸侧发绺（厚条，从鬓角垂到肩）
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(hx + sd * 21, hy - 8);
    g.quadraticCurveTo(hx + sd * 27, hy + 40, hx + sd * 22, hy + 86);
    g.quadraticCurveTo(hx + sd * 19, hy + 100, hx + sd * 14, hy + 92);
    g.quadraticCurveTo(hx + sd * 16, hy + 44, hx + sd * 14, hy + 2);
    g.closePath();
    g.fillStyle = HAIR;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.stroke();
  }
  // 五官：正面杏眼 ×2、细眉、小红唇、腮红
  dot(g, hx - 14, hy + 14, 7, 'rgba(232,110,110,0.5)');
  dot(g, hx + 14, hy + 14, 7, 'rgba(232,110,110,0.5)');
  for (const sd of [-1, 1]) {
    const ex = hx + sd * 10;
    g.fillStyle = '#fff';
    g.beginPath();
    g.ellipse(ex, hy + 2, 6, 3.6, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.stroke();
    dot(g, ex + sd * 1.6, hy + 2.4, 2.4, '#3a2a1c');
    g.strokeStyle = INK;
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(ex, hy, 4.4, 0.35, Math.PI - 0.35);
    g.stroke();
    g.strokeStyle = '#8a5a20';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(ex - 5.4, hy - 6);
    g.quadraticCurveTo(ex, hy - 9, ex + 5.4, hy - 6);
    g.stroke();
  }
  g.fillStyle = '#c0303a';
  g.beginPath();
  g.moveTo(hx, hy + 17);
  g.lineTo(hx + 4.6, hy + 19);
  g.lineTo(hx, hy + 21.4);
  g.lineTo(hx - 4.6, hy + 19);
  g.closePath();
  g.fill();
  // 鞋
  F(g, '#3a2418', INK, 1.6, () => g.ellipse(hx - 22, hy + 292, 10, 5, 0, 0, Math.PI * 2));
  F(g, '#3a2418', INK, 1.6, () => g.ellipse(hx + 22, hy + 292, 10, 5, 0, 0, Math.PI * 2));
  g.restore();
}


