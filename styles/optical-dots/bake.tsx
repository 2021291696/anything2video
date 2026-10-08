import React, {useEffect, useRef} from 'react';
import {AbsoluteFill, delayRender, continueRender, staticFile, useCurrentFrame} from 'remotion';
import {W, H} from '../common';
import {renderSceneField, renderHookFrame, renderGlow, drawBase} from './paint';
import type {SceneId} from './world';

// 临时调试开关：置 true 时 f15 直出 s4 分级底稿（采样验证 grade 后像素，验证完必须回 false）
const DEBUG_BASE = false;

// ============================================================================
// bake.tsx — 烘焙/基准/探针合成（均不进正片）
//   Bake  : 28 帧 = 4 场景 ×5 flicker 态 + 钩子结晶 6 帧 + 光渗呼吸层 2 张
//   Bench : 热帧工作量实测（clearRect + drawImage 场景态 + drawImage 光渗层 α 脉动，GPU 同步读回，n=90）
//   Probe : 空载基线（probe_hotframe 基线用）
// 由 scripts/bake_paint.mjs / scripts/bench_hotframe.mjs / scripts/probe_hotframe.mjs 驱动。
// ============================================================================

export const BAKE_FRAMES = 28;
/** 帧 → 资产名（与 scripts/bake_paint.mjs 的输出命名一一对应）。 */
export const bakeAssetName = (f: number): string => {
  if (f < 20) {
    const scene = (['s1', 's2', 's3', 's4'] as SceneId[])[Math.floor(f / 5)];
    return `${scene}-${f % 5}`;
  }
  if (f < 26) return `hook-${f - 19}`; // hook-1..6
  return f === 26 ? 'glow-s3' : 'glow-s4';
};

export const BakeFrame: React.FC = () => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    let out: HTMLCanvasElement;
    if (f < 20) {
      const scene = (['s1', 's2', 's3', 's4'] as SceneId[])[Math.floor(f / 5)];
      out = DEBUG_BASE && f === 15 ? drawBase('s4') : renderSceneField(scene, f % 5);
    } else if (f < 26) {
      out = renderHookFrame((f - 19) / 6);
    } else {
      const field = renderSceneField(f === 26 ? 's3' : 's4', 0);
      out = renderGlow(field);
    }
    g.clearRect(0, 0, W, H);
    g.drawImage(out, 0, 0);
  }, [f]);
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0}} />;
};


const benchImg = (name: string) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = () => rej(new Error(`bench img load fail: ${name}`));
  im.src = staticFile(`assets/optical-dots/field/${name}.png`);
});

/** 热帧实测：渲染产物即证据（数字直接写进 out/bench-hotframe.png）。 */
export const BenchFrame: React.FC = () => {
  const [line, setLine] = React.useState('bench running...');
  const [handle] = React.useState(() => delayRender('bench-hotframe'));
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const scene = await benchImg('s3-0');
      const glow = await benchImg('glow-s3');
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const g = cv.getContext('2d')!;
      const run = (t0off: number) => {
        const flush = () => g.getImageData(0, 0, 1, 1); // 强制同步：把 GPU 栅格化计进成本
        for (let i = 0; i < 12; i++) {
          const t = (i + t0off) / 30;
          g.clearRect(0, 0, W, H);
          g.drawImage(scene, 0, 0, W, H);
          g.globalAlpha = 0.16 + 0.12 * Math.sin((t * Math.PI * 2) / 2.6);
          g.drawImage(glow, 0, 0, W, H);
          g.globalAlpha = 1;
          flush();
        }
        const t0 = performance.now();
        const N = 90;
        for (let i = 0; i < N; i++) {
          const t = (i + t0off) / 30;
          g.clearRect(0, 0, W, H);
          g.drawImage(scene, 0, 0, W, H);
          g.globalAlpha = 0.16 + 0.12 * Math.sin((t * Math.PI * 2) / 2.6);
          g.drawImage(glow, 0, 0, W, H);
          g.globalAlpha = 1;
          flush();
        }
        return (performance.now() - t0) / N;
      };
      run(0);
      const ms = run(100);
      if (!alive) return;
      setLine(`hot-frame = ${ms.toFixed(2)}ms  (drawImage scene+flicker state, glow alpha pulse; n=90)`);
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
    <AbsoluteFill style={{background: '#101a4a', color: '#4aff4a', fontFamily: 'monospace',
      fontSize: 54, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      {line}
    </AbsoluteFill>
  );
};

export const ProbeFrame: React.FC = () => <AbsoluteFill style={{background: '#101a4a'}} />;
