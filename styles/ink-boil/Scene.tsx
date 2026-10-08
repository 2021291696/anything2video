// 《一根火柴的一生》—— ink-boil 风格样片正片（逐帧线沸腾 cel 动画）。
// 编舞词汇移植自 mg-styles-15 demos/05-cel-boil scene.js (MIT, Vincentwei1021), TSX 重写。
// 纪律：全帧 = 一张 cel；drawFrame(f) 纯帧号函数，seeded（同帧渲两次逐像素一致）。
import React from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {drawing, bv, FPS} from './cadence';
import {hs, lerp, clamp, inv, sstep, K, xf, circlePts, mulberry32, boil, spline, type Key, type Pt} from './engine';
import {PAL, REG, type CanvasCtx, type DrawInfo} from './types';
import {inkStroke, inkLoop, fillShape, hatch, edge, dens, Layers} from "./brush";
import {drawTwinkle, drawSpark, speedLinesTrail, speedLinesRadial, drawStarburst, smokeGroup, drawWisp, drawLightPool, drawEmbers, drawPoof} from './fx';
import {SUBS} from '../common/subs';
import {shotFor, boxState, shakeAt, matchPose, flameH, poolR, hopDx, STICK, BOX, TIP_OF, type MatchPose} from './state';
import {drawBox, drawMatch, drawStrikeSmear, drawSpirit, drawSubs, drawTitle, type Spirit} from './actors';

export const W = 1280, H = 720;

// ---------------------------------------------------------------- 火柴盒
// ---------------------------------------------------------------- 火柴
// 局部中心线：头 (0,2) → 杆 (0,STICK+2)，bend 让杆微弯
// ---------------------------------------------------------------- 火灵（flame spirit）
// ---------------------------------------------------------------- 擦燃：smear / multiples 帧
// ---------------------------------------------------------------- 纸底 / 纸纹 / 尘
let PAPER: HTMLCanvasElement | null = null;
function paper(): HTMLCanvasElement {
  if (PAPER) return PAPER;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  g.fillStyle = PAL.cream;
  g.fillRect(0, 0, W, H);
  const rnd = mulberry32(0x9a2e11);
  for (let i = 0; i < 1300; i++) { // 纤维
    const x = rnd() * W, y = rnd() * H, a = rnd() * Math.PI, len = 3 + rnd() * 10;
    g.strokeStyle = rnd() < 0.5 ? 'rgba(120,90,50,0.05)' : 'rgba(255,250,235,0.09)';
    g.lineWidth = 0.8 + rnd();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
  }
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(70,45,20,0.10)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  PAPER = cv;
  return cv;
}
let TOOTH: HTMLCanvasElement | null = null;
function tooth(): HTMLCanvasElement {
  if (TOOTH) return TOOTH;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d')!;
  const im = g.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = 0.5 + 0.5 * (0.6 * Math.sin(x * 0.55) * Math.sin(y * 0.63) + 0.4 * Math.sin(x * 1.7 + 1.3) * Math.sin(y * 1.9 + 0.7));
      const shade = 246 - Math.round(v * 26);
      const o = (y * S + x) * 4;
      im.data[o] = shade; im.data[o + 1] = shade; im.data[o + 2] = shade; im.data[o + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  TOOTH = cv;
  return cv;
}
function drawTooth(c: CanvasCtx, D: DrawInfo): void {
  const v = bv(D);
  const pat = c.createPattern(tooth(), 'repeat');
  if (!pat) return;
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.globalAlpha = 0.12;
  const ox = Math.floor(hs(v, 51) * 256), oy = Math.floor(hs(v, 52) * 256);
  c.translate(-ox, -oy);
  c.fillStyle = pat;
  c.fillRect(0, 0, W + 256, H + 256);
  c.restore();
  // 扫描尘：每张 cel 换一批石墨斑点
  c.save();
  c.globalAlpha = 0.16;
  c.fillStyle = PAL.ink;
  for (let i = 0; i < 20; i++) {
    const px = hs(v, i, 71) * W, py = hs(v, i, 72) * H;
    c.beginPath(); c.arc(px, py, 0.7 + 1.1 * hs(v, i, 73), 0, 7); c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- 幕震

// ---------------------------------------------------------------- 帧级状态机

// ---------------------------------------------------------------- 字幕 / 题字
// ---------------------------------------------------------------- 主绘制（一张 cel）
const LY = new Layers(W, H); // 烟圈离屏层（模块级复用，免每帧建 canvas）
export function drawFrame(c: CanvasCtx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, 361);
  const D = drawing(f);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  c.drawImage(paper(), 0, 0);
  // 相机：镜头切换 + 幕震
  const shot = shotFor(f);
  const [sx, sy] = shakeAt(f);
  const applyCam = (g: CanvasCtx): void => {
    g.translate(shot.X + sx, shot.Y + sy);
    g.scale(shot.s, shot.s);
    g.translate(-shot.px, -shot.py);
  };
  c.save();
  applyCam(c);
  const pose = matchPose(f, D);
  const tip = TIP_OF(pose);
  // 灯池（multiply 入纸，先画）
  drawLightPool(c, tip[0], tip[1] - 24, poolR(f), bv(D) % 3);
  // 盒子 + 焦痕
  drawBox(c, f, D);
  if (f >= 202) {
    const sc = dens(xf(circlePts(0, 0, 30, 16, 22), {x: 772, y: 504}), 4);
    c.save();
    c.globalAlpha = 0.4;
    fillShape(c, sc, PAL.ink, {seed: 950 + bv(D), amp: 1.6});
    c.restore();
  }
  // 拍入拍：拖尾速度线（入画方向）+ f4 落地爆星 poof + 尘圈
  if (f === 3 || f === 4) {
    const sd3 = 1750 + D.id;
    for (let k = 0; k < 4; k++) {
      const off = k * 24 + hs(sd3, k) * 8;
      const x0 = pose.hx + 46 + off * 0.7, y0 = pose.hy - 52 + off;
      inkStroke(c, [[x0 + 128, y0 - 138], [x0 + 34, y0 - 36]], {seed: sd3 * 7 + k, w: 4.0, t0: 60, t1: 10, min: 0.05, amp: 1.2, heavy: 0});
    }
  }
  if (f >= 4 && f <= 7) {
    const R = K(f, [[4, 46], [7, 12, 'in2']] as Key[]);
    drawPoof(c, 356, 566, R, 1360 + D.id, D.id * 0.5);
  }
  if (f >= 4 && f <= 6) {
    smokeGroup(c, LY, [{x: 396, y: 598, r: 11}, {x: 312, y: 604, r: 8}], {seed: 1330 + D.id, w: 4});
  }
  // 擦燃特殊帧（1s 段内 f147=smear、f148=multiples）
  if (f === 147 || f === 148) {
    drawStrikeSmear(c, pose, matchPose(f - 1, drawing(f - 1)), D, f === 148);
  } else {
    drawMatch(c, pose, D, 200);
  }
  // 火焰状态
  const fh = flameH(f);
  const isHero = f >= 217 && f <= 226;
  if (isHero) { // HERO 爆框（画在火灵后面）
    const R = K(f, [[217, 470], [224, 432], [226, 240, 'in2']] as Key[]);
    drawStarburst(c, tip[0] - 40, tip[1] - 60, R, 1400 + D.id, D.id * 0.37);
    if (f <= 224) speedLinesRadial(c, tip[0] - 40, tip[1] - 60, R * 0.5, R * 0.86, 14, 1500 + D.id, 7);
  }
  // 点火 poof 星 + 起火尘
  if (f >= 167 && f <= 172) drawPoof(c, pose.hx, pose.hy - 12, K(f, [[167, 44], [172, 14, 'in2']] as Key[]), 1380 + D.id, D.id * 0.5);
  if (f >= 167 && f <= 170) {
    smokeGroup(c, LY, [{x: pose.hx + 26, y: pose.hy + 10, r: 13}, {x: pose.hx - 30, y: pose.hy + 16, r: 10}], {seed: 1320 + D.id, w: 4});
  }
  // 擦燃火花（拖划后半段向后飞）
  if (f >= 152 && f <= 166) {
    for (let k = 0; k < 5; k++) {
      const u = inv(152, 166, f) * (0.7 + 0.5 * hs(D.id, k, 21));
      const a = Math.PI + (k - 2) * 0.4;
      const dd = 30 + u * (130 + 60 * hs(D.id, k, 22));
      drawSpark(c, pose.hx + Math.cos(a) * dd, pose.hy + Math.sin(a) * dd * 0.6 - 6, Math.cos(a) * 620, Math.sin(a) * 620, 5.5, D.id * 3 + k);
    }
  }
  // 火灵（基座在炭化尖端，HERO 段带跳步）
  if (fh > 2) {
    const hop = f >= 202 && f < 270 ? hopDx(f) : {dx: 0, hop: 0, sq: 1};
    drawSpirit(c, {
      x: tip[0] + hop.dx, y: tip[1] + hop.hop, H: fh,
      kx: 0.16 * Math.sin(D.fq * 0.5), curl: -0.1, r: 0.04 * Math.sin(D.fq * 0.23),
      wild: f < 202 ? 0.1 : isHero ? 0.18 : 0.14,
      seed: 500 + D.id, face: f >= 202, arms: f >= 217 && f < 270,
      sx: hop.sq, sy: hop.sq,
    }, D);
  }
  // 熄火的分离火舌
  if (f >= 271 && f <= 279) {
    const u = inv(271, 279, f);
    drawSpark(c, tip[0] - 6 + u * 26, tip[1] - 30 - u * 90, 90, -240, 6 - u * 3, 1810 + D.id);
  }
  // 烟丝 + 烟圈
  const smokeAmt = f < 188 ? 0 : K(f, [[188, 0.3], [210, 0.5], [274, 0.55], [286, 1], [361, 1]] as Key[]);
  if (smokeAmt > 0.05 && fh < 40) {
    drawWisp(c, tip[0] + 2, tip[1] - 16, D.fq * 0.167, 700, {amt: smokeAmt, big: f >= 300 ? 1 : 0});
  }
  if (f >= 298) {
    const su = inv(298, 361, f);
    smokeGroup(c, LY, [
      {x: tip[0] + 40 + su * 60, y: tip[1] - 120 - su * 90, r: 12 + su * 16},
      {x: tip[0] + 76 + su * 70, y: tip[1] - 168 - su * 110, r: 8 + su * 12},
    ], {seed: 1550 + D.id, w: 4.4});
  }
  // 余烬粒子（结尾定帧微动效）
  if (f >= 296) {
    drawEmbers(c, tip[0], tip[1] - 10, 5, 1900, D.fq * 0.06);
  }
  // 磷面刮痕（拖划进度）
  if (f >= 128 && f < 202) {
    const sp = inv(126, 166, f);
    const L = [[BOX.px + BOX.x0 + 40, BOX.py + (BOX.y1 + BOX.y2) / 2 + 2],
      [lerp(BOX.px + BOX.x0 + 40, BOX.px + BOX.x1 - 30, sp * 0.6), BOX.py + (BOX.y1 + BOX.y2) / 2 - 3],
      [lerp(BOX.px + BOX.x0 + 40, BOX.px + BOX.x1 - 30, sp), BOX.py + (BOX.y1 + BOX.y2) / 2 + 1]];
    inkStroke(c, L, {seed: 100 + D.id, w: 4.0, t0: 30, t1: 60, amp: 1.0, color: PAL.cream, heavy: 0});
  }
  // 特写镜头里的暗角速度线（点火后）
  if (f >= 168 && f < 202 && bv(D) % 2 === 0) {
    speedLinesTrail(c, pose.hx - 60, pose.hy - 40, 3, 1600 + D.id, {dir: -1, len: 90, gap: 22, w: 3.4});
  }
  c.restore();
  // 纸纹每张 cel 重乘 + 尘
  drawTooth(c, D);
  // 题字 / 字幕（纸纹之上，保持可读）
  if (f < 104) drawTitle(c, f, D, false);
  if (f >= 327) drawTitle(c, f, D, true);
  drawSubs(c, f, D);
  // 末 6 帧轻收暗（合法收尾）
  if (f > 355) {
    c.save();
    c.globalAlpha = ((f - 355) / 6) * 0.18;
    c.fillStyle = PAL.ink;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
}

// ---------------------------------------------------------------- Remotion 组件
let fontHandle: number | null = null;
export const InkBoilFilm: React.FC = () => {
  const frame = useCurrentFrame() + 1;
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(fontHandle !== null);
  React.useEffect(() => {
    if (fontHandle !== null) return;
    fontHandle = delayRender('ink-boil-fonts');
    const face = new FontFace('Noto Sans SC', `url(${staticFile('fonts/NotoSansSC.ttf')})`, {weight: '100 900'} as FontFaceDescriptors);
    face.load().then((ff) => {
      (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
      continueRender(fontHandle as number);
      setReady(true);
    }).catch(() => {
      continueRender(fontHandle as number);
      setReady(true);
    });
  }, []);
  React.useEffect(() => {
    if (!ready || !ref.current) return;
    drawFrame(ref.current.getContext('2d') as CanvasCtx, frame);
  }, [frame, ready]);
  return (
    <AbsoluteFill style={{background: PAL.cream}}>
      <canvas ref={ref} width={W} height={H} style={{width: W, height: H, display: 'block'}} />
    </AbsoluteFill>
  );
};
