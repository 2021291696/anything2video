import React from 'react';
import {AbsoluteFill, continueRender, delayRender, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {W, H, FPS} from '../common';
import {SUBS} from '../common/subs';
import {hash2, PAL, FLICKER_FPS, STATES} from './pointillism';
import {S2_MOSAIC} from './world';

// ============================================================================
// kit.tsx — optical-dots 运行时图元库
// 性能纪律（卡 brief）：静态点阵烘焙（bake.tsx + scripts/bake_paint.mjs → 28 张 PNG），
//   热帧 = drawImage 场景态（6fps flicker 换态）+ 光渗层 α 脉动；仅转场/换色波按帧逐点画。
// 签名组件：
//   FieldCanvas  烘焙点彩场（5 态循环 = 7% 点换配对色「空气在颤」）
//   CrystalWipe  pointill 结晶转场（点 0→长出→对角换色波、换色瞬间 1.35 跳、收没）
//   MixWave      SC02 红蓝镶嵌区换紫波（退后一步 → 变成紫）
//   TitleCard / CaptionChip / SubsBand / Vignette  信息层（信息层不上点彩，保读性）
// 确定性：hash2 纯散列；无 Math.random/Date/网络。
// ============================================================================

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const inv = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
export const seg = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
export const outC = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);
export const inQ = (u: number) => clamp01(u) * clamp01(u);
export const lerpN = (a: number, b: number, u: number) => a + (b - a) * clamp01(u);

// ---- 烘焙位图缓存：页面生命周期内 fetch+decode 一次（delayRender 保证渲前就绪）----
const ASSET_DIR = 'assets/optical-dots/field';
const BAKE_NAMES = [
  's1-0', 's1-1', 's1-2', 's1-3', 's1-4',
  's2-0', 's2-1', 's2-2', 's2-3', 's2-4',
  's3-0', 's3-1', 's3-2', 's3-3', 's3-4',
  's4-0', 's4-1', 's4-2', 's4-3', 's4-4',
  'hook-1', 'hook-2', 'hook-3', 'hook-4', 'hook-5', 'hook-6',
  'glow-s3', 'glow-s4',
];
const imgCache = new Map<string, HTMLImageElement>();
const preloadHandle = delayRender('optical-dots field preload');
{
  Promise.all(BAKE_NAMES.map((n) => new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = staticFile(`${ASSET_DIR}/${n}.png`);
    imgCache.set(n, img);
  }))).then(() => continueRender(preloadHandle));
}
const img = (name: string): HTMLImageElement | undefined => imgCache.get(name);

/** 6fps flicker 态（正片换态节拍，与烘焙 st 一致）。 */
export const flickerState = (absF: number) => Math.floor((absF / FPS) * FLICKER_FPS) % STATES;

/** 烘焙点彩场：asset=PNG 名（如 `s3-2` / `hook-4`）；glow=光渗呼吸层名（可选，α 脉动）。 */
export const FieldCanvas: React.FC<{asset: string; glow?: string; style?: React.CSSProperties}> = ({asset, glow, style}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const f = useCurrentFrame();
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    const main = img(asset);
    if (main && main.complete && main.naturalWidth > 0) g.drawImage(main, 0, 0, W, H);
    if (glow) {
      const gl = img(glow);
      if (gl && gl.complete && gl.naturalWidth > 0) {
        g.globalAlpha = 0.15 + 0.11 * Math.sin(((f / FPS) * Math.PI * 2) / 2.6);
        g.drawImage(gl, 0, 0, W, H);
        g.globalAlpha = 1;
      }
    }
  }, [asset, glow, f]);
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, display: 'block', ...style}} />;
};

/** 采样两张烘焙位图的像素（转场 useMemo 一次）。 */
const samplePixels = (name: string): Uint8ClampedArray | null => {
  const im = img(name);
  if (!im || !im.complete || im.naturalWidth === 0) return null;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d', {willReadFrequently: true});
  if (!g) return null;
  g.drawImage(im, 0, 0, W, H);
  return g.getImageData(0, 0, W, H).data;
};

type CrystalDot = {px: number; py: number; sw: number; ca: string; cb: string};
const crystalDots = (fromData: Uint8ClampedArray, toData: Uint8ClampedArray, pitch: number): CrystalDot[] => {
  const rowh = pitch * 0.866;
  const dots: CrystalDot[] = [];
  for (let j = 0, y = pitch / 2; y < H + pitch; j++, y += rowh) {
    for (let x = (j % 2) * (pitch / 2); x < W + pitch; x += pitch) {
      const k = ((Math.min(H - 1, Math.max(0, y | 0)) * W) + Math.min(W - 1, Math.max(0, x | 0))) * 4;
      const ca = `rgb(${fromData[k]},${fromData[k + 1]},${fromData[k + 2]})`;
      const cb = `rgb(${toData[k]},${toData[k + 1]},${toData[k + 2]})`;
      const sw = Math.min(1, Math.max(0, ((x / W) * 0.6 + (y / H) * 0.4) * 0.5 + hash2(x | 0, y | 0) * 0.25 + 0.15));
      dots.push({px: x, py: y, sw, ca, cb});
    }
  }
  return dots;
};

/** pointill 结晶转场（签名⑤）：旧画面长点（0→满）→ 纸色 → 对角波次换新色（换色瞬间 1.35 跳）→ 新画面显影、点收回。 */
export const CrystalWipe: React.FC<{from: string; to: string; u: number; pitch?: number}> = ({from, to, u, pitch = 14}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const dots = React.useMemo<CrystalDot[]>(() => {
    const da = samplePixels(from);
    const db = samplePixels(to);
    if (!da || !db) return [];
    return crystalDots(da, db, pitch);
  }, [from, to, pitch]);
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    const ia = img(from);
    const ib = img(to);
    if (ia && ia.complete) g.drawImage(ia, 0, 0, W, H);
    if (u > 0.05) {
      g.fillStyle = `rgba(246,238,220,${seg(0.05, 0.4, u).toFixed(3)})`;
      g.fillRect(0, 0, W, H);
    }
    if (u > 0.6 && ib && ib.complete) {
      g.globalAlpha = seg(0.6, 0.95, u);
      g.drawImage(ib, 0, 0, W, H);
      g.globalAlpha = 1;
    }
    const grow = outC(seg(0, 0.3, u));
    const shrink = 1 - inQ(seg(0.7, 1, u));
    const R = pitch * 0.46 * grow * shrink;
    if (R < 0.4 || dots.length === 0) return;
    const buckets = new Map<string, Path2D>();
    for (const d of dots) {
      const useB = u > d.sw;
      const pop = Math.abs(u - d.sw) < 0.04 ? 1.35 : 1; // 换色瞬间点「跳」一下
      const rr = R * pop;
      const key = useB ? d.cb : d.ca;
      let p = buckets.get(key);
      if (!p) buckets.set(key, (p = new Path2D()));
      p.moveTo(d.px + rr, d.py);
      p.arc(d.px, d.py, rr, 0, Math.PI * 2);
    }
    buckets.forEach((p, col) => {
      g.fillStyle = col;
      g.fill(p);
    });
  }, [u, dots, pitch]);
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, display: 'block'}} />;
};

type WaveDot = {px: number; py: number; sw: number; ca: string; cb: string};
const VIOLETS = ['#7a4aa8', '#9a7ac8', '#6a3f96', '#8a5cb8'];
/** SC02 换紫波：镶嵌大点按对角波次从红/蓝换成紫（换色瞬间 1.35 跳）——「退后一步，变成紫」的落点。 */
export const MixWave: React.FC<{u: number; rect?: {x: number; y: number; w: number; h: number}; pitch?: number; rad?: number}> =
({u, rect = S2_MOSAIC, pitch = 27, rad = 11.2}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const dots = React.useMemo<WaveDot[]>(() => {
    const rowh = pitch * 0.866;
    const out: WaveDot[] = [];
    const {x: rx, y: ry, w: rw, h: rh} = rect;
    for (let j = 0, y = ry + pitch / 2; y < ry + rh + pitch; j++, y += rowh) {
      for (let i = 0, x = rx + (j % 2) * (pitch / 2); x < rx + rw + pitch; i++, x += pitch) {
        const sw = Math.min(1, Math.max(0, ((x - rx) / rw) * 0.55 + ((y - ry) / rh) * 0.3) + hash2(x | 0, y | 0) * 0.28 + 0.1);
        out.push({
          px: x, py: y, sw,
          ca: (i + j) % 2 === 0 ? '#e0432a' : '#2a3a9a',
          cb: VIOLETS[Math.floor(hash2(i * 3 + 1, j * 5 + 7) * VIOLETS.length) % VIOLETS.length],
        });
      }
    }
    return out;
  }, [rect, pitch]);
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    const grow = outC(seg(0, 0.12, u));
    const shrink = 1 - inQ(seg(0.88, 1, u));
    const R = rad * grow * shrink;
    if (R < 0.4) return;
    for (const d of dots) {
      const useB = u > d.sw;
      const pop = Math.abs(u - d.sw) < 0.05 ? 1.35 : 1;
      g.fillStyle = useB ? d.cb : d.ca;
      g.beginPath();
      g.arc(d.px, d.py, R * pop, 0, Math.PI * 2);
      g.fill();
    }
  }, [u, dots, rad]);
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, display: 'block'}} />;
};

// ---- 信息层（不上点彩，保读性）----
const INK = '#23244a';
const CREAM = '#f8f0dc';

export const TitleCard: React.FC<{f: number; at: number}> = ({f, at}) => {
  const u = outC(inv(at, at + 10, f));
  const fade = 1 - inv(at + 30, at + 36, f);
  if (u <= 0 || fade <= 0) return null;
  const dotIn = (t: number) => outC(inv(at + 6 + t * 5, at + 12 + t * 5, f));
  const violet = outC(inv(at + 24, at + 32, f));
  return (
    <div style={{position: 'absolute', left: 96, top: 236, opacity: (u * fade).toFixed(3),
      transform: `translateY(${((1 - u) * 26).toFixed(1)}px)`}}>
      <div style={{background: 'rgba(248,240,220,0.94)', borderRadius: 18, padding: '30px 44px 26px',
        boxShadow: '0 14px 34px rgba(30,26,60,0.35)', border: '2px solid rgba(35,36,74,0.25)'}}>
        <div style={{fontFamily: `'Noto Serif SC', serif`, fontWeight: 900, fontSize: 62, color: INK, letterSpacing: 6}}>颜色的算术</div>
        <div style={{fontFamily: `'Noto Serif SC', serif`, fontWeight: 600, fontSize: 24, color: '#6a5a8a', letterSpacing: 10, marginTop: 6}}>大 碗 岛 的 夏 天</div>
      </div>
      <svg width={230} height={64} style={{position: 'absolute', right: -18, bottom: -46}}>
        <circle cx={34} cy={30} r={17} fill={PAL[9]} opacity={dotIn(0)} />
        <circle cx={86} cy={30} r={17} fill={PAL[1]} opacity={dotIn(1)} />
        <circle cx={160} cy={30} r={17} fill={PAL[11]} opacity={violet} />
        <circle cx={160} cy={30} r={17} fill="none" stroke={CREAM} strokeWidth={2.5} opacity={violet} />
      </svg>
    </div>
  );
};

/** 小标注卡（画面术语注解，蜡纸质感）。 */
export const CaptionChip: React.FC<{x: number; y: number; text: string; sub?: string; u: number; align?: 'left' | 'center'}> =
({x, y, text, sub, u, align = 'left'}) => {
  if (u <= 0) return null;
  const e = outC(u);
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(${align === 'center' ? '-50%' : '0'}, ${(1 - e) * 14}px)`,
      opacity: e.toFixed(3), background: 'rgba(248,240,220,0.93)', borderRadius: 12, padding: '12px 20px',
      border: '2px solid rgba(35,36,74,0.28)', boxShadow: '0 8px 22px rgba(30,26,60,0.28)', whiteSpace: 'nowrap'}}>
      <div style={{fontFamily: `'Noto Sans SC', sans-serif`, fontWeight: 800, fontSize: 27, color: INK}}>{text}</div>
      {sub ? <div style={{fontFamily: `'Noto Sans SC', sans-serif`, fontWeight: 600, fontSize: 18, color: '#6a5a8a', marginTop: 2}}>{sub}</div> : null}
    </div>
  );
};

/** 字幕带：奶油字 + 深蓝描边（绘画馆藏标签气质，Noto Serif SC）。 */
const ringShadow = (r: number, k: number, col: string) => Array.from({length: k}, (_, i) => {
  const a = (i / k) * Math.PI * 2;
  return `${(Math.cos(a) * r).toFixed(2)}px ${(Math.sin(a) * r).toFixed(2)}px 0 ${col}`;
});
export const SubsBand: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    {SUBS.map((s, k) => (
      <Sequence key={k} from={s.from - 1} durationInFrames={Math.max(1, s.to - s.from + 1)}>
        <SubLine text={s.text} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
const SubLine: React.FC<{text: string}> = ({text}) => (
  <div style={{position: 'absolute', left: W / 2, top: 642, transform: 'translateX(-50%)', whiteSpace: 'nowrap',
    fontFamily: `'Noto Serif SC', serif`, fontWeight: 800, fontSize: 40, color: CREAM, letterSpacing: 3,
    textShadow: [...ringShadow(4, 16, 'rgba(26,32,88,0.95)'), ...ringShadow(2.4, 8, 'rgba(26,32,88,0.95)'), ...ringShadow(1.2, 4, 'rgba(26,32,88,0.95)')].join(', ')}}>
    {text}
  </div>
);

export const Vignette: React.FC = () => (
  <div style={{position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse 118% 108% at 50% 46%, rgba(0,0,0,0) 62%, rgba(30,22,50,0.24) 100%)'}} />
);

/** 本地字体（Noto Serif/Sans SC，OFL 随模板分发）。 */
export const Fonts: React.FC = () => {
  const [handle] = React.useState(() => delayRender('fonts'));
  React.useEffect(() => {
    Promise.all([
      new FontFace('Noto Sans SC', `url(${staticFile('fonts/NotoSansSC.ttf')})`, {weight: '100 900'} as FontFaceDescriptors).load(),
      new FontFace('Noto Serif SC', `url(${staticFile('fonts/NotoSerifSC[wght].ttf')})`, {weight: '100 900'} as FontFaceDescriptors).load(),
    ]).then((fs) => {
      fs.forEach((f) => (document.fonts as unknown as {add: (f: FontFace) => void}).add(f));
      continueRender(handle);
    }).catch(() => continueRender(handle));
  }, [handle]);
  return null;
};
