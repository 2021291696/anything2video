// ============================================================================
// actors.ts — 读信人（★ 级人物重做核心）+ 烛焰/浮尘/云影/热气/impasto 鬃毛笔
// 技法借鉴 huashu-art-motion lib/brush.js P.impasto（鬃毛厚涂）+ scenes/32_rembrandt.js
// 角色处理（体积渐变 source-atop / 失边两遍 / 伦勃朗光小三角 / 只在受光处厚涂）
// （MIT, alchaincyf），TS 重写——机制与参数级借鉴，零代码拷贝。
//
// ★ 级重做硬要求（人物无扁平感三件套，缺一即「贴上去」）：
//   ① 光照图：人物被脸/胸光池照亮（light.ts，坐标锚点在本文件导出）；
//   ② 失边两遍：blur 2.4px 全不透明 + α0.62 清晰层（kit.tsx 合成）——暗侧融进背景、五官留清；
//   ③ impasto 受光厚涂：只在受光处（金发/领口/信纸缘/珍珠/颧骨）——画成三条整齐线=白色贴纸坑。
//   另有抗扁平底层：皮肤多段建模（受光径向+暗侧线性+眼窝+鼻侧+鼻上投影+颧骨受光三角）、
//   体积渐变 source-atop、细笔触肌理、读信微动作（呼吸/头微动/眨眼/信角颤）。
// ============================================================================

import {CANDLE, mulberry32, noise2, clamp01, lerp} from './world';

/** 角色离屏层 bbox（失边处理作用域） */
export const READER_R = {x: 645, y: 152, w: 412, h: 512};
/** 光照图锚点（light.ts 光池表定位用） */
export const READER = {
  faceC: [862, 262] as [number, number],
  chest: [912, 372] as [number, number],
};

type Pt = [number, number];
const q = (g: CanvasRenderingContext2D, a: Pt, c: Pt, b: Pt) => {
  g.quadraticCurveTo(c[0], c[1], b[0], b[1]);
};

/** 周期眨眼（约 4.7s 一次，0.13s） */
export const isBlink = (t: number): boolean => (t % 4.7) < 0.13;

// ---------------------------------------------------------------------------
// 签名③ impasto 鬃毛厚涂笔：一笔 = round(w/1.3) 条平行细鬃（亮度 ±17、两端缩 0-25%、
// 线宽 1.4-2.6、鬃位微抖）+ 下侧 α0.28 投影 + 上侧 2+w/3 亮点。只用于受光处。
// 坑（huashu 实测）：画成「暗影+主笔+亮脊」三条整齐线 = 白色贴纸——每条鬃必须独立抖。
// ---------------------------------------------------------------------------
export function impasto(
  g: CanvasRenderingContext2D, p0: Pt, p1: Pt, w: number,
  color: string, hi?: string, seed = 4242,
): void {
  const n = Math.max(2, Math.round(w / 1.3));
  const r = mulberry32(seed);
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  if (ny < 0) return; // 法线统一朝下（投影在下侧）；反向笔画由调用方换端点序
  // 下侧投影（一条 α0.28）
  g.save();
  g.strokeStyle = 'rgba(30,12,4,.28)';
  g.lineWidth = w * 0.55;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(p0[0] + nx * (w * 0.42), p0[1] + ny * (w * 0.42) + 1.5);
  g.lineTo(p1[0] + nx * (w * 0.42), p1[1] + ny * (w * 0.42) + 1.5);
  g.stroke();
  g.restore();
  // 平行细鬃
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const off = (n === 1 ? 0 : (i / (n - 1) - 0.5) * w) + (r() - 0.5) * w * 0.12;
    const trim0 = r() * 0.25, trim1 = r() * 0.25;
    const ax = p0[0] + dx * trim0, ay = p0[1] + dy * trim0;
    const bx = p1[0] - dx * trim1, by = p1[1] - dy * trim1;
    const shade = (r() - 0.5) * 34; // ±17
    const [cr, cg, cb] = hexParts(color);
    g.strokeStyle = `rgba(${clampC(cr + shade)},${clampC(cg + shade)},${clampC(cb + shade)},0.85)`;
    g.lineWidth = 1.4 + r() * 1.2;
    g.beginPath();
    g.moveTo(ax + nx * off, ay + ny * off);
    g.lineTo(bx + nx * off, by + ny * off);
    g.stroke();
  }
  // 上侧亮点（2+w/3 个）
  if (hi) {
    const dots = 2 + Math.floor(w / 3);
    for (let k = 0; k < dots; k++) {
      const u = 0.15 + r() * 0.7;
      const off = -r() * w * 0.5;
      g.fillStyle = hi;
      g.globalAlpha = 0.4 + r() * 0.35;
      g.beginPath();
      g.arc(lerp(p0[0], p1[0], u) + nx * off, lerp(p0[1], p1[1], u) + ny * off - 0.8, 0.8 + r() * 0.9, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  g.restore();
}
const clampC = (v: number) => Math.max(0, Math.min(255, v | 0));
const hexParts = (h: string): [number, number, number] => {
  const m = /^#([0-9a-f]{6})$/i.exec(h);
  if (!m) return [255, 255, 255];
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

// ---------------------------------------------------------------------------
// 读信人（绝对坐标画师；kit 平移进离屏层做失边）
// ---------------------------------------------------------------------------
export function drawReader(g: CanvasRenderingContext2D, t: number): void {
  const blink = isBlink(t);
  const breathe = Math.sin(t * 1.15) * 1.6;        // 胸腔呼吸
  const headBob = Math.sin(t * 0.85 + 1) * 1.5;    // 低头读信的微动
  const headTilt = Math.sin(t * 0.6 + 2) * 0.012;
  const page = Math.sin(t * 2.1) * 1.6;            // 信角轻颤

  // ---- 裙身（暗 umber，先画——头组压在上面） ----
  g.fillStyle = '#38200f';
  g.beginPath();
  g.moveTo(772, 404);
  q(g, [790, 362], [852, 344], [918, 344]);
  q(g, [996, 360], [1022, 400], [1034, 560]);
  g.lineTo(1038, 660);
  g.lineTo(758, 660);
  g.lineTo(764, 560);
  g.closePath();
  g.fill();
  // 裙褶：S 形弧笔（深浅交替、宽度不均——首版坑：等距竖直线读成栅栏）
  g.lineCap = 'round';
  const folds: Array<[Pt, number, number]> = [
    [[816, 402], 14, 0.4], [[876, 396], 20, 0.5], [[948, 392], 12, 0.38], [[1006, 406], 16, 0.44],
  ];
  folds.forEach(([a, lw, al], k) => {
    const sway = 14 + k * 6;
    g.strokeStyle = `rgba(14,6,2,${al})`;
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.quadraticCurveTo(a[0] - sway, (a[1] + 640) / 2, a[0] - sway * 0.4 + k * 4, 646 + (k % 2) * 8);
    g.stroke();
    g.strokeStyle = 'rgba(130,75,40,.22)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(a[0] - lw * 0.55, a[1] + 6);
    g.quadraticCurveTo(a[0] - lw * 0.55 - sway, (a[1] + 640) / 2, a[0] - lw * 0.55 - sway * 0.3 + k * 4, 640);
    g.stroke();
  });
  // 裙底阴影
  const hemG = g.createLinearGradient(0, 560, 0, 660);
  hemG.addColorStop(0, 'rgba(0,0,0,0)');
  hemG.addColorStop(1, 'rgba(5,2,0,.55)');
  g.fillStyle = hemG;
  g.fillRect(750, 560, 292, 100);

  // ---- 头组（绕颈枢轴微动） ----
  g.save();
  g.translate(868, 334 + headBob);
  g.rotate(headTilt);
  g.translate(-868, -334);
  // 颈
  g.fillStyle = '#c89468';
  g.beginPath();
  g.moveTo(850, 294); g.lineTo(892, 296); g.lineTo(886, 348); g.lineTo(856, 348);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(70,30,10,.45)';
  g.beginPath(); g.ellipse(870, 306, 21, 9, 0.1, 0, Math.PI * 2); g.fill();
  // 后发量（暗金褐，含髻）
  g.fillStyle = '#6a4418';
  g.beginPath();
  g.ellipse(918, 234, 74, 88, 0.12, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#744c1c';
  g.beginPath(); g.arc(948, 202, 27, 0, Math.PI * 2); g.fill();
  // 颅底
  g.fillStyle = '#d9a878';
  g.beginPath(); g.ellipse(885, 245, 56, 64, 0, 0, Math.PI * 2); g.fill();

  // ---- 脸（3/4 朝向烛光：受光在左下，暗侧沉右） ----
  const facePath = new Path2D();
  facePath.moveTo(842, 192);
  facePath.quadraticCurveTo(830, 222, 828, 240);
  facePath.lineTo(820, 262);            // 鼻尖
  facePath.quadraticCurveTo(826, 268, 834, 270);
  facePath.quadraticCurveTo(836, 282, 846, 284);
  facePath.quadraticCurveTo(840, 290, 854, 308);
  facePath.quadraticCurveTo(890, 314, 926, 294);
  facePath.lineTo(936, 252);
  facePath.quadraticCurveTo(916, 200, 886, 186);
  facePath.quadraticCurveTo(862, 184, 842, 192);
  facePath.closePath();
  g.fillStyle = '#e2b488';
  g.fill(facePath);
  g.save();
  g.clip(facePath);
  // 受光径向（烛在左下方：亮心在颧/颊）
  let fg = g.createRadialGradient(846, 268, 6, 846, 268, 100);
  fg.addColorStop(0, 'rgba(248,221,178,.95)');
  fg.addColorStop(0.55, 'rgba(221,168,119,.6)');
  fg.addColorStop(1, 'rgba(221,168,119,0)');
  g.fillStyle = fg;
  g.fillRect(790, 160, 170, 180);
  // 暗侧线性沉底（只压最右 1/4，软过渡——暗侧融向耳，失边的画内一半）
  let sg = g.createLinearGradient(884, 0, 944, 0);
  sg.addColorStop(0, 'rgba(0,0,0,0)');
  sg.addColorStop(1, 'rgba(42,18,7,.66)');
  g.fillStyle = sg;
  g.fillRect(884, 160, 90, 180);
  // 颌底投影（轻）
  fg = g.createRadialGradient(884, 306, 4, 884, 306, 40);
  fg.addColorStop(0, 'rgba(50,22,8,.26)');
  fg.addColorStop(1, 'rgba(50,22,8,0)');
  g.fillStyle = fg;
  g.fillRect(830, 268, 110, 70);
  // 额头釉光
  fg = g.createRadialGradient(856, 212, 3, 856, 212, 32);
  fg.addColorStop(0, 'rgba(255,238,200,.16)');
  fg.addColorStop(1, 'rgba(255,238,200,0)');
  g.fillStyle = fg;
  g.fillRect(820, 180, 76, 66);
  // 眼窝阴影（近/远，浅）
  g.fillStyle = 'rgba(105,50,22,.22)';
  g.beginPath(); g.ellipse(858, 236, 14, 6, 0.06, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(80,35,14,.3)';
  g.beginPath(); g.ellipse(898, 240, 12, 5.5, 0.06, 0, Math.PI * 2); g.fill();
  // 鼻：梁侧亮面（弱）+ 右侧暗面 + 尖部高光 + 烛下投影（影子朝上——伦勃朗烛光签名）
  g.strokeStyle = 'rgba(252,228,190,.4)';
  g.lineWidth = 2.6;
  g.beginPath(); g.moveTo(829, 228); g.lineTo(825.5, 252); g.stroke();
  g.strokeStyle = 'rgba(115,55,22,.3)';
  g.lineWidth = 3.4;
  g.beginPath(); g.moveTo(835.5, 242); g.lineTo(837, 262); g.stroke();
  g.fillStyle = 'rgba(85,38,14,.26)';
  g.beginPath(); g.ellipse(832, 251.5, 5.5, 2.6, -0.3, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffedd0';
  g.beginPath(); g.arc(823.5, 259, 2.2, 0, Math.PI * 2); g.fill();
  // 颧骨受光暖晕
  fg = g.createRadialGradient(846, 272, 3, 846, 272, 22);
  fg.addColorStop(0, 'rgba(216,116,84,.28)');
  fg.addColorStop(1, 'rgba(216,116,84,0)');
  g.fillStyle = fg;
  g.fillRect(820, 250, 52, 44);
  // 伦勃朗光小三角：暗侧颊上一块受光（签名；小而软）
  g.fillStyle = 'rgba(244,214,172,.42)';
  g.beginPath();
  g.moveTo(899, 252); g.lineTo(914, 254); g.lineTo(904, 271);
  g.closePath(); g.fill();
  // 鼻唇软折
  g.strokeStyle = 'rgba(120,60,26,.26)';
  g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(842, 268); g.lineTo(849, 281); g.stroke();
  g.restore();

  // ---- 五官 ----
  // 眉（软、有弓）
  g.strokeStyle = 'rgba(122,76,32,.55)';
  g.lineWidth = 2.2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(841, 224); g.quadraticCurveTo(853, 218.5, 865, 219.5); g.stroke();
  g.strokeStyle = 'rgba(90,52,20,.45)';
  g.lineWidth = 1.9;
  g.beginPath(); g.moveTo(887, 221); g.quadraticCurveTo(895, 220.5, 902, 224); g.stroke();
  // 眼（垂目读信：细上睑 + 下露半枚虹膜 + 卧蚕；眨眼时闭睑）
  if (blink) {
    g.fillStyle = '#d8a878';
    g.beginPath(); g.ellipse(857, 241, 12, 5, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#3a1e0c'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(846, 241); g.quadraticCurveTo(857, 245, 867, 240); g.stroke();
  } else {
    g.fillStyle = '#241408';
    g.beginPath(); g.ellipse(857, 243.5, 3.8, 2.7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,240,210,.9)';
    g.beginPath(); g.arc(855.7, 242.3, 1, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#3a1e0c'; g.lineWidth = 1.9;
    g.beginPath(); g.moveTo(845, 238.5); g.quadraticCurveTo(856, 234.5, 868, 237.5); g.stroke();
    g.strokeStyle = 'rgba(150,90,50,.45)'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(847, 248); g.quadraticCurveTo(857, 250.5, 866, 247.5); g.stroke();
    g.strokeStyle = 'rgba(60,30,12,.6)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(864, 238); g.quadraticCurveTo(867, 239.5, 869, 242); g.stroke();
  }
  // 远眼（暗侧：睑线 + 一点虹膜剪影）
  g.strokeStyle = 'rgba(42,18,6,.7)';
  g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(890, 241); g.quadraticCurveTo(897, 243.5, 904, 243); g.stroke();
  g.fillStyle = 'rgba(30,14,5,.55)';
  g.beginPath(); g.ellipse(897, 245, 2.6, 1.8, 0, 0, Math.PI * 2); g.fill();
  // 唇
  g.fillStyle = '#a8483e';
  g.beginPath();
  g.moveTo(832, 280); g.lineTo(844, 277); g.lineTo(850, 281); g.lineTo(838, 290); g.lineTo(830, 285);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,206,168,.5)';
  g.beginPath(); g.ellipse(839, 288, 5, 2, 0, 0, Math.PI * 2); g.fill();
  // 耳 + 珍珠耳坠
  g.strokeStyle = '#a06838';
  g.lineWidth = 2.5;
  g.beginPath(); g.arc(933, 246, 8, -1.1, 1.6); g.stroke();
  g.fillStyle = '#f2ece0';
  g.beginPath(); g.arc(934, 274, 4.5, 0, Math.PI * 2); g.fill();

  // ---- 前发（冠部扫覆 + 受光/背光鬃丝 + 碎发） ----
  g.fillStyle = '#a87834';
  g.beginPath();
  g.moveTo(842, 196);
  g.quadraticCurveTo(862, 170, 900, 168);
  g.quadraticCurveTo(948, 170, 958, 212);
  g.quadraticCurveTo(964, 252, 950, 292);
  g.quadraticCurveTo(944, 302, 936, 300);
  g.quadraticCurveTo(946, 244, 928, 210);
  g.quadraticCurveTo(902, 186, 860, 192);
  g.quadraticCurveTo(848, 194, 842, 196);
  g.closePath(); g.fill();
  const hr = mulberry32(11);
  // 鬃丝只落在发量内：冠顶顺梳（沿发缘向右后，不出脸区）+ 右侧外缘垂丝
  for (let i = 0; i < 10; i++) {
    const u = i / 9;
    const lit = i % 2 === 0;
    g.strokeStyle = lit ? `rgba(216,162,78,${0.45 + hr() * 0.3})` : `rgba(110,74,26,${0.45 + hr() * 0.3})`;
    g.lineWidth = 1.5 + hr() * 1.6;
    const x0 = lerp(858, 940, u), y0 = 182 + hr() * 8;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(x0 + 8 + u * 8, y0 + 10 + u * 14, x0 + 16 + u * 10, y0 + 22 + u * 30);
    g.stroke();
  }
  for (let i = 0; i < 5; i++) { // 右侧外缘垂丝（贴发缘轮廓）
    g.strokeStyle = `rgba(160,112,46,${0.4 + hr() * 0.25})`;
    g.lineWidth = 1.5 + hr() * 1.2;
    const y0 = 214 + i * 17;
    g.beginPath();
    g.moveTo(950 - i * 2, y0);
    g.quadraticCurveTo(958 - i * 2, y0 + 12, 948 - i * 3, y0 + 26);
    g.stroke();
  }
  for (let i = 0; i < 4; i++) { // 发际线内侧鬃丝（贴额发缘，极短不上脸）
    g.strokeStyle = `rgba(190,140,66,${0.35 + hr() * 0.25})`;
    g.lineWidth = 1.3;
    const x0 = 850 + i * 9;
    g.beginPath();
    g.moveTo(x0, 194 + i * 0.5);
    g.quadraticCurveTo(x0 + 2, 189, x0 + 6, 185 + hr() * 3);
    g.stroke();
  }
  for (let i = 0; i < 3; i++) { // 碎发
    g.strokeStyle = 'rgba(200,150,80,.5)';
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(856 + i * 12, 188);
    g.quadraticCurveTo(854 + i * 14, 176, 862 + i * 16, 170 + hr() * 6);
    g.stroke();
  }
  g.restore(); // 头组结束

  // ---- 花边大领（平摊肩上，盖住颈-身接缝） ----
  g.fillStyle = '#ece2cc';
  g.beginPath();
  g.moveTo(846, 330); g.lineTo(838, 354); g.lineTo(866, 366); g.lineTo(898, 364);
  g.lineTo(928, 350); g.lineTo(938, 332); g.lineTo(912, 326); g.lineTo(878, 328);
  g.closePath(); g.fill();
  const cr = mulberry32(13);
  for (let k = 0; k < 10; k++) {
    const u = k / 9;
    const x = lerp(840, 934, u), y = lerp(354, 344, u) + Math.sin(u * Math.PI) * 12;
    g.fillStyle = '#f4ecda';
    g.beginPath(); g.arc(x, y, 5.5 + cr() * 1.6, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(150,130,100,.6)';
  g.lineWidth = 1.2;
  g.setLineDash([2, 4]);
  g.beginPath();
  g.moveTo(848, 336);
  g.quadraticCurveTo(890, 352, 930, 334);
  g.stroke();
  g.setLineDash([]);

  // ---- 手臂（袖管）→ 手 → 信 ----
  g.strokeStyle = '#40240f';
  g.lineWidth = 32;
  g.beginPath(); g.moveTo(992, 402); g.quadraticCurveTo(930, 442, 820, 430); g.stroke();
  g.lineWidth = 28;
  g.beginPath(); g.moveTo(800, 428); g.quadraticCurveTo(760, 436, 726, 440); g.stroke();
  g.strokeStyle = 'rgba(160,105,55,.3)';
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(988, 392); g.quadraticCurveTo(928, 430, 824, 420); g.stroke();
  // 信（摊开在手中，烛光从左照亮；右上角随 t 轻颤）
  g.fillStyle = '#efe4c6';
  g.beginPath();
  g.moveTo(664, 378); g.lineTo(802, 400 + page); g.lineTo(792, 466); g.lineTo(654, 442);
  g.closePath(); g.fill();
  let lg = g.createLinearGradient(660, 400, 800, 440);
  lg.addColorStop(0, 'rgba(255,244,214,.4)');
  lg.addColorStop(1, 'rgba(120,80,40,.18)');
  g.fillStyle = lg;
  g.beginPath();
  g.moveTo(664, 378); g.lineTo(802, 400 + page); g.lineTo(792, 466); g.lineTo(654, 442);
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(150,118,66,.55)';
  g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(733, 389); g.lineTo(723, 454); g.stroke();
  g.strokeStyle = 'rgba(125,95,52,.6)';
  g.lineWidth = 1.4;
  for (let k = 0; k < 5; k++) {
    const yy = 398 + k * 10;
    g.beginPath(); g.moveTo(672, yy + 6); g.lineTo(720, yy + 14); g.stroke();
    g.beginPath(); g.moveTo(742, yy + 16); g.lineTo(790, yy + 24); g.stroke();
  }
  g.strokeStyle = 'rgba(255,246,220,.9)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(664, 378); g.lineTo(802, 400 + page); g.stroke();
  // 手（左：四指扣信缘；右：三指拈角）
  g.fillStyle = '#d8a878';
  g.beginPath(); g.ellipse(706, 444, 20, 12, -0.14, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#dcae80';
  g.lineWidth = 9;
  for (let k = 0; k < 4; k++) {
    const x0 = 690 + k * 22, y0 = 436 + k * 3;
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + 16, y0 + 8, x0 + 26, y0 + 13); g.stroke();
  }
  g.strokeStyle = 'rgba(120,60,25,.5)';
  g.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) {
    g.beginPath(); g.moveTo(702 + k * 22, 440 + k * 3); g.lineTo(716 + k * 22, 449 + k * 3); g.stroke();
  }
  g.fillStyle = '#d8a878';
  g.beginPath(); g.ellipse(724, 426, 8, 6, 0.3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(794, 432, 16, 11, 0.2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#dcae80';
  g.lineWidth = 8;
  for (let k = 0; k < 3; k++) {
    const y0 = 404 + k * 12;
    g.beginPath(); g.moveTo(796, y0); g.quadraticCurveTo(788, y0 + 8, 786, y0 + 18); g.stroke();
  }
  g.fillStyle = '#e2b088';
  g.beginPath(); g.ellipse(800, 416, 6, 4.5, 0.5, 0, Math.PI * 2); g.fill();

  // ---- 体积渐变（source-atop：左上受光 → 右下沉入暗部） + 细笔触肌理 ----
  g.save();
  g.globalCompositeOperation = 'source-atop';
  let vg = g.createLinearGradient(820, 220, 1040, 660);
  vg.addColorStop(0, 'rgba(255,240,200,.13)');
  vg.addColorStop(0.45, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(8,4,1,.7)');
  g.fillStyle = vg;
  g.fillRect(READER_R.x, READER_R.y, READER_R.w, READER_R.h);
  // 细笔触肌理（古典油画：不沸腾；source-atop 只落在角色像素上）
  const tr = mulberry32(8);
  for (let i = 0; i < 130; i++) {
    const x = READER_R.x + tr() * READER_R.w, y = READER_R.y + tr() * READER_R.h;
    const a = -0.6 + noise2(x * 0.01, y * 0.01) * 1.2;
    g.strokeStyle = tr() < 0.5 ? 'rgba(255,236,200,.05)' : 'rgba(20,8,2,.07)';
    g.lineWidth = 2.5 + tr() * 3;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
    g.stroke();
  }
  g.restore();
  void breathe;
}

// ---------------------------------------------------------------------------
// 云影：暗色径向斑横穿窗玻璃（260px/s→720p 约 230px/s，只出现在窗内）
// ---------------------------------------------------------------------------
export function drawCloud(g: CanvasRenderingContext2D, t: number): void {
  g.save();
  g.beginPath();
  g.rect(187, 77, 300, 356);
  g.clip();
  const cx = 170 + ((t * 230) % 950);
  const cgr = g.createRadialGradient(cx, 250, 20, cx, 250, 240);
  cgr.addColorStop(0, 'rgba(60,40,20,.35)');
  cgr.addColorStop(1, 'rgba(60,40,20,0)');
  g.fillStyle = cgr;
  g.fillRect(187, 77, 300, 356);
  g.restore();
}

// ---------------------------------------------------------------------------
// 浮尘：70 颗，只在光柱楔形内显形，24 帧闪烁节奏（sin 4t）
// ---------------------------------------------------------------------------
const DUST_N = 70;
export function drawDust(g: CanvasRenderingContext2D, t: number, u: number): void {
  if (u <= 0) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const r = mulberry32(17);
  for (let i = 0; i < DUST_N; i++) {
    const bx = lerp(300, 1150, r());
    const speed = 24 + r() * 32;
    const ph = r() * 560;
    const drift = Math.sin(t * 0.5 + i * 1.7) * 18 + Math.sin(t * 1.3 + i) * 7;
    const y = 660 - (((t * speed + ph) % 560) | 0);
    const x = bx + drift;
    const yl = clamp01((y - 80) / 580);
    const xl = 192 + 126 * yl + 6, xr = 486 + 220 * yl - 6;
    if (x < xl || x > xr || y > 640) continue; // 光柱楔内才显形（浮尘满桌散=穿帮）
    const tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 2.1);
    g.fillStyle = `rgba(255,236,190,${((0.16 + 0.4 * tw) * u).toFixed(3)})`;
    g.beginPath();
    g.arc(x, y, 1.1 + r() * 1.5, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------------------
// 烛焰（lighter）：噪声摇曳左右倾 + 高度跳 + 蓝底芯；ignite 点亮 / hero 爆亮
// ---------------------------------------------------------------------------
export function drawFlame(g: CanvasRenderingContext2D, t: number, ignite: number, heroPulse: number): void {
  if (ignite <= 0) return;
  const fc = 0.5 + 0.5 * (0.5 * noise2(t * 2.2 * 1.7 + 21.9, 9.3) + 0.25 * noise2(t * 6.5 * 1.7 + 3, 12));
  const fx = CANDLE.x + 5 * noise2(t * 5, 2);
  const lean = 6 * noise2(t * 3, 8);
  const top = CANDLE.top;
  g.save();
  g.globalCompositeOperation = 'lighter';
  // 光晕
  const gr = (70 + 12 * fc + 44 * heroPulse) * ignite;
  const grad = g.createRadialGradient(fx, top - 10, 4, fx, top - 10, gr);
  grad.addColorStop(0, `rgba(255,170,70,${clamp01((0.45 + 0.2 * fc) * ignite).toFixed(3)})`);
  grad.addColorStop(1, 'rgba(255,170,70,0)');
  g.fillStyle = grad;
  g.fillRect(fx - gr, top - 10 - gr, gr * 2, gr * 2);
  // 焰身
  g.globalAlpha = ignite;
  g.fillStyle = '#ffd890';
  g.beginPath();
  g.moveTo(fx - 8, top + 14);
  g.quadraticCurveTo(fx - 10, top - 6, fx + lean, top - 22 - 8 * fc - 4 * heroPulse);
  g.quadraticCurveTo(fx + 10, top - 6, fx + 8, top + 14);
  g.closePath();
  g.fill();
  // 亮芯 + 蓝底
  g.fillStyle = '#fff6d8';
  g.beginPath(); g.ellipse(fx + lean * 0.3, top + 2, 4, 9, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(110,130,230,.4)';
  g.beginPath(); g.ellipse(fx, top + 12, 3.4, 4, 0, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
  g.restore();
}

/** 热气微升（烛焰上方两缕，定帧微动件） */
export function drawHeat(g: CanvasRenderingContext2D, t: number, u: number): void {
  if (u <= 0) return;
  g.save();
  g.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    g.strokeStyle = `rgba(255,236,200,${(0.16 * u).toFixed(3)})`;
    g.lineWidth = 2.4;
    g.beginPath();
    const bx = CANDLE.x + 3 + k * 5;
    g.moveTo(bx, CANDLE.top - 26);
    g.quadraticCurveTo(bx + 7 * Math.sin(t * 2.4 + k * 2), CANDLE.top - 48, bx + 3 * Math.sin(t * 1.7 + k), CANDLE.top - 70);
    g.stroke();
  }
  g.restore();
}

/** 受光处 impasto 布点表（签名③：只打受光——金发/领口/信纸缘/珍珠/颧骨/铜座/书口/指节） */
export function drawImpastoPass(g: CanvasRenderingContext2D, t: number): void {
  const s = 4242 + ((t * 60) | 0) * 0; // 每帧同 seed：笔触不沸腾（古典油画纪律）
  // 金发受光（冠部两笔 + 髻缘一笔）
  impasto(g, [866, 197], [908, 185], 7, '#e2b058', 'rgba(255,238,190,.8)', s);
  impasto(g, [846, 207], [872, 193], 6, '#d8a24e', 'rgba(255,238,190,.7)', s + 1);
  impasto(g, [936, 197], [958, 190], 5, '#d8a24e', 'rgba(255,240,200,.6)', s + 2);
  // 领口受光边：一串短厚笔
  for (let k = 0; k < 5; k++) {
    const u = k / 4;
    const x = lerp(846, 932, u), y = lerp(350, 344, u) + Math.sin(u * Math.PI) * 10;
    impasto(g, [x, y], [x + 9, y + 2], 4.5, 'rgba(246,238,218,.9)', 'rgba(255,255,245,.45)', s + 10 + k);
  }
  // 信纸受光缘（顶缘高光厚涂）
  impasto(g, [672, 382], [794, 402], 4, '#fbf4dc', undefined, s + 20);
  // 珍珠
  impasto(g, [933, 273], [935, 274.5], 3.5, '#ffffff', undefined, s + 21);
  // 颧骨受光
  impasto(g, [838, 267], [851, 262], 4, '#eecba0', 'rgba(255,240,210,.5)', s + 22);
  // 黄铜烛座受光
  impasto(g, [577, 469], [613, 469], 4, '#e8c878', 'rgba(255,236,180,.6)', s + 23);
  // 书口受光
  impasto(g, [446, 449], [490, 447], 4, '#f6e8c0', undefined, s + 24);
  // 指节受光
  impasto(g, [700, 437], [716, 441], 3.5, '#f0d0a8', undefined, s + 25);
}
