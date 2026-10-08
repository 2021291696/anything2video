// 会动的母题：高跷象（地平线）／蚂蚁怀表（9 只蚂蚁绕橙表爬）／软体沉睡生物（前景，达利自画像母题）。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）references/风格配方/23_dali.md 与 scenes/23_dali.js
// （MIT）——机制与参数级借鉴，Remotion(React+TSX)+Canvas2D 重写，几何按 1280×720 重设计，零整段拷贝。
// 短板修正（INDEX「人物偏矢量插画」）：软体生物加第二高光＋暗部反光＋地面暖反弹（配方「仍可改进」项）。
import {vol} from './paint';
import {CREATURE, ELEPHANT, GROUND, HZ, WATCH, type CanvasCtx} from './types';

const TAU = Math.PI * 2;

/** 高跷象：四条细长腿相位差 π/2 交替迈步（膝关节 0.52 高度处微弯），身体微颠，背驮方尖碑。 */
export function elephant(c: CanvasCtx, x: number, t: number): void {
  const y = 282;
  const legH = GROUND - 2 - y;
  c.save();
  c.fillStyle = ELEPHANT.body;
  c.strokeStyle = ELEPHANT.body;
  c.lineCap = 'round';
  const legs: Array<[number, number]> = [[-20, 0], [-9, Math.PI], [13, Math.PI * 0.5], [24, Math.PI * 1.5]];
  legs.forEach(([ox, ph]) => {
    const sw = Math.sin(t * 7 + ph);
    const fx = x + ox + sw * 6;
    const kx = x + ox + sw * 2.4 + 2;
    const ky = y + legH * 0.52 - Math.max(0, sw) * 4;
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(x + ox, y + 6);
    c.lineTo(kx, ky);
    c.lineTo(fx, GROUND - 2 - Math.max(0, sw) * 3);
    c.stroke();
  });
  const bob = Math.sin(t * 14);
  c.beginPath();
  c.ellipse(x, y + bob, 46, 24, 0, 0, TAU);
  c.fill();
  c.beginPath();
  c.ellipse(x - 38, y - 7 + bob, 15, 13, 0, 0, TAU);
  c.fill();
  c.lineWidth = 4.5;
  c.beginPath();
  c.moveTo(x - 48, y - 2 + bob);
  c.quadraticCurveTo(x - 61, y + 24, x - 55 + Math.sin(t * 5) * 4, y + 42);
  c.stroke();
  // 背上的方尖碑与鞍布
  c.fillStyle = ELEPHANT.saddle;
  c.fillRect(x - 19, y - 22 + bob, 34, 7);
  c.fillStyle = ELEPHANT.obelisk;
  c.beginPath();
  c.moveTo(x - 8, y - 22 + bob);
  c.lineTo(x + 6, y - 22 + bob);
  c.lineTo(x - 1, y - 82 + bob);
  c.closePath();
  c.fill();
  c.fillStyle = ELEPHANT.rim;
  c.beginPath();
  c.ellipse(x - 12, y - 10 + bob, 22, 5, -0.2, 0, TAU);
  c.fill();
  c.restore();
}

/** 孤柏（荒原右，达利式枯树）：细瘦剪影＋极轻摆，着地线 yg 655——它的长影子无遮挡，是「影子在变长」的主读数。 */
export function cypress(c: CanvasCtx, t: number): void {
  const x = 1020, base = 655, h = 152;
  const sway = Math.sin(t * 1.1) * 3;
  const p = new Path2D();
  p.moveTo(x - 7, base);
  p.bezierCurveTo(x - 5 + sway * 0.4, base - h * 0.4, x - 3 + sway, base - h * 0.75, x - 1 + sway * 1.4, base - h);
  p.bezierCurveTo(x + 6 + sway, base - h * 0.7, x + 8 + sway * 0.5, base - h * 0.35, x + 7, base);
  p.closePath();
  c.save();
  c.fillStyle = '#3d2c1a';
  c.fill(p);
  // 两根枯枝
  c.strokeStyle = '#3d2c1a';
  c.lineCap = 'round';
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(x + sway, base - h * 0.72);
  c.lineTo(x - 14 + sway * 1.2, base - h * 0.86);
  c.moveTo(x + sway * 1.2, base - h * 0.6);
  c.lineTo(x + 16 + sway * 1.5, base - h * 0.78);
  c.stroke();
  c.restore();
}

/** 孤柏剪影（长影子层用）。 */
export function cypressSilhouette(g: CanvasCtx, t: number): void {
  const x = 1020, base = 655, h = 152;
  const sway = Math.sin(t * 1.1) * 3;
  g.save();
  g.fillStyle = '#000';
  g.strokeStyle = '#000';
  g.beginPath();
  g.moveTo(x - 7, base);
  g.bezierCurveTo(x - 5 + sway * 0.4, base - h * 0.4, x - 3 + sway, base - h * 0.75, x - 1 + sway * 1.4, base - h);
  g.bezierCurveTo(x + 6 + sway, base - h * 0.7, x + 8 + sway * 0.5, base - h * 0.35, x + 7, base);
  g.closePath();
  g.fill();
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(x + sway, base - h * 0.72);
  g.lineTo(x - 14 + sway * 1.2, base - h * 0.86);
  g.moveTo(x + sway * 1.2, base - h * 0.6);
  g.lineTo(x + 16 + sway * 1.5, base - h * 0.78);
  g.stroke();
  g.restore();
}

/** 蚂蚁怀表：橙面小怀表躺在石桌上，9 只蚂蚁沿椭圆爬行（方向/速率各异，seeded-free 纯三角函数）。 */
export function antWatch(c: CanvasCtx, t: number): void {
  const x = 687, y = 404;
  const wg = c.createRadialGradient(x - 7, y - 5, 2, x, y, 27);
  wg.addColorStop(0, WATCH.hi);
  wg.addColorStop(1, WATCH.lo);
  c.fillStyle = WATCH.shadow;
  c.beginPath();
  c.ellipse(x + 7, y + 5, 27, 7, 0, 0, TAU);
  c.fill();
  c.fillStyle = wg;
  c.beginPath();
  c.ellipse(x, y, 25, 9, 0, 0, TAU);
  c.fill();
  c.fillStyle = WATCH.crown;
  c.beginPath();
  c.ellipse(x + 24, y - 3, 5, 3, 0, 0, TAU);
  c.fill();
  c.fillStyle = WATCH.ant;
  for (let k = 0; k < 9; k++) {
    const a = t * (1.6 + (k % 3) * 0.5) * (k % 2 ? 1 : -1) + k * 0.7;
    const r = 0.35 + (k % 4) * 0.14;
    const ax = x + Math.cos(a) * 21 * r;
    const ay = y + Math.sin(a) * 6.7 * r;
    const d = a + (k % 2 ? Math.PI / 2 : -Math.PI / 2);
    for (let s = -1; s <= 1; s++) {
      c.beginPath();
      c.ellipse(ax + Math.cos(d) * s * 2.1, ay + Math.sin(d) * s * 0.8, 1.4, 0.95, d, 0, TAU);
      c.fill();
    }
  }
}

/** 软体沉睡生物（前景荒原上，达利式「自画像」母题）。
 *  短板修正：体积靠 vol 渐变＋内阴影之外，再叠第二高光（受光面内侧）＋暗部反光（背光缘）＋地面暖反弹。 */
export function creature(c: CanvasCtx): void {
  const body = new Path2D();
  body.moveTo(265, 610);
  body.bezierCurveTo(268, 578, 300, 562, 342, 566);
  body.bezierCurveTo(392, 570, 428, 585, 442, 596);
  body.bezierCurveTo(470, 588, 486, 580, 492, 584);
  body.bezierCurveTo(500, 590, 494, 602, 476, 610);
  body.bezierCurveTo(470, 622, 462, 636, 444, 640);
  body.bezierCurveTo(400, 650, 320, 648, 288, 636);
  body.bezierCurveTo(268, 628, 262, 620, 265, 610);
  body.closePath();
  vol(c, body, 265, 560, 500, 650, CREATURE.lit, CREATURE.dark, CREATURE.occl, 12);
  // 垂下来的一小片「舌」（达利生物的软垂件）
  const tongue = new Path2D();
  tongue.moveTo(462, 606);
  tongue.bezierCurveTo(474, 610, 480, 626, 474, 638);
  tongue.bezierCurveTo(468, 644, 458, 640, 456, 628);
  tongue.bezierCurveTo(454, 618, 456, 608, 462, 606);
  tongue.closePath();
  vol(c, tongue, 454, 600, 482, 644, '#e8dcb8', '#a8906a', 'rgba(60,45,20,.4)', 6);
  // —— 短板修正三件：第二高光 / 暗部反光 / 地面暖反弹（全部 clip 在体内）——
  c.save();
  c.clip(body);
  // 第二高光：受光面（左上）内侧一团更亮更聚的光
  const hi2 = c.createRadialGradient(316, 584, 3, 330, 592, 40);
  hi2.addColorStop(0, CREATURE.hiSecond);
  hi2.addColorStop(1, 'rgba(255,252,238,0)');
  c.fillStyle = hi2;
  c.filter = 'blur(5px)';
  c.beginPath();
  c.ellipse(330, 592, 44, 20, -0.12, 0, TAU);
  c.fill();
  c.filter = 'none';
  // 暗部反光：背光缘（右下轮廓内侧）一线冷暗反光
  c.strokeStyle = CREATURE.refl;
  c.lineWidth = 7;
  c.filter = 'blur(4px)';
  c.beginPath();
  c.moveTo(420, 640);
  c.quadraticCurveTo(360, 650, 292, 634);
  c.stroke();
  c.filter = 'none';
  // 地面暖反弹：底缘一线沙色反光
  c.strokeStyle = CREATURE.bounce;
  c.lineWidth = 5;
  c.filter = 'blur(3px)';
  c.beginPath();
  c.moveTo(300, 642);
  c.quadraticCurveTo(360, 650, 430, 642);
  c.stroke();
  c.filter = 'none';
  c.restore();
  // 闭眼（睫毛＋眼睑褶）：睡着的脸
  c.strokeStyle = CREATURE.lash;
  c.lineWidth = 1.6;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(384, 600);
  c.quadraticCurveTo(394, 606, 404, 601);
  c.stroke();
  c.beginPath();
  c.moveTo(388, 605);
  c.lineTo(386, 609);
  c.moveTo(394, 607);
  c.lineTo(393, 611);
  c.moveTo(400, 606);
  c.lineTo(400, 610);
  c.stroke();
  c.strokeStyle = 'rgba(110,90,60,.4)';
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(382, 596);
  c.quadraticCurveTo(394, 600, 406, 596);
  c.stroke();
}

/** 生物的剪影（供长影子层用）。 */
export function creatureSilhouette(g: CanvasCtx): void {
  g.save();
  g.fillStyle = '#000';
  g.beginPath();
  g.ellipse(360, 600, 118, 44, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(474, 620, 22, 22, 0, 0, TAU);
  g.fill();
  g.restore();
}

/** 地平线微光（象脚下远处的热霾，极淡）。 */
export function heatHaze(c: CanvasCtx, t: number): void {
  const y = HZ - 8 + Math.sin(t * 0.9) * 1.5;
  const rg = c.createLinearGradient(0, y - 14, 0, y + 14);
  rg.addColorStop(0, 'rgba(250,240,210,0)');
  rg.addColorStop(0.5, 'rgba(250,240,210,.14)');
  rg.addColorStop(1, 'rgba(250,240,210,0)');
  c.fillStyle = rg;
  c.fillRect(520, y - 14, 420, 28);
}
