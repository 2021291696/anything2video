// chrome-ball 字幕与片名 —— 90 年代 demo OSD 风。
// 字幕带：底部暗带 + 暖白字（块级淡入淡出 6f）；片名 f331-345 右上角写出（显影完成后常驻）。
import {delayRender, continueRender, staticFile} from 'remotion';
import type {CanvasCtx} from './types';
import {W} from './types';
import {clamp, easeOut} from './noise';
import {SUBS} from '../common/subs';

let FONTS: {pending: number; done: () => void} | null = null;
const readyQueue: (() => void)[] = [];
let fontsDone = false;

/** 字体就绪后回调（首帧绘制可能早于字体装载；装载完成后触发重绘）。 */
export function onFontsReady(cb: () => void): void {
  if (fontsDone) cb();
  else readyQueue.push(cb);
}

function ensureFonts(): void {
  if (FONTS) return;
  const handle = delayRender('chrome-ball-fonts');
  let pending = 1;
  const done = (): void => {
    pending -= 1;
    if (pending === 0) {
      fontsDone = true;
      continueRender(handle);
      while (readyQueue.length) readyQueue.shift()!();
    }
  };
  FONTS = {pending, done};
  const add = (family: string, file: string, weight = '100 900'): void => {
    const ff = new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, {weight} as FontFaceDescriptors);
    ff.load().then(() => {
      (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
      done();
    }).catch(() => done());
  };
  add('Noto Sans SC', 'NotoSansSC.ttf');
}
ensureFonts();

/** 字幕带：暖白字 + 深青底带（画面底部），块级淡入淡出 6f。 */
export function drawSubs(c: CanvasCtx, f: number): void {
  for (const s of SUBS) {
    if (f < s.from || f > s.to) continue;
    const a = Math.min(clamp((f - s.from) / 6, 0, 1), clamp((s.to - f) / 6, 0, 1));
    c.save();
    c.globalAlpha = a;
    c.font = '500 23px "Noto Sans SC"';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const wpx = c.measureText(s.text).width + 44;
    c.fillStyle = 'rgba(6,20,18,0.55)';
    c.beginPath();
    c.roundRect(640 - wpx / 2, 652, wpx, 38, 8);
    c.fill();
    c.fillStyle = '#eafaf2';
    c.fillText(s.text, 640, 672);
    c.restore();
  }
}

/** 片名（f331-345 淡入落定后常驻）：右上角 OSD 风——「1995 年的桌面」单串（防右对齐双串重叠）。 */
export function drawTitle(c: CanvasCtx, f: number): void {
  if (f < 331) return;
  const a = easeOut((f - 331) / 14);
  const x = 1244, y1 = 58, y2 = 88;
  c.save();
  c.globalAlpha = a;
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  // 单串右对齐（500 档 Noto；细描边加粗）
  c.font = '500 30px "Noto Sans SC"';
  const text = '1995 年的桌面';
  const tw = c.measureText(text).width;
  const tg = c.createLinearGradient(0, y1 - 30, 0, y1 + 6);
  tg.addColorStop(0, '#ffffff');
  tg.addColorStop(0.6, '#e8f6f6');
  tg.addColorStop(1, '#c3e0e4');
  c.fillStyle = tg;
  c.lineWidth = 1.2;
  c.strokeStyle = 'rgba(255,255,255,.9)';
  c.strokeText(text, x, y1);
  c.fillText(text, x, y1);
  // 副标 + 右对齐细线
  c.font = '500 13px "Noto Sans SC"';
  c.fillStyle = 'rgba(234,250,242,.78)';
  c.fillText('早期光线追踪 CGI · PLASTIC DEMO', x, y2);
  c.fillStyle = 'rgba(255,255,255,.5)';
  c.fillRect(x - Math.max(tw, 240), y2 + 10, Math.max(tw, 240), 1.5);
  c.restore();
  // 淡入末尾的一格白闪（显影落定感）
  if (f >= 331 && f < 335) {
    c.save();
    c.globalAlpha = 0.14 * (1 - (f - 331) / 4);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, W, 1);
    c.restore();
  }
}

/** 线框阶段的渲染进度 OSD（f1-15，磷光绿等宽字；f16 后消失）。 */
export function drawRenderOsd(c: CanvasCtx, f: number): void {
  if (f > 15) return;
  const pct = Math.round((clamp(f, 1, 15) / 15) * 100);
  c.save();
  c.font = '500 15px monospace';
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = 'rgba(70,255,154,.9)';
  c.fillText(`RENDERING SCANLINE  ${String(pct).padStart(3, ' ')}%`, 24, 696);
  // 进度条
  c.strokeStyle = 'rgba(70,255,154,.9)';
  c.lineWidth = 1.5;
  c.strokeRect(24, 702, 190, 7);
  c.fillStyle = 'rgba(70,255,154,.55)';
  c.fillRect(25, 703, 188 * (pct / 100), 5);
  c.restore();
}
