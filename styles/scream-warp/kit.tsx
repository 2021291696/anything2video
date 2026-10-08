import React from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {W, H, FPS} from '../common';
import {
  BAKE_N, BACKDROP, BAND_COLORS, BAND_W, PW, PH,
  drawWorld, newWarpedForTransition, oldWarpedForTransition,
  registerPaintImg, paintUrl,
} from './world';

// ============================================================================
// kit.tsx — scream-warp 图元库（蒙克表现主义 · 战役 4 批次④）
// 世界层 = ScreamCanvas（预烘焙流线位图按 boilSeed%8 换图 + 尖叫者/流光/声波环矢量
//   重画 + 整幅行列正弦 warp，单 canvas 1920×1080 显示 1280×720）
// 转场层 = ScreamWarp（签名⑥：旧画按行扭曲 + 波浪前沿压 4 道 26px 色带从上往下压）
// 钩子层 = SurgeReveal（血色前沿从地平线涌上天空，沿前沿 2 道血色带）
// 信息层 = TitleCard / MunchCaption / EndCard / Vignette
// 纪律：全确定性（mulberry32/hash，禁 Math.random/Date）；字体 Noto Serif SC +
//   Fraunces（禁漫画手写体，IMFellEnglish/Kalam 教训）。
// ============================================================================

// ---- 模块级位图预载：页面生命周期内只 fetch+decode 一次（delayRender 保证渲前就绪）----
const preloadHandle = delayRender('scream-warp paint preload');
{
  let left = BAKE_N;
  for (let i = 0; i < BAKE_N; i++) {
    const img = new Image();
    img.onload = () => {
      registerPaintImg(i, img);
      if (--left === 0) continueRender(preloadHandle);
    };
    img.onerror = () => {
      if (--left === 0) continueRender(preloadHandle);
    };
    img.src = staticFile(paintUrl(i));
  }
}

// ---- 缓动 / hash ----
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const inv = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
export const outC = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);
export const inOut = (u: number) => (clamp01(u) < 0.5 ? 2 * clamp01(u) * clamp01(u) : 1 - Math.pow(-2 * clamp01(u) + 2, 2) / 2);
export const outBack = (u: number, s = 1.7) => {
  const x = clamp01(u);
  const c3 = s + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
};
const hash1 = (n: number) => {
  let a = (Math.floor(n) * 2654435761) % 2147483647;
  a = (a ^ 61) ^ (a >>> 16);
  a = (a + (a << 3)) | 0;
  a = a ^ (a >>> 4);
  a = Math.imul(a, 0x27d4eb2d);
  return (((a ^ (a >>> 15)) >>> 0) % 10000) / 10000;
};

// ---- 编排曲线（分段线性，absF = 绝对帧 1 起；时间轴锚 = tts_build 实测，见 beat-sheet）----
const TABLE: Array<[number, number]> = [
  [1, 0.30], [30, 0.30], [31, 0.38], [144, 0.52], [184, 0.88], [200, 0.62], [235, 0.62],
  [236, 0.55], [262, 1.0], [300, 1.0], [320, 0.55], [345, 0.45], [406, 0.42],
];
/** 整幅 warp 幅度系数（0.3 常驻微摆 → 1.0 hero 全开） */
export const warpAmp = (f: number): number => {
  for (let i = 0; i < TABLE.length - 1; i++) {
    const [f0, v0] = TABLE[i];
    const [f1, v1] = TABLE[i + 1];
    if (f <= f0) return v0;
    if (f <= f1) return v0 + ((v1 - v0) * (f - f0)) / (f1 - f0);
  }
  return TABLE[TABLE.length - 1][1];
};
/** 尖叫声波环强度（S02「声音进不了耳朵」f101 起，hero 满幅，f301-335 消退） */
export const ringsU = (f: number): number =>
  (0.55 * inv(101, 118, f) + 0.45 * inv(145, 170, f)) * (1 - inv(301, 335, f));
/** 血色天空流光强度（SC04 天空特写起拉满） */
export const glowU = (f: number): number => 0.3 + 0.3 * inv(185, 205, f) + 0.4 * inv(236, 262, f) - 0.35 * inv(301, 345, f);
/** 尖叫者强度（嘴部张合/后仰；hero 特写放大） */
export const mouthAmp = (f: number): number => 1 + 0.35 * inv(236, 262, f) - 0.35 * inv(301, 330, f);

// ---- 世界画布：单 canvas 1920×1080（CSS 1280×720，源分辨率参数 1:1）----
export const ScreamCanvas: React.FC<{
  absF: number;
  amp: number;
  rings: number;
  glow: number;
  mouth?: number;
  className?: string;
}> = ({absF, amp, rings, glow, mouth = 1, className}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    drawWorld(g, {t: absF / FPS, boilKey: Math.floor((absF / FPS) * 8), amp, rings, glow, mouth});
  }, [absF, amp, rings, glow, mouth]);
  return (
    <canvas ref={ref} width={PW} height={PH}
      style={{position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'block', ...(className ? {} : {})}} />
  );
};

// ---- 相机变换工具（scale + origin → CSS transform 字符串）----
export const camCss = (scale: number, ox: number, oy: number, rot = 0) => ({
  transform: `scale(${scale.toFixed(4)})${rot ? ` rotate(${rot.toFixed(4)}rad)` : ''}`,
  transformOrigin: `${(ox * 100).toFixed(1)}% ${(oy * 100).toFixed(1)}%`,
});

// ---- screamWarp 转场（签名⑥，配方 transitions.js:442-454 机制重写）：
// 旧画按行扭曲幅度随 e 增、新画按行扭曲幅度随 e 减；波浪形前沿 yF 以上是新画面；
// 前沿上压 4 道 26px 色带（#b82a1e #e2541c #f08a24 #f4c03a）。相机在本层内部
// 用 canvas transform 实现（旧 = SC04 天空特写机位、新 = hero 尖叫者特写机位）。----
export const CAM_OLD = {x: 0.5, y: 0.22, s: 1.52};
export const CAM_NEW = {x: 730 / PW, y: 640 / PH, s: 2.05};
const camTf = (g: CanvasRenderingContext2D, c: {x: number; y: number; s: number}) => {
  g.translate(c.x * PW, c.y * PH);
  g.scale(c.s, c.s);
  g.translate(-c.x * PW, -c.y * PH);
};
export const ScreamWarp: React.FC<{absF: number; from: number; to: number}> = ({absF, from, to}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const u = inv(from, to, absF);
  const on = absF >= from && absF < to;
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, PW, PH);
    if (!on) return;
    const e = inOut(u);
    const p = u;
    const ph = ((absF - from) / FPS) * 9;
    const t = absF / FPS;
    const boilKey = Math.floor(t * 8);
    const yF = (x: number) => -180 + (PH + 220) * e + 80 * Math.sin(x * 0.0055 + p * 7);
    const oldCv = oldWarpedForTransition({t, boilKey, amp: 0.62, rings: 0.6, glow: 0.85, noWarp: true}, e, ph);
    const newCv = newWarpedForTransition({t, boilKey, amp: 1.0, rings: 1, glow: 1, mouth: 1.35, noWarp: true}, e, ph);
    g.fillStyle = BACKDROP;
    g.fillRect(0, 0, PW, PH);
    // 前沿以上 = 新画面（hero 机位）
    g.save();
    g.beginPath();
    g.moveTo(0, -10);
    for (let x = 0; x <= PW; x += 24) g.lineTo(x, yF(x));
    g.lineTo(PW, -10);
    g.closePath();
    g.clip();
    g.save();
    camTf(g, CAM_NEW);
    g.drawImage(newCv, 0, 0);
    g.restore();
    g.restore();
    // 前沿以下 = 旧画面（天空特写机位，按行扭曲越来越大）
    g.save();
    g.beginPath();
    g.moveTo(0, yF(0));
    for (let x = 0; x <= PW; x += 24) g.lineTo(x, yF(x));
    g.lineTo(PW, PH + 10);
    g.lineTo(0, PH + 10);
    g.closePath();
    g.clip();
    g.save();
    camTf(g, CAM_OLD);
    g.drawImage(oldCv, 0, 0);
    g.restore();
    g.restore();
    // 前沿 4 道 26px 色带（源卡锁死参数）
    g.save();
    g.lineCap = 'round';
    BAND_COLORS.forEach((col, k) => {
      g.strokeStyle = col;
      g.lineWidth = BAND_W;
      g.beginPath();
      for (let x = -20; x <= PW + 20; x += 16) {
        const y = yF(x) - k * 22 + 10 * Math.sin(x * 0.02 + ph + k);
        if (x > -20) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    });
    g.restore();
  }, [absF, from, to, on, u]);
  if (!on) return null;
  return (
    <canvas ref={ref} width={PW} height={PH}
      style={{position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'block', pointerEvents: 'none'}} />
  );
};

// ---- 钩子：血色涌上天空（f2-f22 前沿从地平线升到天顶，沿前沿 2 道血色带）----
export const SurgeReveal: React.FC<{absF: number; from: number; to: number}> = ({absF, from, to}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const u = inv(from, to, absF);
  const on = absF >= from && absF < to;
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, PW, PH);
    if (!on) return;
    const e = inOut(u);
    const t = absF / FPS;
    const boilKey = Math.floor(t * 8);
    // 血色前沿：从地平线 (y≈540) 涌上天顶 (y≈−80)
    const yF = (x: number) => 540 + (-620) * e + 34 * Math.sin(x * 0.006 + u * 9) + 14 * Math.sin(x * 0.017 - u * 5);
    // 暗夜底（前沿以上 = 未被血色染到的夜）
    g.fillStyle = '#200e14';
    g.fillRect(0, 0, PW, PH);
    // 前沿以下露出油画世界（弱 warp，微摆）
    g.save();
    g.beginPath();
    g.moveTo(0, yF(0));
    for (let x = 0; x <= PW; x += 24) g.lineTo(x, yF(x));
    g.lineTo(PW, PH + 10);
    g.lineTo(0, PH + 10);
    g.closePath();
    g.clip();
    drawWorld(g, {t, boilKey, amp: 0.3, rings: 0, glow: 0.2});
    g.restore();
    // 沿前沿 2 道血色带（screamWarp 同语汇的钩子预告）
    g.save();
    g.lineCap = 'round';
    [['#e2541c', 0, BAND_W], ['#f4c03a', 26, 18]].forEach(([col, off, w]) => {
      g.strokeStyle = col as string;
      g.lineWidth = w as number;
      g.beginPath();
      for (let x = -20; x <= PW + 20; x += 16) {
        const y = yF(x) + (off as number) * 0.4 + 8 * Math.sin(x * 0.02 + u * 9 + (off as number));
        if (x > -20) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    });
    g.restore();
  }, [absF, from, to, on, u]);
  if (!on) return null;
  return (
    <canvas ref={ref} width={PW} height={PH}
      style={{position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'block', pointerEvents: 'none'}} />
  );
};

// ---- 标题卡（钩子 / 收束）：Noto Serif SC 900 + Fraunces（禁漫画手写体）----
export const TitleCard: React.FC<{f: number; at: number; small?: boolean}> = ({f, at, small}) => {
  const u = outBack(inv(at, at + 8, f), 1.9);
  const out = 1 - inv(at + 66, at + 74, f);
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: small ? 64 : 84, textAlign: 'center',
      transform: `scale(${(0.86 + 0.14 * u).toFixed(3)})`, opacity: Math.min(u, out), zIndex: 30}}>
      <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 900,
        fontSize: small ? 52 : 64, color: '#f4c03a', letterSpacing: 10,
        textShadow: '0 4px 0 rgba(26,6,10,0.75), 0 0 30px rgba(226,84,28,0.45)'}}>一声尖叫的形状</div>
      <svg width={430} height={16} style={{display: 'block', margin: '8px auto 0'}}>
        <path d="M10 9 C 130 2, 300 15, 420 6" stroke="#e2541c" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.9} />
      </svg>
      <div style={{marginTop: 8, fontFamily: "'Fraunces', serif", fontWeight: 600,
        fontSize: 21, color: '#f08a24', letterSpacing: 5, opacity: inv(at + 8, at + 14, f)}}>
        EDVARD MUNCH · 1893
      </div>
    </div>
  );
};

// ---- 字幕卡（暗炭纸片 + 血橙墨字 + 薄红边；与梵高奶油纸片刻意分化）----
export const MunchCaption: React.FC<{f: number; from: number; to: number; text: string}> = ({f, from, to, text}) => {
  const u = outBack(inv(from, from + 5, f), 2.0);
  const out = 1 - inv(to - 3, to, f);
  if (u <= 0 || f > to || out <= 0) return null;
  const rot = (hash1(from) - 0.5) * 1.6;
  return (
    <div style={{position: 'absolute', left: '50%', bottom: 30, transform: `translateX(-50%) rotate(${rot.toFixed(2)}deg) scale(${(0.82 + 0.18 * u).toFixed(3)})`,
      opacity: Math.min(u, out), zIndex: 40}}>
      <div style={{background: 'rgba(24,10,14,0.93)', borderRadius: 12, padding: '10px 26px',
        border: '2px solid rgba(184,42,30,0.55)', boxShadow: '3px 5px 0 rgba(12,4,8,0.55)',
        fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 30, color: '#f0a04a', letterSpacing: 3}}>
        {text}
      </div>
    </div>
  );
};

// ---- 暗角（全片常驻，收边）----
export const Vignette: React.FC = () => (
  <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50,
    background: 'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 55%, rgba(16,4,8,0.5) 100%)'}} />
);
