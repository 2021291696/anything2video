// 《一只猫的晨间仪式》—— grain-flat 当代扁平插画正片（战役 v4 批次④）。
// 纪律：drawFrame(f) 纯帧号函数（seeded、同帧重渲逐像素一致；禁 Math.random/Date/网络）。
// 层序：静态底（缓存）→ 晨空/装饰沸腾 → 植物/吊灯（damped 阻尼二次动作）→ 闹钟 → 地面碎裂
//   → 角色层（scratch：水杯+猫 → 整层 source-atop 静态颗粒）→ 烟尘/动线/紧张线 → 字幕。
// 八签名：①mixPose 姿势库逐数值插值 ②绕脚轴挤压拉伸（蹲下脚不离地）③最扁帧翻面 snap
//   ④damped 环境二次动作（跨卡可借 util）⑤stipple 密度点彩+角色层颗粒 ⑥无描边+同色系深一档
//   ⑦getTransform().invertSelf() 目标反算 ⑧烟尘/咖啡滴拖尾/冲击放射线 ≥3 小件。
// 技法借鉴 huashu-art-motion (MIT, alchaincyf) scenes/16_2026.js + 风格配方/16_2026.md，Remotion/TSX 重写。
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {FPS, H, PAL, TOTAL, W, WORLD, type CanvasCtx} from './types';
import {clamp} from './util';
import {damped} from './damped';
import {cached, grainTexture} from './stipple';
import {drawStatic, decos, lamp, sky, snakePlant} from './env';
import {catState, cupState, RINGS, SWIPES} from './state';
import {drawCat, earFlick, shiverJit} from './actors';
import {drawAlarm, drawMug, drips, dust, motionMarks, shatter, tension} from './props';
import {drawSubs} from './caption';

let SCRATCH: HTMLCanvasElement | null = null;
function scratch(): CanvasRenderingContext2D {
  if (!SCRATCH) {
    SCRATCH = document.createElement('canvas');
    SCRATCH.width = W;
    SCRATCH.height = H;
  }
  const g = SCRATCH.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, W, H);
  return g;
}

/** 静态底缓存（一次构建）。 */
const STATIC_BG = (): HTMLCanvasElement => cached('gf_bg', W, H, drawStatic);
/** 角色层静态颗粒纹理（一次构建，5% 暗 α70 + 3.5% 亮 α90）。 */
const GRAIN = (): HTMLCanvasElement => cached('gf_grain', W, H, (g) => g.drawImage(grainTexture(W, H, 2026), 0, 0));

/** 杯子 x 查表（拍杯爪子反算用）。 */
function cupXAt(f: number): number {
  const cs = cupState(f);
  if (cs && cs.phase === 'table') return cs.x;
  return 766;
}

function drawFrame(c: CanvasCtx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, TOTAL);
  const t = (f - 1) / FPS;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  c.drawImage(STATIC_BG(), 0, 0);
  sky(c, t);
  decos(c, t);
  // 环境二次动作（签名④）：吊灯在落桌/碎裂后摆，植物在蹬地/碎裂后晃，空闲微呼吸
  const lampA = damped(f, 176, 0.055, 26, 22) + damped(f, 263, 0.045, 22, 20) + Math.sin(t * 1.3) * 0.004;
  const plantA = damped(f, 152, 0.035, 22, 18) + damped(f, 263, 0.05, 9, 26) + Math.sin(t * 1.7) * 0.006;
  snakePlant(c, -plantA * 0.8);
  lamp(c, lampA);
  drawAlarm(c, f);
  // 地面碎裂（在角色层下）
  shatter(c, f);
  // —— 角色层（scratch，画完一次 source-atop 颗粒）——
  const L = scratch();
  const cs = cupState(f);
  if (cs && cs.phase === 'table') drawMug(L, cs.x, WORLD.tableY - 33, cs.rot);
  const s = catState(f, t);
  const jit = shiverJit(f);
  const flick = earFlick(f);
  L.save();
  L.translate(jit[0], jit[1]);
  L.rotate(flick * 0.4);
  drawCat(L, s, f, t, cupXAt);
  L.restore();
  if (cs && cs.phase === 'fall') {
    drips(c, f); // 拖尾画主画布（在杯后）
    drawMug(L, cs.x, cs.y, cs.rot);
  }
  L.save();
  L.globalCompositeOperation = 'source-atop';
  L.globalAlpha = 0.9;
  L.drawImage(GRAIN(), 0, 0);
  L.restore();
  c.drawImage(SCRATCH!, 0, 0);
  // —— 上层小件 ——
  // 起跳/小跳烟尘
  const hops: Array<[number, number]> = [[137, 560], [142, 640], [151, 700]];
  hops.forEach(([f0, x]) => {
    const q = (f - f0) / 10;
    if (q > 0 && q < 1) dust(c, x, WORLD.catFloor.ground, q);
  });
  motionMarks(c, f, cupXAt);
  // 惊呼紧张线（头顶世界上方）
  if (f >= 264 && f <= 290) {
    const headTop: [number, number] = [
      s.x + s.dir * s.pose.head[0],
      s.y + (s.pose.head[1] - s.pose.head[3] - s.pose.gy) + s.pose.gy,
    ];
    tension(c, f, headTop);
  }
  drawSubs(c, f);
}

export const GrainFlatFilm: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: PAL.wall, overflow: 'hidden'}}>
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
  <AbsoluteFill style={{background: PAL.wall, overflow: 'hidden'}}>
    {audio ? <Audio src={staticFile('assets/grain-flat/audio.wav')} /> : null}
    <GrainFlatFilm />
  </AbsoluteFill>
);

export const Video: React.FC = () => <Stage audio />;

export {FPS, TOTAL, W, H, RINGS, SWIPES};
