// 世界底版与窗外景 —— watercolor-cel（缓存精灵：全片画一次，逐帧 drawImage）。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）scenes/25_ghibli.js 底版段：机制与参数级借鉴，
// Remotion(Canvas2D+TSX) 惯用法按 1280×720 重设计，零整段拷贝。
// 坑（RECON §25 点名）：① 暗部必须用 amp60 大变形多边形，矩形拼墙出硬接缝；② 色晕 α≤0.045×3 层防「发霉羊皮纸」。
import type {CanvasCtx, Pt} from './types';
import {W, H, FLOOR, WIN, WALL, BLOOM_TINTS, WOODS, FIX, ROD} from './types';
import {mulberry32, clamp} from './noise';
import {wash, rectPts, ellipsePts, paperTex, cached} from './wash';

/** 室内底版：纸 → 径向洗染墙 → 28 块色晕 → 两角暗晕（amp60 多边形）→ 护墙板/地板逐块洗染 → 窗光斑 → 家具剪影。 */
export function roomBg(): HTMLCanvasElement {
  return cached('wcc_bg', W, H, (g) => {
    g.drawImage(paperTex('wcc_paper', 640, 360, '#fbf6ea', {scale: 0.02, amt: 6, grain: 10, seed: 3}), 0, 0, W, H);
    // 墙：径向渐变洗染（窗边亮 #fbf3e0 → 角落暗 #dcc49a）——渐变做 fill 传入 wash
    const wl = g.createRadialGradient(300, 260, 70, 380, 320, 1000);
    wl.addColorStop(0, WALL.hi);
    wl.addColorStop(0.6, WALL.mid);
    wl.addColorStop(1, WALL.lo);
    wash(g, rectPts(-20, -20, W + 40, FLOOR + 30), WALL.base, {layers: 5, alpha: 0.4, amp: 12, seed: 2, edge: 0, fill: wl});
    // 28 块大幅变形透明色晕（跳过窗洞区；α0.028 无边=水彩吸进纸里的柔晕，防迷彩污块）
    {
      const r = mulberry32(404);
      for (let i = 0; i < 28; i++) {
        const x = r() * W, y = r() * 440, rx = 90 + r() * 170, ry = 60 + r() * 120;
        if (x > 90 && x < 490 && y > 60 && y < 400) continue;
        wash(g, ellipsePts(x, y, rx, ry, 10), BLOOM_TINTS[i % BLOOM_TINTS.length], {layers: 3, alpha: 0.028, amp: 40, seed: 100 + i, edge: 0});
      }
    }
    // 两角暗晕：大幅变形多边形（矩形硬接缝坑→amp60）
    wash(g, [[1130, -20], [1300, -20], [1300, 520], [1070, 520], [1110, 300]] as Pt[], '#b89a6c', {layers: 4, alpha: 0.04, amp: 60, seed: 3, edge: 0.02});
    wash(g, [[-20, -20], [140, -20], [100, 280], [150, 520], [-20, 520]] as Pt[], '#b89a6c', {layers: 4, alpha: 0.04, amp: 60, seed: 4, edge: 0.02});
    // 木护墙板（392→FLOOR 竖板逐块换色调）
    {
      const r = mulberry32(505);
      for (let x = -10; x < W; x += 43) wash(g, rectPts(x, 392, 41, FLOOR - 392), WOODS.dado[(r() * 4) | 0], {layers: 3, alpha: 0.32, amp: 3, seed: 200 + x, edge: 0.12});
    }
    wash(g, rectPts(-20, 384, W + 40, 12), WOODS.dadoLine, {layers: 3, alpha: 0.4, amp: 2, seed: 7, edge: 0.15});
    // 地板：逐条木板洗染
    {
      const r = mulberry32(606);
      let y = FLOOR;
      for (let k = 0; k < 8; k++) {
        const h = 17 + k * 8;
        wash(g, rectPts(-20, y, W + 40, h), WOODS.floor[(r() * 4) | 0], {layers: 3, alpha: 0.5, amp: 3, seed: 300 + k, edge: 0.14});
        y += h;
      }
    }
    // 窗投到地上的暖光斑（软边带窗棂十字影——缓存底版里可以安全用 filter blur）
    g.save();
    g.globalCompositeOperation = 'screen';
    g.filter = 'blur(8px)';
    g.fillStyle = FIX.lightShaft;
    g.beginPath();
    g.moveTo(180, 488);
    g.lineTo(420, 488);
    g.lineTo(540, 716);
    g.lineTo(230, 716);
    g.closePath();
    g.fill();
    g.restore();
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.filter = 'blur(5px)';
    g.fillStyle = FIX.shaftBar;
    g.beginPath();
    g.moveTo(286, 488);
    g.lineTo(293, 488);
    g.lineTo(362, 716);
    g.lineTo(352, 716);
    g.closePath();
    g.fill();
    g.fillRect(196, 585, 318, 7);
    g.restore();
    // 踢脚板
    wash(g, rectPts(-20, FLOOR - 18, W + 40, 18), '#9a6a40', {layers: 4, alpha: 0.25, amp: 4, seed: 6, edge: 0.1});
    // 窗框（白漆木，蓝绿阴影）＋窗台
    const frame: Array<[number, number, number, number]> = [
      [WIN.frame.x, WIN.frame.y, WIN.frame.w, 16],
      [WIN.frame.x, WIN.frame.y, 16, WIN.frame.h],
      [WIN.frame.x + WIN.frame.w - 16, WIN.frame.y, 16, WIN.frame.h],
      [WIN.view.x + WIN.view.w / 2 - 5, WIN.view.y, 10, WIN.view.h],
      [WIN.view.x, WIN.view.y + WIN.view.h / 2 - 5, WIN.view.w, 10],
    ];
    frame.forEach(([x, y, w, h], i) => wash(g, rectPts(x, y, w, h), '#f6f1e2', {layers: 3, alpha: 0.95, amp: 2, seed: 20 + i, edge: 0.2, blend: 'source-over'}));
    frame.forEach(([x, y, w, h], i) => wash(g, rectPts(x + w * 0.55, y, w * 0.45, h), '#9fb8c0', {layers: 2, alpha: 0.25, amp: 2, seed: 30 + i, edge: 0}));
    wash(g, rectPts(108, WIN.view.y + WIN.view.h, 348, 18), '#f3ecd8', {layers: 3, alpha: 0.95, amp: 2, seed: 40, edge: 0.2, blend: 'source-over'});
    wash(g, rectPts(108, WIN.view.y + WIN.view.h + 15, 348, 10), '#a8b7b8', {layers: 2, alpha: 0.35, amp: 2, seed: 41, edge: 0});
    // 窗帘杆
    g.strokeStyle = '#6a4a30';
    g.lineWidth = 6;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(ROD.x0, ROD.y);
    g.lineTo(ROD.x1, ROD.y);
    g.stroke();
    // 右墙小木架＋瓶罐（彩蛋位）
    wash(g, rectPts(1030, 252, 200, 12), '#8a5a34', {layers: 3, alpha: 0.6, amp: 2, seed: 50, edge: 0.15});
    ([[1044, 200, 24, 46, '#6a9ac0'], [1088, 216, 30, 30, '#d8a050'], [1136, 192, 20, 54, '#9ab86a'], [1178, 208, 34, 38, '#c86a50']] as const).forEach(([x, y, w, h, col], i) =>
      wash(g, rectPts(x, y, w, h), col, {layers: 4, alpha: 0.3, amp: 4, seed: 60 + i, edge: 0.15}));
    // 靠墙的扫帚（致敬魔女宅急便）
    g.save();
    g.translate(1128, 250);
    g.rotate(0.12);
    wash(g, rectPts(-5, 0, 10, 340), '#7a5030', {layers: 3, alpha: 0.5, amp: 2, seed: 70, edge: 0.2});
    wash(g, [[-7, 334], [7, 334], [32, 452], [-32, 452]] as Pt[], '#c89a4a', {layers: 4, alpha: 0.45, amp: 5, seed: 71, edge: 0.2});
    g.strokeStyle = 'rgba(120,80,30,.6)';
    g.lineWidth = 1.4;
    for (let k = -4; k <= 4; k++) {
      g.beginPath();
      g.moveTo(k * 1.6, 340);
      g.lineTo(k * 6.4, 448);
      g.stroke();
    }
    g.fillStyle = '#c84a3a';
    g.fillRect(-9, 324, 18, 8);
    g.restore();
    // 整体纸纹颗粒（颜料在纸凹处沉积）：multiply α0.3
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.globalAlpha = 0.3;
    g.drawImage(paperTex('wcc_gran', 640, 360, '#f4efe2', {scale: 0.06, amt: 18, grain: 26, seed: 9}), 0, 0, W, H);
    g.restore();
  });
}

/** 云精灵：白团 source-over 洗染 + source-atop 底部蓝灰渐变（锁死配方）。 */
export function cloudSprite(key: string, w: number, h: number, seed: number): HTMLCanvasElement {
  return cached(`wcc_cloud_${key}`, w, h, (g) => {
    const r = mulberry32(seed);
    const puffs: Array<[number, number, number]> = [];
    for (let i = 0; i < 12; i++) {
      const x = w * (0.15 + r() * 0.7), base = h * 0.78;
      const yy = base - Math.sin((x / w) * Math.PI) * h * (0.35 + r() * 0.3);
      puffs.push([x, yy, 20 + r() * 30]);
    }
    puffs.push([w * 0.5, h * 0.72, w * 0.36]);
    puffs.forEach(([x, y, rr], i) =>
      wash(g, ellipsePts(x, y, rr, rr * 0.82, 14), '#ffffff', {layers: 3, alpha: 0.9, amp: 6, seed: seed + i, edge: 0, blend: 'source-over'}));
    g.save();
    g.globalCompositeOperation = 'source-atop';
    const sh = g.createLinearGradient(0, h * 0.35, 0, h);
    sh.addColorStop(0, FIX.cloudShadeA);
    sh.addColorStop(1, FIX.cloudShadeB);
    g.fillStyle = sh;
    g.fillRect(0, 0, w, h);
    g.restore();
  });
}

/** 大樟树精灵（窗外，绕树根轻摇）。 */
export function treeSprite(): HTMLCanvasElement {
  return cached('wcc_tree', 220, 260, (g) => {
    g.fillStyle = '#4a3a2a';
    g.fillRect(100, 150, 16, 110);
    const r = mulberry32(77);
    for (let i = 0; i < 20; i++) {
      const x = 110 + (r() - 0.5) * 170, y = 105 + (r() - 0.5) * 120, rr = 24 + r() * 28;
      wash(g, ellipsePts(x, y, rr, rr * 0.8, 12), i % 3 ? '#3f7a3a' : '#2a5a32', {layers: 3, alpha: 0.6, amp: 10, seed: i + 5, edge: 0.15, blend: 'source-over'});
    }
    for (let i = 0; i < 12; i++) {
      const x = 85 + (r() - 0.5) * 140, y = 75 + (r() - 0.5) * 90, rr = 12 + r() * 16;
      wash(g, ellipsePts(x, y, rr, rr * 0.7, 10), '#8cc65a', {layers: 2, alpha: 0.45, amp: 6, seed: i + 50, edge: 0, blend: 'source-over'});
    }
  });
}

/**
 * 窗外草叶：360 根成片摆。风场 gust = 0.5+0.5·sin(3.1t−0.027x)——相位沿 x 推进=一道风浪扫过草坡。
 * freezeK：结尾定帧时摆幅收敛（微动保留）。heroBoost：HERO 段风浪二次增强包络。
 */
export function grassField(c: CanvasCtx, t: number, freezeK: number, heroBoost: number): void {
  c.save();
  c.beginPath();
  c.rect(WIN.view.x, WIN.view.y, WIN.view.w, WIN.view.h);
  c.clip();
  c.lineCap = 'round';
  const r = mulberry32(5);
  const cols = FIX.grassBlades;
  for (let i = 0; i < 360; i++) {
    const x = WIN.view.x + 4 + r() * (WIN.view.w - 8);
    const y = 262 + r() * 76;
    const h = 7 + r() * 12 + (y - 262) * 0.28;
    const ph = r() * Math.PI * 2;
    const wind = clamp(0.5 + 0.5 * Math.sin(3.1 * t - x * 0.027) + heroBoost * 0.45 * Math.sin(Math.PI * clamp((x - WIN.view.x) / WIN.view.w)) , 0, 1.15);
    const sway = ((0.25 + wind * 0.75) * h * 0.55 + Math.sin(t * 9 + ph) * 1.6) * (0.3 + 0.7 * freezeK);
    c.strokeStyle = cols[i % 5];
    c.lineWidth = 1.4 + r() * 1.4;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + sway * 0.3, y - h * 0.6, x + sway, y - h);
    c.stroke();
  }
  c.restore();
}

/** 窗外静态远山+草坡（进 bg 之后、动态草叶之下；每帧在窗洞 clip 内先铺）。 */
export function windowScenery(g: CanvasCtx): void {
  const sky = g.createLinearGradient(0, WIN.view.y, 0, WIN.view.y + 200);
  sky.addColorStop(0, FIX.skyHi);
  sky.addColorStop(1, FIX.skyLo);
  wash(g, rectPts(WIN.view.x - 4, WIN.view.y - 4, WIN.view.w + 8, 220), '#5a9ad8', {layers: 5, alpha: 0.5, amp: 6, seed: 7, edge: 0, blend: 'source-over', fill: sky});
  // 远山（蓝绿）
  wash(g, [[WIN.view.x - 4, 300], [240, 282], [280, 290], [330, 272], [390, 284], [446, 268], [WIN.view.x + WIN.view.w + 4, 284], [WIN.view.x + WIN.view.w + 4, 330], [WIN.view.x - 4, 330]] as Pt[], FIX.hill, {layers: 5, alpha: 0.35, amp: 6, seed: 8, edge: 0.12});
  // 草坡（亮绿→深绿渐变洗染）
  const gr = g.createLinearGradient(0, 300, 0, 380);
  gr.addColorStop(0, FIX.grassHi);
  gr.addColorStop(1, FIX.grassLo);
  wash(g, [[WIN.view.x - 4, 312], [240, 298], [330, 310], [WIN.view.x + WIN.view.w + 4, 296], [WIN.view.x + WIN.view.w + 4, 378], [WIN.view.x - 4, 378]] as Pt[], '#6aa848', {layers: 6, alpha: 0.5, amp: 6, seed: 9, edge: 0.1, blend: 'source-over', fill: gr});
}
