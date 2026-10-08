// 底版三张缓存：dali_bg（天/海/礁岩/荒原）→ 影子夹层 → wall（断墙＋枯枝）→ block（石块桌＋凳）。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）references/风格配方/23_dali.md 与 scenes/23_dali.js 底版管线
// （MIT）——机制与参数级借鉴，Remotion(React+TSX)+Canvas2D 重写，几何按 1280×720 重设计，零整段拷贝。
import {cached, vol, grain} from './paint';
import {BLOCK, CLIFF, HZ, GROUND, PLAIN, SEA, SKY, WALLC, W, H, type CanvasCtx} from './types';

const TAU = Math.PI * 2;

/** 天空（群青→淡金）＋细长粉云＋玻璃静海＋金色礁岩＋暖沙荒原＋画布纹与上光油。 */
export const bgLayer = (): HTMLCanvasElement => cached('sc-bg', (g) => {
  const sg = g.createLinearGradient(0, 0, 0, HZ);
  sg.addColorStop(0, SKY.hi);
  sg.addColorStop(0.55, SKY.mid);
  sg.addColorStop(1, SKY.lo);
  g.fillStyle = sg;
  g.fillRect(0, 0, W, HZ + 2);
  // 细长粉云
  const clouds: Array<[number, number, number, number]> = [[173, 200, 120, 4], [493, 167, 153, 3], [880, 220, 133, 4], [620, 283, 187, 2]];
  clouds.forEach(([x, y, w, h]) => {
    const rg = g.createLinearGradient(x - w, 0, x + w, 0);
    rg.addColorStop(0, 'rgba(250,215,200,0)');
    rg.addColorStop(0.5, 'rgba(250,215,200,.32)');
    rg.addColorStop(1, 'rgba(250,215,200,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.ellipse(x, y, w, h, 0, 0, TAU);
    g.fill();
  });
  // 静海（玻璃般，几道高光线）
  const mg = g.createLinearGradient(0, HZ, 0, GROUND);
  mg.addColorStop(0, SEA.hi);
  mg.addColorStop(1, SEA.lo);
  g.fillStyle = mg;
  g.fillRect(0, HZ, W, GROUND - HZ);
  g.strokeStyle = SEA.glint;
  g.lineWidth = 1;
  [379, 383, 389].forEach((y, k) => {
    g.beginPath();
    g.moveTo(53 + k * 93, y);
    g.lineTo(467 + k * 133, y);
    g.stroke();
  });
  // 克雷乌斯角礁岩（右侧，金色低缓岩头，光滑高光）
  const cliff = new Path2D();
  cliff.moveTo(947, GROUND);
  [[987, 353], [1033, 337], [1087, 330], [1140, 320], [1193, 327], [1240, 315], [1280, 318], [1280, GROUND]].forEach((p) => cliff.lineTo(p[0], p[1]));
  cliff.closePath();
  vol(g, cliff, 960, 315, 1013, 400, '#eec98a', CLIFF.dark, CLIFF.rim, 10);
  g.strokeStyle = CLIFF.ridge;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(1033, 341);
  g.quadraticCurveTo(1073, 328, 1107, 327);
  g.moveTo(1147, 324);
  g.quadraticCurveTo(1173, 326, 1200, 319);
  g.stroke();
  // 荒原：近暗远亮，几道细地层线
  const gg = g.createLinearGradient(0, GROUND, 0, H);
  gg.addColorStop(0, PLAIN.hi);
  gg.addColorStop(0.45, PLAIN.mid);
  gg.addColorStop(1, PLAIN.lo);
  g.fillStyle = gg;
  g.fillRect(0, GROUND, W, H - GROUND);
  g.strokeStyle = PLAIN.strata;
  g.lineWidth = 1.4;
  for (let k = 0; k < 9; k++) {
    const y = GROUND + Math.pow(k / 9, 1.6) * 320 + 7;
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(400, y - 4, 867, y + 5, W, y - 1);
    g.stroke();
  }
  // 画布纹＋暖色上光油
  g.fillStyle = 'rgba(255,200,120,.06)';
  g.fillRect(0, 0, W, H);
  g.drawImage(grain('softclock', 0.1, [70, 45, 20], 0.1), 0, 0);
});

/** 断墙残片（开窗，evenodd 挖窗洞；窗内同一片更亮更远的风景＋漂浮的蛋）＋枯橄榄枝。基线 y=466。 */
export const wallLayer = (): HTMLCanvasElement => cached('sc-wall', (g) => {
  const wall = new Path2D();
  wall.moveTo(200, 466);
  [[200, 80], [220, 64], [248, 72], [273, 52], [313, 61], [360, 47], [407, 59], [453, 43], [507, 60], [547, 53], [572, 69], [573, 466]].forEach((p) => wall.lineTo(p[0], p[1]));
  wall.closePath();
  wall.rect(246, 93, 280, 267);
  const wg = g.createLinearGradient(200, 0, 573, 0);
  wg.addColorStop(0, WALLC.lit);
  wg.addColorStop(1, WALLC.dark);
  g.fillStyle = wg;
  g.fill(wall, 'evenodd');
  g.fillStyle = WALLC.side;
  g.beginPath();
  g.moveTo(573, 69);
  g.lineTo(595, 80);
  g.lineTo(595, 475);
  g.lineTo(573, 466);
  g.closePath();
  g.fill();
  g.strokeStyle = WALLC.crack;
  g.lineWidth = 1.1;
  [[[220, 200], [235, 227], [229, 260], [240, 287]], [[547, 400], [533, 427], [541, 460]], [[427, 61], [435, 79], [431, 91]]].forEach((cr) => {
    g.beginPath();
    cr.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
  });
  // 窗内：同一片风景（更亮更远）＋窗框
  g.save();
  g.beginPath();
  g.rect(246, 93, 280, 267);
  g.clip();
  const ig = g.createLinearGradient(0, 93, 0, 360);
  ig.addColorStop(0, '#3d64a2');
  ig.addColorStop(0.85, '#f0e1b4');
  ig.addColorStop(1, '#f6ecc8');
  g.fillStyle = ig;
  g.fillRect(246, 93, 280, 267);
  g.fillStyle = '#7f9db3';
  g.fillRect(246, 337, 280, 23);
  g.strokeStyle = 'rgba(250,245,220,.7)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(267, 343);
  g.lineTo(400, 343);
  g.moveTo(347, 352);
  g.lineTo(507, 352);
  g.stroke();
  // 窗里漂浮的一只蛋（达利母题）
  const eg = g.createRadialGradient(373, 200, 4, 387, 220, 47);
  eg.addColorStop(0, '#fffaf0');
  eg.addColorStop(1, '#bfae8e');
  g.fillStyle = eg;
  g.beginPath();
  g.ellipse(387, 220, 31, 40, 0, 0, TAU);
  g.fill();
  g.restore();
  g.lineWidth = 12;
  g.strokeStyle = WALLC.wood;
  g.strokeRect(241, 87, 292, 279);
  g.lineWidth = 2.6;
  g.strokeStyle = WALLC.woodL;
  g.strokeRect(237, 84, 299, 285);
  g.fillStyle = WALLC.woodL;
  g.fillRect(227, 365, 320, 12);
  g.fillStyle = WALLC.wood;
  g.fillRect(227, 377, 320, 8);
  // 枯橄榄枝：从墙头右上角伸出（挂软钟用）
  g.strokeStyle = WALLC.branch;
  g.lineCap = 'round';
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(567, 75);
  g.bezierCurveTo(600, 60, 640, 69, 693, 64);
  g.stroke();
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(640, 67);
  g.quadraticCurveTo(660, 47, 667, 31);
  g.moveTo(673, 65);
  g.lineTo(713, 75);
  g.stroke();
});

/** 石块桌（顶面＋正面，光从左来）＋深色木凳。 */
export const blockLayer = (): HTMLCanvasElement => cached('sc-block', (g) => {
  g.fillStyle = BLOCK.lit;
  g.beginPath();
  g.moveTo(540, 413);
  g.lineTo(803, 413);
  g.lineTo(793, 400);
  g.lineTo(551, 400);
  g.closePath();
  g.fill();
  const bk = new Path2D();
  bk.rect(540, 413, 263, 190);
  vol(g, bk, 540, 0, 803, 0, BLOCK.face, BLOCK.dark, 'rgba(40,20,8,.5)', 15);
  const st = new Path2D();
  st.rect(867, 495, 127, 109);
  vol(g, st, 867, 0, 994, 0, BLOCK.stool, BLOCK.stoolD, 'rgba(30,15,5,.5)', 11);
});
