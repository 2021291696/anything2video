// 《1995 年的桌面》—— chrome-ball 早期光追 CGI 正片（战役 v4 批次④）。
// 纪律：drawFrame(f) 纯帧号函数（seeded，同帧渲两次逐像素一致）。
// 层序：背景（青绿墙+窗，缓存）→ 逐像素透视棋盘地面（缓存）→ 反射层（各物体按接地线镜像
//   画进独立层、整体 α.34 进地面裁剪区——签名⑤防叠加变不透明）→ 反射渐隐 → 接触阴影
//   → 物体远→近（绿锥/紫环/铬球/猫）→ SC02 铬球点名/SC03 地面逐格扫描带 → 镜头光晕（lighter）
//   → 绿色线框→扫描线逐行显影（钩子签名⑦）→ 渲染 OSD → 片名 → 字幕带。
// 签名纪律：塑料四步着色 / cyl 肢体 / 逐像素棋盘(2×2 超采样+93px 35% 雾) / 铬球环境映射
//   (棋盘 u 随 t·4.5 平移=球在转)+菲涅尔 / 镜像倒影整体半透明 / 镜头光晕(核+12 星芒 0.25rad/s
//   +横丝 840px+5 六边形鬼影) / 线框→扫描线显影——逐帧确定性，禁 Math.random/Date/网络。
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {W, H, FPS, TOTAL, FLOOR_Y, GROUND, HERO_F} from './types';
import type {CanvasCtx} from './types';
import {clamp, lerp} from './noise';
import {cached, scratch, scratchCanvas, drawBackground, drawFloor, drawReveal, drawScanBand} from './world';
import {chromeSphere, torus, cone, ballPing} from './objects';
import {drawCat} from './cat';
import {flare, flarePower} from './flare';
import {drawSubs, drawTitle, drawRenderOsd, onFontsReady} from './captions';

const BALL = {x: 830, y: 505, r: 52};
const TOR = {x: 1130, y: 498, R: 40, rr: 11};
const CONE = {x: 1035, tipY: 404, baseY: 516, rx: 45};

function mirror(g: CanvasCtx, groundY: number, draw: (c: CanvasCtx) => void): void {
  g.save();
  g.translate(0, 2 * groundY);
  g.scale(1, -1);
  draw(g);
  g.restore();
}

/** 反射渐隐罩（水线以下随深度沉入雾色）。 */
function reflFade(c: CanvasCtx): void {
  const fg = c.createLinearGradient(0, 604, 0, H);
  fg.addColorStop(0, 'rgba(150,190,195,0)');
  fg.addColorStop(1, 'rgba(150,190,195,.32)');
  c.fillStyle = fg;
  c.fillRect(0, 604, W, H - 604);
}

function contactShadows(c: CanvasCtx): void {
  c.fillStyle = 'rgba(10,30,35,.35)';
  ([[348, 560, 66, 9], [830, 557, 54, 8], [1130, 524, 40, 7], [1035, 516, 46, 7]] as const).forEach(([x, y, rx, ry]) => {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  });
}

/** SC02「一面青绿的墙」：f155-185 一道 lighter 光带扫过墙面（窗光扫掠）。 */
function wallSweep(c: CanvasCtx, f: number): void {
  if (f < 155 || f > 191) return;
  const p = (f - 155) / 30;
  const sx = lerp(-300, W + 300, p);
  c.save();
  c.beginPath();
  c.rect(0, 0, W, FLOOR_Y);
  c.clip();
  c.globalCompositeOperation = 'lighter';
  const g = c.createLinearGradient(sx - 130, 0, sx + 130, 0);
  g.addColorStop(0, 'rgba(200,255,240,0)');
  g.addColorStop(0.5, 'rgba(200,255,240,.11)');
  g.addColorStop(1, 'rgba(200,255,240,0)');
  c.fillStyle = g;
  c.fillRect(sx - 130, 0, 260, FLOOR_Y);
  c.restore();
}

function drawFrame(c: CanvasCtx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, TOTAL);
  const t = (f - 1) / FPS;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  // ① 静态底（墙+窗 / 逐像素棋盘，均缓存）
  c.drawImage(cached('cb_bg', W, H, drawBackground), 0, 0);
  c.drawImage(cached('cb_floor', W, H, drawFloor), 0, 0);
  // ② 反射：物体先画独立层（各按接地线镜像），整体半透明画进地面裁剪区（签名⑤）
  const rg = scratch('cb_refl');
  mirror(rg, GROUND.cone, (g) => cone(g, CONE.x, CONE.tipY, CONE.baseY, CONE.rx));
  mirror(rg, GROUND.torus, (g) => torus(g, t, TOR.x, TOR.y, TOR.R, TOR.rr));
  mirror(rg, GROUND.ball, (g) => chromeSphere(g, t, BALL.x, BALL.y, BALL.r));
  mirror(rg, GROUND.cat, (g) => drawCat(g, t));
  const refl = scratchCanvas('cb_refl');
  c.save();
  c.beginPath();
  c.rect(0, FLOOR_Y, W, H - FLOOR_Y);
  c.clip();
  c.globalAlpha = 0.34;
  c.drawImage(refl, 0, 0);
  c.restore();
  reflFade(c);
  // ③ 接触阴影 → 物体（远→近）
  contactShadows(c);
  cone(c, CONE.x, CONE.tipY, CONE.baseY, CONE.rx);
  torus(c, t, TOR.x, TOR.y, TOR.R, TOR.rr);
  chromeSphere(c, t, BALL.x, BALL.y, BALL.r);
  drawCat(c, t);
  // ④ 段落动效：SC02 铬球点名 / 墙面扫光 / SC03 地面逐格扫描带
  ballPing(c, f, BALL.x, BALL.y, BALL.r);
  wallSweep(c, f);
  drawScanBand(c, f);
  // ⑤ HERO（f229=60.7%）：镜头光晕全开的入光一闪 + 常驻光晕
  if (f >= HERO_F && f < HERO_F + 4) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(255,245,250,${0.14 * (1 - (f - HERO_F) / 4)})`;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
  flare(c, t, flarePower(f));
  // ⑥ 钩子显影：绿色线框→扫描线逐行渲染（盖在成画面上，f16 完成）
  drawReveal(c, f);
  // ⑦ OSD / 片名 / 字幕
  drawRenderOsd(c, f);
  drawTitle(c, f);
  drawSubs(c, f);
}

export const ChromeBallFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const draw = React.useCallback(() => {
    const el = canvasRef.current;
    if (el) drawFrame(el.getContext('2d')!, frame + 1);
  }, [frame]);
  // ref 回调先画一版（不空帧）；字体装载完成后重绘（防片名/字幕字形回退）
  React.useEffect(() => {
    draw();
    onFontsReady(draw);
  }, [draw]);
  return (
    <AbsoluteFill style={{background: '#05130e', overflow: 'hidden'}}>
      <canvas
        width={W}
        height={H}
        style={{width: '100%', height: '100%'}}
        ref={(el) => {
          canvasRef.current = el;
          if (el) drawFrame(el.getContext('2d')!, frame + 1);
        }}
      />
    </AbsoluteFill>
  );
};

export const Stage: React.FC<{audio?: boolean}> = ({audio = false}) => (
  <AbsoluteFill style={{background: '#05130e', overflow: 'hidden'}}>
    {audio ? <Audio src={staticFile('assets/chrome-ball/audio.wav')} /> : null}
    <ChromeBallFilm />
  </AbsoluteFill>
);

export const Video: React.FC = () => <Stage audio />;

// 帧成本基准钩子（scripts/bench_frame.mjs 页内调用；正常渲染路径零影响）：
// 在离屏 canvas 上循环 drawFrame 整个 HERO 段（最重区间），返回纯绘制 avg/p95。
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __cbBench?: () => any;
  }
}
if (typeof window !== 'undefined') {
  window.__cbBench = () => {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d')!;
    drawFrame(g, 250); // 预热：静态缓存全量建立
    const times: number[] = [];
    for (let f = HERO_F - 20; f <= Math.min(HERO_F + 40, TOTAL); f++) {
      const t0 = performance.now();
      drawFrame(g, f);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return {avg, p95: times[Math.min(times.length - 1, Math.floor(times.length * 0.95))], max: times[times.length - 1], n: times.length};
  };
}
