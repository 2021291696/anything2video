// 千军万马虚影 —— HERO 段「杆子一挑」的应答：两马三兵皮影自幕后升起。
// 布局纪律（multiply 重叠变深）：群件全部避开武将焦点柱（x 810-950）与旦角（x 353-447），
// 允许的非焦点边缘轻重叠即皮影「重叠自然变深」的材质证据。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）34_shadowpuppet 的皮件/stamp 机制——TSX 重写，零拷贝。
import {PAL, type CanvasCtx, type Pt} from './types';
import {ease} from './noise';
import {piece, sprite, blit, smooth, taper, kDots, kLattice, kLines, stampLayer, type Sprite} from './leather';

type Unit = {key: string; x: number; y: number; s: number; flip: number; t0: number; build: string};

/** 五件布阵：马（橘）×2 翻面相向，兵（蓝/绿/红）×3 错落——全离两主角焦点柱。 */
const UNITS: Unit[] = [
  {key: 'army_horse0', x: 628, y: 602, s: 0.55, flip: 1, t0: 240, build: 'horse'},
  {key: 'army_sol0', x: 752, y: 594, s: 0.5, flip: 1, t0: 245, build: 'soldier-blu'},
  {key: 'army_sol1', x: 968, y: 586, s: 0.46, flip: 1, t0: 250, build: 'soldier-grn'},
  {key: 'army_horse1', x: 1112, y: 606, s: 0.5, flip: -1, t0: 255, build: 'horse'},
  {key: 'army_sol2', x: 1030, y: 578, s: 0.4, flip: 1, t0: 260, build: 'soldier-red'},
];

/** 群件可见窗口：f240-306 升起驻列，f293-315 随灯暗退散（两窗交叠为快出）。 */
export function armyWindow(f: number): {a: number; units: Array<{u: Unit; k: number}>} {
  if (f < 240 || f > 315) return {a: 0, units: []};
  const out = 1 - ease((f - 293) / 22);
  const units = UNITS.filter((u) => f >= u.t0).map((u) => ({u, k: ease((f - u.t0) / 16) * out}));
  return {a: units.length ? 1 : 0, units};
}

/** 画千军万马：scratch 合并（各件独立升起 alpha/y）→ 一次 stamp（单层 multiply，控合成次数）。 */
export function drawArmy(g: CanvasCtx, c: CanvasCtx, f: number): boolean {
  const w = armyWindow(f);
  if (!w.units.length) return false;
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  for (const {u, k} of w.units) {
    if (k <= 0.004) continue;
    g.save();
    g.globalAlpha = 0.9 * k;
    g.translate(u.x, u.y - (1 - k) * 46);
    g.scale(u.s * u.flip, u.s);
    for (const sp of unitSprites(u.build)) blit(g, sp);
    g.restore();
  }
  g.globalAlpha = 1;
  stampLayer(c, g.canvas, 9, 6);
  return true;
}

// ---------- 马（橘皮：白鞍=镂空，鬃尾刻线，尾 3 节铰链静态姿态） ----------

function horseSprites(): Sprite[] {
  const body = smooth([[-95, -58], [-104, -88], [-72, -106], [-24, -112], [20, -116], [58, -104], [92, -88], [102, -60], [94, -32], [62, -24], [24, -28], [-20, -24], [-62, -28]]);
  const out: Sprite[] = [];
  out.push(piece('horse_body', body, {x: -112, y: -124, w: 222, h: 132}, PAL.org, (k) => {
    kDots(k, -82, -100, 44, -40, 22, 3.6);
    kLines(k, [[[52, -104], [66, -128]], [[62, -98], [80, -118]], [[70, -90], [92, -106]]], 3.6);
  }));
  out.push(piece('horse_neck', taper([44, -98], [88, -150], 30, 17), {x: 26, y: -166, w: 82, h: 78}, PAL.org, (k) => kLines(k, [[[54, -122], [70, -144]]], 3.4)));
  out.push(piece('horse_head', (() => {
    const q = new Path2D();
    q.ellipse(100, -156, 22, 13, -0.32, 0, 7);
    q.moveTo(112, -168);
    q.lineTo(118, -181);
    q.lineTo(123, -166);
    q.closePath();
    return q;
  })(), {x: 72, y: -188, w: 58, h: 46}, PAL.org, null, 3));
  // 白鞍：整块 destination-out 只留皮边（签名⑧ 在群件上的第三处落点）
  out.push(sprite('horse_saddle', {x: -40, y: -128, w: 80, h: 40}, (k) => {
    const rim = new Path2D();
    rim.moveTo(-26, -104);
    rim.quadraticCurveTo(0, -130, 26, -104);
    rim.lineTo(21, -94);
    rim.quadraticCurveTo(0, -116, -21, -94);
    rim.closePath();
    k.fillStyle = PAL.tan;
    k.fill(rim);
    const hole = new Path2D();
    hole.moveTo(-17, -104);
    hole.quadraticCurveTo(0, -120, 17, -104);
    hole.lineTo(14, -99);
    hole.quadraticCurveTo(0, -111, -14, -99);
    hole.closePath();
    k.save();
    k.globalCompositeOperation = 'destination-out';
    k.fill(hole);
    k.restore();
    k.strokeStyle = PAL.edge;
    k.lineWidth = 2;
    k.stroke(rim);
  }));
  // 四腿（高而直，蹄端略外撇）
  ([[ -66, -6 ], [ -38, 3 ], [ 34, 3 ], [ 62, -6 ]] as Array<[number, number]>).forEach(([x, dx], i) => {
    out.push(piece(`horse_leg${i}`, taper([x, -32], [x + dx, 0], 14, 9), {x: Math.min(x, x + dx) - 11, y: -42, w: Math.abs(dx) + 22, h: 52}, PAL.org, null, 3));
  });
  // 尾（3 节，静态下垂姿态——铰链公式给一次定格相位）
  let o: Pt = [-98, -80], ang = 2.55;
  for (let i = 0; i < 3; i++) {
    ang += 0.34;
    const e: Pt = [o[0] + Math.cos(ang) * (30 - i * 4), o[1] + Math.sin(ang) * (30 - i * 4)];
    out.push(piece(`horse_tail${i}`, taper(o, e, 10 - i * 2, 7 - i * 2),
      {x: Math.min(o[0], e[0]) - 6, y: Math.min(o[1], e[1]) - 6, w: Math.abs(e[0] - o[0]) + 12, h: Math.abs(e[1] - o[1]) + 12}, PAL.tan, null, 2.4));
    o = e;
  }
  return out;
}

// ---------- 兵（三色：蓝/绿/红；矛+万字格坎肩） ----------

function soldierSprites(col: string, tag: string): Sprite[] {
  const out: Sprite[] = [];
  out.push(piece(`sol_${tag}_body`, smooth([[-18, -104], [-24, -56], [22, -56], [16, -104]]),
    {x: -32, y: -112, w: 62, h: 64}, col, (k) => kLattice(k, -16, -96, 14, -62, 18, 7)));
  out.push(piece(`sol_${tag}_head`, (() => { const q = new Path2D(); q.arc(0, -122, 15, 0, 7); return q; })(),
    {x: -22, y: -144, w: 44, h: 44}, PAL.tan, (k) => kLines(k, [[[-6, -128], [6, -128]]], 2.4), 3));
  out.push(piece(`sol_${tag}_helm`, (() => { const q = new Path2D(); q.ellipse(0, -132, 16, 8, 0, Math.PI, 0); return q; })(),
    {x: -22, y: -146, w: 44, h: 20}, PAL.amb, null, 2.6));
  ([[ -10, -4 ], [ 10, 4 ]] as Array<[number, number]>).forEach(([x, dx], i) => {
    out.push(piece(`sol_${tag}_leg${i}`, taper([x, -58], [x + dx, 0], 12, 8), {x: Math.min(x, x + dx) - 9, y: -68, w: Math.abs(dx) + 18, h: 76}, col, null, 3));
  });
  out.push(piece(`sol_${tag}_arm`, taper([12, -96], [20, -62], 10, 9), {x: 4, y: -104, w: 26, h: 50}, col, null, 3));
  out.push(piece(`sol_${tag}_spear`, (() => {
    const q = new Path2D();
    q.rect(12, -176, 8, 180);
    q.moveTo(8, -176);
    q.lineTo(16, -196);
    q.lineTo(24, -176);
    q.closePath();
    return q;
  })(), {x: 0, y: -202, w: 32, h: 208}, PAL.flame, null, 3));
  out.push(sprite(`sol_${tag}_flag`, {x: -66, y: -216, w: 84, h: 160}, (k) => {
    // 背旗：杆自身后斜出，旗布挂杆顶（不再悬空）
    k.strokeStyle = PAL.flame;
    k.lineWidth = 3.4;
    k.beginPath();
    k.moveTo(8, -62);
    k.lineTo(-26, -186);
    k.stroke();
    const q = new Path2D();
    q.moveTo(-26, -186);
    q.lineTo(-62, -180);
    q.lineTo(-60, -152);
    q.lineTo(-24, -158);
    q.closePath();
    k.fillStyle = col;
    k.fill(q);
    k.save();
    k.clip(q);
    k.globalCompositeOperation = 'destination-out';
    kDots(k, -58, -182, -26, -156, 12, 2.4);
    k.restore();
    k.strokeStyle = PAL.edge;
    k.lineWidth = 2.2;
    k.stroke(q);
  }));
  return out;
}

function unitSprites(build: string): Sprite[] {
  if (build === 'horse') return horseSprites();
  if (build === 'soldier-blu') return soldierSprites(PAL.blu, 'blu');
  if (build === 'soldier-grn') return soldierSprites(PAL.grn, 'grn');
  return soldierSprites(PAL.red, 'red');
}
