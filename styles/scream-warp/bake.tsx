import React, {useEffect, useRef} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {drawWorld, getPainting, PW, PH} from './world';

/**
 * Bake 合成（不进正片）：把「底稿 + flowLines 长弯笔 + 桥景」按 boilSeed 预渲染成 PNG 资产。
 * 每帧输出一张全幅油画位图：f0-7 = wide 种子 8 态（1920×1080 源分辨率）。
 * 由 scripts/bake_paint.mjs 渲到 public/assets/scream-warp/paint/wide-<i>.png，
 * 正片 ScreamCanvas 只按 boilSeed%N 换图（8fps boil），热帧零 flowLines 计算。
 */
export const BakeFrame: React.FC = () => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    const painting = getPainting(100 + f * 57);
    g.clearRect(0, 0, PW, PH);
    g.drawImage(painting, 0, 0);
  }, [f]);
  return <canvas ref={ref} width={PW} height={PH} style={{position: 'absolute', left: 0, top: 0}} />;
};

/**
 * Bench 合成（性能门实测，不进正片）：页面内对「热帧实际新增计算」计次——
 * clearRect + drawImage(全幅烘焙位图) + 尖叫者/流光/声波环矢量 + 行列 warp blit ×90 均值。
 * 结果直接写进画面（渲染产物即证据），数字由真实执行产生。
 */
const loadImg = (i: number) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = () => rej(new Error(`bench img load fail: wide-${i}`));
  im.src = staticFile(`assets/scream-warp/paint/wide-${i}.png`);
});
export const BenchFrame: React.FC = () => {
  const [line, setLine] = React.useState('bench running...');
  const [handle] = React.useState(() => delayRender('bench-hotframe'));
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const img = await loadImg(0);
      const cv = document.createElement('canvas');
      cv.width = PW;
      cv.height = PH;
      const g = cv.getContext('2d')!;
      const flush = () => g.getImageData(0, 0, 1, 1); // 强制同步：把 GPU 栅格化计进成本
      const one = (i: number) => {
        const t = i / 30;
        drawWorld(g, {t, boilKey: Math.floor(t * 8), amp: 1, rings: 1, glow: 1, mouth: 1.35});
        flush();
      };
      for (let i = 0; i < 12; i++) one(i); // 预热
      const t0 = performance.now();
      const N = 90;
      for (let i = 0; i < N; i++) one(i);
      const ms = (performance.now() - t0) / N;
      if (!alive) return;
      setLine(`hot-frame wide=${ms.toFixed(2)}ms (drawImage+screamer+glow+rings+warpRows+warpCols @1920x1080, n=90)`);
      continueRender(handle);
    })().catch(() => {
      if (!alive) return;
      setLine('bench failed');
      continueRender(handle);
    });
    return () => {
      alive = false;
    };
  }, [handle]);
  return (
    <AbsoluteFill style={{background: '#000', color: '#4aff4a', fontFamily: 'monospace',
      fontSize: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      {line}
    </AbsoluteFill>
  );
};
