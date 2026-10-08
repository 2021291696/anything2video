// 《第一幅画》—— cave-wall 洞穴岩画正片（战役 v4 批次④）。
// 纪律：全帧 = 一张岩壁；drawFrame(f) 纯帧号函数（seeded，同帧渲两次逐像素一致）。
// 层序：岩壁底版（缓存）→ 颜料层（喷雾/牛群/画者/伸手/活手印/题字 → source-atop 岩面贴图）
//   → 火把焰 → 余烬（世界空间）→ 火光 overlay（屏幕空间，禁 lighter）→ 手印呼吸 → 钩子暗场 → 字幕。
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {hermite} from '../common/motion/hermite';
import {FPS, PAL, TOTAL, WORLD, type CanvasCtx} from './types';
import {clamp} from './noise';
import {figTex, wallBg} from './relief';
import {staticHands, drawLiveHand} from './handprint';
import {drawEmbers, drawFirelight, drawHandGlows, drawHookDark, drawTorchFlame, fireCenter} from './embers';
import {drawBlowMist, drawHerd, drawPainter, drawReachingHand, painterBlow} from './actors';
import {drawSubs, drawTitle} from './title';

export const W = 1280, H = 720;

/** 相机轨（火把沿岩壁走）：八站 Hermite，f362 起钳在末站=定帧 1.2s。 */
const camTrack = hermite([
  {t: 0.0, v: [520, 470, 1.28], e: true},
  {t: 2.87, v: [558, 456, 1.3], e: true},
  {t: 4.4, v: [716, 424, 1.44], e: true},
  {t: 6.53, v: [722, 430, 1.44], e: true},
  {t: 7.9, v: [952, 452, 1.06], e: true},
  {t: 9.93, v: [960, 456, 1.06], e: true},
  {t: 11.0, v: [880, 505, 0.82], e: true},
  {t: 12.0, v: [872, 508, 0.82], e: true},
]);

const TORCH: [number, number] = [585, 520];

let SCRATCH: HTMLCanvasElement | null = null;
function scratch(): CanvasRenderingContext2D {
  if (!SCRATCH) {
    SCRATCH = document.createElement('canvas');
    SCRATCH.width = WORLD.w;
    SCRATCH.height = WORLD.h;
  }
  const g = SCRATCH.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, WORLD.w, WORLD.h);
  return g;
}

/** 钩子场亮系数：f1 已见暗壁（k 0.16 起步，防纯黑场），f3 火把绽放、f14 全亮（0.4s<0.5s 纪律）。 */
function hookK(f: number): number {
  const p = clamp((f - 1) / 13);
  const ease = p * p * (3 - 2 * p);
  return 0.16 + 0.84 * ease;
}

function drawFrame(c: CanvasCtx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, TOTAL);
  const t = (f - 1) / FPS;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  const [cx, cy, z] = camTrack(t);
  const toScreen = (wx: number, wy: number): [number, number] => [(wx - cx) * z + 640, (wy - cy) * z + 360];
  c.save();
  c.translate(640, 360);
  c.scale(z, z);
  c.translate(-cx, -cy);
  c.drawImage(wallBg(staticHands), 0, 0);
  // 颜料层（世界空间，画完全层一次 source-atop 岩面贴图 = 「颜料吃进岩石」）
  const g = scratch();
  drawBlowMist(g, f);
  drawHerd(g, f);
  drawPainter(g, 430, 640, f, painterBlow(f));
  drawReachingHand(g, f);
  drawLiveHand(g, f);
  drawTitle(g, f);
  g.globalCompositeOperation = 'source-atop';
  g.drawImage(figTex(), 0, 0);
  g.globalCompositeOperation = 'source-over';
  c.drawImage(SCRATCH!, 0, 0);
  // 火把焰（亮源不吃贴图）+ 余烬（世界空间）
  drawTorchFlame(c, TORCH[0], TORCH[1], t);
  drawEmbers(c, t, hookK(f));
  c.restore();
  // 屏幕空间：火光 overlay（合成=overlay，禁 lighter）+ 呼吸暗角 + 手印相位呼吸
  const [fdx, fdy] = fireCenter(t);
  const [fsx, fsy] = toScreen(TORCH[0] + fdx, TORCH[1] + fdy);
  const spike = f < 3 ? 0 : f < 9 ? 0.5 * (1 - (f - 3) / 6) : 0;
  drawFirelight(c, fsx, fsy, z, t, hookK(f) + spike);
  drawHandGlows(c, toScreen, t, z, hookK(f));
  drawHookDark(c, hookK(f));
  drawSubs(c, f);
}

export const CaveWallFilm: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: PAL.wallD, overflow: 'hidden'}}>
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
  <AbsoluteFill style={{background: PAL.wallD, overflow: 'hidden'}}>
    {audio ? <Audio src={staticFile('assets/cave-wall/audio.wav')} /> : null}
    <CaveWallFilm />
  </AbsoluteFill>
);

export const Video: React.FC = () => <Stage audio />;
