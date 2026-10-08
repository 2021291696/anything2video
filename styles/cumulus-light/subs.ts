// 字幕（奶油字 + 藏青深底板，屏幕空间）。SUBS 由 tts_build 生成；字体经 FontFace+delayRender 装载。
import {continueRender, delayRender, staticFile} from 'remotion';
import {CanvasCtx, FIX} from './types';
import {SUBS} from '../common/subs';

let FONTS: {done: () => void} | null = null;

function ensureFonts(): void {
  if (FONTS) return;
  const handle = delayRender('cumulus-light-fonts');
  FONTS = {done: () => continueRender(handle)};
  const ff = new FontFace('Noto Sans SC', `url(${staticFile('fonts/NotoSansSC.ttf')})`, {weight: '100 900'} as FontFaceDescriptors);
  ff.load().then(() => {
    (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
    FONTS?.done();
  }).catch(() => FONTS?.done());
}
ensureFonts();

/** 字幕：底部深底板 + 奶油字（夏日天光的安静注脚，无抖动装饰）。 */
export function drawSubs(c: CanvasCtx, f: number): void {
  const sub = SUBS.find((s) => f >= s.from && f <= s.to);
  if (!sub) return;
  c.save();
  c.font = '700 28px "Noto Sans SC"';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const tw = c.measureText(sub.text).width;
  const cx = 640, cy = 652;
  const bw = tw + 56, bh = 46;
  c.fillStyle = FIX.subPlate;
  c.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
  c.strokeStyle = 'rgba(255,246,214,0.28)';
  c.lineWidth = 1.5;
  c.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
  c.fillStyle = FIX.subText;
  c.fillText(sub.text, cx, cy + 1);
  c.restore();
}
