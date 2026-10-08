import React from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {getPainting} from './world';
import {drawMotion, heroEnvelope} from './motion';
import {mulberry32} from './strokes';
import {W, H, FPS} from '../common';
import {SUBS} from '../common/subs';
import {deckY, BAKE_N} from './world';

// ============================================================================
// kit.tsx — lily-pond 图元库（莫奈睡莲 · 战役 4 批次④ D5）
// 世界层 = PaintCanvas（预烘焙油画位图 6 态轮换 = 恰 6fps boil 分档沸腾 + 每帧运动/母题层矢量重画）
//   位图由 scripts/bake_paint.mjs 预渲染（底稿+四遍 boil 分档笔触+桥独立成层）——
//   「底稿与笔触预渲染为静态图，仅光斑/母题层走 useCurrentFrame」性能纪律。
// 转场 = rippleWipe（签名⑥）：旧画 6px 行条正弦错位如倒影被搅 → 新画 3600 根横笔椭圆按
//   椭圆距离荡开（clip 显影）+ 涟漪前沿虚线椭圆 + 水光短横线闪。配方 28 转场机制 TS 重写。
// 信息层 = TitleCard / CaptionCard / PaletteCard / Vignette（水墨蓝墨字 + 藕紫纸片）
// 纪律：全确定性（mulberry32/hash2，禁 Math.random/Date）。
// 技法借鉴 huashu-art-motion scenes/28_monet.js + lib/transitions.js ripple (MIT, alchaincyf)，TSX 重写。
// ============================================================================

/** 烘焙态轮换：idx = floor((f-1)/5) % 6 —— 每 5 帧一换 = 恰 6fps 沸腾（与 boil:6 等价） */
export const bakeIdx = (absF: number): number =>
  ((Math.floor((absF - 1) / 5) % BAKE_N) + BAKE_N) % BAKE_N;

const paintUrl = (i: number) => staticFile(`assets/lily-pond/paint/scene-${i}.png`);

// ---- 模块级位图缓存：页面生命周期内只 fetch+decode 一次 ----
const imgCache = new Map<string, HTMLImageElement>();
const preloadHandle = delayRender('lily-pond paint preload');
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

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const inv = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
export const outC = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);
export const outBack = (u: number, s = 1.7) => {
  const x = clamp01(u);
  const c3 = s + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
};
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

const hash1 = (n: number) => {
  let a = (Math.floor(n) * 2654435761) % 2147483647;
  a = (a ^ 61) ^ (a >>> 16);
  a = (a + (a << 3)) | 0;
  a = a ^ (a >>> 4);
  a = Math.imul(a, 0x27d4eb2d);
  return (((a ^ (a >>> 15)) >>> 0) % 10000) / 10000;
};

// ---- 相机（canvas 空间实现，与 CSS transform scale+origin 逐值等价）----
export interface Cam { s: number; ox: number; oy: number }
export const applyCam = (g: CanvasRenderingContext2D, cam: Cam): void => {
  const {s, ox, oy} = cam;
  g.translate(ox * (1 - s), oy * (1 - s));
  g.scale(s, s);
};

/** 世界一帧（烘焙位图 + 运动层）画进任意 ctx（ripple 转场的 A/B 视图用；cam=identity 时与 PaintCanvas 逐值一致） */
export function drawWorldInto(g: CanvasRenderingContext2D, t: number, f: number, cam: Cam): void {
  g.save();
  applyCam(g, cam);
  const img = getPaintingImg(bakeIdx(f));
  if (img?.complete && img.naturalWidth > 0) g.drawImage(img, 0, 0, W, H);
  else g.drawImage(getPainting(bakeIdx(f)), 0, 0, W, H);
  drawMotion(g, t, f);
  g.restore();
}

// ---- 签名⑥ ripple 转场（配方 28→机制 TS 重写）：旧画行条正弦错位 + 新画横笔椭圆按距离荡开 ----
interface RipStroke { x: number; y: number; l: number; h: number; d: number }
const RIP_CX = 640, RIP_CY = 310;
const RIPPLE_STROKES: RipStroke[] = (() => {
  const r = mulberry32(41);
  const out: RipStroke[] = [];
  for (let i = 0; i < 3600; i++) {
    const x = r() * W, y = r() * H;
    out.push({x, y, l: 40 + r() * 70, h: 9 + r() * 8, d: Math.hypot(x - RIP_CX, (y - RIP_CY) * 1.9) / 1700 + r() * 0.06});
  }
  return out;
})();

export function rippleWipe(g: CanvasRenderingContext2D, A: HTMLCanvasElement, B: HTMLCanvasElement, p: number): void {
  const e = easeInOut(p);
  // 旧画：6px 行条横向正弦错位（倒影被搅），幅度先增后收
  const amp = 46 * Math.sin(Math.PI * Math.min(1, p * 1.2));
  const rowH = 6;
  for (let y = 0; y < H; y += rowH) {
    const d = Math.abs(y - RIP_CY) / H;
    const dx = Math.sin(y * 0.045 - p * 26) * amp * (0.4 + d);
    g.drawImage(A, 0, y, W, rowH, dx, y, W, rowH);
  }
  // 新画：3600 根横笔椭圆按到中心椭圆距离荡开（clip 显影）
  const front = e * 1.15 - 0.05;
  if (front > 0) {
    g.save();
    g.beginPath();
    for (const s of RIPPLE_STROKES) {
      if (s.d > front) continue;
      const k = clamp01((front - s.d) / 0.06);
      g.ellipse(s.x, s.y, s.l * k / 2 + 1, s.h / 2, 0, 0, Math.PI * 2);
    }
    g.clip();
    g.drawImage(B, 0, 0);
    g.restore();
  }
  // 涟漪前沿：3 圈浅色虚线椭圆（dash 流动）
  g.save(); g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const R = front * 2300 - k * 70;
    if (R <= 0) continue;
    g.strokeStyle = `rgba(240,246,255,${(0.7 - k * 0.2).toFixed(2)})`;
    g.lineWidth = 10 - k * 2;
    g.setLineDash([46, 22]);
    g.lineDashOffset = -p * 300;
    g.beginPath(); g.ellipse(RIP_CX, RIP_CY, R, R / 1.9, 0, 0, Math.PI * 2); g.stroke();
  }
  g.setLineDash([]);
  // 水光短横线闪（转场期闪一遍）
  const r = mulberry32(7 + Math.floor(p * 30));
  const al = Math.sin(Math.PI * p);
  const GL = ['#fffbe8', '#f8e0ec', '#e8f4ff'];
  for (let i = 0; i < 140; i++) {
    const x = r() * W, y = r() * H;
    g.strokeStyle = GL[i % 3];
    g.globalAlpha = al * 0.8;
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18 + r() * 30, y); g.stroke();
  }
  g.globalAlpha = 1;
  // 尾段：新画整体显影兜底
  if (p > 0.7) {
    g.globalAlpha = seg(p, 0.7, 0.95);
    g.drawImage(B, 0, 0);
    g.globalAlpha = 1;
  }
  g.restore();
}

// ---- 世界画布：预烘焙位图 drawImage（6 态轮换=6fps boil）+ 每帧运动层（单 canvas）----
export const PaintCanvas: React.FC<{absF: number}> = ({absF}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const t = (absF - 1) / FPS;
  const idx = bakeIdx(absF);
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    const img = getPaintingImg(idx);
    if (img?.complete && img.naturalWidth > 0) g.drawImage(img, 0, 0, W, H);
    else g.drawImage(getPainting(idx), 0, 0, W, H);
    drawMotion(g, t, absF);
  }, [absF, idx, t]);
  return (
    <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, display: 'block'}} />
  );
};

// ---- 标题卡（藕紫纸片 + 水墨蓝字 + 藕粉弧线）----
export const TitleCard: React.FC<{f: number; at: number; sub?: string; small?: boolean; to?: number}> =
({f, at, sub, small, to}) => {
  const u = outBack(inv(at, at + 8, f), 1.9);
  const out = to !== undefined ? 1 - inv(to, to + 8, f) : 1;
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: small ? 64 : 84, textAlign: 'center',
      transform: `scale(${(0.86 + 0.14 * u).toFixed(3)})`, opacity: Math.min(u, out), zIndex: 30}}>
      <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900,
        fontSize: small ? 46 : 58, color: '#3d4d86', letterSpacing: 8,
        textShadow: '0 3px 0 rgba(250,248,242,0.92), 0 6px 18px rgba(58,74,134,0.28)'}}>池上的桥</div>
      <svg width={380} height={16} style={{display: 'block', margin: '8px auto 0'}}>
        <path d="M10 9 C 110 3, 270 14, 370 6" stroke="#c8a0c8" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.9} />
      </svg>
      {sub ? (
        <div style={{marginTop: 8, fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700,
          fontSize: 21, color: '#6a6aa8', letterSpacing: 4, opacity: inv(at + 8, at + 14, f)}}>{sub}</div>
      ) : null}
    </div>
  );
};

// ---- 字幕卡（藕紫纸片 + 水墨蓝字 + hash 微转角）----
export const CaptionCard: React.FC<{f: number; from: number; to: number; text: string}> = ({f, from, to, text}) => {
  const u = outBack(inv(from, from + 5, f), 2.0);
  const out = 1 - inv(to - 3, to, f);
  if (u <= 0 || f > to || out <= 0) return null;
  const rot = (hash1(from) - 0.5) * 1.6;
  return (
    <div style={{position: 'absolute', left: '50%', bottom: 30, transform: `translateX(-50%) rotate(${rot.toFixed(2)}deg) scale(${(0.82 + 0.18 * u).toFixed(3)})`,
      opacity: Math.min(u, out), zIndex: 40}}>
      <div style={{background: 'rgba(250,248,242,0.94)', borderRadius: 13, padding: '9px 24px',
        border: '2px solid rgba(150,150,200,0.45)', boxShadow: '3px 5px 0 rgba(58,74,134,0.28)',
        fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 29, color: '#3d4d86', letterSpacing: 2}}>
        {text}
      </div>
    </div>
  );
};

// ---- 锁死 token 色板卡（签名可视化：水/叶/粉三族上屏）----
const Chip: React.FC<{hex: string; f: number; at: number}> = ({hex, f, at}) => {
  const u = outBack(inv(at, at + 6, f), 2.2);
  if (u <= 0) return null;
  return (
    <div style={{
      width: 34, height: 27, borderRadius: 6, background: hex,
      border: '2px solid rgba(110,120,180,0.45)', boxShadow: '2px 3px 0 rgba(58,74,134,0.25)',
      transform: `scale(${u.toFixed(3)})`, opacity: Math.min(1, u * 1.6),
    }} />
  );
};
export const PaletteCard: React.FC<{f: number; at: number}> = ({f, at}) => {
  const rows: Array<{name: string; hexes: string[]}> = [
    {name: '池水九色', hexes: ['#5b6fb5', '#7d8fd0', '#9db5e0', '#6aa0a8', '#b7a6d8', '#d9c8e8', '#8fb8a8', '#a6c4e8', '#c8b0d8']},
    {name: '叶绿六色', hexes: ['#5f8f4a', '#7fae5a', '#3f6f4a', '#9cc070', '#6f9a7a', '#b4cc78']},
    {name: '花瓣四色', hexes: ['#f0a0b8', '#f7d0dc', '#fff2f4', '#e88aa0']},
  ];
  let k = 0;
  return (
    <div style={{position: 'absolute', left: 56, bottom: 84, display: 'flex', flexDirection: 'column', gap: 9,
      background: 'rgba(250,248,242,0.93)', borderRadius: 14, padding: '13px 19px',
      boxShadow: '4px 6px 0 rgba(58,74,134,0.3)', border: '2px solid rgba(110,120,180,0.4)', zIndex: 32}}
      >
      {rows.map((row) => (
        <div key={row.name} style={{display: 'flex', alignItems: 'center', gap: 7}}>
          <div style={{width: 96, fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 15, color: '#3d4d86'}}>{row.name}</div>
          {row.hexes.map((hx, i) => <Chip key={hx + i} hex={hx} f={f} at={at + (k++) * 2} />)}
        </div>
      ))}
    </div>
  );
};

// ---- 暗角（水汽紫罗兰调，全片常驻）----
export const Vignette: React.FC = () => (
  <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50,
    background: 'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 60%, rgba(46,64,110,0.30) 100%)'}} />
);

// ---- 字幕序列（消费 tts_build 生成的 SUBS）----
export const SubtitleLayer: React.FC<{f: number}> = ({f}) => (
  <>
    {SUBS.map((sub, i) => (
      <CaptionCard key={i} f={f} from={sub.from} to={sub.to} text={sub.text} />
    ))}
  </>
);

export const useHero = (f: number): number => heroEnvelope(f);

// ---- Bake 合成（不进正片）：底稿+四遍 boil 分档笔触+桥层按烘焙态渲染（scripts/bake_paint.mjs 消费）----
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

// ---- Bench 合成（性能实测，不进正片）：热帧=drawImage(烘焙位图)+drawMotion，×90 均值 ----
const loadImg = (i: number) => new Promise<HTMLImageElement>((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = () => rej(new Error(`bench img load fail: scene-${i}`));
  im.src = staticFile(`assets/lily-pond/paint/scene-${i}.png`);
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

// 转场引用守卫（deckY 在 ripple 特写镜头边框定位用）
export const BRIDGE_DECK_AT = deckY(640);
export {BAKE_N} from './world';
