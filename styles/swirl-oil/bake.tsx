import React, {useEffect, useRef} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {getPainting} from './world';
import {drawGlow, swirlPhase} from './world';
import {W, H} from '../common';

/**
 * Bake 合成（不进正片）：把「底稿 + 三遍分区笔触 + 道具层 + 环境线稿」按 boilSeed 预渲染成 PNG 资产。
 * 每帧输出一张全幅油画位图：f0-7 = scene 种子 8 态，f8-15 = vortex 种子 8 态。
 * 由 scripts/bake_paint.mjs 渲到 public/assets/swirl-oil/paint/<variant>-<i>.png，
 * 正片 OilCanvas 只按 boilSeed%N 换图（8fps boil），热帧零笔触计算。
 */
export const BAKE_SCENE = 8;
export const BAKE_VORTEX = 8;
export const BakeFrame: React.FC = () => {
  const f = useCurrentFrame();
  const variant = f < BAKE_SCENE ? 'scene' : 'vortex';
  const i = f % BAKE_SCENE;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    const painting = getPainting(variant, 100 + i * 57);
    g.clearRect(0, 0, painting.width, painting.height);
    g.drawImage(painting, 0, 0);
  }, [variant, i]);
  return <canvas ref={ref} width={1280} height={720} style={{position: 'absolute', left: 0, top: 0}} />;
};

/**
 * Bench 合成（性能门实测，不进正片）：页面内对「热帧实际新增计算」计次——
 * clearRect + drawImage(全幅烘焙位图) + drawGlow(真实 t 扫描) ×90 次取均值。
 * 结果直接写进画面（渲染产物即证据），数字由真实执行产生。
 */
const loadImg = (name: string) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = () => rej(new Error(`bench img load fail: ${name}`));
  im.src = staticFile(`assets/swirl-oil/paint/${name}.png`);
});
export const BenchFrame: React.FC = () => {
  const [line, setLine] = React.useState('bench running...');
  const [handle] = React.useState(() => delayRender('bench-hotframe'));
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const scene = await loadImg('scene-0');
      const vortex = await loadImg('vortex-0');
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const g = cv.getContext('2d')!;
      const run = (img: HTMLImageElement, variant: 'scene' | 'vortex') => {
        const flush = () => g.getImageData(0, 0, 1, 1); // 强制同步：把 GPU 栅格化计进成本
        for (let i = 0; i < 12; i++) {
          const t = i / 30;
          g.clearRect(0, 0, W, H);
          g.drawImage(img, 0, 0, W, H);
          drawGlow(g, t, variant, swirlPhase(t));
          flush();
        }
        const t0 = performance.now();
        const N = 90;
        for (let i = 0; i < N; i++) {
          const t = i / 30;
          g.clearRect(0, 0, W, H);
          g.drawImage(img, 0, 0, W, H);
          drawGlow(g, t, variant, swirlPhase(t));
          flush();
        }
        return (performance.now() - t0) / N;
      };
      const s = run(scene, 'scene');
      const v = run(vortex, 'vortex');
      if (!alive) return;
      setLine(`hot-frame scene=${s.toFixed(2)}ms vortex=${v.toFixed(2)}ms (drawImage+glow, n=90)`);
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
      fontSize: 58, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      {line}
    </AbsoluteFill>
  );
};
