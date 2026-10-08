import React from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {W, H, FPS} from '../common';
import {
  drawGlow, swirlPhase, HERO_VORTEX, BOIL_FPS, type WorldVariant,
} from './world';

// ============================================================================
// kit.tsx — swirl-oil 图元库（梵高后印象派 · 战役 4 批次④）
// 世界层 = OilCanvas（预烘焙油画位图按 boilSeed%8 换图 + 每帧亮度层矢量重画，单 canvas）
//   位图由 scripts/bake_paint.mjs 预渲染（底稿+三遍分区笔触+道具层+环境线稿）——
//   「底稿与三遍笔触预渲染为静态图，仅方向场时间项/亮度层走 useCurrentFrame」性能纪律。
//   位图经模块级 Image 缓存 + delayRender 预载（顺序渲染热帧零解码抖动、零 DOM 重挂载）。
// 转场层 = SpiralSuck（星空漩涡卷入，签名④；盘内容=预烘焙漩涡特写位图 clip+反向旋入）
// 信息层 = TitleCard / OilCaption / GuideArrows / ColorChips
// 纪律：全确定性（mulberry32/hash，禁 Math.random/Date）。
// ============================================================================

export const BAKE_N = 8;
const paintUrl = (variant: WorldVariant, i: number) => staticFile(`assets/swirl-oil/paint/${variant}-${i}.png`);

// ---- 模块级位图缓存：页面生命周期内只 fetch+decode 一次（delayRender 保证渲前就绪）----
const imgCache = new Map<string, HTMLImageElement>();
const preloadHandle = delayRender('swirl-oil paint preload');
{
  const urls: string[] = [];
  (['scene', 'vortex'] as WorldVariant[]).forEach((v) => {
    for (let i = 0; i < BAKE_N; i++) urls.push(paintUrl(v, i));
  });
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
const getPaintingImg = (variant: WorldVariant, i: number): HTMLImageElement | undefined =>
  imgCache.get(paintUrl(variant, i));

// ---- 缓动 ----
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const inv = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
export const outC = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);
export const inQ = (u: number) => clamp01(u) * clamp01(u);
export const outQ = (u: number) => 1 - (1 - clamp01(u)) * (1 - clamp01(u));
export const outBack = (u: number, s = 1.7) => {
  const x = clamp01(u);
  const c3 = s + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
};
export const lerpN = (a: number, b: number, u: number) => a + (b - a) * clamp01(u);
const hash1 = (n: number) => {
  let a = (Math.floor(n) * 2654435761) % 2147483647;
  a = (a ^ 61) ^ (a >>> 16);
  a = (a + (a << 3)) | 0;
  a = a ^ (a >>> 4);
  a = Math.imul(a, 0x27d4eb2d);
  return (((a ^ (a >>> 15)) >>> 0) % 10000) / 10000;
};

// ---- 世界画布：预烘焙位图 drawImage（8fps boil 换图）+ 每帧亮度层（单 canvas）----
export const OilCanvas: React.FC<{absF: number; variant?: WorldVariant}> = ({absF, variant = 'scene'}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const t = absF / FPS;
  const idx = Math.floor(t * BOIL_FPS) % BAKE_N;
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    const img = getPaintingImg(variant, idx);
    if (img?.complete && img.naturalWidth > 0) g.drawImage(img, 0, 0, W, H);
    drawGlow(g, t, variant, swirlPhase(t));
  }, [absF, variant]);
  return (
    <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, display: 'block'}} />
  );
};
const boilSeedOf = (t: number) => Math.floor(t * BOIL_FPS);

// ---- 星空漩涡卷入转场（签名④）：扩张圆盘=预烘焙漩涡特写位图（CSS clip 圆 + 反向旋入 + 1.35 过扫），
// 盖满即接管全屏——被吞掉的屏幕是油画，不是平色块。臂/盘缘/速度线走透明 canvas（零图片加载竞态）。----
export const SpiralSuck: React.FC<{absF: number; from: number; coverAt: number; fadeTo: number; cx?: number; cy?: number}> =
({absF, from, coverAt, fadeTo, cx = HERO_VORTEX[0], cy = HERO_VORTEX[1]}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const u = inv(from, coverAt, absF);
  const fade = 1 - inv(fadeTo, fadeTo + 8, absF);
  const on = absF >= from && fade > 0;
  const grow = outC(u);
  const coverR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 90;
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    if (!on) return;
    const t = absF / FPS;
    const r = coverR * grow;
    // 圆盘内容 = 预烘焙漩涡特写位图（大漩涡中心 (640,330) 对齐盘心，反向旋入 + 1.35 过扫盖角）
    const img = getPaintingImg('vortex', boilSeedOf(t) % BAKE_N);
    if (img?.complete && img.naturalWidth > 0) {
      g.save();
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.clip();
      g.translate(cx, cy);
      g.rotate(0.55 * (1 - grow));
      g.scale(1.35, 1.35);
      g.drawImage(img, -640, -360, W, H);
      g.restore();
    }
    // 盘缘深蓝描边（漩涡边界像一笔厚涂）
    g.strokeStyle = 'rgba(20,26,60,0.85)';
    g.lineWidth = 20;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    // 三条螺旋臂（半透明新笔，快旋）
    g.lineCap = 'round';
    for (let arm = 0; arm < 3; arm++) {
      g.strokeStyle = arm % 2 ? 'rgba(143,179,236,0.55)' : 'rgba(90,130,214,0.58)';
      g.lineWidth = 20 + arm * 6;
      g.beginPath();
      const spin = t * 5.2 + (arm * Math.PI * 2) / 3;
      for (let s = 0; s <= 26; s++) {
        const q = s / 26;
        const rr = 18 + q * coverR * grow * 1.06;
        const aa = spin - q * 4.6;
        const px = cx + Math.cos(aa) * rr;
        const py = cy + Math.sin(aa) * rr * 0.94;
        if (s) g.lineTo(px, py); else g.moveTo(px, py);
      }
      g.stroke();
    }
    // 内吸速度线（四周向中心飞）
    for (let i = 0; i < 12; i++) {
      const h = hash1(i * 7 + 3);
      const ang = h * Math.PI * 2 + t * 1.6;
      const rr0 = coverR * (1.04 - 0.5 * grow);
      const rr1 = rr0 - (h * 260 + ((t * 620 + i * 97) % 260));
      const a1 = Math.max(rr1, 30);
      const a0 = Math.max(rr0, a1 + 34);
      g.strokeStyle = `rgba(143,179,238,${(0.42 * grow).toFixed(3)})`;
      g.lineWidth = 3 + h * 3;
      g.beginPath();
      g.moveTo(cx + Math.cos(ang) * a1, cy + Math.sin(ang) * a1 * 0.94);
      g.lineTo(cx + Math.cos(ang) * a0, cy + Math.sin(ang) * a0 * 0.94);
      g.stroke();
    }
  }, [absF, from, coverAt, fadeTo, cx, cy, on, u, grow, coverR]);
  if (!on) return null;
  return (
    <canvas ref={ref} width={W} height={H}
      style={{position: 'absolute', left: 0, top: 0, display: 'block', opacity: fade, pointerEvents: 'none'}} />
  );
};

// ---- 方向场指示箭头（行进虚线，签名①的可视化）----
export const GuideArrow: React.FC<{from: [number, number]; to: [number, number]; f: number; at: number; col?: string; w?: number}> =
({from, to, f, at, col = '#f6f1e6', w = 4}) => {
  const u = outC(inv(at, at + 8, f));
  if (u <= 0) return null;
  const x2 = from[0] + (to[0] - from[0]) * u;
  const y2 = from[1] + (to[1] - from[1]) * u;
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const dash = 12 + 8;
  const off = -((f * 2.2) % dash);
  return (
    <g opacity={0.9}>
      <line x1={from[0]} y1={from[1]} x2={x2} y2={y2} stroke={col} strokeWidth={w}
        strokeDasharray={`${dash - 8} ${8}`} strokeDashoffset={off} strokeLinecap="round" />
      <polygon
        points={`${x2 + Math.cos(ang) * 13},${y2 + Math.sin(ang) * 13} ${x2 + Math.cos(ang + 2.5) * 11},${y2 + Math.sin(ang + 2.5) * 11} ${x2 + Math.cos(ang - 2.5) * 11},${y2 + Math.sin(ang - 2.5) * 11}`}
        fill={col} opacity={u > 0.6 ? 1 : 0} />
    </g>
  );
};

// ---- 色相 chips（签名②可视化：锁死 token 原样上屏）----
const Chip: React.FC<{hex: string; f: number; at: number}> = ({hex, f, at}) => {
  const u = outBack(inv(at, at + 7, f), 2.2);
  if (u <= 0) return null;
  return (
    <div style={{
      width: 46, height: 36, borderRadius: 7, background: hex,
      border: '2px solid rgba(28,36,88,0.55)', boxShadow: '2px 3px 0 rgba(28,36,88,0.35)',
      transform: `scale(${u.toFixed(3)})`, opacity: Math.min(1, u * 1.6),
    }} />
  );
};
export const ColorChips: React.FC<{f: number; at: number}> = ({f, at}) => {
  const rows: Array<{name: string; hexes: string[]}> = [
    {name: '星空 6 色', hexes: ['#22339a', '#2f4fb8', '#5c86dc', '#8fb6ee', '#1b2a78', '#3c6bd0']},
    {name: '墙 8 色蓝紫', hexes: ['#7f9be6', '#5f7fd8', '#a7bbf2', '#6c6fd2', '#8ad0e6', '#c3cbf6', '#4f6cc8', '#9a8fe0']},
    {name: '地板 7 色暖', hexes: ['#c0573c', '#a8453a', '#d7774a', '#8e3b30', '#5f8f6a', '#c96a52', '#e08a5c']},
  ];
  let k = 0;
  return (
    <div style={{position: 'absolute', left: 74, bottom: 92, display: 'flex', flexDirection: 'column', gap: 10,
      background: 'rgba(246,241,230,0.93)', borderRadius: 16, padding: '16px 22px',
      boxShadow: '4px 6px 0 rgba(20,26,60,0.4)', border: '2px solid rgba(28,36,88,0.4)'}}
      >
      {rows.map((row) => (
        <div key={row.name} style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <div style={{width: 92, fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 17, color: '#1c2458'}}>{row.name}</div>
          {row.hexes.map((hx, i) => <Chip key={hx + i} hex={hx} f={f} at={at + (k++) * 2} />)}
        </div>
      ))}
    </div>
  );
};

// ---- 标题卡（钩子 / 收束）----
export const TitleCard: React.FC<{f: number; at: number; sub?: string; small?: boolean}> = ({f, at, sub, small}) => {
  const u = outBack(inv(at, at + 8, f), 1.9);
  const out = 1 - inv(at + 62, at + 70, f) * (small ? 0 : 1);
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: small ? 78 : 96, textAlign: 'center',
      transform: `scale(${(0.86 + 0.14 * u).toFixed(3)})`, opacity: Math.min(u, out)}}>
      <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900,
        fontSize: small ? 54 : 66, color: '#f6f1e6', letterSpacing: 6,
        textShadow: '0 4px 0 rgba(20,26,60,0.65), 0 0 34px rgba(143,179,236,0.35)'}}>梵高的夜班</div>
      <svg width={420} height={18} style={{display: 'block', margin: '8px auto 0'}}>
        <path d="M8 10 C 120 2, 300 16, 412 7" stroke="#f6d84a" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.92} />
      </svg>
      {sub ? (
        <div style={{marginTop: 10, fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700,
          fontSize: 24, color: '#c3cbf6', letterSpacing: 3, opacity: inv(at + 8, at + 14, f)}}>{sub}</div>
      ) : null}
    </div>
  );
};

// ---- 字幕卡（奶油纸片 + 深蓝墨字 + 轻微手贴角度）----
export const OilCaption: React.FC<{f: number; from: number; to: number; text: string}> = ({f, from, to, text}) => {
  const u = outBack(inv(from, from + 5, f), 2.0);
  const out = 1 - inv(to - 3, to, f);
  if (u <= 0 || f > to || out <= 0) return null;
  const rot = (hash1(from) - 0.5) * 1.7;
  return (
    <div style={{position: 'absolute', left: '50%', bottom: 34, transform: `translateX(-50%) rotate(${rot.toFixed(2)}deg) scale(${(0.82 + 0.18 * u).toFixed(3)})`,
      opacity: Math.min(u, out), zIndex: 40}}>
      <div style={{background: 'rgba(246,241,230,0.95)', borderRadius: 14, padding: '10px 26px',
        border: '2px solid rgba(28,36,88,0.45)', boxShadow: '3px 5px 0 rgba(20,26,60,0.4)',
        fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 30, color: '#1c2458', letterSpacing: 2}}>
        {text}
      </div>
    </div>
  );
};

// ---- 暗角（全片常驻，收边）----
export const Vignette: React.FC = () => (
  <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50,
    background: 'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 58%, rgba(8,12,38,0.42) 100%)'}} />
);
