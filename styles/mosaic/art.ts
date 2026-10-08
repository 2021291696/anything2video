// 《小心恶犬》庞贝 CAVE CANEM 马赛克——画面 painters（底稿 / 类别图共用）。
// 技法借鉴 huashu-art-motion (MIT) scripts/engine/scenes/04_roman.js 的平涂底稿+类别图语法，TSX 重写。
import {Ctx, clamp, mix3, hex, rgb, spline} from './engine';

// ---- 锁死 token（配方：墙 #e4ddcd＋晕圈 #f5f1e8＋红金画框＋灰浆 rgb(112,103,92)）----
export const PAL = {
  wall: '#e4ddcd', halo: '#f5f1e8', outline: '#46322a',
  frameRed: '#a8322a', frameRed2: '#7c221d', frameGold: '#d0a23c', frameDark: '#3a2a22',
  bW: '#ece6d8', bK: '#24201d',
  sky: '#9ec0d8', sky2: '#d3e3e4',
  coneL: '#7c84b8', cone: '#4e5796', coneD: '#2f3672', ridge: '#373e7c',
  green: '#6f9341', green2: '#92b254', ground: '#cba344', ground2: '#a67d2a',
  cyp: '#2b5a2f',
  lava: '#d64a22', lava2: '#f2952c',
  cloud: '#88847d', cloud2: '#a29c94',
  dog: '#1d1a18', dogFar: '#322d28', dogInk: '#0e0c0a',
  teeth: '#f7f2e8', mouth: '#7c1f1f', tongue: '#b8433a', nose: '#0e0c0a',
  eyeW: '#fbf8f0', eyeD: '#2a2420',
  collar: '#b02a22', gold: '#d0a23c',
  mouse: '#86807a', mouseHi: '#9a948c',
  text: '#1d1a18',
  grout: [112, 103, 92] as [number, number, number],
  bed: [90, 82, 73] as [number, number, number],
};

export const W = 1920, H = 1080, BW = 84;
export const FRESCO = {x: 170, y: 190, w: 440, h: 410};
export const FINT = {x: 198, y: 218, w: 384, h: 354};          // 画内 clip
export const CRATER: [number, number] = [390, 253];            // 火山口
export const MOUTH: [number, number] = [746, 574];             // 犬嘴（吠叫波源）
export const DOG_PIVOT: [number, number] = [872, 592];         // 头部抬起枢轴
export const JAW_PIVOT: [number, number] = [806, 590];         // 下颌旋转枢轴
export const DOG_BOX = {x: 660, y: 400, w: 800, h: 550};       // 犬动态矩形（含晕圈余量）

// ---- CAVE CANEM 等宽粗笔画字模（每笔约 2 块 7px 石宽；细字体在粗颗粒下必断——配方三轮结论）----
type Glyph = {w: number; draw: (g: Ctx) => void};
const poly = (g: Ctx, pts: Array<[number, number]>, ox = 0): void => {
  g.beginPath();
  pts.forEach((q, i) => (i ? g.lineTo(ox + q[0], q[1]) : g.moveTo(ox + q[0], q[1])));
  g.stroke();
};
export const GLYPHS: Record<string, Glyph> = {
  C: {w: 44, draw: (g) => { g.beginPath(); g.ellipse(22, 30, 19, 26, 0, Math.PI * 0.27, Math.PI * 1.73); g.stroke(); }},
  A: {w: 46, draw: (g) => { poly(g, [[0, 60], [23, 0], [46, 60]]); poly(g, [[11, 38], [35, 38]]); }},
  V: {w: 46, draw: (g) => poly(g, [[0, 0], [23, 60], [46, 0]])},
  E: {w: 38, draw: (g) => { poly(g, [[38, 6], [6, 6], [6, 54], [38, 54]]); poly(g, [[6, 30], [32, 30]]); }},
  N: {w: 46, draw: (g) => poly(g, [[0, 60], [0, 0], [46, 60], [46, 0]])},
  M: {w: 52, draw: (g) => poly(g, [[4, 60], [6, 0], [26, 46], [46, 0], [48, 60]])},
};
export const TEXT_WORD = 'CAVE CANEM';
export const TEXT_STROKE = 14, TEXT_GAP = 16, TEXT_ADV = 30;
export const textLayout = (): {items: Array<{ch: string; x: number}>; width: number} => {
  const items: Array<{ch: string; x: number}> = [];
  let x = 0;
  for (const ch of TEXT_WORD) {
    if (ch === ' ') { x += TEXT_ADV; continue; }
    items.push({ch, x});
    x += GLYPHS[ch].w + TEXT_GAP;
  }
  return {items, width: x - TEXT_GAP};
};
export const TEXT_X0 = 640, TEXT_Y = 905, TEXT_W = 640;
/** CAVE CANEM：画在 (x0,y) 起、总宽 targetW；返回各字中心 x（供文字砖级联） */
export function drawText(g: Ctx, x0: number, y: number, targetW: number, color: string): Array<{ch: string; cx: number}> {
  const {items, width} = textLayout();
  const sc = targetW / width;
  const centers: Array<{ch: string; cx: number}> = [];
  g.save();
  g.translate(x0, y); g.scale(sc, 1);
  g.strokeStyle = color; g.lineWidth = TEXT_STROKE; g.lineJoin = 'miter'; g.lineCap = 'butt';
  for (const it of items) {
    g.save(); g.translate(it.x, 0); GLYPHS[it.ch].draw(g); g.restore();
    centers.push({ch: it.ch, cx: x0 + (it.x + GLYPHS[it.ch].w / 2) * sc});
  }
  g.restore();
  return centers;
}

// ---- 犬（正侧面左扑，龇牙张口；j=颌开合 0..1，lift=抬头弧度）----
const jawPt = (p: [number, number], j: number): [number, number] => {
  const a = j * 0.72, c = Math.cos(a), s = Math.sin(a);
  const dx = p[0] - JAW_PIVOT[0], dy = p[1] - JAW_PIVOT[1];
  return [JAW_PIVOT[0] + dx * c - dy * s, JAW_PIVOT[1] + dx * s + dy * c];
};
const headPt = (p: [number, number], lift: number): [number, number] => {
  const c = Math.cos(lift), s = Math.sin(lift);
  const dx = p[0] - DOG_PIVOT[0], dy = p[1] - DOG_PIVOT[1];
  return [DOG_PIVOT[0] + dx * c - dy * s, DOG_PIVOT[1] + dx * s + dy * c];
};
const jp2 = (p: [number, number], j: number, lift: number): [number, number] => headPt(jawPt(p, j), lift);

type PartKind = 'fig' | 'face';
/** 单部件按三种模式上色：art=真彩＋墨边；halo=晕圈粗描；class=类别平色 */
type Part = {kind: PartKind; paint: (g: Ctx, mode: 0 | 1 | 2, cFig: string, cFace: string) => void};

const fillPart = (path: (g: Ctx) => void, art: string, lw: number): Part['paint'] => (g, mode, cFig) => {
  path(g);
  if (mode === 1) { g.strokeStyle = PAL.halo; g.lineWidth = lw + 46; g.stroke(); return; }
  g.fillStyle = mode === 2 ? cFig : art;
  g.fill();
  g.strokeStyle = mode === 2 ? cFig : PAL.dogInk;
  g.lineWidth = mode === 2 ? 9 : lw;
  g.stroke();
};
const strokePart = (draw: (g: Ctx) => void, w: number, art: string, lw: number): Part['paint'] => (g, mode, cFig) => {
  if (mode === 1) { draw(g); g.strokeStyle = PAL.halo; g.lineWidth = w + 46; g.stroke(); return; }
  draw(g); g.strokeStyle = mode === 2 ? cFig : PAL.dogInk; g.lineWidth = w + (mode === 2 ? 9 : lw); g.stroke();
  draw(g); g.strokeStyle = mode === 2 ? cFig : art; g.lineWidth = w; g.stroke();
};
const legPath = (pts: Array<[number, number]>, w0: number, w1: number, arts = PAL.dog): Part['paint'] => (g, mode, cFig) => {
  if (mode === 1) { legPoly(g, pts); g.strokeStyle = PAL.halo; g.lineWidth = w0 + 46; g.lineCap = 'round'; g.stroke(); return; }
  legPoly(g, pts);
  g.strokeStyle = mode === 2 ? cFig : PAL.dogInk; g.lineWidth = w0 + (mode === 2 ? 9 : 6); g.lineCap = 'round'; g.stroke();
  legPoly(g, pts);
  g.strokeStyle = mode === 2 ? cFig : arts; g.lineWidth = w0; g.stroke();
};
const legPoly = (g: Ctx, pts: Array<[number, number]>): void => {
  g.beginPath();
  pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
};

/** 犬部件表（顺序=画序）。j/lift 已折进路径。 */
export function dogParts(j: number, lift: number): Part[] {
  const hp = (p: [number, number]): [number, number] => headPt(p, lift);
  const jp = (p: [number, number]): [number, number] => jp2(p, j, lift);
  return [
    // 尾（上扬）
    {kind: 'fig', paint: strokePart((g) => {
      const tip = hp([1392, 468]);
      g.beginPath(); g.moveTo(1272, 622);
      g.bezierCurveTo(1330, 596, 1368, 540, tip[0], tip[1]);
    }, 22, PAL.dog, 6)},
    // 远侧腿（略浅）
    {kind: 'fig', paint: legPath([[930, 712], [886, 800], [852, 888]], 30, 18, PAL.dogFar)},
    {kind: 'fig', paint: legPath([[1240, 700], [1288, 806], [1330, 878]], 32, 18, PAL.dogFar)},
    // 身体（梨形）
    {kind: 'fig', paint: fillPart((g) => {
      const body: Array<[number, number]> = [[985, 588], [1090, 606], [1215, 648], [1272, 622], [1290, 668], [1218, 764], [1080, 806], [940, 792], [846, 688], [830, 610], [900, 560]];
      g.beginPath(); spline(g, body); g.closePath();
    }, PAL.dog, 6)},
    // 近侧腿
    {kind: 'fig', paint: legPath([[880, 700], [812, 788], [762, 878]], 34, 20)},
    {kind: 'fig', paint: legPath([[1198, 716], [1210, 812], [1176, 884]], 38, 22)},
    // 颈圈（红带 + 金铆钉，颜色细节）
    {kind: 'fig', paint: (g, mode, cFig) => {
      const a = hp([824, 634]), b = hp([896, 646]);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
      g.lineCap = 'butt';
      g.strokeStyle = mode === 1 ? PAL.halo : (mode === 2 ? cFig : PAL.dogInk);
      g.lineWidth = mode === 1 ? 17 + 46 : 17 + (mode === 2 ? 9 : 5);
      g.stroke();
      if (mode !== 1) {
        g.strokeStyle = mode === 2 ? cFig : PAL.collar; g.lineWidth = 17; g.stroke();
        const stud = hp([862, 640]);
        g.beginPath(); g.arc(stud[0], stud[1], mode === 2 ? 9 : 7, 0, Math.PI * 2);
        g.fillStyle = mode === 2 ? cFig : PAL.gold; g.fill();
      }
    }},
    // 头组
    {kind: 'face', paint: fillPart((g) => {
      g.beginPath(); spline(g, [hp([806, 496]), hp([856, 482]), hp([892, 520]), hp([878, 570]), hp([830, 590]), hp([796, 560]), hp([796, 520])]); g.closePath();
    }, PAL.dog, 7)},
    // 耳（后掠）
    {kind: 'face', paint: fillPart((g) => {
      g.beginPath(); spline(g, [hp([852, 500]), hp([906, 458]), hp([884, 540])]); g.closePath();
    }, PAL.dog, 6)},
    // 上口鼻
    {kind: 'face', paint: fillPart((g) => {
      g.beginPath(); spline(g, [hp([800, 528]), hp([770, 538]), hp([744, 548]), hp([752, 566]), hp([790, 572]), hp([806, 590])]); g.closePath();
    }, PAL.dog, 6)},
    // 下颌（随 j 旋开）
    {kind: 'face', paint: fillPart((g) => {
      g.beginPath(); spline(g, [jp([750, 584]), jp([756, 608]), jp([824, 612]), jp([828, 588])]); g.closePath();
    }, PAL.dog, 6)},
  ];
}
/** art 模式专属面部细节（口腔/舌/牙/鼻/眼；类别图中这些区域已落在头部件的 K_FACE 范围内） */
export function dogFaceArt(g: Ctx, j: number, lift: number): void {
  const hp = (p: [number, number]): [number, number] => headPt(p, lift);
  const jp = (p: [number, number]): [number, number] => jp2(p, j, lift);
  // 口腔楔 + 舌
  const m0 = hp([802, 586]), m1 = hp([758, 566]), j0 = jp([754, 586]), j1 = jp([792, 596]);
  g.beginPath(); g.moveTo(m0[0], m0[1]); g.lineTo(m1[0], m1[1]); g.lineTo(j0[0], j0[1]); g.lineTo(j1[0], j1[1]); g.closePath();
  g.fillStyle = PAL.mouth; g.fill();
  const t0 = jp([778, 596]);
  g.beginPath(); g.ellipse(t0[0], t0[1] + 4, 15, 7, j * 0.5, 0, Math.PI * 2); g.fillStyle = PAL.tongue; g.fill();
  // 牙（上 2 下 2，白石）
  const tooth = (p: [number, number], dir: number, len: number): void => {
    g.beginPath(); g.moveTo(p[0] - 5, p[1]); g.lineTo(p[0] + 5, p[1]); g.lineTo(p[0], p[1] + dir * len); g.closePath();
    g.fillStyle = PAL.teeth; g.fill();
  };
  tooth(hp([766, 568]), 1, 13); tooth(hp([788, 574]), 1, 12);
  tooth(jp([768, 588]), -1, 11); tooth(jp([788, 592]), -1, 10);
  // 鼻头（深色椭圆＋左上高光点——黑上黑必须有高光才读得出）
  const np = hp([744, 549]);
  g.beginPath(); g.ellipse(np[0], np[1], 9.5, 6.5, 0.1, 0, Math.PI * 2); g.fillStyle = PAL.nose; g.fill();
  g.beginPath(); g.ellipse(np[0] - 3, np[1] - 2.5, 3, 2, 0.2, 0, Math.PI * 2); g.fillStyle = '#6e655a'; g.fill();
  // 眼（眼白 15×8 + 深色 9×8 + 白色下眼环 + 怒纹；短板修正：半尺寸下五官必须可读）
  const ep = hp([826, 527]);
  g.beginPath(); g.ellipse(ep[0] + 2.5, ep[1], 7.5, 4, -0.12, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
  g.beginPath(); g.ellipse(ep[0] - 0.5, ep[1], 4.5, 4, 0, 0, Math.PI * 2); g.fillStyle = PAL.eyeD; g.fill();
  g.strokeStyle = PAL.dogInk; g.lineWidth = 6;
  g.beginPath(); g.moveTo(ep[0] - 14, ep[1] - 13); g.lineTo(ep[0] + 14, ep[1] - 7); g.stroke();
  g.strokeStyle = PAL.eyeW; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(ep[0] - 9, ep[1] + 6); g.quadraticCurveTo(ep[0], ep[1] + 9, ep[0] + 9, ep[1] + 6); g.stroke();
}
export type DogMode = 'art' | 'halo' | 'class';
export function paintDog(g: Ctx, j: number, lift: number, mode: DogMode, cFig = '', cFace = ''): void {
  const m: 0 | 1 | 2 = mode === 'art' ? 0 : mode === 'halo' ? 1 : 2;
  g.save();
  g.lineJoin = 'round';
  for (const p of dogParts(j, lift)) p.paint(g, m, p.kind === 'fig' ? cFig : cFace, cFace);
  if (mode === 'art') dogFaceArt(g, j, lift);
  g.restore();
}

// ---- 维苏威湿壁画（画框静态部分）----
export function paintFresco(g: Ctx): void {
  g.strokeStyle = PAL.halo; g.lineWidth = 30;
  g.strokeRect(FRESCO.x, FRESCO.y, FRESCO.w, FRESCO.h);
  g.fillStyle = PAL.frameRed; g.fillRect(FRESCO.x, FRESCO.y, FRESCO.w, FRESCO.h);
  g.fillStyle = PAL.frameRed2; g.fillRect(FRESCO.x + 12, FRESCO.y + 12, FRESCO.w - 24, FRESCO.h - 24);
  g.fillStyle = PAL.frameGold; g.fillRect(FRESCO.x + 18, FRESCO.y + 18, FRESCO.w - 36, FRESCO.h - 36);
  g.fillStyle = PAL.frameDark; g.fillRect(FRESCO.x + 24, FRESCO.y + 24, FRESCO.w - 48, FRESCO.h - 48);
  g.save();
  g.beginPath(); g.rect(FINT.x, FINT.y, FINT.w, FINT.h); g.clip();
  const sg = g.createLinearGradient(0, FINT.y, 0, FINT.y + 200);
  sg.addColorStop(0, PAL.sky); sg.addColorStop(1, PAL.sky2);
  g.fillStyle = sg; g.fillRect(FINT.x, FINT.y, FINT.w, FINT.h);
  const poly2 = (pts: Array<[number, number]>, col: string): void => {
    g.fillStyle = col; g.beginPath();
    pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
    g.closePath(); g.fill();
  };
  poly2([[FINT.x + 12, 470], [CRATER[0] - 18, 254], [CRATER[0] + 2, 254], [CRATER[0] - 28, 470]], PAL.coneL);
  poly2([[CRATER[0] - 28, 470], [CRATER[0] + 2, 254], [CRATER[0] + 20, 254], [CRATER[0] + 62, 470]], PAL.cone);
  poly2([[CRATER[0] + 62, 470], [CRATER[0] + 20, 254], [FINT.x + FINT.w - 10, 470]], PAL.coneD);
  g.strokeStyle = PAL.ridge; g.lineWidth = 4;
  [[CRATER[0] - 12, 258, CRATER[0] - 60, 360], [CRATER[0] + 14, 258, CRATER[0] + 40, 368]].forEach(([x0, y0, x1, y1]) => {
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 - 14, (y0 + y1) / 2, x1, y1); g.stroke();
  });
  g.fillStyle = '#2a2c48';
  g.beginPath(); g.ellipse(CRATER[0], CRATER[1], 17, 4.5, 0, 0, Math.PI * 2); g.fill();
  g.lineCap = 'round';
  g.strokeStyle = PAL.lava; g.lineWidth = 6;
  g.beginPath(); g.moveTo(CRATER[0] + 4, CRATER[1] + 3); g.lineTo(CRATER[0] + 14, CRATER[1] + 34); g.lineTo(CRATER[0] + 26, CRATER[1] + 66); g.stroke();
  g.strokeStyle = PAL.lava2; g.lineWidth = 4;
  g.beginPath(); g.moveTo(CRATER[0] - 6, CRATER[1] + 4); g.lineTo(CRATER[0] - 12, CRATER[1] + 30); g.stroke();
  g.fillStyle = PAL.green;
  g.beginPath(); g.moveTo(FINT.x, 452); g.quadraticCurveTo(300, 428, 400, 448); g.quadraticCurveTo(500, 466, FINT.x + FINT.w, 440);
  g.lineTo(FINT.x + FINT.w, 572); g.lineTo(FINT.x, 572); g.fill();
  g.fillStyle = PAL.green2;
  g.beginPath(); g.moveTo(FINT.x, 476); g.quadraticCurveTo(310, 458, 420, 474); g.quadraticCurveTo(510, 488, FINT.x + FINT.w, 468);
  g.lineTo(FINT.x + FINT.w, 572); g.lineTo(FINT.x, 572); g.fill();
  g.fillStyle = PAL.ground; g.fillRect(FINT.x, 496, FINT.w, 76);
  g.strokeStyle = PAL.ground2; g.lineWidth = 3;
  for (let x = FINT.x; x < FINT.x + FINT.w; x += 26) {
    g.beginPath(); g.moveTo(x, 516); g.quadraticCurveTo(x + 7, 511, x + 14, 517); g.stroke();
  }
  [[540, 292, 560, 13], [560, 306, 558, 10]].forEach(([x, top, bot, w]) => {
    g.fillStyle = PAL.cyp;
    g.beginPath(); g.moveTo(x, top); g.quadraticCurveTo(x + w * 1.1, top + 90, x + w * 0.7, bot);
    g.lineTo(x - w * 0.7, bot); g.quadraticCurveTo(x - w * 1.1, top + 90, x, top); g.fill();
  });
  g.restore();
  g.strokeStyle = PAL.outline; g.lineWidth = 5;
  g.strokeRect(FRESCO.x, FRESCO.y, FRESCO.w, FRESCO.h);
}

// ---- 维苏威动态：灰云带右漂 + 烟柱压低右飘 + 火星抛物线 + 火山口熔岩脉动 ----
export function paintFrescoFX(g: Ctx, t: number): void {
  g.save();
  g.beginPath(); g.rect(FINT.x, FINT.y, FINT.w, FINT.h); g.clip();
  const cx0 = (t * 55) % 380;
  for (const ox of [-380, 0]) {
    ([[28, 262, 40, 14, PAL.cloud], [108, 256, 46, 13, PAL.cloud2], [218, 260, 44, 14, PAL.cloud], [308, 264, 50, 13, PAL.cloud2], [66, 282, 32, 9, PAL.cloud2], [278, 284, 36, 9, PAL.cloud]] as Array<[number, number, number, number, string]>)
      .forEach(([x, y, rx, ry, col]) => {
        g.fillStyle = col; g.beginPath();
        g.ellipse(FINT.x + x + ox + cx0, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
      });
  }
  for (let i = 0; i < 7; i++) {
    const q = (t * 0.85 + i / 7) % 1, e = 1 - Math.pow(1 - q, 1.6);
    const x = CRATER[0] + e * 150 + Math.sin(t * 2 + i * 2.1) * 9;
    const y = CRATER[1] - e * 34 - Math.sin(e * 3.1) * 12;
    const r = 10 + q * 34;
    const col = mix3(hex('#3f3c3a'), hex('#a29c94'), Math.min(1, q * 1.1));
    g.globalAlpha = q > 0.8 ? (1 - q) / 0.2 : 1;
    g.fillStyle = rgb(col); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = rgb(mix3(col, [255, 255, 255], 0.3)); g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  let sd = 7917;
  const rnd = (): number => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (rnd() - 0.5) * 1.9, sp = 110 + rnd() * 90, ph = rnd();
    const q = (t * 1.2 + ph) % 1, tt = q * 0.85;
    const x = CRATER[0] + Math.cos(ang) * sp * tt;
    const y = CRATER[1] + 2 + Math.sin(ang) * sp * tt + 300 * tt * tt;
    g.fillStyle = rnd() < 0.5 ? '#f6d23c' : '#f08a22';
    g.fillRect(x - 5, y - 5, 10, 10);
  }
  g.fillStyle = `rgba(246,160,40,${0.5 + 0.45 * Math.sin(t * 9)})`;
  g.beginPath(); g.ellipse(CRATER[0], CRATER[1], 13, 4, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}

// ---- 庞贝细节：小鼠（右下角）----
export function paintMouse(g: Ctx, mode: 'art' | 'halo' | 'class' = 'art', cFig = ''): void {
  const body = (col: string, lw: number, stroke = false): void => {
    g.lineWidth = lw; g.strokeStyle = col;
    if (!stroke) { g.fillStyle = col; }
    g.beginPath(); g.ellipse(1650, 962, 26, 11, 0, 0, Math.PI * 2);
    if (stroke) g.stroke(); else g.fill();
    g.beginPath(); g.arc(1682, 948, 7, 0, Math.PI * 2);
    if (stroke) g.stroke(); else g.fill();
    g.beginPath(); g.moveTo(1622, 966); g.quadraticCurveTo(1598, 950, 1588, 974);
    if (stroke) g.stroke(); else { g.lineWidth = 3; g.stroke(); }
  };
  if (mode === 'halo') { body(PAL.halo, 30, true); return; }
  if (mode === 'class') { body(cFig, 11, true); return; }
  body(PAL.halo, 26, true);
  body(PAL.mouse, 0, false);
  g.fillStyle = PAL.dogInk; g.beginPath(); g.arc(1690, 946, 1.8, 0, Math.PI * 2); g.fill();
  g.strokeStyle = PAL.mouseHi; g.lineWidth = 4;
  g.beginPath(); g.moveTo(1670, 952); g.quadraticCurveTo(1682, 940, 1694, 952); g.stroke();
}

// ---- 静态底稿：墙 + 画 + 字 + 小鼠（不含犬与 FX）----
export function paintStatic(g: Ctx): void {
  g.fillStyle = PAL.wall; g.fillRect(0, 0, W, H);
  paintFresco(g);
  drawText(g, TEXT_X0, TEXT_Y, TEXT_W, PAL.text);
  paintMouse(g);
  g.fillStyle = PAL.bK;
  g.fillRect(BW - 2, BW - 2, W - 2 * BW + 4, 6);
  g.fillRect(BW - 2, H - BW - 4, W - 2 * BW + 4, 6);
  g.fillRect(BW - 2, BW - 2, 6, H - 2 * BW + 4);
  g.fillRect(W - BW - 4, BW - 2, 6, H - 2 * BW + 4);
}

// ---- 波浪纹边框图案（维特鲁威卷涡，u 沿顺时针、v 从外往里；conveyor 之下 / 底稿烘色用）----
export const PER = 81;
export const SIDES: Array<[number, number, number, number, number, number, number]> = [
  [1, 0, 0, 1, 0, 0, W], [0, 1, -1, 0, W, 0, H], [-1, 0, 0, -1, W, H, W], [0, -1, 1, 0, 0, H, H],
];
export function paintScroll(g: Ctx, phase: number): void {
  for (const [a, b, c, d, e, f, len] of SIDES) {
    g.save(); g.setTransform(a, b, c, d, e, f);
    g.beginPath(); g.rect(BW, 0, len - 2 * BW, BW); g.clip();
    g.fillStyle = PAL.bW; g.fillRect(0, 0, len, BW);
    g.fillStyle = PAL.bK; g.fillRect(0, 0, len, 8); g.fillRect(0, 66, len, BW - 66);
    g.strokeStyle = PAL.bK; g.lineWidth = 13; g.lineCap = 'round'; g.lineJoin = 'round';
    const off = ((phase % PER) + PER) % PER;
    for (let u0 = BW - 2 * PER + off; u0 < len + PER; u0 += PER) {
      const cx = u0 + PER * 0.52, cy = 38, r0 = 24;
      g.beginPath(); g.moveTo(u0 - 6, 68); g.quadraticCurveTo(u0 + 2, 42, cx - r0, cy);
      for (let th = Math.PI; th <= Math.PI * 3.25; th += 0.14) {
        const r = r0 - (th - Math.PI) / (Math.PI * 2.25) * (r0 - 5);
        g.lineTo(cx + Math.cos(th) * r, cy + Math.sin(th) * r);
      }
      g.stroke();
    }
    g.restore();
  }
  for (const [x, y] of [[0, 0], [W - BW, 0], [0, H - BW], [W - BW, H - BW]]) {
    g.fillStyle = PAL.bK; g.fillRect(x, y, BW, BW);
    g.fillStyle = PAL.bW; g.fillRect(x + 10, y + 10, BW - 20, BW - 20);
    g.fillStyle = PAL.bK; g.fillRect(x + 22, y + 22, BW - 44, BW - 44);
    g.fillStyle = PAL.frameRed; g.fillRect(x + 33, y + 33, BW - 66, BW - 66);
  }
}
export const clamp01 = (v: number): number => clamp(v, 0, 1);
