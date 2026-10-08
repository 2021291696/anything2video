// 《墨虾》画面部件：窗框/案面笔触表、远山/朱日/雾带、竹、虾（齐白石参数）、水纹、题跋、窗前小鸟。
// 笔墨引擎技法借鉴 huashu-art-motion 17_ink (MIT, alchaincyf), TSX 重写（编舞词汇+参数表移植）。
// 管线纪律：纸是底、墨只往上加、大面积留白（虾游的水 = 不画的那片纸）。
import {clamp, lerp, ss, type Pt} from './ink';
import {inkBrush} from './InkBrush';
import {leafStroke} from './LeafStroke';
import {inkWash, blankOut} from './InkWash';
import {TONE} from './ink';

export type Ctx = CanvasRenderingContext2D;

// ---------------------------------------------------------------- 窗框/案面笔触表（w14-18 dry.45-.6 / 案面 w22 / 地线 w5 dry.85 tone.35）
export interface StrokeSpec { p: Pt[]; w: number; d: number; l: number; dry: number; tone?: number }

export const WIN: StrokeSpec[] = [
  {p: [[306, 80], [472, 74], [634, 82]], w: 12, d: 0.06, l: 0.18, dry: 0.55},
  {p: [[316, 70], [312, 230], [318, 384]], w: 11, d: 0.14, l: 0.18, dry: 0.5},
  {p: [[624, 72], [628, 240], [622, 382]], w: 10, d: 0.22, l: 0.18, dry: 0.6},
  {p: [[300, 378], [468, 372], [644, 380]], w: 13, d: 0.3, l: 0.2, dry: 0.45},
  {p: [[330, 96], [372, 96], [372, 140]], w: 3.5, d: 0.42, l: 0.12, dry: 0.3},
  {p: [[606, 96], [564, 96], [564, 140]], w: 3.5, d: 0.47, l: 0.12, dry: 0.3},
  {p: [[330, 360], [372, 360], [372, 318]], w: 3.5, d: 0.52, l: 0.12, dry: 0.3},
  {p: [[606, 360], [564, 360], [564, 318]], w: 3.5, d: 0.57, l: 0.12, dry: 0.3},
];
export const TABLE: StrokeSpec[] = [
  {p: [[560, 552], [780, 544], [1020, 552]], w: 16, d: 0.6, l: 0.22, dry: 0.5},
  {p: [[580, 572], [790, 578], [1004, 572]], w: 5, d: 0.74, l: 0.16, dry: 0.4},
  {p: [[608, 576], [612, 660], [604, 716]], w: 9.5, d: 0.8, l: 0.16, dry: 0.65},
  {p: [[972, 576], [968, 668], [978, 716]], w: 9.5, d: 0.86, l: 0.16, dry: 0.65},
  {p: [[618, 592], [664, 612], [716, 602]], w: 4, d: 0.92, l: 0.12, dry: 0.4},
  {p: [[966, 592], [922, 612], [876, 602]], w: 4, d: 0.96, l: 0.12, dry: 0.4},
  {p: [[220, 712], [600, 704], [1000, 714], [1180, 708]], w: 4, d: 1.04, l: 0.2, dry: 0.85, tone: TONE.zhong * 0.58},
];
/** 窗内净区（远山/朱日/雾带/小鸟共用 clip） */
export const WINBOX = {x: 306, y: 74, w: 328, h: 306};

export function drawStrokeTable(c: Ctx, table: StrokeSpec[], rv: number[]): void {
  table.forEach((s, i) => {
    const reveal = rv[i] ?? 0;
    if (reveal <= 0) return;
    inkBrush(c, s.p, {w: s.w, dry: s.dry, seed: 10 + i, reveal, tone: s.tone ?? 0.88, head: 0.1, tail: 0.45, bristles: 6});
  });
}

// ---------------------------------------------------------------- 远山 / 朱日 / 雾带（窗内）
export function mountains(g: Ctx): void {
  g.save();
  g.beginPath(); g.rect(WINBOX.x, WINBOX.y, WINBOX.w, WINBOX.h); g.clip();
  const ridge = (y0: number, amp: number, f: number, seed: number): Pt[] => {
    const pts: Pt[] = [];
    for (let x = WINBOX.x - 20; x <= WINBOX.x + WINBOX.w + 20; x += 8) {
      const n = Math.sin(x * f * 7.3 + seed * 11.7) * 0.5 + Math.sin(x * f * 17.1 + seed * 4.3) * 0.3 + Math.sin(x * f * 31 + seed) * 0.2;
      const bump = Math.exp(-Math.pow((x - (WINBOX.x + 150 + seed * 60)) / 90, 2));
      pts.push([x, y0 - amp * (0.5 + 0.5 * n) - amp * 0.6 * bump]);
    }
    return pts;
  };
  const fill = (pts: Pt[], a: number, y1: number): void => {
    const gr = g.createLinearGradient(0, Math.min(...pts.map((p) => p[1])), 0, y1);
    gr.addColorStop(0, `rgba(40,40,44,${a})`);
    gr.addColorStop(1, 'rgba(40,40,44,0)');
    g.fillStyle = gr;
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.lineTo(WINBOX.x + WINBOX.w + 20, y1);
    g.lineTo(WINBOX.x - 20, y1);
    g.closePath(); g.fill();
  };
  fill(ridge(288, 78, 0.008, 1), 0.32, 372);
  fill(ridge(336, 58, 0.011, 2.4), 0.5, 384);
  g.restore();
}

/** 朱日：multiply 红日，随 grow 微胀 */
export function redSun(c: Ctx, grow: number, alpha: number): void {
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.globalAlpha = alpha;
  c.filter = `blur(${(2 + grow * 3).toFixed(2)}px)`;
  c.fillStyle = '#d8553f';
  c.beginPath(); c.arc(560, 158, 21 + grow * 3, 0, Math.PI * 2); c.fill();
  c.filter = 'none';
  c.restore();
}

/** 雾带：纸色横带 150-270px/s 左移，远山时隐时现 */
export function fogBands(c: Ctx, lt: number, strength: number): void {
  c.save();
  c.beginPath(); c.rect(WINBOX.x, WINBOX.y, WINBOX.w, WINBOX.h); c.clip();
  c.filter = 'blur(14px)';
  const bands: Array<[number, number, number]> = [[188, 36, 0], [244, 28, 1], [300, 24, 2], [346, 26, 3], [222, 22, 4]];
  bands.forEach(([y, h, k]) => {
    const span = WINBOX.w + 560;
    const x = WINBOX.x + span - ((lt * (185 + k * 55) + k * 230) % span);
    c.fillStyle = `rgba(242,234,214,${(0.85 * strength).toFixed(3)})`;
    c.beginPath(); c.ellipse(x, y, 210, h, 0, 0, Math.PI * 2); c.fill();
  });
  c.filter = 'none';
  c.restore();
}

/** 窗前掠过的小鸟：两笔翅 + 身 + 白眼点（每 0.12s 扇一次） */
export function bird(c: Ctx, lt: number): void {
  const u = lt - 3.7;
  if (u < 0 || u > 2.2) return;
  const bx = 640 - u * 400, by = 300 - Math.sin(lt * 3) * 22;
  const fl = Math.sin(lt * 52);
  c.save();
  c.beginPath(); c.rect(WINBOX.x, WINBOX.y, WINBOX.w, WINBOX.h); c.clip();
  c.fillStyle = 'rgba(14,12,10,0.9)';
  c.beginPath(); c.ellipse(bx, by, 9, 5, -0.2, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(bx - 9, by - 3, 4, 0, Math.PI * 2); c.fill();
  leafStroke(c, bx - 2, by - 2, -1.2 - fl * 0.7, 24, 8, 0.9);
  leafStroke(c, bx + 3, by - 1, -0.5 - fl * 0.5, 20, 7, 0.75);
  // 眼白：destination-out 挖纸（留白＝露纸，不画白颜料）
  blankOut(c, (cc) => {
    cc.beginPath(); cc.arc(bx - 10.5, by - 4, 1.7, 0, Math.PI * 2); cc.fill();
  });
  c.restore();
}

// ---------------------------------------------------------------- 竹（右上斜入，随风摆）
const BAMBOO_BASE: Pt = [1196, 26];
const BAMBOO_NODES: Pt[] = [[1196, 26], [1122, 106], [1052, 171], [982, 224], [912, 268]];

export function bamboo(c: Ctx, t: number, segRv: number[], leafRv: number[]): void {
  const sw = Math.sin(t * 2.9) * 0.145 + Math.sin(t * 6.1 + 1) * 0.03;
  const rot = (x: number, y: number, k: number): Pt => {
    const a = sw * k, dx = x - BAMBOO_BASE[0], dy = y - BAMBOO_BASE[1];
    return [BAMBOO_BASE[0] + dx * Math.cos(a) - dy * Math.sin(a), BAMBOO_BASE[1] + dx * Math.sin(a) + dy * Math.cos(a)];
  };
  // 主枝分节：每节一笔，节间留白
  for (let i = 0; i < BAMBOO_NODES.length - 1; i++) {
    const a = rot(BAMBOO_NODES[i][0], BAMBOO_NODES[i][1], i / 4);
    const b = rot(BAMBOO_NODES[i + 1][0], BAMBOO_NODES[i + 1][1], (i + 1) / 4);
    const q0 = 0.04;
    const A: Pt = [lerp(a[0], b[0], q0), lerp(a[1], b[1], q0)];
    const B: Pt = [lerp(a[0], b[0], 0.94), lerp(a[1], b[1], 0.94)];
    const rv = segRv[i] ?? 0;
    if (rv <= 0) continue;
    inkBrush(c, [A, [lerp(A[0], B[0], 0.5), lerp(A[1], B[1], 0.5)], B], {
      w: 9, tone: 0.5, dry: 0.3, seed: 60 + i, reveal: rv, head: 0.06, tail: 0.1, bristles: 5,
    });
  }
  // 叶：个字/介字组，浓墨，随风颤
  const groups: Array<[number, number, number]> = [[2, -0.2, 0], [3, 0.4, 1], [4, -0.9, 2], [3, 2.2, 3], [4, 0.9, 4]];
  groups.forEach(([ni, a0, gi]) => {
    const np = BAMBOO_NODES[Math.min(BAMBOO_NODES.length - 1, ni)];
    const p = rot(np[0], np[1], ni / 4);
    const flut = Math.sin(t * 7 + gi * 1.3) * 0.34;
    const rv = leafRv[gi] ?? 0;
    if (rv <= 0) return;
    [[0, 1], [0.45, 0.82], [-0.42, 0.78]].forEach(([da, ls], k) => {
      leafStroke(c, p[0], p[1], a0 + 1.4 + da + flut * (1 + k * 0.4) + sw * 2, 96 * ls * rv, 12, 0.86);
    });
  });
}

// ---------------------------------------------------------------- 齐白石虾（6 节淡墨 + 焦墨头胸甲 + 须行波）
export interface ShrimpRv {
  wash: number; seg: number[]; tail: number; head: number; eye: number; whisk: number; claw: number; leg: number;
}

export function shrimpWashFn(x: number, y: number, s: number): (g: Ctx) => void {
  return (g: Ctx): void => {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = 'rgba(30,28,26,0.42)';
    g.beginPath(); g.ellipse(4, 2, 52, 20, -0.08, 0, Math.PI * 2); g.fill();
    g.restore();
  };
}

export function shrimp(c: Ctx, x: number, y: number, ang: number, s: number, t: number, ph: number, rv: ShrimpRv, whiskBoost = 1): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);
  const flex = Math.sin(t * 7 + ph) * 0.055;
  // ---- 身体：6 节淡墨，缓弯 S 弧（齐白石：节节分明、淡墨透明叠） ----
  let px = 8, py = -2, a = 0.1;
  const segs: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 6; i++) {
    a += 0.115 + flex;
    const l = 11.5 - i * 0.9;
    px += Math.cos(a) * l;
    py += Math.sin(a) * l;
    segs.push([px, py, a, 8.2 - i * 0.62]);
  }
  segs.forEach(([sx, sy, sa, sw], i) => {
    const rvS = rv.seg[i] ?? 0;
    if (rvS <= 0) return;
    c.save();
    c.globalAlpha = rvS;
    c.fillStyle = `rgba(32,30,28,${(0.16 + i * 0.035).toFixed(3)})`;
    c.beginPath(); c.ellipse(sx, sy, 8.6, sw, sa + 0.1, 0, Math.PI * 2); c.fill();
    // 节界：只在腹侧描一道淡墨弧（齐白石的「节」）
    c.strokeStyle = `rgba(24,22,20,${(0.28 + i * 0.03).toFixed(3)})`;
    c.lineWidth = 1.7;
    c.beginPath(); c.ellipse(sx, sy, 8.6, sw, sa + 0.1, 0.35, 2.1); c.stroke();
    // 背脊一道更淡的弧（甲壳受光）
    c.strokeStyle = 'rgba(20,18,16,0.16)';
    c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(sx, sy, 8.6, sw, sa + 0.1, -2.5, -0.7); c.stroke();
    c.restore();
  });
  // ---- 尾扇：三笔两头尖 ----
  if (rv.tail > 0) {
    const tl = segs[5];
    [-0.42, 0.05, 0.5].forEach((d) => leafStroke(c, tl[0], tl[1], tl[2] + d + 0.35, 14, 5.5, 0.38 * rv.tail));
  }
  // ---- 头胸甲：楔形淡墨一块（杧果形），前缘一道焦墨竖笔 ----
  if (rv.head > 0) {
    c.save();
    c.globalAlpha = rv.head;
    c.fillStyle = 'rgba(32,30,28,0.26)';
    c.beginPath();
    c.moveTo(-36, 6);
    c.quadraticCurveTo(-30, -14, -10, -13);
    c.quadraticCurveTo(4, -12, 8, -3);
    c.quadraticCurveTo(4, 8, -10, 12);
    c.quadraticCurveTo(-28, 15, -36, 6);
    c.closePath();
    c.fill();
    // 甲面一道淡墨弧（体积）
    c.strokeStyle = 'rgba(24,22,20,0.2)';
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-28, 8); c.quadraticCurveTo(-16, 12, -4, 9); c.stroke();
    // 前缘焦墨（虾头的「重」）
    c.strokeStyle = 'rgba(10,10,10,0.88)';
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(-34, 5); c.quadraticCurveTo(-33, -4, -26, -11); c.stroke();
    c.restore();
  }
  // ---- 眼：两粒焦墨点，顶在甲前上缘（齐白石：眼在甲上平伸） ----
  if (rv.eye > 0) {
    c.save();
    c.globalAlpha = rv.eye;
    c.fillStyle = 'rgba(8,8,8,0.95)';
    c.beginPath(); c.arc(-27, -13, 2.1, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(-21.5, -15, 2.1, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // ---- 须：两长两短，行波（须是活的——hero 段波幅 ×1.5） ----
  if (rv.whisk > 0) {
    c.lineCap = 'round';
    ([[-1, 112, 0.9], [1, 96, 1.4], [-1, 38, 2.1], [1, 33, 2.8]] as Array<[number, number, number]>).forEach(([sg, L, q], wi) => {
      c.strokeStyle = `rgba(10,10,10,${(0.72 - wi * 0.08) * rv.whisk})`;
      c.lineWidth = wi < 2 ? 1.05 : 0.9;
      c.beginPath();
      c.moveTo(-30, -6);
      const n = 12;
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        const wav = Math.sin(t * 6.5 + q + u * 4) * 8.5 * u * whiskBoost;
        c.lineTo(-30 - u * L * rv.whisk, -6 + sg * u * L * (wi < 2 ? 0.16 : 0.3) * rv.whisk + wav * rv.whisk);
      }
      c.stroke();
    });
  }
  // ---- 钳（螯）：两支，向前（游动方向）平伸，臂三节可见 + 钳附臂端 ----
  if (rv.claw > 0) {
    c.save();
    c.globalAlpha = rv.claw;
    ([[-0.02, 0], [0.16, 1]] as Array<[number, number]>).forEach(([da, k]) => {
      c.strokeStyle = 'rgba(12,10,10,0.74)';
      c.lineWidth = 1.9;
      c.lineCap = 'round';
      const sw2 = Math.sin(t * 4 + k * 2 + ph) * 0.18;
      let qx = -6, qy = 8;
      c.beginPath(); c.moveTo(qx, qy);
      ([[16, 2.95], [14, 2.8], [10, 2.7]] as Array<[number, number]>).forEach(([l, aa]) => {
        qx += Math.cos(aa + da + sw2) * l;
        qy += Math.sin(aa + da + sw2) * l;
        c.lineTo(qx, qy);
      });
      c.stroke();
      // 钳：附在臂端、顺游动方向的泪滴形
      c.fillStyle = 'rgba(12,10,10,0.7)';
      c.beginPath(); c.ellipse(qx - 4, qy + 1.5, 5.4, 2.2, 2.85 + da, 0, Math.PI * 2); c.fill();
    });
    c.restore();
  }
  // ---- 腿：五条，腹下划水 ----
  if (rv.leg > 0) {
    c.save();
    c.globalAlpha = rv.leg;
    c.strokeStyle = 'rgba(20,20,20,0.5)';
    c.lineWidth = 1.3;
    for (let i = 0; i < 5; i++) {
      const sg = segs[Math.min(5, i)];
      c.beginPath();
      c.moveTo(sg[0] - 1, sg[1] + 4);
      c.lineTo(sg[0] - 6 + Math.sin(t * 13 + i) * 2.2, sg[1] + 15);
      c.stroke();
    }
    c.restore();
  }
  c.restore();
}

// ---------------------------------------------------------------- 水纹（留白处的水：清墨弧 + 涟漪环）
/** 常态两道横漂水纹 + 涟漪环（hero 段加密，定帧段微漾） */
export function waterRipples(c: Ctx, f: number, sx: number, sy: number, boost: number): void {
  c.save();
  c.strokeStyle = `rgba(40,38,34,${0.2 * boost})`;
  c.lineWidth = 1.7;
  // 三道短弧水纹，随虾身横漂
  for (let k = 0; k < 3; k++) {
    const dx = ((f * (0.5 + k * 0.14) + k * 130) % 260) - 130;
    const y = sy + 46 + k * 26 - k * 8;
    const x = sx - 60 + dx;
    c.beginPath();
    c.ellipse(x, y, 40 + k * 10, 6, 0, Math.PI * 0.12, Math.PI * 0.88);
    c.stroke();
  }
  // 涟漪环：每 46 帧一圈、周期 138 帧循环，从虾腹下扩出
  for (let r = 0; r < 3; r++) {
    const cyc = f - (176 + r * 46);
    if (cyc < 0) continue;
    const age = (cyc % 118) / 54;
    if (age >= 1) continue;
    const alpha = 0.3 * (1 - age) * boost;
    const rr = 30 + age * 104;
    c.strokeStyle = `rgba(40,38,34,${alpha.toFixed(3)})`;
    c.lineWidth = 1.5;
    c.beginPath();
    c.ellipse(sx + 8, sy + 40, rr, rr * 0.24, 0, Math.PI * 0.08, Math.PI * 0.92);
    c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------- 题跋（竖排：墨虾 / 丙午秋日）
export const INSCRIPTION = {main: ['墨', '虾'], sub: ['丙', '午', '秋', '日']} as const;
export const INSCRIPTION_X = 150;
export const INSCRIPTION_MAIN_Y = 118;
export const INSCRIPTION_MAIN_GAP = 64;
export const INSCRIPTION_SUB_Y = 268;
export const INSCRIPTION_SUB_GAP = 34;

export function inscription(c: Ctx, mainRv: number[], subRv: number[]): void {
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = '600 52px "Noto Serif SC"';
  INSCRIPTION.main.forEach((ch, i) => {
    const rv = mainRv[i] ?? 0;
    if (rv <= 0) return;
    c.save();
    c.globalAlpha = 0.94 * rv;
    c.fillStyle = 'rgba(22,18,14,1)';
    c.fillText(ch, INSCRIPTION_X, INSCRIPTION_MAIN_Y + i * INSCRIPTION_MAIN_GAP + (1 - rv) * -6);
    c.restore();
  });
  c.font = '500 24px "Noto Serif SC"';
  INSCRIPTION.sub.forEach((ch, i) => {
    const rv = subRv[i] ?? 0;
    if (rv <= 0) return;
    c.save();
    c.globalAlpha = 0.86 * rv;
    c.fillStyle = 'rgba(40,34,28,1)';
    c.fillText(ch, INSCRIPTION_X, INSCRIPTION_SUB_Y + i * INSCRIPTION_SUB_GAP + (1 - rv) * -4);
    c.restore();
  });
  c.restore();
}

// ---------------------------------------------------------------- 淡墨晕层包装（供 Scene 用 scratch）
export function washLayer(
  c: Ctx, scratch: HTMLCanvasElement, grow: number,
  fn: (g: Ctx) => void, o: {blur?: number; halo?: number; haloA?: number; alpha?: number} = {},
): void {
  inkWash(c, scratch, clamp(grow), fn, o);
}

/** 负形挖白（BlankOut 的直接调用样例：虾须后方的空气感留白） */
export function carveBlank(c: Ctx, x: number, y: number, r: number): void {
  blankOut(c, (cc) => {
    cc.fillStyle = '#000';
    cc.beginPath();
    cc.arc(x, y, r, 0, Math.PI * 2);
    cc.fill();
  });
}

export const smooth = (v: number): number => ss(0, 1, v);
