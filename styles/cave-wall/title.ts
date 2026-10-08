// 题字（喷绘写出）与字幕（炭底白垩）。红赭题字画进颜料层（同样吃岩面贴图）。
import {continueRender, delayRender, staticFile} from 'remotion';
import {PAL, type CanvasCtx} from './types';
import {boilSeed, clamp, hash2, mulberry32} from './noise';
import {poly, roughPts, spray} from './charcoal';
import {SUBS} from '../common/subs';

let FONTS: {pending: number; done: () => void} | null = null;

function ensureFonts(): void {
  if (FONTS) return;
  const handle = delayRender('cave-wall-fonts');
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

const TITLE = '第一幅画';
const TITLE_X = 1150, TITLE_Y = 772, TITLE_SIZE = 112;

/** 题字「第一幅画」：f300-348 喷绘写出（逐字揭示 + 前沿喷点），红赭，Noto Serif SC。 */
export function drawTitle(g: CanvasCtx, f: number): void {
  if (f < 300) return;
  const q = clamp((f - 300) / 48);
  g.save();
  g.font = `900 ${TITLE_SIZE}px "Noto Serif SC"`;
  g.textBaseline = 'alphabetic';
  g.fillStyle = PAL.title;
  const chars = [...TITLE];
  const widths = chars.map((ch) => g.measureText(ch).width);
  const gap = 26;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let x = TITLE_X - total / 2;
  let frontier = TITLE_X - total / 2;
  chars.forEach((ch, i) => {
    const w = widths[i];
    const charK = clamp(((f - 300) / 44) * chars.length - i * 0.9);
    if (charK > 0) {
      g.save();
      g.beginPath();
      g.rect(x - 4, TITLE_Y - TITLE_SIZE, w * Math.min(1, charK * 1.3) + 8, TITLE_SIZE * 1.25);
      g.clip();
      g.globalAlpha = 0.92;
      g.fillText(ch, x, TITLE_Y);
      g.restore();
    }
    frontier = Math.max(frontier, x + w * charK);
    x += w + gap;
  });
  // 写出前沿的喷雾点
  if (q > 0 && q < 1) {
    const b = boilSeed(f);
    spray(g, frontier + 14, TITLE_Y - 44, 20, 40, PAL.title, 701 + b, 0.8, 2.6, 0.1, 0.5);
  }
  // 炭笔下划线（写完后补一笔）
  if (f > 344) {
    const k = clamp((f - 344) / 10);
    const line = roughPts([[TITLE_X - total / 2 - 10, TITLE_Y + 26], [TITLE_X - total / 2 + total * k, TITLE_Y + 30]], 81, 2.5);
    g.strokeStyle = 'rgba(33,21,13,.8)';
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath();
    line.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
  }
  g.restore();
}

/** 字幕：炭底粗糙板 + 白垩字（屏幕空间，boil 微颤）。 */
export function drawSubs(c: CanvasCtx, f: number): void {
  const sub = SUBS.find((s) => f >= s.from && f <= s.to);
  if (!sub) return;
  const b = boilSeed(f);
  const jx = (hash2(b, 81, 31) - 0.5) * 2.4, jy = (hash2(b, 82, 31) - 0.5) * 2.4;
  c.save();
  c.font = '700 30px "Noto Sans SC"';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const tw = c.measureText(sub.text).width;
  const cx = 640 + jx, cy = 656 + jy;
  const bw = tw + 64, bh = 54;
  const rect = roughPts([[cx - bw / 2, cy - bh / 2], [cx + bw / 2, cy - bh / 2], [cx + bw / 2, cy + bh / 2], [cx - bw / 2, cy + bh / 2]], 91, 2.2);
  c.fillStyle = 'rgba(22,12,6,.62)';
  c.fill(poly(rect));
  c.strokeStyle = 'rgba(240,223,191,.35)';
  c.lineWidth = 2;
  c.stroke(poly(rect));
  c.fillStyle = PAL.chalk;
  c.fillText(sub.text, cx, cy + 1);
  c.restore();
}
