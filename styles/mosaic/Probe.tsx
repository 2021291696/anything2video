// 探针合成：渲染一张统计帧（tiles / buildMs / warmMs），供 report 用真实数字。
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {getMosaic, drawFrame} from './mosaic';
import {W, H} from './Scene';

export const ProbeStats: React.FC = () => {
  const frame = useCurrentFrame() + 1;
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [out, setOut] = React.useState('');
  React.useEffect(() => {
    if (!ref.current || out) return;
    const M = getMosaic();
    const g = ref.current.getContext('2d') as CanvasRenderingContext2D;
    drawFrame(g, frame);
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) drawFrame(g, 200);
    const warm = (performance.now() - t0) / 5;
    const line = `tiles=${M.stats.tiles} dynTiles=${M.stats.dynTiles} buildMs=${M.stats.buildMs} warmMs=${warm.toFixed(1)} revealEnd=${M.revealEnd}`;
    setOut(line);
    const c = g;
    c.fillStyle = '#111';
    c.fillRect(0, 0, 60, 40);
    c.fillStyle = '#fff';
    c.font = '24px monospace';
    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.fillText(line, 20, 12);
  }, [frame, out]);
  return (
    <AbsoluteFill style={{background: '#111'}}>
      <canvas ref={ref} width={W} height={H} style={{width: W, height: H, display: 'block'}} />
    </AbsoluteFill>
  );
};
