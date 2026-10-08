import React from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {W, H, FPS} from '../common';
import {
  bakeBeam, bakeOverlay, bakeStatic, clamp01,
} from './world';
import {
  CAT_RH, CAT_RW, CAT_RX, CAT_RY, drawBirds, drawCat, drawDust, drawFlame,
  drawFogBand, drawOrnithopter, drawRiverGlints,
} from './actors';

// ============================================================================
// kit.tsx — sfumato React 层（战役 4 批次④ D5）
// SceneCanvas 每帧合成顺序（=配方 06 管线）：
//   静态层 PNG（已整层 blur 1.3px=sfumato①）→ 窗洞动态（河光/飞鸟/扑翼机）
//   → 猫离屏层两遍晕涂（签名①：blur 1.6px 全不透明 → α0.82 清晰层；
//     v2 教训：高 blur 低 α 清晰层=景深倒置，禁）→ 雾带 → 光柱 screen+浮尘
//   → 烛焰 → 罩层 PNG（签名②四件套，1920×1080 剂量降采样）
// 位图由 scripts/bake_paint.mjs 预烘焙（静态层/罩层/光柱各 1 张确定性 PNG），
// 热帧零纹理计算；位图模块级 Image 缓存 + delayRender 预载。
// 纪律：全确定性（mulberry32/解析噪声，禁 Math.random/Date）。
// ============================================================================

export const BAKE_N = 3;
const paintUrl = (i: number) => staticFile(`assets/sfumato/paint/${['static', 'overlay', 'beam'][i]}.png`);

const imgCache = new Map<string, HTMLImageElement>();
const preloadHandle = delayRender('sfumato paint preload');
{
  Promise.all(
    Array.from({length: BAKE_N}, (_, i) => paintUrl(i)).map((u) => new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = u;
      imgCache.set(u, img);
    })),
  ).then(() => continueRender(preloadHandle));
}
const getImg = (i: number): HTMLImageElement | undefined => imgCache.get(paintUrl(i));

// ---- 缓动 ----
export const inv = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
export const outC = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);
export const inQ = (u: number) => clamp01(u) * clamp01(u);
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

// ---- hero 扑翼机航程（帧号锁死在 beat-sheet：f223-273，峰值 f248=67.4%）----
export const HERO_FROM = 223;
export const HERO_TO = 273;

// ---- 场景画布：每帧整帧合成 ----
export const SceneCanvas: React.FC<{absF: number; fogU?: number; bloom?: number; heroOn?: boolean}> =
({absF, fogU = 0, bloom = 1, heroOn = true}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const scratchRef = React.useRef<HTMLCanvasElement | null>(null);
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    const t = absF / FPS;
    g.clearRect(0, 0, W, H);
    // ① 静态层（预 blur 1.3px 的整幅 sfumato 底）
    const stat = getImg(0);
    if (stat?.complete && stat.naturalWidth > 0) g.drawImage(stat, 0, 0, W, H);
    // ② 窗洞动态：河面碎光/云影 → 飞鸟 → 扑翼机（hero 航程）
    drawRiverGlints(g, t);
    drawBirds(g, t);
    if (heroOn) drawOrnithopter(g, t, inv(HERO_FROM, HERO_TO, absF), 1);
    // ③ 猫：离屏层 → 两遍晕涂（blur 1.6px 全不透明 + α0.82 清晰层）
    if (!scratchRef.current) scratchRef.current = document.createElement('canvas');
    const L = scratchRef.current;
    if (L.width !== CAT_RW || L.height !== CAT_RH) {
      L.width = CAT_RW;
      L.height = CAT_RH;
    }
    const lg = L.getContext('2d');
    if (lg) {
      lg.clearRect(0, 0, CAT_RW, CAT_RH);
      lg.save();
      lg.translate(-CAT_RX, -CAT_RY);
      drawCat(lg, t);
      lg.restore();
      g.save();
      g.filter = 'blur(1.6px)';
      g.drawImage(L, CAT_RX, CAT_RY);
      g.filter = 'none';
      g.globalAlpha = 0.82;
      g.drawImage(L, CAT_RX, CAT_RY);
      g.globalAlpha = 1;
      g.restore();
    }
    // ④ 雾带（S02 一层雾盖住边界）
    drawFogBand(g, fogU);
    // ⑤ 光柱 screen 叠加（神光窗口 bloom × 云过日 0.8±0.3sin）+ 浮尘上浮
    const beam = getImg(2);
    g.save();
    g.globalCompositeOperation = 'screen';
    if (beam?.complete && beam.naturalWidth > 0) {
      g.globalAlpha = Math.min(1, bloom * (0.8 + 0.3 * Math.sin(t * 2.3)));
      g.drawImage(beam, 0, 0, W, H);
      g.globalAlpha = 1;
    }
    g.restore();
    drawDust(g, t, bloom);
    // ⑥ 烛焰（结尾定帧微动）
    drawFlame(g, t);
    // ⑦ 罩层（720p 原生剂量，一次 drawImage）
    const over = getImg(1);
    if (over?.complete && over.naturalWidth > 0) g.drawImage(over, 0, 0);
  }, [absF, fogU, bloom, heroOn]);
  return (
    <canvas ref={ref} width={W} height={H}
      style={{position: 'absolute', left: 0, top: 0, display: 'block'}} />
  );
};

// ---- 标题卡（钩子/收束：衬线金调，文艺复兴题签）----
export const TitleCard: React.FC<{f: number; at: number; sub?: string; small?: boolean}> =
({f, at, sub, small}) => {
  const u = outBack(inv(at, at + 8, f), 1.8);
  const out = 1 - inv(at + 64, at + 72, f) * (small ? 0 : 1);
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: small ? 64 : 84, textAlign: 'center',
      transform: `scale(${(0.9 + 0.1 * u).toFixed(3)})`, opacity: Math.min(u, out), zIndex: 30}}>
      <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 900,
        fontSize: small ? 44 : 56, color: '#f2e6cc', letterSpacing: 10,
        textShadow: '0 3px 0 rgba(20,10,4,.75), 0 0 30px rgba(255,225,170,.28)'}}>画室里的雾</div>
      <svg width={380} height={14} style={{display: 'block', margin: '6px auto 0'}}>
        <path d="M6 8 C 110 2, 270 12, 374 6" stroke="#c9a24a" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.9} />
      </svg>
      {sub ? (
        <div style={{marginTop: 8, fontFamily: "'Noto Serif SC', serif", fontWeight: 700,
          fontSize: 20, color: '#d8c8a4', letterSpacing: 5, opacity: inv(at + 8, at + 14, f)}}>{sub}</div>
      ) : null}
    </div>
  );
};

// ---- 字幕卡（羊皮纸片 + 深褐墨字 + 金边，衬线）----
export const SfumatoCaption: React.FC<{f: number; from: number; to: number; text: string}> =
({f, from, to, text}) => {
  const u = outBack(inv(from, from + 5, f), 1.9);
  const out = 1 - inv(to - 3, to, f);
  if (u <= 0 || f > to || out <= 0) return null;
  const rot = (hash1(from) - 0.5) * 1.4;
  return (
    <div style={{position: 'absolute', left: '50%', bottom: 30, zIndex: 40,
      transform: `translateX(-50%) rotate(${rot.toFixed(2)}deg) scale(${(0.85 + 0.15 * u).toFixed(3)})`,
      opacity: Math.min(u, out)}}
    >
      <div style={{background: 'rgba(242,232,208,0.95)', borderRadius: 10, padding: '9px 24px',
        border: '1.5px solid rgba(150,110,40,0.55)', boxShadow: '3px 5px 0 rgba(20,10,4,0.45)',
        fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 27, color: '#3e2410',
        letterSpacing: 2}}
      >
        {text}
      </div>
    </div>
  );
};

// ---- 空气透视色签（S03 签名③可视化：三段山色「越远越蓝越淡」）----
const CHIP: Array<{hex: string; label: string}> = [
  {hex: '#9fb4b8', label: '远 · 最淡'},
  {hex: '#8aa1a6', label: '中'},
  {hex: '#7d9294', label: '近 · 最沉'},
];
export const AerialChips: React.FC<{f: number; at: number}> = ({f, at}) => {
  const u = outBack(inv(at, at + 8, f), 1.9);
  const out = 1 - inv(258, 268, f);
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 570, top: 128, zIndex: 32, opacity: Math.min(u, out),
      transform: `translateX(${(14 * (1 - u)).toFixed(1)}px)`}}
    >
      <div style={{background: 'rgba(242,232,208,0.93)', borderRadius: 10, padding: '10px 16px',
        border: '1.5px solid rgba(150,110,40,0.55)', boxShadow: '3px 4px 0 rgba(20,10,4,0.4)'}}>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 900, fontSize: 16,
          color: '#3e2410', letterSpacing: 2, marginBottom: 6}}>空气透视 · 越远越蓝越淡</div>
        {CHIP.map((c, i) => (
          <div key={c.hex} style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: i ? 4 : 0,
            opacity: inv(at + 2 + i * 3, at + 7 + i * 3, f)}}>
            <div style={{width: 34, height: 18, borderRadius: 4, background: c.hex,
              border: '1px solid rgba(60,40,20,.4)'}} />
            <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 14,
              color: '#5a4028'}}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---- 晕涂两遍签（S02 签名①可视化：blur 层 + 清晰层配比）----
export const SfumatoTag: React.FC<{f: number; at: number}> = ({f, at}) => {
  const u = outBack(inv(at, at + 8, f), 1.9);
  const out = 1 - inv(182, 192, f);
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', right: 56, top: 96, zIndex: 32, opacity: Math.min(u, out),
      transform: `translateX(${(-14 * (1 - u)).toFixed(1)}px)`}}
    >
      <div style={{background: 'rgba(242,232,208,0.93)', borderRadius: 10, padding: '10px 16px',
        border: '1.5px solid rgba(150,110,40,0.55)', boxShadow: '3px 4px 0 rgba(20,10,4,0.4)'}}>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 900, fontSize: 16,
          color: '#3e2410', letterSpacing: 2}}>晕涂两遍</div>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 13.5,
          color: '#5a4028', marginTop: 4}}>第一遍 虚 · blur 1.6px</div>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 13.5,
          color: '#5a4028', marginTop: 2}}>第二遍 清 · α 0.82</div>
      </div>
    </div>
  );
};

// ---- Bake 合成（不进正片）：帧0=静态层 / 帧1=罩层 / 帧2=光柱 ----
export const BakeFrame: React.FC = () => {
  const f = useCurrentFrame();
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    if (f === 0) {
      bakeStatic(g);
    } else if (f === 1) {
      bakeOverlay(g);
    } else {
      bakeBeam(g);
    }
  }, [f]);
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0}} />;
};
