// 旦角皮影 —— shadow-play 签名③⑤⑦⑧的主体件：空脸+铆钉关节+10fps 步进+杆操+飘带铰链+团扇白镂空。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）references/风格配方/34_shadowpuppet.md 与
// scripts/engine/scenes/34_shadowpuppet.js（195 行）的旦角机制与参数——Remotion(React+TSX) 重写，零整段拷贝。
import {PAL, type CanvasCtx, type Pt} from './types';
import {clamp, lerp, stepT, ease} from './noise';
import {piece, sprite, blit, smooth, taper, rotPt, kDots, kFlowers, kClouds, kLines, rivet, rod, chain, stampLayer, type Sprite} from './leather';

export type Pose = {
  f: number; // 1 起帧号
  px: number; py: number; s: number; // 世界落点（脚底）与缩放
  cup: number; // 团扇抬起进度 0→1（对应配方 choreo 的 cup）
  visible: boolean;
};

/** 旦角出退场编排：f118-150 左侧幕滑入，f300-336 退出左侧（收戏「皮人归匣」）。 */
export function danPose(f: number): Pose {
  const inK = ease((f - 118) / 30);
  const outK = f < 300 ? 0 : ease((f - 300) / 34);
  const px = lerp(-130, 400, inK) + lerp(0, -540, outK);
  const cup = 0.5 - 0.5 * Math.cos(clamp((f - 122) / 30) * Math.PI);
  const visible = f >= 118 && f < 336 && !(f >= 300 && outK >= 0.999);
  return {f, px, py: 618, s: 0.72, cup, visible};
}

/** 画旦角：scratch 层合并皮件（每帧只做变换），铆钉一并印层，杆画到幕布。 */
export function drawDan(g: CanvasCtx, c: CanvasCtx, p: Pose): boolean {
  if (!p.visible) return false;
  const ts = stepT((p.f - 1) / 30, 10); // 签名③：杆操步进 10fps 全场一致
  const ls = (p.f - 1) / 30;
  const sway = 0.012 * Math.sin(ts * 4.4);
  g.save();
  g.translate(p.px, p.py);
  g.rotate(sway);
  g.scale(p.s, p.s);

  // ---- 远侧袖（绿）+ 皮白手（身后层）----
  blit(g, piece('dan_farSleeve', taper([-30, -352], [-76, -306], 28, 20),
    {x: -96, y: -370, w: 86, h: 82}, PAL.grn, (k) => kClouds(k, -66, -350, -34, -314, 24), 4));
  blit(g, piece('dan_farHand', (() => { const q = new Path2D(); q.ellipse(-84, -298, 10, 8, 0.5, 0, 7); return q; })(),
    {x: -98, y: -310, w: 28, h: 24}, PAL.tan, null, 3));

  // ---- 裙（绿，竖褶刻线 + 下摆鱼子 + 侧团花）----
  const skirt = smooth([[-50, -298], [-66, -200], [-84, -60], [-46, -4], [42, -4], [78, -52], [60, -200], [46, -298]]);
  blit(g, piece('dan_skirt', skirt, {x: -92, y: -306, w: 178, h: 318}, PAL.grn, (k) => {
    kLines(k, [[[-40, -280], [-52, -30]], [[-8, -286], [-14, -12]], [[26, -282], [24, -10]], [[52, -260], [56, -50]]], 3.5);
    kDots(k, -78, -46, 72, -12, 14, 3.2);
    kFlowers(k, 30, -240, 62, -140, 38, 5);
  }));

  // ---- 飘带（签名⑦：4 节铰链，0.3sin(7ts−0.9i)+0.38 鞭梢滞后；画在裙后上衣前，腰际垂出）----
  const rbEnds = chain(g, ts, [-46, -298], 1.92, [
    {len: 56, w0: 18, w1: 14, key: 'dan_rb0', col: PAL.yel},
    {len: 50, w0: 14, w1: 11, key: 'dan_rb1', col: PAL.yel},
    {len: 44, w0: 11, w1: 8, key: 'dan_rb2', col: PAL.yel},
    {len: 38, w0: 8, w1: 6, key: 'dan_rb3', col: PAL.tan},
  ], 0.3);

  // ---- 上衣（红，团花）+ 襟边（黄，鱼子）----
  const torso = smooth([[-38, -360], [-44, -325], [-48, -296], [44, -296], [40, -325], [34, -360], [16, -386], [-18, -386]]);
  blit(g, piece('dan_torso', torso, {x: -56, y: -394, w: 108, h: 106}, PAL.red, (k) => kFlowers(k, -34, -372, 30, -302, 34, 5)));
  blit(g, piece('dan_collar', smooth([[-20, -386], [0, -372], [18, -386], [15, -350], [0, -338], [-16, -350]]),
    {x: -26, y: -394, w: 52, h: 64}, PAL.yel, (k) => kDots(k, -14, -380, 12, -350, 11, 2.4), 3));

  // ---- 头（单件：发/髻/刘海/头花/簪 → 空脸 → 轮廓+凤眼柳叶眉点唇），绕颈铆钉微转 ----
  const nk: Pt = [0, -358];
  const hTilt = 0.06 * Math.sin(ts * 3);
  g.save();
  g.translate(nk[0], nk[1]);
  g.rotate(hTilt);
  g.translate(-nk[0], -nk[1]);
  blit(g, headSprite());
  // 步摇珠串（随头动甩，直接画不缓存）
  const sw = 0.4 * Math.sin(ts * 9);
  g.fillStyle = PAL.yel;
  g.strokeStyle = PAL.edge;
  g.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) {
    const bx = 38 + Math.sin(sw) * k * 10, by = -426 + Math.cos(sw) * k * 10;
    g.beginPath();
    g.arc(bx, by, 4.6, 0, 7);
    g.fill();
    g.stroke();
  }
  g.restore();

  // ---- 近侧臂：上臂/前臂/手三件刚体；手腕松，会甩（签名③ dangle 公式，扇抬起时收敛）----
  const S: Pt = [30, -350], E: Pt = [56, -316], Hd: Pt = [76, -288];
  blit(g, piece('dan_upArm', taper(S, E, 26, 22), {x: 14, y: -366, w: 58, h: 66}, PAL.red, (k) => kClouds(k, 24, -350, 62, -318, 26)));
  blit(g, piece('dan_foreArm', taper(E, Hd, 24, 26), {x: 42, y: -336, w: 50, h: 62}, PAL.red, (k) => kFlowers(k, 50, -322, 82, -290, 30, 4)));
  const dangle = 0.35 * Math.sin(ls * 11) * (1 - p.cup * 0.6);
  g.save();
  g.translate(Hd[0], Hd[1]);
  g.rotate(dangle);
  g.translate(-Hd[0], -Hd[1]);
  // 手：空皮（整块 destination-out 只留轮廓——「手也是空的」）
  const hand = new Path2D();
  hand.ellipse(Hd[0] + 2, Hd[1] + 4, 15, 11, 0.5, 0, 7);
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fill(hand);
  g.restore();
  g.strokeStyle = PAL.edge;
  g.lineWidth = 2.6;
  g.stroke(hand);
  // 团扇（签名⑧：白=镂空——扇面整块 destination-out 只留皮边与扇柄），抬起进度 cup：
  // cup=0 垂于手右下（fanA 1.25），cup=1 沿手向右上扬起（-0.5）——扇面全程离躯干，杜绝焦点区 multiply 重叠发黑
  const fanA = 1.25 - p.cup * 1.75;
  g.save();
  g.translate(Hd[0], Hd[1]);
  g.rotate(fanA);
  g.translate(-Hd[0], -Hd[1]);
  blit(g, fanSprite(Hd));
  g.restore();
  g.restore();

  // ---- 铆钉（印层前画上：颈/肩/肘/腕/飘带根）----
  rivet(g, nk[0], nk[1]);
  rivet(g, S[0], S[1], 6);
  rivet(g, E[0], E[1], 6);
  rivet(g, Hd[0], Hd[1], 5);
  rivet(g, -46, -298, 5);
  g.restore();

  // ---- 印幕（签名⑥：blur6 α0.28 偏移虚影 + 本体，multiply）----
  stampLayer(c, g.canvas, 7, 5);

  // ---- 杆（幕后操纵：主杆在颈、手杆在腕——向下、向外，不跨过别的角色）----
  const w = (q: Pt): Pt => {
    const r = rotPt([q[0] * p.s, q[1] * p.s], [0, 0], sway);
    return [r[0] + p.px, r[1] + p.py];
  };
  rod(c, w(rotPt(nk, [0, 0], hTilt)), [p.px + 180, 760]);
  rod(c, w(Hd), [p.px + 60, 760]);
  return true;
}

/** 头件（自由 sprite）：发/髻云纹 → 签名⑤ 空脸（destination-out 整脸）→ 皮边+凤眼柳叶眉点唇 → 头花+簪。 */
function headSprite(): Sprite {
  return sprite('dan_head', {x: -60, y: -472, w: 130, h: 122}, (k) => {
    // 发廓（颅+髻，琥珀皮）
    const hair = new Path2D();
    hair.ellipse(0, -404, 44, 40, 0, 0, 7);
    const bun = new Path2D();
    bun.arc(34, -442, 15, 0, 7);
    k.fillStyle = PAL.amb;
    k.fill(hair);
    k.fill(bun);
    // 签名⑤ 空脸：destination-out 整张脸，只描轮廓
    const face = new Path2D();
    face.ellipse(2, -398, 30, 34, 0, 0, 7);
    k.save();
    k.globalCompositeOperation = 'destination-out';
    k.fill(face);
    k.restore();
    // 脸轮廓（深褐）+ 皮边（琥珀，clip 内粗描回补）
    k.strokeStyle = PAL.edge;
    k.lineWidth = 3;
    k.stroke(face);
    k.save();
    k.clip(face);
    k.strokeStyle = PAL.amb;
    k.lineWidth = 8;
    k.stroke(face);
    // 发上云纹刻（destination-out）
    k.globalCompositeOperation = 'destination-out';
    kClouds(k, -34, -434, 32, -392, 22, 11);
    k.restore();
    // 头发外缘补皮边+外轮廓（carve 云纹可能啃到发廓）
    k.save();
    k.clip(hair);
    k.strokeStyle = PAL.amb;
    k.lineWidth = 8;
    k.stroke(hair);
    k.restore();
    k.strokeStyle = PAL.edge;
    k.lineWidth = 2.6;
    k.stroke(hair);
    k.stroke(bun);
    // 五官：凤眼（细长挑梢+下眼线+点睛）、柳叶眉、点唇——全是皮上留的线（读得清的粗细）
    const ex = -2, ey = -402;
    k.strokeStyle = PAL.edge;
    k.lineWidth = 3.6;
    k.beginPath();
    k.moveTo(ex - 16, ey + 1);
    k.quadraticCurveTo(ex, ey - 9, ex + 20, ey - 5);
    k.stroke();
    k.lineWidth = 2.8;
    k.beginPath();
    k.moveTo(ex - 13, ey + 3);
    k.quadraticCurveTo(ex, ey + 6, ex + 15, ey - 1);
    k.stroke();
    k.fillStyle = PAL.edge;
    k.beginPath();
    k.arc(ex - 2, ey - 1, 3.2, 0, 7);
    k.fill();
    k.lineWidth = 3;
    k.beginPath();
    k.moveTo(ex - 16, ey - 18);
    k.quadraticCurveTo(ex - 2, ey - 24, ex + 14, ey - 19);
    k.stroke();
    k.fillStyle = PAL.red;
    k.beginPath();
    k.arc(2, -374, 4.6, 0, 7);
    k.fill();
    // 头花（红，六瓣）+ 蓝簪
    const hx = -26, hy = -436;
    k.fillStyle = PAL.red;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      k.beginPath();
      k.ellipse(hx + Math.cos(a) * 10, hy + Math.sin(a) * 10, 7, 4.4, a, 0, 7);
      k.fill();
    }
    k.fillStyle = PAL.yel;
    k.beginPath();
    k.arc(hx, hy, 4, 0, 7);
    k.fill();
    k.strokeStyle = PAL.blu;
    k.lineWidth = 4.6;
    k.beginPath();
    k.moveTo(30, -430);
    k.lineTo(56, -462);
    k.stroke();
    k.strokeStyle = PAL.edge;
    k.lineWidth = 1.4;
    k.stroke();
  });
}

/** 团扇：扇心在手右前侧（离躯干），扇面整块镂空（白=镂空）+ 皮边环带 + 扇柄。 */
function fanSprite(Hd: Pt): Sprite {
  const cx = Hd[0] + 46, cy = Hd[1] + 2;
  return sprite('dan_fan', {x: Hd[0] + 2, y: Hd[1] - 44, w: 90, h: 92}, (k) => {
    const rim = new Path2D();
    rim.arc(cx, cy, 38, 0, 7);
    k.fillStyle = PAL.blu;
    k.fill(rim);
    const face = new Path2D();
    face.arc(cx, cy, 32, 0, 7);
    k.save();
    k.globalCompositeOperation = 'destination-out';
    k.fill(face); // 扇面整块镂空（签名⑧）
    k.restore();
    // 皮边环带上的花刻（destination-out）
    k.save();
    k.clip(rim);
    k.globalCompositeOperation = 'destination-out';
    kFlowers(k, cx - 34, cy - 34, cx + 34, cy + 34, 30, 5);
    k.restore();
    // 柄（琥珀）+ 外轮廓
    const handle = new Path2D();
    handle.rect(cx - 32, cy - 3, 24, 7);
    k.fillStyle = PAL.amb;
    k.fill(handle);
    k.strokeStyle = PAL.edge;
    k.lineWidth = 2.6;
    k.stroke(rim);
    k.stroke(handle);
  });
}
