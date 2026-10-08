// 字幕（奶油字 + 半透明暖褐底板，屏幕空间）。SUBS 由 tts_build 生成；字体经 FontFace+delayRender 装载。
import {continueRender, delayRender, staticFile} from 'remotion';
import {FIX, type CanvasCtx} from './types';
import {SUBS} from '../common/subs';

let FONTS: {done: () => void} | null = null;

function ensureFonts(): void {
  if (FONTS) return;
  const handle = delayRender('watercolor-cel-fonts');
  FONTS = {done: () => continueRender(handle)};
  const ff = new FontFace('Noto Sans SC', `url(${staticFile('fonts/NotoSansSC.ttf')})`, {weight: '100 900'} as FontFaceDescriptors);
  ff.load().then(() => {
    (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
    FONTS?.done();
  }).catch(() => FONTS?.done());
}
ensureFonts();

/** 字幕：底部暖纸底板 + 深褐字（水彩画的铅笔注脚，安静无装饰）。 */
export function drawSubs(c: CanvasCtx, f: number): void {
  const sub = SUBS.find((s) => f >= s.from && f <= s.to);
  if (!sub) return;
  c.save();
  c.font = '700 28px "Noto Sans SC"';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const tw = c.measureText(sub.text).width;
  const cx = 640, cy = 654;
  const bw = tw + 52, bh = 44;
  c.fillStyle = FIX.subPlate;
  c.beginPath();
  if ((c as CanvasRenderingContext2D & {roundRect?: (x: number, y: number, w: number, h: number, r: number) => void}).roundRect) {
    (c as CanvasRenderingContext2D & {roundRect: (x: number, y: number, w: number, h: number, r: number) => void}).roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
  } else {
    c.rect(cx - bw / 2, cy - bh / 2, bw, bh);
  }
  c.fill();
  c.fillStyle = FIX.subText;
  c.fillText(sub.text, cx, cy + 1);
  c.restore();
}
