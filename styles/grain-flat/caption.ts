// 字幕：扁平胶囊（藏青圆角 pill + 奶白字），块级淡入。数据来自 tts_build 生成的 SUBS。
import {delayRender, continueRender, staticFile} from 'remotion';
import {PAL} from './types';
import {SUBS} from '../common/subs';
import type {CanvasCtx} from './types';

let FONTS: {pending: number; done: () => void} | null = null;
function ensureFonts(): void {
  if (FONTS) return;
  const handle = delayRender('grain-flat-fonts');
  let pending = 1;
  const done = (): void => {
    pending -= 1;
    if (pending === 0) continueRender(handle);
  };
  FONTS = {pending, done};
  const ff = new FontFace('Noto Sans SC', `url(${staticFile('fonts/NotoSansSC.ttf')})`, {weight: '100 900'} as FontFaceDescriptors);
  ff.load()
    .then(() => {
      (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
      done();
    })
    .catch(() => done());
}
ensureFonts();

/** 底部居中胶囊字幕（扁平：无描边、深底亮字、短入淡出）。 */
export function drawSubs(c: CanvasCtx, f: number): void {
  const cur = SUBS.find((s) => f >= s.from - 2 && f <= s.to + 4);
  if (!cur) return;
  const aIn = Math.min(1, (f - (cur.from - 2)) / 4);
  const aOut = 1 - Math.max(0, (f - cur.to) / 4);
  const a = Math.max(0, Math.min(aIn, aOut));
  if (a <= 0.01) return;
  const size = 30;
  c.save();
  c.globalAlpha = a;
  c.font = `600 ${size}px "Noto Sans SC"`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const w = c.measureText(cur.text).width;
  const bx = 640, by = 616;
  const padX = 26, padY = 13;
  c.fillStyle = PAL.navy;
  c.beginPath();
  c.roundRect(bx - w / 2 - padX, by - size / 2 - padY, w + padX * 2, size + padY * 2, (size + padY * 2) / 2);
  c.fill();
  c.fillStyle = PAL.white;
  c.fillText(cur.text, bx, by + 1);
  c.restore();
}
