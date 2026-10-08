// 字幕（浅蓝灰字 + 深蓝底板，屏幕空间）。SUBS 由 tts_build 生成；字体经 FontFace+delayRender 装载。
import {continueRender, delayRender, staticFile} from 'remotion';
import {BLUE, type CanvasCtx} from './types';
import {SUBS} from '../common/subs';

let FONTS: {done: () => void} | null = null;

function ensureFonts(): void {
  if (FONTS) return;
  const handle = delayRender('blue-period-fonts');
  FONTS = {done: () => continueRender(handle)};
  const ff = new FontFace('Noto Sans SC', `url(${staticFile('fonts/NotoSansSC.ttf')})`, {weight: '100 900'} as FontFaceDescriptors);
  ff.load().then(() => {
    (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
    FONTS?.done();
  }).catch(() => FONTS?.done());
}
ensureFonts();

/** 字幕：底部深蓝底板 + 浅蓝灰字（单色纪律内最亮一档，安静地念）。 */
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
  c.fillStyle = 'rgba(10,20,44,0.62)';
  c.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
  c.strokeStyle = 'rgba(107,143,182,0.35)';
  c.lineWidth = 1.5;
  c.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
  c.fillStyle = BLUE.hair;
  c.fillText(sub.text, cx, cy + 1);
  c.restore();
}
