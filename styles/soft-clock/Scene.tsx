// 《融化的下午》—— soft-clock 达利超现实主义正片（战役 v4 批次④）。
// 纪律：drawFrame(f) 纯帧号函数（seeded，同帧渲两次逐像素一致）；全片无勾线，体积只靠 vol 渐变＋内阴影。
// 层序（底版拆层纪律——影子必须夹在 bg 与前景之间）：bg → 地平线热霾 → 高跷象 → 长影子（剪切仿射）
//   → 断墙 → 石块桌 → 三只软钟（枯枝/窗台/桌沿）→ 蚂蚁怀表 → 软体沉睡生物 → 暗角 → 字幕（屏幕空间）。
// 签名：softMap 软钟映射 / vol 体积填色 / 剪切仿射长影子 / 高跷象 / 蚂蚁绕表 / melt 转场 / sag 全程 0.1→1.4。
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {clamp} from './noise';
import {castShadow, faceRipple, softClock} from './paint';
import {meltTransition, scratchFrame} from './melt';
import {CAM1, cam2, kxAt, meltP, sagAt, type Cam} from './camera';
import {antWatch, creature, creatureSilhouette, cypress, cypressSilhouette, elephant, heatHaze} from './motifs';
import {bgLayer, blockLayer, wallLayer} from './world';
import {drawSubs} from './subs';
import {H, SENT_S04, SHADOW_CLIP_Y, W, YG, type CanvasCtx} from './types';
import {TOTAL_FRAMES} from '../common/timeline';

/** 三只软钟（世界坐标，1280×720 重设计）：枯枝 R43（fold −23 大部分垂下）/窗台 R48/桌沿 R59。 */
const BRANCH_CLK = {cx: 650, cy: 69, R: 43, fold: -23, top: 0.25, drip: 0.25};
const SILL_CLK = {cx: 493, cy: 365, R: 48, fold: 3, top: 0.3, drip: 0.4};
const TABLE_CLK = {cx: 608, cy: 407, R: 59, fold: 8, top: 0.28, drip: 0.3};

/** 高跷象：全景揭示时已在荒原中部偏右，向左 47px/s 走过（source 70px/s@1920 等比），冻结段继续远走。 */
const elephX = (f: number): number => 880 - (f - 134) * 1.567;

/** 一帧的世界绘制（画进任意 1280×720 画布，cam 取景）。 */
function drawWorld(cv: HTMLCanvasElement, cam: Cam, f: number): void {
  const c = cv.getContext('2d')!;
  const t = (f - 1) / 30;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.filter = 'none';
  c.clearRect(0, 0, W, H);
  c.save();
  c.translate(640, 360);
  c.scale(cam.z, cam.z);
  c.translate(-cam.x, -cam.y);
  // ① 底版（天/海/礁岩/荒原）
  c.drawImage(bgLayer(), 0, 0);
  heatHaze(c, t);
  // ② 高跷象（地平线母题，在影子层之前）
  elephant(c, elephX(f), t);
  // ③ 长影子：剪切仿射投到地面（kx 随下午变长 = 时间流逝）
  castShadow(c, [
    [YG.wall, (g) => {
      g.beginPath();
      g.moveTo(200, 466);
      [[200, 80], [273, 52], [360, 47], [453, 43], [547, 53], [572, 69], [595, 80], [595, 475]].forEach((p) => g.lineTo(p[0], p[1]));
      g.closePath();
      g.rect(246, 93, 280, 267);
      g.fill('evenodd');
    }],
    [YG.table, (g) => {
      g.fillRect(540, 400, 263, 205);
      g.fillRect(867, 495, 127, 109);
    }],
    [YG.creature, (g) => creatureSilhouette(g)],
    [655, (g) => cypressSilhouette(g, t)],
  ], {kx: kxAt(f), clipY: SHADOW_CLIP_Y, alpha: 0.6});
  // ④ 断墙＋石块桌＋孤柏（前景底版）
  c.drawImage(wallLayer(), 0, 0);
  c.drawImage(blockLayer(), 0, 0);
  cypress(c, t);
  // ⑤ 三只软钟（sag 全程 0.1→1.4，三只相位略异）
  const sag = sagAt(f);
  softClock(c, BRANCH_CLK, sag * 0.92, t + 7, 4.5);
  softClock(c, SILL_CLK, sag, t, 6.5);
  if (f >= SENT_S04.from) faceRipple(c, SILL_CLK, sag, f, SENT_S04.from);
  softClock(c, TABLE_CLK, sag * 0.9, t + 3, -2.4);
  // ⑥ 蚂蚁怀表＋软体沉睡生物
  antWatch(c, t);
  creature(c);
  c.restore();
  // ⑦ 暗角（博物馆灯下的画，屏幕空间）
  const vg = c.createRadialGradient(640, 347, 347, 640, 360, 767);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(25,12,4,.38)');
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);
}

function drawFrame(c: CanvasCtx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, TOTAL_FRAMES);
  const p = meltP(f);
  if (p < 0) {
    // 开场：特写画（钩子——第一只钟开始下垂）
    drawWorld(c.canvas, CAM1, f);
  } else if (p > 1) {
    // 全景画（缓推，f330 钳死）
    drawWorld(c.canvas, cam2(f), f);
  } else {
    // melt 转场：特写画被压着淌下来，全景画从液面上方露出
    const A = scratchFrame('A');
    const B = scratchFrame('B');
    drawWorld(A, CAM1, f);
    drawWorld(B, cam2(f), f);
    meltTransition(c, A, B, p);
  }
  // ⑧ 字幕（屏幕空间）
  drawSubs(c, f);
}

export const SoftClockFilm: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#22407c', overflow: 'hidden'}}>
      <canvas
        width={W}
        height={H}
        style={{width: '100%', height: '100%'}}
        ref={(el) => {
          if (el) drawFrame(el.getContext('2d')!, frame + 1);
        }}
      />
    </AbsoluteFill>
  );
};

export const Stage: React.FC<{audio?: boolean}> = ({audio = false}) => (
  <AbsoluteFill style={{background: '#22407c', overflow: 'hidden'}}>
    {audio ? <Audio src={staticFile('assets/soft-clock/audio.wav')} /> : null}
    <SoftClockFilm />
  </AbsoluteFill>
);

export const Video: React.FC = () => <Stage audio />;
