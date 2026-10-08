import React from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {W, H, FPS, clamp01, bakeStatic, bakeOverlay, bakeBeam} from './world';
import {buildLightMap, applyLight, flick} from './light';
import {READER_R, drawReader, drawCloud, drawDust, drawFlame, drawHeat, drawImpastoPass} from './actors';

// ============================================================================
// kit.tsx — candle-light React 层（战役 4 批次④ D5 ★ 级重做卡）
// SceneCanvas 每帧合成顺序（=32_rembrandt 管线）：
//   ① 静态层 PNG（亮态底稿已揉开 blur2.2）→ ② 云影横穿窗玻璃
//   → ③ 角色离屏层 → 签名④失边两遍（blur 2.4px 全不透明 + α0.62 清晰层）
//   → ④ 签名①光照图整幅 multiply（环境 0.13 打底+光池表 lighter）
//   → ⑤ 窗玻璃 screen 再提亮（窗是光源）→ ⑥ 签名③impasto 受光厚涂
//   → ⑦ 浮尘（光柱内显形）→ ⑧ 烛焰+热气 → ⑨ 罩层 PNG → ⑩ 暖金 soft-light 釉
// 位图由 scripts/bake_paint.mjs 预烘焙（static/overlay/beam 各 1 张确定性 PNG）。
// 纪律：全确定性（mulberry32/解析噪声，禁 Math.random/Date）。
// ============================================================================

export const BAKE_N = 3;
const paintUrl = (i: number) => staticFile(`assets/candle-light/paint/${['static', 'overlay', 'beam'][i]}.png`);

const imgCache = new Map<string, HTMLImageElement>();
const preloadHandle = delayRender('candle-light paint preload');
export const paintReady: Promise<boolean> = Promise.all(
  Array.from({length: BAKE_N}, (_, i) => paintUrl(i)).map((u) => new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = u;
    imgCache.set(u, img);
  })),
).then((ok) => ok.every(Boolean));
paintReady.then(() => continueRender(preloadHandle));
const getImg = (i: number): HTMLImageElement | undefined => imgCache.get(paintUrl(i));
const allPaintReady = (): boolean =>
  Array.from({length: BAKE_N}, (_, i) => paintUrl(i)).every((u) => {
    const im = imgCache.get(u);
    return !!im?.complete && im.naturalWidth > 0;
  });

// ---- 缓动 ----
export const inv = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
export const outC = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);
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

/** hero 烛焰爆亮脉冲：f277-286 起、f300-330 落（beat-sheet：f277=70.3%） */
const heroPulseAt = (f: number): number => outC(inv(277, 286, f)) * (1 - inv(302, 332, f));
/** 剧情云影增益：S03 f250-268 窗光转暗 → f278-300 窗光恢复 */
const cloudBoostAt = (f: number): number => inv(250, 268, f) * (1 - inv(278, 300, f));

// ---- 场景画布每帧合成（单函数，便于 try/catch 诊断） ----
type GetImg = (i: number) => HTMLImageElement | undefined;
const step = (
  g: CanvasRenderingContext2D, absF: number, flameU: number, poolU: number, sepU: number, getImg: GetImg,
): void => {
  const t = absF / FPS;
  g.clearRect(0, 0, W, H);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  // ① 静态层（暗房：亮态底稿已揉开）
  const stat = getImg(0);
  if (stat?.complete && stat.naturalWidth > 0) g.drawImage(stat, 0, 0, W, H);
  // ② 云影横穿窗玻璃
  drawCloud(g, t);
  // ③ 角色离屏层 → 签名④失边两遍：blur 2.4px 全不透明 + α0.62 清晰层
  const L = document.createElement('canvas');
  L.width = READER_R.w;
  L.height = READER_R.h;
  const lg = L.getContext('2d');
  if (lg) {
    lg.clearRect(0, 0, READER_R.w, READER_R.h);
    lg.save();
    lg.translate(-READER_R.x, -READER_R.y);
    drawReader(lg, t);
    lg.restore();
    g.save();
    g.filter = 'blur(2.4px)';
    g.drawImage(L, READER_R.x, READER_R.y);
    g.filter = 'none';
    g.globalAlpha = 0.62;
    g.drawImage(L, READER_R.x, READER_R.y);
    g.globalAlpha = 1;
    g.restore();
  }
  // ④ 签名①光照图整幅 multiply（环境 rgb(30,21,13) 打底 + lighter 光池表）
  const beamImg = getImg(2) ?? null;
  const map = buildLightMap(t, {
    ignite: flameU, poolU, sepU, heroPulse: heroPulseAt(absF), cloudBoost: cloudBoostAt(absF), beamImg,
  });
  applyLight(g, map);
  // ⑤ 窗玻璃本身是光源：screen 再提亮（0.35+0.08flick）
  if (stat?.complete && stat.naturalWidth > 0) {
    g.save();
    g.globalCompositeOperation = 'screen';
    g.globalAlpha = 0.35 + 0.08 * flick(t);
    g.drawImage(stat, 187, 77, 300, 356, 187, 77, 300, 356);
    g.restore();
    g.globalAlpha = 1;
  }
  // ⑥ 签名③impasto 受光厚涂（光照之后画——颜料高光浮在光上；烛火未点亮前不出笔）
  if (flameU > 0.45) drawImpastoPass(g, t);
  // ⑦ 浮尘（光柱内显形）
  drawDust(g, t, poolU * flameU);
  // ⑧ 烛焰 + 热气
  drawFlame(g, t, flameU, heroPulseAt(absF));
  drawHeat(g, t, flameU);
  // ⑨ 罩层（暗角/龟裂/颗粒，一次 drawImage）
  const over = getImg(1);
  if (over?.complete && over.naturalWidth > 0) g.drawImage(over, 0, 0);
  // ⑩ 暖金 soft-light 釉（锁死 token：rgba(200,140,60,.35)）
  g.save();
  g.globalCompositeOperation = 'soft-light';
  g.fillStyle = 'rgba(200,140,60,.35)';
  g.fillRect(0, 0, W, H);
  g.restore();
};
// ---- 场景画布：每帧整帧合成 ----
export const SceneCanvas: React.FC<{absF: number; ignite?: number; bloom?: number; sepU?: number}> =
({absF, ignite, bloom = 1, sepU = 0}) => {
  const flameU = ignite ?? outC(inv(1, 4, absF));
  const poolU = bloom * (ignite !== undefined ? ignite : outC(inv(2, 12, absF)));
  const ref = React.useRef<HTMLCanvasElement>(null);
  // 位图预载完成后强制重画：delayRender 只冻结取帧，layout effect 可能早于图片 onload 跑过一次
  const [ready, setReady] = React.useState(allPaintReady());
  React.useEffect(() => {
    if (ready) return;
    let alive = true;
    paintReady.then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [ready]);
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    try {
      step(g, absF, flameU, poolU, sepU, getImg);
    } catch (err) {
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.filter = 'none';
      g.fillStyle = '#550000';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffdddd';
      g.font = '20px monospace';
      const msg = String((err as Error)?.stack ?? err).slice(0, 900);
      msg.split('\n').forEach((line, i) => g.fillText(line, 20, 40 + i * 24));
    }
  }, [absF, flameU, poolU, sepU, bloom, ready]);
  return (
    <canvas ref={ref} width={W} height={H}
      style={{position: 'absolute', left: 0, top: 0, display: 'block'}} />
  );
};

// ---- 标题卡
// ---- 标题卡（衬线暖金，烛光题签）----
export const TitleCard: React.FC<{f: number; at: number; sub?: string; small?: boolean}> =
({f, at, sub, small}) => {
  const u = outBack(inv(at, at + 8, f), 1.8);
  const out = small ? 1 : 1 - inv(at + 64, at + 72, f);
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: small ? 58 : 78, textAlign: 'center',
      transform: `scale(${(0.9 + 0.1 * u).toFixed(3)})`, opacity: Math.min(u, out), zIndex: 30}}>
      <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 900,
        fontSize: small ? 40 : 54, color: '#f0dfba', letterSpacing: 10,
        textShadow: '0 3px 0 rgba(15,7,2,.8), 0 0 34px rgba(255,190,110,.3)'}}>烛光下的读信人</div>
      <svg width={380} height={14} style={{display: 'block', margin: '6px auto 0'}}>
        <path d="M6 8 C 110 2, 270 12, 374 6" stroke="#c99a3a" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.9} />
      </svg>
      {sub ? (
        <div style={{marginTop: 8, fontFamily: "'Noto Serif SC', serif", fontWeight: 700,
          fontSize: 19, color: '#d8c096', letterSpacing: 5, opacity: inv(at + 8, at + 14, f)}}>{sub}</div>
      ) : null}
    </div>
  );
};

// ---- 字幕卡（深胡桃木牌 + 暖金边 + 奶油字——暗房烛光语境的铭牌）----
export const CandleCaption: React.FC<{f: number; from: number; to: number; text: string}> =
({f, from, to, text}) => {
  const u = outBack(inv(from, from + 5, f), 1.9);
  const out = 1 - inv(to - 3, to, f);
  if (u <= 0 || f > to || out <= 0) return null;
  const rot = (hash1(from) - 0.5) * 1.2;
  return (
    <div style={{position: 'absolute', left: '50%', bottom: 28, zIndex: 40,
      transform: `translateX(-50%) rotate(${rot.toFixed(2)}deg) scale(${(0.85 + 0.15 * u).toFixed(3)})`,
      opacity: Math.min(u, out)}}
    >
      <div style={{background: 'rgba(28,18,10,0.9)', borderRadius: 10, padding: '9px 24px',
        border: '1.5px solid rgba(190,140,60,0.6)', boxShadow: '0 0 24px rgba(255,180,90,.16), 0 4px 10px rgba(0,0,0,.55)',
        fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 27, color: '#f0e2c0',
        letterSpacing: 2, textShadow: '0 0 14px rgba(255,200,120,.35)'}}
      >
        {text}
      </div>
    </div>
  );
};

// ---- 光照图签（S01 签名①可视化）----
export const LightMapTag: React.FC<{f: number; at: number}> = ({f, at}) => {
  const u = outBack(inv(at, at + 8, f), 1.9);
  const out = 1 - inv(112, 122, f);
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 52, top: 96, zIndex: 32, opacity: Math.min(u, out),
      transform: `translateX(${(-14 * (1 - u)).toFixed(1)}px)`}}>
      <div style={{background: 'rgba(28,18,10,0.9)', borderRadius: 10, padding: '10px 16px',
        border: '1.5px solid rgba(190,140,60,0.6)', boxShadow: '0 4px 10px rgba(0,0,0,.5)'}}>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 900, fontSize: 16,
          color: '#f0e2c0', letterSpacing: 2}}>光照图 · 光即内容</div>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 13,
          color: '#c8ac80', marginTop: 4}}>环境光 0.13 · 整幅 multiply</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 6}}>
          <div style={{width: 30, height: 16, borderRadius: 4, background: 'rgb(30,21,13)',
            border: '1px solid rgba(190,140,60,.5)'}} />
          <div style={{width: 30, height: 16, borderRadius: 4, background: 'rgb(255,226,180)',
            border: '1px solid rgba(190,140,60,.5)'}} />
          <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 12.5,
            color: '#c8ac80'}}>暗打底 · 六池 lighter</div>
        </div>
      </div>
    </div>
  );
};

// ---- 失边两遍签（S02 签名④可视化）----
export const LostEdgeTag: React.FC<{f: number; at: number}> = ({f, at}) => {
  const u = outBack(inv(at, at + 8, f), 1.9);
  const out = 1 - inv(172, 182, f);
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 52, top: 96, zIndex: 32, opacity: Math.min(u, out),
      transform: `translateX(${(-14 * (1 - u)).toFixed(1)}px)`}}>
      <div style={{background: 'rgba(28,18,10,0.9)', borderRadius: 10, padding: '10px 16px',
        border: '1.5px solid rgba(190,140,60,0.6)', boxShadow: '0 4px 10px rgba(0,0,0,.5)'}}>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 900, fontSize: 16,
          color: '#f0e2c0', letterSpacing: 2}}>失边两遍</div>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 13,
          color: '#c8ac80', marginTop: 4}}>第一遍 糊 · blur 2.4px 全不透明</div>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 13,
          color: '#c8ac80', marginTop: 2}}>第二遍 清 · α 0.62（暗侧融进夜色）</div>
      </div>
    </div>
  );
};

// ---- 厚涂签（S03 签名③可视化）----
export const ImpastoTag: React.FC<{f: number; at: number}> = ({f, at}) => {
  const u = outBack(inv(at, at + 8, f), 1.9);
  const out = 1 - inv(258, 268, f);
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 52, top: 96, zIndex: 32, opacity: Math.min(u, out),
      transform: `translateX(${(-14 * (1 - u)).toFixed(1)}px)`}}>
      <div style={{background: 'rgba(28,18,10,0.9)', borderRadius: 10, padding: '10px 16px',
        border: '1.5px solid rgba(190,140,60,0.6)', boxShadow: '0 4px 10px rgba(0,0,0,.5)'}}>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 900, fontSize: 16,
          color: '#f0e2c0', letterSpacing: 2}}>厚涂 · 鬃毛笔</div>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 13,
          color: '#c8ac80', marginTop: 4}}>一笔 = round(w/1.3) 条细鬃 ±17</div>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 13,
          color: '#c8ac80', marginTop: 2}}>只打受光处：亮处堆着厚颜料</div>
      </div>
    </div>
  );
};

// ---- 分离光签（S03 末签名⑤可视化）----
export const SepLightTag: React.FC<{f: number; at: number}> = ({f, at}) => {
  const u = outBack(inv(at, at + 8, f), 1.9);
  const out = 1 - inv(296, 306, f);
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', right: 56, top: 96, zIndex: 32, opacity: Math.min(u, out),
      transform: `translateX(${(14 * (1 - u)).toFixed(1)}px)`}}>
      <div style={{background: 'rgba(28,18,10,0.9)', borderRadius: 10, padding: '10px 16px',
        border: '1.5px solid rgba(190,140,60,0.6)', boxShadow: '0 4px 10px rgba(0,0,0,.5)'}}>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 900, fontSize: 16,
          color: '#f0e2c0', letterSpacing: 2}}>分离光</div>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 13,
          color: '#c8ac80', marginTop: 4}}>暗侧背后墙面打亮 r300</div>
        <div style={{fontFamily: "'Noto Serif SC', serif", fontWeight: 700, fontSize: 13,
          color: '#c8ac80', marginTop: 2}}>把人从背景里分出来</div>
      </div>
    </div>
  );
};

// ---- Bake 合成（不进正片）：帧0=静态层 / 帧1=罩层 / 帧2=光柱 ----
// ⚠ 罩层/光柱必须带 alpha 通道烘焙（画布禁填底色）——首版坑：底色不透明，第⑨步整幅盖掉正片。
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
