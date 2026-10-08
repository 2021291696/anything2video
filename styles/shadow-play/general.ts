// 武将皮影 —— HERO 主体：大靠+靠旗+翎子铰链+翻杆 360°+关节步进打斗+杆操。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）references/风格配方/34_shadowpuppet.md 与
// scripts/engine/scenes/34_shadowpuppet.js 的铰链/杆操机制与参数——Remotion(React+TSX) 重写，零整段拷贝。
import {PAL, type CanvasCtx, type Pt} from './types';
import {clamp, lerp, stepT, ease} from './noise';
import {piece, sprite, blit, smooth, taper, rotPt, kDots, kFlowers, kClouds, kLattice, kLines, rivet, rod, chain, stampLayer, type Sprite} from './leather';

export type GPose = {
  f: number;
  px: number; py: number; s: number;
  flip: number; // 翻杆角 0→-2π（绕前手握点）
  squash: number; // 落定压缩 0→1→0
  pose: number; // 打斗两姿态 0/1（10fps 切换）
  visible: boolean;
};

/** 武将编排：f206-230 右侧入场，f232-250 翻杆（绕前手杆 360°），f250-292 步进打斗，f316-352 下沉归匣。 */
export function generalPose(f: number): GPose {
  const inK = ease((f - 206) / 22);
  const flip = f < 232 ? 0 : f > 250 ? -Math.PI * 2 : -Math.PI * 2 * ease((f - 232) / 18);
  const squash = f >= 250 && f < 258 ? Math.sin(Math.PI * clamp((f - 250) / 8)) : 0;
  const sinkK = f < 316 ? 0 : ease((f - 316) / 34);
  const py = 618 + sinkK * 480;
  const pose = f >= 250 ? Math.floor((f - 250) / 3) % 2 : 0; // 3 帧一换 = 10fps 步进
  const visible = f >= 206 && f < 352 && inK > 0.001 && sinkK < 0.999;
  return {f, px: lerp(1430, 880, inK), py, s: 0.78, flip, squash, pose, visible};
}

/** 前手握点（翻杆轴心，本地坐标）。 */
export const GRIP: Pt = [70, -296];

/** 画武将：scratch 合并皮件 → 印幕；翻杆期加一道大偏移虚影增速度感。 */
export function drawGeneral(g: CanvasCtx, c: CanvasCtx, p: GPose): boolean {
  if (!p.visible) return false;
  const ts = stepT((p.f - 1) / 30, 10); // 签名③：10fps 步进
  const sway = 0.014 * Math.sin(ts * 3.6) + (p.pose ? 0.045 : -0.03); // 打斗两姿态的前倾/后仰
  const poleX = p.pose ? 0.12 : -0.16; // 杆两姿态摆幅

  if (p.flip !== 0 && p.flip > -Math.PI * 2 * 0.97) {
    // 翻杆中的第二道速度虚影（大偏移低 α，仅翻杆中段）
    compose(g, c, p, ts, sway, poleX, 14, 9, 0.12);
  }
  compose(g, c, p, ts, sway, poleX, 8, 5, 1);

  // ---- 杆（主杆在盔顶、手杆在前握点；翻杆时杆随皮件甩——操纵语义）----
  const wp = (q: Pt): Pt => {
    let r: Pt = [q[0] * p.s, q[1] * p.s];
    if (p.flip !== 0) r = rotPt(r, [GRIP[0] * p.s, GRIP[1] * p.s], p.flip);
    r = rotPt(r, [0, 0], sway);
    return [r[0] + p.px, r[1] + p.py];
  };
  rod(c, wp([0, -500]), [p.px + 205, 770]);
  rod(c, wp(GRIP), [p.px + 95, 770]);
  return true;
}

function compose(g: CanvasCtx, c: CanvasCtx, p: GPose, ts: number, sway: number, poleX: number, dx: number, dy: number, alpha: number): void {
  g.save();
  g.globalAlpha = alpha;
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  g.translate(p.px, p.py);
  g.rotate(sway);
  if (p.squash > 0) g.scale(1 + p.squash * 0.04, 1 - p.squash * 0.06);
  g.scale(p.s, p.s);
  if (p.flip !== 0) {
    // 翻杆：整件绕前手握点转 flip（0→-2π）
    g.translate(GRIP[0], GRIP[1]);
    g.rotate(p.flip);
    g.translate(-GRIP[0], -GRIP[1]);
  }

  // ---- 靠旗×4（背上扇开，静态随身体）----
  flagSprites().forEach((sp) => blit(g, sp));

  // ---- 靠甲裙（绿，万字格）+ 战袍（红，团花）+ 腰带（黄，鱼子）----
  blit(g, piece('gen_skirt', smooth([[-56, -238], [-74, -120], [-64, -4], [58, -4], [70, -120], [52, -238]]),
    {x: -82, y: -246, w: 160, h: 254}, PAL.grn, (k) => kLattice(k, -52, -220, 46, -20, 26, 10)));
  blit(g, piece('gen_robe', smooth([[-52, -428], [-64, -380], [-60, -300], [-52, -236], [48, -236], [56, -300], [62, -380], [50, -428], [24, -452], [-26, -452]]),
    {x: -72, y: -460, w: 142, h: 232}, PAL.red, (k) => {
      kFlowers(k, -40, -416, 36, -318, 40, 5);
      kLines(k, [[[-8, -238], [-8, -292]], [[14, -238], [14, -292]]], 3.4);
    }));
  blit(g, piece('gen_belt', smooth([[-56, -292], [-58, -268], [56, -268], [54, -292]]),
    {x: -66, y: -300, w: 130, h: 40}, PAL.yel, (k) => kDots(k, -44, -288, 42, -272, 13, 2.6), 4));
  // 护肩（红，云纹）
  blit(g, piece('gen_shL', (() => { const q = new Path2D(); q.ellipse(-58, -420, 27, 16, 0.3, 0, 7); return q; })(),
    {x: -90, y: -442, w: 64, h: 40}, PAL.red, (k) => kClouds(k, -78, -430, -40, -410, 20), 3));
  blit(g, piece('gen_shR', (() => { const q = new Path2D(); q.ellipse(58, -420, 27, 16, -0.3, 0, 7); return q; })(),
    {x: 26, y: -442, w: 64, h: 40}, PAL.red, (k) => kClouds(k, 40, -430, 78, -410, 20), 3));

  // ---- 头（盔+净角脸谱 单件）+ 翎子×2（签名⑦ 铰链链，小正 curl=梢向上内挑，鞭梢滞后同源）----
  const nk: Pt = [0, -452];
  blit(g, headSprite());
  chain(g, ts, [-30, -480], -2.52, [
    {len: 64, w0: 9, w1: 6, key: 'gen_lg0', col: PAL.amb},
    {len: 54, w0: 6, w1: 4.5, key: 'gen_lg1', col: PAL.amb},
    {len: 46, w0: 4.5, w1: 3.5, key: 'gen_lg2', col: PAL.amb},
  ], 0.2);
  chain(g, ts, [30, -480], -0.62, [
    {len: 64, w0: 9, w1: 6, key: 'gen_rg0', col: PAL.amb},
    {len: 54, w0: 6, w1: 4.5, key: 'gen_rg1', col: PAL.amb},
    {len: 46, w0: 4.5, w1: 3.5, key: 'gen_rg2', col: PAL.amb},
  ], 0.2);

  // ---- 长杆（兵器，穿两手；打斗两姿态绕前手握点摆）+ 后臂/前臂 ----
  blit(g, piece('gen_rearArm', taper([-44, -392], [-60, -318], 26, 20), {x: -76, y: -408, w: 52, h: 106}, PAL.red, (k) => kClouds(k, -70, -390, -44, -330, 24)));
  blit(g, piece('gen_rearFore', taper([-60, -318], [-48, -260], 20, 22), {x: -74, y: -334, w: 42, h: 90}, PAL.red, (k) => kFlowers(k, -70, -312, -40, -272, 26, 4)));
  g.save();
  g.translate(GRIP[0], GRIP[1]);
  g.rotate(poleX);
  g.translate(-GRIP[0], -GRIP[1]);
  blit(g, piece('gen_pole', (() => { const q = new Path2D(); q.rect(-152, -240, 330, 11); return q; })(),
    {x: -158, y: -246, w: 342, h: 23}, PAL.flame, (k) => kLines(k, [[[-120, -234], [120, -242]]], 3), 4));
  // 杆头缨（红）
  blit(g, piece('gen_tassel', (() => { const q = new Path2D(); q.moveTo(178, -238); q.arc(172, -234, 13, 0, 7); return q; })(),
    {x: 154, y: -252, w: 42, h: 40}, PAL.red, (k) => kDots(k, 160, -244, 184, -226, 9, 2.2), 3));
  // 前臂压杆（画在杆上层=握杆）
  blit(g, piece('gen_foreArm', taper([44, -392], [GRIP[0] - 4, GRIP[1] + 8], 26, 24), {x: 28, y: -410, w: 62, h: 130}, PAL.red, (k) => kClouds(k, 40, -386, 80, -322, 26)));
  blit(g, piece('gen_hand', (() => { const q = new Path2D(); q.ellipse(GRIP[0] + 2, GRIP[1] - 4, 15, 11, 0.4, 0, 7); return q; })(),
    {x: GRIP[0] - 20, y: GRIP[1] - 22, w: 42, h: 36}, PAL.tan, null, 3));
  g.restore();

  // ---- 战靴（两姿态错位步）----
  const step = p.pose ? 6 : -6;
  blit(g, piece('gen_bootL', smooth([[-46, -26], [-48, -2], [-10, -2], [-12, -26]]),
    {x: -56, y: -34, w: 54, h: 40}, PAL.darkred, (k) => kDots(k, -42, -22, -16, -6, 11, 2.2), 3));
  g.save();
  g.translate(step, 0);
  blit(g, piece('gen_bootR', smooth([[10, -26], [8, -2], [48, -2], [46, -26]]),
    {x: 0, y: -34, w: 56, h: 40}, PAL.darkred, (k) => kDots(k, 14, -22, 42, -6, 11, 2.2), 3));
  g.restore();

  // ---- 铆钉（颈/双肩/后肘/前握点）----
  rivet(g, nk[0], nk[1]);
  rivet(g, -58, -420, 6);
  rivet(g, 58, -420, 6);
  rivet(g, -60, -318, 5);
  rivet(g, GRIP[0], GRIP[1], 6);
  g.restore();

  // ---- 印幕（签名⑥；翻杆中段加第二道速度虚影）----
  stampLayer(c, g.canvas, dx, dy, alpha);
}

/** 盔+净角脸谱 单件（深红脸=实皮刻线，与旦角空脸对照）。 */
function headSprite(): Sprite {
  return sprite('gen_head', {x: -44, y: -518, w: 88, h: 116}, (k) => {
    // 盔（琥珀，云纹）+ 盔顶缨球（红）
    const helm = new Path2D();
    helm.ellipse(0, -474, 32, 24, 0, 0, 7);
    k.fillStyle = PAL.amb;
    k.fill(helm);
    k.fillStyle = PAL.red;
    k.beginPath();
    k.arc(0, -500, 8, 0, 7);
    k.fill();
    // 脸（深红实皮，净角）
    const face = new Path2D();
    face.ellipse(0, -436, 28, 31, 0, 0, 7);
    k.fillStyle = PAL.darkred;
    k.fill(face);
    // 脸谱刻纹（destination-out：眉骨/颊纹两道）
    k.save();
    k.globalCompositeOperation = 'destination-out';
    kClouds(k, -26, -494, 24, -466, 18, 17);
    kLines(k, [[[-18, -442], [-9, -434]], [[18, -442], [9, -434]], [[-7, -414], [7, -414]]], 3.2);
    k.restore();
    // 盔檐 + 脸外轮廓
    k.strokeStyle = PAL.edge;
    k.lineWidth = 2.6;
    k.stroke(helm);
    k.stroke(face);
    k.beginPath();
    k.moveTo(-34, -458);
    k.quadraticCurveTo(0, -447, 34, -458);
    k.lineWidth = 4.4;
    k.stroke();
    // 眼（皮白点）+ 长髯（刻线）
    k.fillStyle = PAL.tan;
    k.beginPath();
    k.ellipse(-11, -440, 5.6, 3.8, 0.2, 0, 7);
    k.ellipse(11, -440, 5.6, 3.8, -0.2, 0, 7);
    k.fill();
    k.strokeStyle = PAL.edge;
    k.lineWidth = 2.6;
    k.beginPath();
    k.moveTo(-14, -416);
    k.quadraticCurveTo(0, -398, 14, -416);
    k.quadraticCurveTo(0, -410, -14, -416);
    k.fill();
  });
}

/** 靠旗 4 面（杆+旗布，黄红相间万字格），一次性预渲。 */
function flagSprites(): Sprite[] {
  const anchors: Array<{a: number; col: string; key: string}> = [
    {a: -2.95, col: PAL.yel, key: 'flag0'},
    {a: -2.42, col: PAL.red, key: 'flag1'},
    {a: -0.72, col: PAL.yel, key: 'flag2'},
    {a: -0.19, col: PAL.red, key: 'flag3'},
  ];
  const root: Pt = [-8, -438];
  return anchors.map(({a, col, key}) => sprite(key, {x: -175, y: -555, w: 350, h: 270}, (k) => {
    const dir: Pt = [Math.cos(a), Math.sin(a)];
    const per: Pt = [-dir[1], dir[0]];
    const at = (d: number, o: number): Pt => [root[0] + dir[0] * d + per[0] * o, root[1] + dir[1] * d + per[1] * o];
    const p0 = at(36, 0), p1 = at(140, 33), p2 = at(168, 0), p3 = at(140, -33);
    // 旗杆
    k.strokeStyle = PAL.flame;
    k.lineWidth = 5;
    k.beginPath();
    k.moveTo(root[0], root[1]);
    k.lineTo(p2[0], p2[1]);
    k.stroke();
    // 旗布（quad）
    const cloth = new Path2D();
    cloth.moveTo(p0[0], p0[1]);
    cloth.lineTo(p1[0], p1[1]);
    cloth.lineTo(p2[0], p2[1]);
    cloth.lineTo(p3[0], p3[1]);
    cloth.closePath();
    k.fillStyle = col;
    k.fill(cloth);
    k.save();
    k.clip(cloth);
    k.globalCompositeOperation = 'destination-out';
    const cxs = [p0, p1, p2, p3];
    kLattice(k, Math.min(...cxs.map((q) => q[0])), Math.min(...cxs.map((q) => q[1])), Math.max(...cxs.map((q) => q[0])), Math.max(...cxs.map((q) => q[1])), 22, 9);
    k.restore();
    k.strokeStyle = PAL.edge;
    k.lineWidth = 2.6;
    k.stroke(cloth);
  }));
}
