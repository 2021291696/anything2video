// stipple 颗粒点彩（签名⑤）+ 角色层静态颗粒纹理。
// 密度是位置函数：density(x,y)→[0,1]，形状内撒 2px 方点，越靠“受光反向”越密（粉圆下密上疏）。
// 角色层画完后叠一张静态颗粒纹理 source-atop（5% 暗 α70 + 3.5% 亮 α90），颗粒只落在角色身上。
// 技法借鉴 huashu-art-motion (MIT) scenes/16_2026.js stipple()/grainTex()，TSX 重写。
import type {CanvasCtx} from './types';
import {mulberry32} from './util';
import {lerp} from './util';

/** 在 shape（Path2D，可空=矩形域）内按密度函数撒方点。 */
export function stipple(
  g: CanvasCtx,
  shape: Path2D | null,
  box: [number, number, number, number],
  col: string,
  density: (x: number, y: number) => number,
  seed: number,
  size = 2.2,
): void {
  const r = mulberry32(seed);
  const [x0, y0, x1, y1] = box;
  g.save();
  if (shape) g.clip(shape);
  g.fillStyle = col;
  const n = Math.round((x1 - x0) * (y1 - y0) * 0.02);
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r());
    const y = lerp(y0, y1, r());
    if (r() < density(x, y)) {
      const s = size * (0.6 + r() * 0.8);
      g.fillRect(x, y, s, s);
    }
  }
  g.restore();
}

/** 粉圆标准密度函数：0.12 + 0.75·clamp((y-cy+lift)/span)（越往下越密）。 */
export function pinkCircleDensity(cy: number, lift: number, span: number): (x: number, y: number) => number {
  return (_x: number, y: number) => 0.12 + 0.75 * Math.max(0, Math.min(1, (y - cy + lift) / span));
}

/** 角色层静态颗粒纹理（一次性构建）：5% 暗点 α70、3.5% 亮点 α90。 */
export function grainTexture(w: number, h: number, seed: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  const im = g.createImageData(w, h);
  const d = im.data;
  const r = mulberry32(seed);
  for (let i = 0; i < w * h; i++) {
    const v = r();
    if (v < 0.05) {
      d[i * 4] = 60;
      d[i * 4 + 1] = 40;
      d[i * 4 + 2] = 70;
      d[i * 4 + 3] = 70;
    } else if (v > 0.965) {
      d[i * 4] = 255;
      d[i * 4 + 1] = 255;
      d[i * 4 + 2] = 255;
      d[i * 4 + 3] = 90;
    }
  }
  g.putImageData(im, 0, 0);
  return cv;
}

/** 简单帧记忆缓存（同 key 只构建一次；纹理/贴图均为确定性 seeded，帧间共享安全）。 */
const CACHE = new Map<string, HTMLCanvasElement>();
export function cached(key: string, w: number, h: number, build: (g: CanvasCtx) => void): HTMLCanvasElement {
  const hit = CACHE.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  build(g);
  CACHE.set(key, cv);
  return cv;
}
