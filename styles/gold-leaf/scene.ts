// ============================================================================
// scene.ts — 静态场景·建筑与陈设（山墙/小尖塔/侧柱/草地/下边框/尖拱彩窗/桌/宝座）
// 技法借鉴 huashu-art-motion 05_gothic（MIT），TSX 重写；坐标＝源片 ×2/3。
// 金铅条/山墙金球/十字顶饰/宝座金件进「金色度」掩膜，被匀速高光扫点亮（签名④）。
// ============================================================================
import {
  archPath, BLUE, dot, F, GOLD, GREEN, GREEN_DK, INK, lerpN, mulberry32,
  PANEL_PTS, PINK, RED, ROSE, LANCETS, WIN, WHITE, WOOD, paintGoldTexture, paintParchment,
} from './world';
import {knight, maiden, textColumn} from './figures';

// ---- 建筑带饰（山墙金球 / 小尖塔 / 侧柱 / 草地 / 下边框）----
function architecture(g: CanvasRenderingContext2D) {
  const band = (pts: Array<[number, number]>, col: string, w: number) => {
    g.lineJoin = 'miter';
    g.lineCap = 'butt';
    F(g, null, INK, w + 4, () => {
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    });
    F(g, null, col, w, () => {
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    });
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(2, Math.floor(L / 15));
      for (let k = 1; k < n; k++) {
        const q = k / n;
        dot(g, lerpN(a[0], b[0], q), lerpN(a[1], b[1], q), 1.8, '#fff');
      }
      const nx = (b[1] - a[1]) / L, ny = -(b[0] - a[0]) / L, sg = ny < 0 ? 1 : -1;
      const m = Math.max(2, Math.floor(L / 23));
      for (let k = 1; k < m; k++) {
        const q = k / m;
        dot(g, lerpN(a[0], b[0], q) + nx * sg * (w / 2 + 6), lerpN(a[1], b[1], q) + ny * sg * (w / 2 + 6), 4, GOLD, INK, 1.4);
      }
    }
  };
  band([[215, 131], [387, 35], [559, 131]], PINK, 20);
  band([[557, 131], [657, 55], [757, 131]], BLUE, 17);
  band([[757, 131], [857, 55], [964, 131]], BLUE, 17);
  // 三叶拱描线（中、右山墙下）
  g.strokeStyle = 'rgba(110,66,10,0.8)';
  g.lineWidth = 2;
  for (const cx of [657, 857]) {
    g.beginPath();
    g.arc(cx - 59, 175, 41, Math.PI * 1.05, Math.PI * 1.85);
    g.arc(cx, 137, 47, Math.PI * 1.12, Math.PI * 1.88);
    g.arc(cx + 59, 175, 41, Math.PI * 1.15, Math.PI * 1.95);
    g.stroke();
  }
  // 吊坠尖
  for (const x of [557, 757]) {
    F(g, WHITE, INK, 1.8, () => {
      g.moveTo(x - 11, 159);
      g.lineTo(x + 11, 159);
      g.lineTo(x, 188);
      g.closePath();
    });
    dot(g, x, 168, 3, RED);
  }
  // 十字顶饰
  for (const [x, y] of [[387, 20], [657, 40], [857, 40]]) {
    g.fillStyle = GOLD;
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.fillRect(x - 2.6, y - 15, 5.2, 20);
    g.strokeRect(x - 2.6, y - 15, 5.2, 20);
    g.fillRect(x - 8, y - 9, 16, 4.6);
    g.strokeRect(x - 8, y - 9, 16, 4.6);
  }
  // 小尖塔
  for (const [x, top, bot] of [[208, 45, 165], [557, 61, 157], [757, 61, 157], [970, 45, 165]]) {
    const sw = 15, shaftTop = top + 41;
    g.fillStyle = WHITE;
    g.fillRect(x - sw / 2, shaftTop, sw, bot - shaftTop);
    g.fillStyle = BLUE;
    for (const dx of [-3.4, 2]) g.fillRect(x + dx, shaftTop + 5, 2, bot - shaftTop - 11);
    g.strokeStyle = INK;
    g.lineWidth = 1.6;
    g.strokeRect(x - sw / 2, shaftTop, sw, bot - shaftTop);
    F(g, RED, INK, 1.6, () => {
      g.moveTo(x - 10, shaftTop);
      g.lineTo(x, top);
      g.lineTo(x + 10, shaftTop);
      g.closePath();
    });
    g.fillStyle = GOLD;
    g.fillRect(x - 10, shaftTop - 1.4, 20, 4.6);
    g.strokeRect(x - 10, shaftTop - 1.4, 20, 4.6);
    dot(g, x, top - 3, 3.4, GOLD, INK, 1.4);
  }
  // 侧柱：红/蓝/粉方块 + 白点
  const cols = [RED, BLUE, PINK, BLUE];
  for (const x0 of [199, 960]) {
    for (let y = 167, k = 0; y < 630; y += 21, k++) {
      g.fillStyle = cols[k % 4];
      g.fillRect(x0, y, 20, 21);
      g.strokeStyle = INK;
      g.lineWidth = 1.4;
      g.strokeRect(x0, y, 20, 21);
      dot(g, x0 + 10, y + 10.5, 2.6, '#fff');
    }
  }
  g.fillStyle = GOLD;
  g.fillRect(197, 160, 23, 8);
  g.fillRect(958, 160, 23, 8);
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.strokeRect(197, 160, 23, 8);
  g.strokeRect(958, 160, 23, 8);
  // 草地
  g.fillStyle = GREEN;
  g.fillRect(219, 595, 741, 35);
  g.fillStyle = GREEN_DK;
  g.fillRect(219, 595, 741, 3.4);
  const r = mulberry32(11);
  g.strokeStyle = GREEN_DK;
  g.lineWidth = 1.4;
  for (let i = 0; i < 60; i++) {
    const x = 227 + r() * 727, y = 603 + r() * 23;
    g.beginPath();
    g.moveTo(x - 2.6, y - 4);
    g.lineTo(x, y + 1.4);
    g.lineTo(x + 3.4, y - 4.6);
    g.stroke();
  }
  for (const x of [667, 694, 702, 724, 745, 787, 507, 460]) {
    const y = 600 + (x % 5);
    for (let k = 0; k < 5; k++) dot(g, x + Math.cos(k * 1.26) * 2.6, y + Math.sin(k * 1.26) * 2.6, 1.6, '#fff');
    dot(g, x, y, 1.4, '#f2c230');
  }
  // 下边框：红蓝相间 + 白波浪
  for (let x = 215, k = 0; x < 960; x += 35, k++) {
    const w = Math.min(35, 960 - x);
    g.fillStyle = k % 2 ? BLUE : RED;
    g.fillRect(x, 630, w, 17);
    g.strokeStyle = '#fff';
    g.lineWidth = 1.4;
    g.beginPath();
    for (let s = 0; s <= w - 7; s += 1.6) {
      const yy = 638.5 + Math.sin((s / (w - 7)) * Math.PI * 2) * 2.6;
      if (s) g.lineTo(x + 3.4 + s, yy);
      else g.moveTo(x + 3.4, yy);
    }
    g.stroke();
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.strokeRect(x, 630, w, 17);
  }
  g.lineWidth = 2;
  g.strokeRect(199, 629, 781, 20);
  for (const [x, y] of [[207, 639], [972, 639]]) {
    g.fillStyle = GOLD;
    g.fillRect(x - 8.6, y - 8.6, 17.4, 17.4);
    g.strokeStyle = INK;
    g.strokeRect(x - 8.6, y - 8.6, 17.4, 17.4);
  }
  dot(g, 979, 645, 5.4, GOLD, INK, 1.4);
}

// ---- 尖拱窗：四叶玫瑰窗 + 两扇柳叶窗红蓝菱格彩玻璃（金铅条进掩膜）----
function windowStatic(g: CanvasRenderingContext2D) {
  g.save();
  g.shadowColor = 'rgba(80,40,0,0.35)';
  g.shadowOffsetX = 3.4;
  g.shadowOffsetY = 3.4;
  F(g, '#f6eedb', INK, 2.6, () => archPath(g, WIN.xl, WIN.xr, WIN.ys, WIN.yb, WIN.r));
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  archPath(g, WIN.xl, WIN.xr, WIN.ys, WIN.yb, WIN.r);
  g.stroke();
  g.strokeStyle = 'rgba(140,110,70,0.5)';
  g.lineWidth = 1.4;
  g.beginPath();
  archPath(g, WIN.xl + 8, WIN.xr - 8, WIN.ys + 1.4, WIN.yb, WIN.r - 8);
  g.stroke();
  // 四叶玫瑰窗
  const [rcx, rcy] = ROSE;
  F(g, RED, INK, 2, () => {
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 - Math.PI / 2;
      g.moveTo(rcx + Math.cos(a) * 22 + 20, rcy + Math.sin(a) * 22);
      g.arc(rcx + Math.cos(a) * 22, rcy + Math.sin(a) * 22, 20, 0, Math.PI * 2);
    }
  });
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 - Math.PI / 2;
    const px = rcx + Math.cos(a) * 22, py = rcy + Math.sin(a) * 22;
    dot(g, px, py, 13, BLUE, INK, 1.6);
    dot(g, px, py, 4, GOLD, INK, 1);
  }
  dot(g, rcx, rcy, 8.6, GOLD, INK, 1.6);
  for (const [dx, dy] of [[0, -6], [-6, 4], [6, 4]]) dot(g, rcx - 1.4 + dx, rcy + 63 + dy, 5.4, BLUE, INK, 1.4);
  // 柳叶窗：红蓝菱格 + 金铅条 + 白点
  LANCETS.forEach((L, li) => {
    g.save();
    g.beginPath();
    archPath(g, L.xl, L.xr, L.ys, L.yb, L.r);
    g.clip();
    const s = 25;
    for (let a = -20; a < 40; a++) {
      for (let b = -20; b < 20; b++) {
        const u = a * s, v = b * s;
        const x = (u + v) / 2, y = (u - v) / 2;
        if (x < 250 || x > 527 || y < 240 || y > 373) continue;
        g.beginPath();
        g.moveTo(x, y - s / 2);
        g.lineTo(x + s / 2, y);
        g.lineTo(x, y + s / 2);
        g.lineTo(x - s / 2, y);
        g.closePath();
        g.fillStyle = (a + b) % 2 ? RED : BLUE;
        g.fill();
        if ((a + b) % 2 === 0) for (const [dx, dy] of [[-2.6, 0], [2.6, 0], [0, -2.6], [0, 2.6], [0, 0]]) dot(g, x + dx, y + dy, 1.2, '#fff');
        else dot(g, x, y, 2.6, GOLD);
      }
    }
    g.strokeStyle = GOLD;
    g.lineWidth = 2;
    g.beginPath();
    for (let k = -40; k < 80; k++) {
      const c0 = (k + 0.5) * s;
      g.moveTo(c0 - 700, 700);
      g.lineTo(c0 + 700, -700);
      g.moveTo(c0 - 700, -700);
      g.lineTo(c0 + 700, 700);
    }
    g.stroke();
    g.restore();
    g.strokeStyle = INK;
    g.lineWidth = 2.6;
    g.beginPath();
    archPath(g, L.xl, L.xr, L.ys, L.yb, L.r);
    g.stroke();
  });
  // 窗台
  F(g, PINK, INK, 2, () => g.rect(230, 358, 313, 16));
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(233, 361, 307, 2.6);
}

// ---- 桌（白桌布 + 蓝竖条 + 扇贝边）、宝座、面包、刀 ----
function furniture(g: CanvasRenderingContext2D) {
  g.lineCap = 'round';
  for (const x of [581, 761]) {
    for (const [a, b] of [[-17, 12], [17, -12]]) {
      F(g, null, INK, 10, () => {
        g.moveTo(x + b, 477);
        g.lineTo(x + a, 599);
      });
      F(g, null, WOOD, 6.6, () => {
        g.moveTo(x + b, 477);
        g.lineTo(x + a, 599);
      });
    }
    g.fillStyle = WOOD;
    g.fillRect(x - 15, 553, 30, 5.4);
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.strokeRect(x - 15, 553, 30, 5.4);
  }
  F(g, WHITE, INK, 2, () => {
    g.moveTo(537, 385);
    g.lineTo(810, 385);
    g.lineTo(807, 430);
    g.lineTo(540, 430);
    g.closePath();
  });
  g.fillStyle = 'rgba(150,140,120,0.18)';
  g.fillRect(540, 420, 267, 9.4);
  g.strokeStyle = BLUE;
  g.lineWidth = 1.6;
  for (const x of [552, 557, 789, 795]) {
    g.beginPath();
    g.moveTo(x, 387);
    g.lineTo(x + (x < 670 ? 1.4 : -1.4), 429);
    g.stroke();
  }
  F(g, WHITE, INK, 2, () => {
    g.moveTo(541, 430);
    g.lineTo(805, 430);
    g.lineTo(803, 475);
    for (let x = 803; x > 543; x -= 17) g.quadraticCurveTo(x - 8.6, 495, x - 17, 475);
    g.closePath();
  });
  g.save();
  g.beginPath();
  g.moveTo(541, 430);
  g.lineTo(805, 430);
  g.lineTo(803, 475);
  for (let x = 803; x > 543; x -= 17) g.quadraticCurveTo(x - 8.6, 495, x - 17, 475);
  g.closePath();
  g.clip();
  g.strokeStyle = 'rgba(36,68,158,0.8)';
  g.lineWidth = 1.4;
  for (let x = 548; x < 803; x += 17) {
    g.beginPath();
    g.moveTo(x, 432);
    g.quadraticCurveTo(x + 2, 460, x + 0.6, 490);
    g.stroke();
  }
  g.strokeStyle = 'rgba(150,140,120,0.45)';
  g.lineWidth = 1;
  for (let x = 556; x < 803; x += 17) {
    g.beginPath();
    g.moveTo(x, 433);
    g.lineTo(x + 1.4, 483);
    g.stroke();
  }
  g.restore();
  for (let x = 551; x < 800; x += 8.6) dot(g, x, 467, 1.6, RED);
  // 面包 + 刀
  F(g, '#d9a058', INK, 1.6, () => g.ellipse(587, 411, 23, 13, 0, 0, Math.PI * 2));
  g.strokeStyle = '#8a5524';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(587, 400);
  g.lineTo(587, 421);
  g.moveTo(575, 411);
  g.quadraticCurveTo(587, 404, 599, 411);
  g.stroke();
  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(737, 424);
  g.lineTo(760, 421);
  g.stroke();
  g.strokeStyle = '#7a4a20';
  g.lineWidth = 2.6;
  g.stroke();
  g.strokeStyle = INK;
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(760, 421);
  g.lineTo(790, 418);
  g.stroke();
  g.strokeStyle = '#d8d8d8';
  g.lineWidth = 1.6;
  g.stroke();
  // 宝座（少女身后）
  F(g, '#3c8a3a', INK, 2, () => g.rect(959, 287, 27, 212));
  g.strokeStyle = 'rgba(255,255,255,0.3)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(964, 293);
  g.lineTo(964, 493);
  g.stroke();
  dot(g, 972, 281, 6, GOLD, INK, 1.4);
  dot(g, 985, 307, 4.6, GOLD, INK, 1.4);
  F(g, PINK, INK, 2, () => g.rect(868, 499, 120, 89));
  for (let k = 0; k < 4; k++) {
    const x = 879 + k * 27;
    F(g, BLUE, INK, 1.6, () => archPath(g, x, x + 17, 527, 581, 11.4));
  }
  F(g, GOLD, INK, 1.6, () => g.rect(864, 587, 128, 12));
  F(g, RED, INK, 2, () => {
    g.moveTo(867, 484);
    g.lineTo(989, 484);
    g.lineTo(991, 500);
    g.lineTo(867, 500);
    g.closePath();
  });
  dot(g, 989, 490, 4.6, GOLD, INK, 1.4);
}


export function paintStatic(g: CanvasRenderingContext2D) {
  paintParchment(g);
  // 金箔纹理（签名①：逐像素；PANEL 裁剪内）
  g.save();
  g.beginPath();
  PANEL_PTS.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
  g.clip();
  paintGoldTexture(g, 219, 40, 962, 598, 5);
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  PANEL_PTS.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
  g.stroke();
  architecture(g);
  windowStatic(g);
  furniture(g);
  textColumn(g);
  knight(g);
  maiden(g);
}
