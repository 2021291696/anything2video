// 场景：晨间卧室一角。静态底（缓存一次）+ 会动的环境（太阳光芒/云漂/装饰符号 4fps 沸腾/
// 吊灯与光锥阻尼摆/虎尾兰阻尼晃）。
// 技法借鉴 huashu-art-motion (MIT) scenes/16_2026.js background/sky/decos/lamp/snakePlant，TSX 重写。
import type {CanvasCtx} from './types';
import {H, PAL, W, WORLD} from './types';
import {damped} from './damped';
import {hash2, lerp, smoothPath} from './util';
import {cached, pinkCircleDensity, stipple} from './stipple';

const PINK = [620, 240, 170] as const;
const LAVP: Array<[number, number]> = [[1010, 200], [1130, 176], [1225, 214], [1268, 320], [1252, 452], [1170, 520], [1050, 500], [980, 420], [962, 300]];

/** 静态底：奶油墙/地板、粉圆点彩、淡紫色块点彩、地毯、窗（晨空）、床头柜、地面软影。 */
export function drawStatic(g: CanvasCtx): void {
  // 墙 + 地板
  g.fillStyle = PAL.wall;
  g.fillRect(0, 0, W, WORLD.floorY);
  const fg = g.createLinearGradient(0, WORLD.floorY, 0, H);
  fg.addColorStop(0, PAL.floor);
  fg.addColorStop(1, '#f2e6d2');
  g.fillStyle = fg;
  g.fillRect(0, WORLD.floorY, W, H - WORLD.floorY);
  g.fillStyle = PAL.floorDk;
  g.fillRect(0, WORLD.floorY, W, 8);
  // 粉色大圆：淡粉底 + 越往下越密的点彩（签名⑤ 密度函数）
  const pc = new Path2D();
  pc.arc(PINK[0], PINK[1], PINK[2], 0, 7);
  g.save();
  g.clip(pc);
  const pg = g.createLinearGradient(0, PINK[1] - PINK[2], 0, PINK[1] + PINK[2]);
  pg.addColorStop(0, 'rgba(246,214,206,.55)');
  pg.addColorStop(1, 'rgba(244,196,188,.95)');
  g.fillStyle = pg;
  g.fill(pc);
  g.restore();
  stipple(g, pc, [PINK[0] - PINK[2], PINK[1] - PINK[2], PINK[0] + PINK[2], PINK[1] + PINK[2]], PAL.pinkDot, pinkCircleDensity(PINK[1], 80, 340), 11, 1.8);
  // 淡紫色块（床头柜后）
  const lp = smoothPath(LAVP);
  g.fillStyle = PAL.lav;
  g.fill(lp);
  stipple(g, lp, [950, 170, 1280, 530], PAL.lavDot, (x, y) => 0.04 + 0.45 * Math.max(0, Math.min(1, (x - 1050) / 260)) * Math.max(0, Math.min(1, (y - 260) / 320 + 0.3)), 12);
  // 窗：暖白圆角框 + 晨空渐变（太阳/云在动态层）
  g.save();
  g.shadowColor = 'rgba(150,120,110,.18)';
  g.shadowBlur = 18;
  g.shadowOffsetY = 8;
  g.fillStyle = PAL.white;
  g.beginPath();
  g.roundRect(150, 96, 350, 330, 30);
  g.fill();
  g.restore();
  const panes = new Path2D();
  panes.roundRect(168, 114, 314, 294, 20);
  g.save();
  g.clip(panes);
  const sg = g.createLinearGradient(0, 114, 0, 408);
  sg.addColorStop(0, PAL.sky);
  sg.addColorStop(0.6, '#cbe9f3');
  sg.addColorStop(1, PAL.skyLt);
  g.fillStyle = sg;
  g.fillRect(168, 114, 314, 294);
  stipple(g, null, [168, 114, 482, 408], '#7fb8e6', (_x, y) => 0.08 * (1 - (y - 114) / 294), 14, 1.8);
  // 远处城市剪影
  const bld = (x: number, y: number, w: number, h: number, col: string): void => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };
  bld(180, 330, 62, 78, '#c5b2ec');
  bld(258, 296, 54, 112, '#ec9e9a');
  bld(328, 318, 70, 90, '#a98fe2');
  bld(414, 342, 52, 66, '#7fb593');
  g.fillStyle = '#4c9a69';
  [[206, 408, 22], [446, 408, 17]].forEach(([x, y, r]) => {
    g.beginPath();
    g.arc(x, y, r, Math.PI, 0);
    g.fill();
  });
  g.restore();
  g.fillStyle = PAL.white;
  g.fillRect(317, 114, 14, 294);
  g.fillRect(168, 252, 314, 14);
  // 窗台
  g.save();
  g.shadowColor = 'rgba(150,120,110,.22)';
  g.shadowBlur = 10;
  g.shadowOffsetY = 6;
  g.fillStyle = PAL.white;
  g.beginPath();
  g.roundRect(132, 414, 386, 22, 11);
  g.fill();
  g.restore();
  // 地毯
  const rug = new Path2D();
  rug.ellipse(930, 652, 330, 27, 0, 0, 7);
  g.fillStyle = PAL.mint;
  g.fill(rug);
  stipple(g, rug, [600, 625, 1260, 679], PAL.mintDot, () => 0.3, 13, 2.2);
  // 床头柜（藏青、圆角；台面 470）
  g.fillStyle = PAL.navy;
  g.fill(roundRect(838, 492, 20, 158, 9));
  g.fill(roundRect(1042, 492, 20, 158, 9));
  g.fill(roundRect(780, 470, 300, 26, 13));
  stipple(g, null, [780, 470, 1080, 496], '#3c4178', () => 0.4, 15, 2);
  // 抽屉线 + 拉手
  g.fillStyle = PAL.navyDk;
  g.fillRect(800, 530, 260, 10);
  g.fillRect(800, 586, 260, 10);
  g.fillStyle = PAL.yellow;
  g.beginPath();
  g.arc(930, 560, 8, 0, 7);
  g.fill();
  // 家具地面软影
  g.fillStyle = 'rgba(160,140,120,.22)';
  [[255, 652, 96, 9], [930, 656, 210, 8]].forEach(([x, y, rx, ry]) => {
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, 7);
    g.fill();
  });
}

function roundRect(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D();
  p.roundRect(x, y, w, h, r);
  return p;
}

/** 窗内晨空：太阳光芒慢转 + 云左漂（晨间氛围微动）。 */
export function sky(c: CanvasCtx, t: number): void {
  c.save();
  const panes = new Path2D();
  panes.rect(168, 114, 149, 138);
  panes.rect(331, 114, 151, 138);
  c.clip(panes);
  // 太阳：光芒慢转 + 脉动
  const S = [415, 190];
  c.strokeStyle = PAL.yellow;
  c.lineWidth = 5;
  c.lineCap = 'round';
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + t * 0.35;
    const r0 = 46, r1 = 55 + (k % 2 ? 0 : 5) + Math.sin(t * 5 + k) * 2.5;
    c.beginPath();
    c.moveTo(S[0] + Math.cos(a) * r0, S[1] + Math.sin(a) * r0);
    c.lineTo(S[0] + Math.cos(a) * r1, S[1] + Math.sin(a) * r1);
    c.stroke();
  }
  c.drawImage(cached('gf_sun', 100, 100, (g2) => {
    g2.fillStyle = PAL.yellow;
    g2.beginPath();
    g2.arc(50, 50, 42, 0, 7);
    g2.fill();
    stipple(g2, null, [8, 8, 92, 92], '#e8743a', (x, y) => 0.15 + 0.7 * Math.max(0, Math.min(1, (x + y - 78) / 84)), 5, 2);
  }), S[0] - 50, S[1] - 50);
  // 云：往左慢移（0.2px/帧）
  const cloud = (x: number, y: number, s: number): void => {
    c.fillStyle = PAL.white;
    c.beginPath();
    c.arc(x, y, 18 * s, Math.PI, 0);
    c.arc(x + 24 * s, y - 8 * s, 23 * s, Math.PI, 0);
    c.arc(x + 50 * s, y, 16 * s, Math.PI, 0);
    c.closePath();
    c.fill();
    c.beginPath();
    c.roundRect(x - 18 * s, y - 2, 86 * s, 15 * s, 7 * s);
    c.fill();
  };
  const dx = -((t * 30) % 160);
  cloud(250 + dx, 165, 0.85);
  cloud(330 + dx * 1.15, 230, 1.1);
  c.restore();
}

/** 墙面装饰符号 4fps 沸腾（±1.5px / ±0.09rad）。 */
const DECOS: Array<[string, number, number, string, number]> = [
  ['plus', 566, 420, PAL.red, 1.1], ['dot', 690, 460, PAL.yellow, 0.9], ['ring', 585, 96, PAL.yellow, 1],
  ['squig', 700, 130, PAL.navy, 0.9], ['dots', 545, 210, PAL.lavDk, 0.85], ['tri', 755, 330, '#b59bec', 1],
  ['half', 745, 425, '#8dc7a2', 0.9], ['x', 1245, 120, PAL.navy, 0.95], ['dot', 1170, 88, PAL.red, 0.8],
  ['squig', 1200, 560, PAL.red, 0.75], ['tri', 86, 520, PAL.yellow, 0.9], ['plus', 66, 300, PAL.lavDk, 0.85],
];
export function decos(c: CanvasCtx, t: number): void {
  const b = Math.floor(t * 4);
  DECOS.forEach(([k, x, y, col, s], i) => {
    const jx = (hash2(i, b, 71) - 0.5) * 3;
    const jy = (hash2(i + 50, b, 72) - 0.5) * 3;
    const ja = (hash2(i + 99, b, 73) - 0.5) * 0.18;
    c.save();
    c.translate(x + jx, y + jy);
    c.rotate(ja);
    c.scale(s, s);
    c.fillStyle = col;
    c.strokeStyle = col;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (k === 'plus' || k === 'x') {
      if (k === 'x') c.rotate(0.78);
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(-12, 0);
      c.lineTo(12, 0);
      c.moveTo(0, -12);
      c.lineTo(0, 12);
      c.stroke();
    } else if (k === 'dot') {
      c.beginPath();
      c.arc(0, 0, 10, 0, 7);
      c.fill();
    } else if (k === 'ring') {
      c.lineWidth = 5.5;
      c.beginPath();
      c.arc(0, 0, 12, 0, 7);
      c.stroke();
    } else if (k === 'tri') {
      c.beginPath();
      c.moveTo(0, -15);
      c.lineTo(14, 11);
      c.lineTo(-14, 11);
      c.closePath();
      c.fill();
    } else if (k === 'half') {
      c.beginPath();
      c.arc(0, 6, 19, Math.PI, 0);
      c.closePath();
      c.fill();
    } else if (k === 'squig') {
      c.lineWidth = 4.5;
      c.beginPath();
      for (let s2 = 0; s2 <= 24; s2++) {
        const xx = -30 + s2 * 2.6;
        const yy = Math.sin((s2 / 24) * Math.PI * 3 + i) * 7;
        if (s2) c.lineTo(xx, yy);
        else c.moveTo(xx, yy);
      }
      c.stroke();
    } else if (k === 'dots') {
      for (let a = 0; a < 3; a++)
        for (let d = 0; d < 4; d++) {
          c.beginPath();
          c.arc(d * 14 - 21, a * 14 - 14, 3.4, 0, 7);
          c.fill();
        }
    }
    c.restore();
  });
}

/** 吊灯 + 光锥：绕天花板挂点 (930,0) 阻尼摆（签名④；光锥为缓存颗粒贴图一起摆）。 */
export function lamp(c: CanvasCtx, ang: number): void {
  c.save();
  c.translate(WORLD.lampX, 0);
  c.rotate(ang);
  c.translate(-WORLD.lampX, 0);
  c.drawImage(cached('gf_cone', 260, 240, (g) => {
    const r = hashNoise(31);
    for (let i = 0; i < 5000; i++) {
      const y = r() * 230;
      const w = lerp(34, 84, y / 230);
      const x = 130 + (r() * 2 - 1) * w;
      const edge = 1 - Math.abs(x - 130) / w;
      const a = (1 - y / 240) * (0.22 + 0.5 * Math.min(1, edge * 3));
      if (r() < a) {
        g.fillStyle = r() < 0.7 ? 'rgba(245,205,95,.42)' : 'rgba(255,240,190,.55)';
        g.fillRect(x, y, 2.4, 2.4);
      }
    }
  }), WORLD.lampX - 130, 212);
  c.strokeStyle = PAL.navy;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(WORLD.lampX, 0);
  c.lineTo(WORLD.lampX, 128);
  c.stroke();
  c.fillStyle = PAL.navy;
  c.beginPath();
  c.roundRect(WORLD.lampX - 11, 122, 22, 22, 5);
  c.fill();
  c.fillStyle = PAL.yellow;
  c.beginPath();
  c.arc(WORLD.lampX, 200, 20, 0, Math.PI);
  c.fill();
  c.fillStyle = PAL.red;
  c.beginPath();
  c.moveTo(WORLD.lampX - 64, 202);
  c.bezierCurveTo(WORLD.lampX - 64, 158, WORLD.lampX - 33, 134, WORLD.lampX, 134);
  c.bezierCurveTo(WORLD.lampX + 33, 134, WORLD.lampX + 64, 158, WORLD.lampX + 64, 202);
  c.closePath();
  c.fill();
  c.save();
  const shade = new Path2D();
  shade.moveTo(WORLD.lampX - 64, 202);
  shade.bezierCurveTo(WORLD.lampX - 64, 158, WORLD.lampX - 33, 134, WORLD.lampX, 134);
  shade.bezierCurveTo(WORLD.lampX + 33, 134, WORLD.lampX + 64, 158, WORLD.lampX + 64, 202);
  shade.closePath();
  c.clip(shade);
  c.drawImage(cached('gf_shade', 130, 70, (g) => {
    const r = hashNoise(41);
    g.fillStyle = PAL.cupDk;
    for (let i = 0; i < 1300; i++) {
      const x = r() * 130;
      const y = r() * 68;
      if (r() < (x / 130) * 0.8) g.fillRect(x, y, 2, 2);
    }
  }), WORLD.lampX - 65, 136, 130, 68);
  c.restore();
  c.restore();
}

function hashNoise(seed: number): () => number {
  // 局部小 PRNG（mulberry32 变体，确定性）
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 虎尾兰：叶绕盆口阻尼摆（签名④），缓存叶片贴图。 */
export function snakePlant(c: CanvasCtx, ang: number): void {
  const BX = 255, BY = 692;
  c.save();
  c.translate(BX, BY);
  c.rotate(ang);
  c.translate(-BX, -BY);
  const leaf = (bx: number, tipx: number, tipy: number, w: number, col: string, edge: string): void => {
    c.fillStyle = edge;
    c.beginPath();
    c.moveTo(bx - w, BY);
    c.quadraticCurveTo(bx - w * 0.6, (BY + tipy) / 2, tipx, tipy);
    c.quadraticCurveTo(bx + w * 0.8, (BY + tipy) / 2, bx + w, BY);
    c.closePath();
    c.fill();
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(bx - w + 5, BY);
    c.quadraticCurveTo(bx - w * 0.5, (BY + tipy) / 2 + 9, tipx, tipy + 12);
    c.quadraticCurveTo(bx + w * 0.6, (BY + tipy) / 2 + 9, bx + w - 5, BY);
    c.closePath();
    c.fill();
  };
  leaf(226, 198, 470, 16, '#3f9a62', '#2e7f50');
  leaf(292, 348, 488, 15, '#3f9a62', PAL.yellow);
  leaf(244, 250, 400, 18, '#2e7f50', '#2e7f50');
  leaf(270, 300, 435, 17, '#4aa86c', '#2e7f50');
  leaf(256, 210, 545, 13, '#2e7f50', '#22704a');
  leaf(262, 330, 560, 13, '#4aa86c', '#4aa86c');
  c.restore();
  // 盆（不随叶摆）
  c.fillStyle = PAL.red;
  c.beginPath();
  c.moveTo(206, 692);
  c.lineTo(304, 692);
  c.lineTo(299, 706);
  c.quadraticCurveTo(297, 716, 284, 716);
  c.lineTo(226, 716);
  c.quadraticCurveTo(213, 716, 211, 706);
  c.closePath();
  c.fill();
  c.fillStyle = PAL.white;
  c.fillRect(208, 698, 94, 10);
  stipple(c, null, [206, 692, 304, 716], '#c2403a', (x) => (x > 260 ? 0.4 : 0.2), 16);
}
