import React from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {getPainting} from './world';
import {drawMotion} from './motion';
import {W, H, FPS} from '../common';
import {SUBS} from '../common/subs';

// ============================================================================
// kit.tsx — light-dabs 图元库（印象派光斑短笔触 · 战役 4 批次④）
// 世界层 = PaintCanvas（预烘焙油画位图按烘焙态轮换 + 每帧运动/光斑层矢量重画，单 canvas）
//   位图由 scripts/bake_paint.mjs 预渲染（底稿+两遍分区笔触+角色层，8 态）——
//   「底稿与笔触预渲染为静态图，仅光斑/局部运动层走 useCurrentFrame」性能纪律。
//   位图经模块级 Image 缓存 + delayRender 预载（顺序渲染热帧零解码抖动）。
// 信息层 = TitleCard / CaptionCard / PaletteCard / Vignette
// 纪律：全确定性（mulberry32/hash，禁 Math.random/Date）。
// 技法借鉴 huashu-art-motion scenes/08_impressionism.js (MIT, alchaincyf)，TSX 重写。
// ============================================================================

export const BAKE_N = 8;
/** 烘焙态轮换序列（乒乓）：0→7→0 往复，消除 7→0 的绕回跳变（方向场每步都是小步长） */
const PINGPONG = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1];
const paintUrl = (i: number) => staticFile(`assets/light-dabs/paint/scene-${i}.png`);

// ---- 模块级位图缓存：页面生命周期内只 fetch+decode 一次 ----
const imgCache = new Map<string, HTMLImageElement>();
const preloadHandle = delayRender('light-dabs paint preload');
{
  const urls: string[] = [];
  for (let i = 0; i < BAKE_N; i++) urls.push(paintUrl(i));
  Promise.all(
    urls.map((u) => new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = u;
      imgCache.set(u, img);
    })),
  ).then(() => continueRender(preloadHandle));
}
const getPaintingImg = (i: number): HTMLImageElement | undefined => imgCache.get(paintUrl(i));

const hash1 = (n: number) => {
  let a = (Math.floor(n) * 2654435761) % 2147483647;
  a = (a ^ 61) ^ (a >>> 16);
  a = (a + (a << 3)) | 0;
  a = a ^ (a >>> 4);
  a = Math.imul(a, 0x27d4eb2d);
  return (((a ^ (a >>> 15)) >>> 0) % 10000) / 10000;
};
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const inv = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
export const outC = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);
export const outBack = (u: number, s = 1.7) => {
  const x = clamp01(u);
  const c3 = s + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
};

// ---- 世界画布：预烘焙位图 drawImage（烘焙态轮换=方向场摇曳）+ 每帧运动层（单 canvas）----
export const PaintCanvas: React.FC<{absF: number}> = ({absF}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const t = (absF - 1) / FPS;
  const idx = PINGPONG[((Math.floor((absF - 1) * 8 / FPS) % PINGPONG.length) + PINGPONG.length) % PINGPONG.length];
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    const img = getPaintingImg(idx);
    if (img?.complete && img.naturalWidth > 0) g.drawImage(img, 0, 0, W, H);
    drawMotion(g, t, absF);
  }, [absF, idx, t]);
  return (
    <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, display: 'block'}} />
  );
};

// ---- 标题卡（钩子/收束：米白纸片 + 玫瑰墨字，印象派画框细线）----
export const TitleCard: React.FC<{f: number; at: number; sub?: string; small?: boolean; to?: number}> =
({f, at, sub, small, to}) => {
  const u = outBack(inv(at, at + 8, f), 1.9);
  const out = to !== undefined ? 1 - inv(to, to + 8, f) : 1;
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: small ? 64 : 84, textAlign: 'center',
      transform: `scale(${(0.86 + 0.14 * u).toFixed(3)})`, opacity: Math.min(u, out), zIndex: 30}}>
      <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900,
        fontSize: small ? 46 : 58, color: '#6a3a58', letterSpacing: 8,
        textShadow: '0 3px 0 rgba(255,250,240,0.9), 0 6px 18px rgba(120,70,120,0.25)'}}>花园里的一小时</div>
      <svg width={380} height={16} style={{display: 'block', margin: '8px auto 0'}}>
        <path d="M10 9 C 110 3, 270 14, 370 6" stroke="#e8a0b8" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.9} />
      </svg>
      {sub ? (
        <div style={{marginTop: 8, fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700,
          fontSize: 21, color: '#9a6a8a', letterSpacing: 4, opacity: inv(at + 8, at + 14, f)}}>{sub}</div>
      ) : null}
    </div>
  );
};

// ---- 字幕卡（米白纸片 + 玫瑰墨字 + hash 微转角）----
export const CaptionCard: React.FC<{f: number; from: number; to: number; text: string}> = ({f, from, to, text}) => {
  const u = outBack(inv(from, from + 5, f), 2.0);
  const out = 1 - inv(to - 3, to, f);
  if (u <= 0 || f > to || out <= 0) return null;
  const rot = (hash1(from) - 0.5) * 1.6;
  return (
    <div style={{position: 'absolute', left: '50%', bottom: 30, transform: `translateX(-50%) rotate(${rot.toFixed(2)}deg) scale(${(0.82 + 0.18 * u).toFixed(3)})`,
      opacity: Math.min(u, out), zIndex: 40}}>
      <div style={{background: 'rgba(252,246,238,0.94)', borderRadius: 13, padding: '9px 24px',
        border: '2px solid rgba(180,130,160,0.45)', boxShadow: '3px 5px 0 rgba(120,70,120,0.28)',
        fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 29, color: '#6a3a58', letterSpacing: 2}}>
        {text}
      </div>
    </div>
  );
};

// ---- 锁死 token 色板卡（签名②可视化：三族粉彩上屏）----
const Chip: React.FC<{hex: string; f: number; at: number}> = ({hex, f, at}) => {
  const u = outBack(inv(at, at + 6, f), 2.2);
  if (u <= 0) return null;
  return (
    <div style={{
      width: 34, height: 27, borderRadius: 6, background: hex,
      border: '2px solid rgba(150,100,140,0.45)', boxShadow: '2px 3px 0 rgba(120,70,120,0.25)',
      transform: `scale(${u.toFixed(3)})`, opacity: Math.min(1, u * 1.6),
    }} />
  );
};
export const PaletteCard: React.FC<{f: number; at: number}> = ({f, at}) => {
  const rows: Array<{name: string; hexes: string[]}> = [
    {name: '粉紫墙系', hexes: ['#f3c6d2', '#e8b6dc', '#f6dcc0', '#d8c0ec', '#fbe8b0', '#f0a8c0', '#c8b8f0', '#fff2d8', '#e8c8f0']},
    {name: '奶黄阳光', hexes: ['#fff0b0', '#fbe08a', '#ffe8c8', '#f8d0d8', '#fff8e0', '#f0c0d8', '#e8d0f8']},
    {name: '玫瑰橙紫地面', hexes: ['#e8a090', '#d88aa0', '#f0b890', '#c890b8', '#f6c8a0', '#b0a0d8', '#e89880']},
  ];
  let k = 0;
  return (
    <div style={{position: 'absolute', left: 56, bottom: 84, display: 'flex', flexDirection: 'column', gap: 9,
      background: 'rgba(252,246,238,0.93)', borderRadius: 14, padding: '13px 19px',
      boxShadow: '4px 6px 0 rgba(120,70,120,0.3)', border: '2px solid rgba(150,100,140,0.4)', zIndex: 32}}
      >
      {rows.map((row) => (
        <div key={row.name} style={{display: 'flex', alignItems: 'center', gap: 7}}>
          <div style={{width: 96, fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 15, color: '#6a3a58'}}>{row.name}</div>
          {row.hexes.map((hx, i) => <Chip key={hx + i} hex={hx} f={f} at={at + (k++) * 2} />)}
        </div>
      ))}
    </div>
  );
};

// ---- 暗角（暖玫瑰调，全片常驻）----
export const Vignette: React.FC = () => (
  <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50,
    background: 'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 60%, rgba(96,48,72,0.30) 100%)'}} />
);

// ---- 字幕序列（消费 tts_build 生成的 SUBS）----
export const SubtitleLayer: React.FC<{f: number}> = ({f}) => (
  <>
    {SUBS.map((sub, i) => (
      <CaptionCard key={i} f={f} from={sub.from} to={sub.to} text={sub.text} />
    ))}
  </>
);

// ---- Bake 合成（不进正片）：底稿+两遍分区笔触+角色层按烘焙态渲染（scripts/bake_paint.mjs 消费）----
export const BAKE_N_FRAMES = BAKE_N;
export const BakeFrame: React.FC = () => {
  const f = useCurrentFrame();
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    const painting = getPainting(f % BAKE_N);
    g.clearRect(0, 0, painting.width, painting.height);
    g.drawImage(painting, 0, 0);
  }, [f]);
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0}} />;
};

// ---- Bench 合成（性能门实测，不进正片）：热帧=drawImage(烘焙位图)+drawMotion，×90 均值 ----
const loadImg = (i: number) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = () => rej(new Error(`bench img load fail: scene-${i}`));
  im.src = staticFile(`assets/light-dabs/paint/scene-${i}.png`);
});
export const BenchFrame: React.FC = () => {
  const [line, setLine] = React.useState('bench running...');
  const [handle] = React.useState(() => delayRender('bench-hotframe'));
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const img = await loadImg(0);
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const g = cv.getContext('2d')!;
      const flush = () => g.getImageData(0, 0, 1, 1); // 强制同步：把 GPU 栅格化计进成本
      for (let i = 0; i < 12; i++) {
        const t = i / 30;
        g.clearRect(0, 0, W, H);
        g.drawImage(img, 0, 0, W, H);
        drawMotion(g, t, i + 1);
        flush();
      }
      const t0 = performance.now();
      const N = 90;
      for (let i = 0; i < N; i++) {
        const t = i / 30;
        g.clearRect(0, 0, W, H);
        g.drawImage(img, 0, 0, W, H);
        drawMotion(g, t, i + 1);
        flush();
      }
      const ms = (performance.now() - t0) / N;
      if (!alive) return;
      setLine(`hot-frame scene=${ms.toFixed(2)}ms (drawImage+motion, n=90)`);
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
