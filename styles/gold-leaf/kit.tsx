// ============================================================================
// kit.tsx — gold-leaf 运行时 React 层
// GoldPage：烘焙静态位图 + 每帧动态层（菱格/接缝/彩窗闪/匀速高光扫/星闪/藤蔓/蜗牛/老鼠/猫/少女动态/颗粒）
// PageTurn：羊皮纸翻页转场（签名⑥；左铰链 rotateY，帧号驱动）
// 技法借鉴 huashu-art-motion 05_gothic（MIT），TSX/Remotion 重写。
// ============================================================================
import React from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import {
  drawGoldSweep, drawLattice, drawSparks, catPendulum, glassTwinkle,
  girlDyn, glint, runMouse, snail, vines,
} from './marginalia';
import {catBody} from './cat';
import {GOLD, HAIR_SPARK, PARCH, SPARKS, W, H} from './world';

const ASSET_DIR = 'assets/gold-leaf/paint';
const imgCache = new Map<string, HTMLImageElement>();
const loadImg = (name: string) => {
  const hit = imgCache.get(name);
  if (hit) return hit;
  const im = new Image();
  im.src = staticFile(`${ASSET_DIR}/${name}.png`);
  imgCache.set(name, im);
  return im;
};

/** 烘焙 PNG 加载钩子（delayRender 防竞态；模块级缓存） */
export const useBakedImg = (name: string): HTMLImageElement | null => {
  const [img, setImg] = React.useState<HTMLImageElement | null>(() => {
    const im = loadImg(name);
    return im.complete && im.naturalWidth > 0 ? im : null;
  });
  const [handle] = React.useState(() => delayRender(`bake-${name}`));
  React.useEffect(() => {
    const im = loadImg(name);
    if (im.complete && im.naturalWidth > 0) {
      setImg(im);
      continueRender(handle);
      return;
    }
    im.onload = () => {
      setImg(im);
      continueRender(handle);
    };
    im.onerror = () => continueRender(handle);
  }, [name, handle]);
  return img;
};

/** 金箔手抄本整页（热帧：drawImage 烘焙图 + 矢量动态层 + 高光带合成） */
export const GoldPage: React.FC<{
  absF: number;
  uSeam?: number;
  uLine?: number;
  uDot?: number;
  sweep?: boolean;
}> = ({absF, uSeam = 1, uLine = 1, uDot = 1, sweep = true}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const staticImg = useBakedImg('page-static');
  const maskImg = useBakedImg('page-mask');
  const grainImg = useBakedImg('grain');
  const t = absF / 30;
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    if (staticImg) g.drawImage(staticImg, 0, 0, W, H);
    drawLattice(g, uSeam, uLine, uDot);
    glassTwinkle(g, t);
    if (sweep) {
      drawGoldSweep(g, absF, maskImg);
      drawSparks(g, absF, SPARKS);
    }
    vines(g, t);
    snail(g, t);
    runMouse(g, absF, t);
    catBody(g);
    catPendulum(g, t);
    girlDyn(g, absF, t);
    if (grainImg) g.drawImage(grainImg, 0, 0, W, H);
  }, [absF, uSeam, uLine, uDot, sweep, staticImg, maskImg, grainImg]);
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, display: 'block'}} />;
};

/** 羊皮纸翻页转场（签名⑥）：左铰链 rotateY 0→-80°，页面带金首字母暗示；14 帧窗口 */
export const PageTurn: React.FC<{absF: number; from: number; to: number}> = ({absF, from, to}) => {
  const u = Math.min(1, Math.max(0, (absF - from) / (to - from)));
  if (u <= 0 || u >= 1) return null;
  const ang = -80 * u;
  return (
    <div style={{position: 'absolute', inset: 0, perspective: 1400, pointerEvents: 'none', overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: W, height: H,
          transformOrigin: 'left center',
          transform: `rotateY(${ang.toFixed(2)}deg)`,
          background: `linear-gradient(105deg, ${PARCH} 0%, #f3e7c8 55%, #d9c493 92%, #c3ab78 100%)`,
          boxShadow: '14px 0 34px rgba(60,35,5,0.45)',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* 页面上的金首字母暗示 + 朱批行 */}
        <div style={{position: 'absolute', left: 90, top: 120, width: 130, height: 128, background: GOLD, border: '3px solid #2b1a12', opacity: 0.85}} />
        <div style={{position: 'absolute', left: 250, top: 140, width: 620, height: 12, background: 'rgba(43,26,18,0.55)'}} />
        <div style={{position: 'absolute', left: 250, top: 176, width: 560, height: 12, background: 'rgba(43,26,18,0.45)'}} />
        <div style={{position: 'absolute', left: 250, top: 212, width: 90, height: 12, background: 'rgba(195,38,46,0.75)'}} />
        <div style={{position: 'absolute', left: 350, top: 212, width: 430, height: 12, background: 'rgba(43,26,18,0.4)'}} />
      </div>
    </div>
  );
};

/** 字幕卡：羊皮纸小签 + 墨字 + 金左条 */
export const ParchCaption: React.FC<{f: number; from: number; to: number; text: string}> = ({f, from, to, text}) => {
  if (f < from || f > to) return null;
  const uIn = Math.min(1, (f - from) / 4);
  const uOut = Math.min(1, (to - f) / 4);
  const a = Math.min(uIn, uOut);
  return (
    <div
      style={{
        position: 'absolute', left: '50%', top: 636, transform: `translateX(-50%) translateY(${((1 - uIn) * 10).toFixed(1)}px)`,
        opacity: a.toFixed(3), display: 'flex', alignItems: 'stretch',
        background: 'rgba(236,223,194,0.94)', border: '2px solid #2b1a12', boxShadow: '0 3px 10px rgba(40,20,0,0.35)',
      }}
    >
      <div style={{width: 8, background: GOLD}} />
      <div style={{padding: '8px 22px 9px', fontFamily: '"Noto Serif SC", serif', fontWeight: 800, fontSize: 27, color: '#2b1a12', letterSpacing: 2, whiteSpace: 'nowrap'}}>{text}</div>
    </div>
  );
};

/** 题名卡：金框羊皮签 + 衬线题名 + 金线 + 副标 */
export const TitleCard: React.FC<{f: number; at: number; title: string; sub: string; x?: number; y?: number; scale?: number; fadeAt?: number}> =
({f, at, title, sub, x = 640, y = 96, scale = 1, fadeAt}) => {
  const u = Math.min(1, Math.max(0, (f - at) / 10));
  const gone = fadeAt ? Math.min(1, Math.max(0, (f - fadeAt) / 10)) : 0;
  if (u <= 0 || gone >= 1) return null;
  const pop = 1 + (1 - u) * (1 - u) * 0.12;
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${(pop * scale).toFixed(4)})`,
        opacity: (u * (1 - gone)).toFixed(3), textAlign: 'center',
      }}
    >
      <div style={{display: 'inline-block', background: 'rgba(236,223,194,0.95)', border: '3px solid #2b1a12', boxShadow: '0 0 0 2px #d9a63a, 0 4px 14px rgba(40,20,0,0.4)', padding: '12px 34px 14px'}}>
        <div style={{fontFamily: '"Noto Serif SC", serif', fontWeight: 900, fontSize: 40, color: '#2b1a12', letterSpacing: 6, whiteSpace: 'nowrap'}}>{title}</div>
        <div style={{height: 3, background: GOLD, margin: '7px 18px 6px'}} />
        <div style={{fontFamily: '"Noto Serif SC", serif', fontWeight: 600, fontSize: 17, color: '#7e1318', letterSpacing: 3}}>{sub}</div>
      </div>
    </div>
  );
};

/** 风格小签（镜头左下角技法注记） */
export const StyleTag: React.FC<{f: number; at: number; text: string}> = ({f, at, text}) => {
  const u = Math.min(1, Math.max(0, (f - at) / 6));
  const out = 1 - Math.min(1, Math.max(0, (f - (at + 66)) / 6));
  if (u <= 0 || out <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 26, top: 78, opacity: (u * out).toFixed(3)}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
        <div style={{width: 26, height: 3, background: GOLD}} />
        <div style={{fontFamily: '"Noto Serif SC", serif', fontWeight: 700, fontSize: 17, color: '#f3e7c8', textShadow: '0 1px 4px rgba(30,15,0,0.9), 0 0 2px rgba(30,15,0,0.9)', letterSpacing: 2}}>{text}</div>
      </div>
    </div>
  );
};

/** 金光经过星闪的显式导出（SC 用） */
export const Spark = glint;
export const HairSparkPoint = HAIR_SPARK;
