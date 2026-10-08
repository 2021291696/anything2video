// 字幕与片名 —— shadow-play。暖白字幕带 + 收戏「幕后」印红题字。
import {delayRender, continueRender, staticFile} from 'remotion';
import {PAL, type CanvasCtx} from './types';
import {ease} from './noise';
import {SUBS} from '../common/subs';

let FONTS: {pending: number; done: () => void} | null = null;

function ensureFonts(): void {
  if (FONTS) return;
  const handle = delayRender('shadow-play-fonts');
  let pending = 2;
  const done = (): void => {
    pending -= 1;
    if (pending === 0) continueRender(handle);
  };
  FONTS = {pending, done};
  const add = (family: string, file: string): void => {
    const ff = new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, {weight: '100 900'} as FontFaceDescriptors);
    ff.load().then(() => {
      (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
      done();
    }).catch(() => done());
  };
  add('Noto Serif SC', 'NotoSerifSC[wght].ttf');
  add('Noto Sans SC', 'NotoSansSC.ttf');
}
ensureFonts();

/** 字幕带：暖白字 + 深褐底带（幕内底部），块级淡入淡出 6f。 */
export function drawSubs(c: CanvasCtx, f: number): void {
  for (const s of SUBS) {
    if (f < s.from || f > s.to) continue;
    const a = Math.min(ease((f - s.from) / 6), ease((s.to - f) / 6));
    c.save();
    c.globalAlpha = a;
    c.font = '500 23px "Noto Sans SC"';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const wpx = c.measureText(s.text).width + 44;
    c.fillStyle = PAL.band;
    c.beginPath();
    c.roundRect(640 - wpx / 2, 652, wpx, 38, 8);
    c.fill();
    c.fillStyle = PAL.sub;
    c.fillText(s.text, 640, 672);
    c.restore();
  }
}

/** 片名「幕后」：f336-374 印红写出（皮人退场后、定帧前），随收戏留在幕上。 */
export function drawTitle(c: CanvasCtx, f: number): void {
  if (f < 336) return;
  const a = ease((f - 336) / 14);
  c.save();
  c.globalAlpha = a;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = '900 88px "Noto Serif SC"';
  c.lineWidth = 7;
  c.strokeStyle = PAL.edge;
  c.strokeText('幕 后', 640, 476);
  c.fillStyle = PAL.title;
  c.fillText('幕 后', 640, 476);
  c.font = '500 21px "Noto Sans SC"';
  c.fillStyle = PAL.sub;
  c.globalAlpha = a * 0.9;
  c.fillText('中 国 皮 影 戏', 640, 512);
  c.globalAlpha = a;
  c.fillStyle = PAL.sub;
  c.fillRect(640 - 120, 528, 240, 2);
  c.restore();
}
