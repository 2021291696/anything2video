// 字体装载（Noto Sans SC 正文/字幕 + Fraunces 衬线 CAFÉ 模版字与 JOU 报头）——FontFace+delayRender，与模板 Fonts 纪律一致。
import {continueRender, delayRender, staticFile} from 'remotion';

let FONTS: {done: () => void} | null = null;

function load(name: string, file: string, weights: FontFaceDescriptors): Promise<void> {
  const ff = new FontFace(name, `url(${staticFile(`fonts/${file}`)})`, weights);
  return ff.load().then((f) => {
    (document.fonts as unknown as {add: (f: FontFace) => void}).add(f);
  });
}

function ensureFonts(): void {
  if (FONTS) return;
  const handle = delayRender('facets-fonts');
  FONTS = {done: () => continueRender(handle)};
  Promise.all([
    load('Noto Sans SC', 'NotoSansSC.ttf', {weight: '100 900'} as FontFaceDescriptors),
    load('Fraunces', 'Fraunces[SOFT,WONK,opsz,wght].ttf', {weight: '100 900'} as FontFaceDescriptors),
  ]).then(() => FONTS?.done()).catch(() => FONTS?.done());
}
ensureFonts();

/** 字体就绪后可同步绘制（渲染器在 delayRender 完成前不取帧）。 */
export const FONT_SANS = '"Noto Sans SC"';
export const FONT_SERIF = '"Fraunces", serif';
