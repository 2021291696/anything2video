// ============================================================================
// bake.tsx — 烘焙与基准合成（不进正片）
// Bake（3 帧）：f0=整页静态位图（含逐像素金箔纹理，签名①）→ page-static.png；
//             f1=金色度掩膜（签名④，从静态层逐像素分类）→ page-mask.png；
//             f2=做旧颗粒 → grain.png。
// Bench：页面内对「热帧实际新增计算」计次（drawImage 静态 + 菱格/藤蔓/蜗牛/高光带合成 ×90 均值），
//        结果渲染进画面（产物即证据）→ out/bench-hotframe.png。
// 技法借鉴 huashu-art-motion 05_gothic（MIT），TSX/Remotion 重写（RECON 建议：逐像素材质预烘焙，热帧零逐像素）。
// ============================================================================
import React, {useEffect, useRef} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {paintGoldMask, paintGrain, W, H} from './world';
import {paintStatic} from './scene';
import {drawGoldSweep, drawLattice, catPendulum, girlDyn, snail, vines} from './marginalia';
import {catBody} from './cat';

export const BAKE_FRAMES = 3;

// 烘焙前必须等字体就绪（UnifrakturMaguntia 拉丁正文栏；否则 canvas 回退衬线体）
let fontsReady: Promise<unknown> | null = null;
const ensureFonts = () => {
  if (!fontsReady) {
    fontsReady = Promise.all([
      new FontFace('UnifrakturMaguntia', `url(${staticFile('fonts/UnifrakturMaguntia-Regular.ttf')})`).load(),
      new FontFace('Noto Serif SC', `url(${staticFile('fonts/NotoSerifSC[wght].ttf')})`, {weight: '100 900'} as FontFaceDescriptors).load(),
    ]).then((fs) => {
      fs.forEach((f) => (document.fonts as unknown as {add: (f: FontFace) => void}).add(f));
    });
  }
  return fontsReady;
};

export const BakeFrame: React.FC = () => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = React.useState(() => delayRender('bake-fonts'));
  React.useEffect(() => {
    let alive = true;
    ensureFonts().then(() => {
      if (!alive) return;
      const g = ref.current?.getContext('2d');
      if (!g) {
        continueRender(handle);
        return;
      }
      g.clearRect(0, 0, W, H);
      if (f === 0) {
        paintStatic(g);
      } else if (f === 1) {
        const off = document.createElement('canvas');
        off.width = W;
        off.height = H;
        paintStatic(off.getContext('2d')!);
        paintGoldMask(g, off);
      } else {
        paintGrain(g);
      }
      continueRender(handle);
    });
    return () => {
      alive = false;
    };
  }, [f, handle]);
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0}} />;
};

const loadImg = (name: string) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = () => rej(new Error(`bench img load fail: ${name}`));
  im.src = staticFile(`assets/gold-leaf/paint/${name}.png`);
});

export const BenchFrame: React.FC = () => {
  const [line, setLine] = React.useState('bench running...');
  const [handle] = React.useState(() => delayRender('bench-hotframe'));
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const stat = await loadImg('page-static');
      const mask = await loadImg('page-mask');
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const g = cv.getContext('2d')!;
      const run = (t: number, f: number) => {
        const flush = () => g.getImageData(0, 0, 1, 1); // 强制同步：把 GPU 栅格化计进成本
        g.clearRect(0, 0, W, H);
        g.drawImage(stat, 0, 0, W, H);
        drawLattice(g, 1, 1, 1);
        vines(g, t);
        snail(g, t);
        catBody(g);
        catPendulum(g, t);
        drawGoldSweep(g, f, mask);
        girlDyn(g, f, t);
        flush();
      };
      // 预热（着色器/图片首绘不计）
      run(0, 220);
      const N = 90;
      const t0 = performance.now();
      for (let i = 0; i < N; i++) run(i / 30, 208 + (i % 60));
      const ms = (performance.now() - t0) / N;
      if (alive) {
        setLine(`gold-leaf hot-frame: ${ms.toFixed(2)} ms/frame  (${N} iters, sweep+lattice+vines+snail+cat+girlDyn)`);
        continueRender(handle);
      }
    })().catch(() => {
      if (alive) {
        setLine('bench failed');
        continueRender(handle);
      }
    });
    return () => {
      alive = false;
    };
  }, [handle]);
  return (
    <AbsoluteFill style={{background: '#241708'}}>
      <div style={{position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{fontFamily: 'monospace', fontSize: 30, color: '#f8de86', background: 'rgba(20,10,0,0.75)', padding: '18px 30px', border: '2px solid #9c6a1a'}}>{line}</div>
      </div>
    </AbsoluteFill>
  );
};

export const EmptyProbe: React.FC = () => <AbsoluteFill style={{background: '#17110b'}} />;
