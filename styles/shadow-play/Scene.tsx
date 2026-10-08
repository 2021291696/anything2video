// 《幕后》—— shadow-play 中国皮影正片（战役 v4 批次④）。
// 纪律：全帧 = 一面影窗；drawFrame(f) 纯帧号函数（seeded，同帧渲两次逐像素一致）。
// 层序：影窗（油灯照明+布纹+调暗罩）→ 道具层（stamp）→ 千军万马虚影 → 旦角 → 武将
//   → 幕后灯苗剪影 → 幕布微漾 → 木框 → 片名 → 字幕带。
// 签名纪律：牛皮透光 multiply / 刻纹五纹样 / 铆钉关节+10fps 步进+杆操 / 幕后油灯 15fps /
//   旦角空脸 / stamp 虚影 / 4 节铰链鞭梢 / 白=镂空——逐帧确定性，禁 Math.random/Date/网络。
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {W, H, TOTAL, PAL, type CanvasCtx} from './types';
import {clamp} from './noise';
import {drawScreen, drawFlame, drawRipple, windowFrame, propLayer} from './screen';
import {stampLayer} from './leather';
import {drawDan, danPose} from './dan';
import {drawGeneral, generalPose} from './general';
import {drawArmy} from './army';
import {drawSubs, drawTitle} from './captions';

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

function drawFrame(c: CanvasCtx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, TOTAL);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  // ① 影窗（签名④：径向暖光+灯焰扰动+布纹+调暗罩）
  const st = drawScreen(c, SCRATCH!, f);
  // ② 静态道具（两侧幕柱+底沿台板，随场亮同明暗）
  stampLayer(c, propLayer(), 6, 4, st.k);
  // ③⑤ 皮人（各自合并到共享 scratch 层再整层 stamp——全帧 multiply 大合成 ≤4 次）
  const g = scratch();
  drawArmy(g, c, f);
  drawDan(g, c, danPose(f));
  drawGeneral(g, c, generalPose(f));
  // ④ 幕后灯苗剪影（收戏后更显）→ 幕布微漾（合法微动效）
  drawFlame(c, st, f);
  drawRipple(c, f);
  // ⑤ 木框（最上层）→ 片名 → 字幕
  c.drawImage(windowFrame(), 0, 0);
  drawTitle(c, f);
  drawSubs(c, f);
}

export const ShadowPlayFilm: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: PAL.wood, overflow: 'hidden'}}>
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
  <AbsoluteFill style={{background: PAL.wood, overflow: 'hidden'}}>
    {audio ? <Audio src={staticFile('assets/shadow-play/audio.wav')} /> : null}
    <ShadowPlayFilm />
  </AbsoluteFill>
);

export const Video: React.FC = () => <Stage audio />;

// 帧成本基准钩子（scripts/bench_frame.mjs 页内调用；正常渲染路径零影响）：
// 在离屏 canvas 上循环 drawFrame 整个 HERO 段（最重区间），返回纯绘制 avg/p95——
// 剥离 renderStill 的浏览器往返基线（probe_frame_cost 墙钟含 ~460ms 基线，见 report）。
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __spBench?: () => any;
  }
}
if (typeof window !== 'undefined') {
  window.__spBench = () => {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d')!;
    drawFrame(g, 250); // 预热：sprite 缓存全量建立
    const times: number[] = [];
    for (let f = 199; f <= 292; f++) {
      const t0 = performance.now();
      drawFrame(g, f);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return {avg, p95: times[Math.min(times.length - 1, Math.floor(times.length * 0.95))], max: times[times.length - 1], n: times.length};
  };
}
