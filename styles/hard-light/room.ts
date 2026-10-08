// 房间底版（双版本画法）—— hard-light。
// 签名①：同一个 room(g,K) 按背光 SH / 受光 LT 两套色各画一张缓存；每帧先铺背光版，
// 再用移动的光斑多边形裁切进受光版 → 光影边缘天然是硬边（本卡禁 blur）。
// 签名⑥：整幅最后叠竖向拉长 fbm 画布刷痕（x·0.06, y·0.006，1/4 分辨率，soft-light α0.2）。
// 横向 fbm 是「水纹大理石」坑——竖向拉长是配方踩坑后的锁死参数。
import {FLOOR, FIX, H, LT, SH, W, WINDOW, type CanvasCtx, type RoomKey} from './types';
import {fbm} from './noise';

const TAU = Math.PI * 2;

/** 窗外对街：红砖立面（砖红 #b4553a 锁死），半拉卷帘高低不一，窗洞右侧 10px 硬影（霍珀细节）。 */
function street(g: CanvasCtx): void {
  const v = WINDOW.view;
  g.save();
  g.beginPath();
  g.rect(v.x, v.y, v.w, v.h);
  g.clip();
  const sk = g.createLinearGradient(0, v.y, 0, v.y + 56);
  sk.addColorStop(0, FIX.skyHi);
  sk.addColorStop(1, FIX.skyLo);
  g.fillStyle = sk;
  g.fillRect(v.x, v.y, v.w, 56);
  g.fillStyle = FIX.brick;                       // 砖立面
  g.fillRect(v.x, v.y + 42, v.w, v.h - 42 - 48);
  g.fillStyle = FIX.brickHi;                     // 檐口
  g.fillRect(v.x, v.y + 38, v.w, 10);
  g.fillStyle = FIX.brickShadow;                 // 檐下硬影
  g.fillRect(v.x, v.y + 48, v.w, 7);
  // 2 行 × 4 扇窗：窗套 + 深玻璃 + 半拉的绿卷帘 + 右侧硬影
  const blindK = [0.55, 0.3, 0.7, 0.42, 0.25, 0.6, 0.5, 0.35];
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < 4; k++) {
      const x = v.x + 14 + k * 62, y = v.y + 58 + row * 58;
      g.fillStyle = FIX.casing;
      g.fillRect(x - 4, y - 4, 48, 56);
      g.fillStyle = FIX.glass;
      g.fillRect(x, y, 40, 48);
      g.fillStyle = FIX.blindOut;
      g.fillRect(x, y, 40, Math.round(48 * blindK[row * 4 + k]));
      g.fillStyle = FIX.winHardShadow;           // 阳光从左来 → 每个窗洞右侧硬影
      g.fillRect(x + 40, y - 4, 7, 56);
    }
  }
  const storeY = v.y + v.h - 68;                 // 店面（理发店所在层）
  g.fillStyle = FIX.fascia;
  g.fillRect(v.x, storeY - 8, v.w, 10);
  g.fillStyle = FIX.store;
  g.fillRect(v.x, storeY + 2, v.w, 44);
  g.fillStyle = FIX.storeWin;
  g.fillRect(v.x + 10, storeY + 8, 116, 34);
  g.fillRect(v.x + 142, storeY + 8, 116, 34);
  g.fillStyle = FIX.storeWinShade;
  g.fillRect(v.x + 10, storeY + 26, 116, 16);
  g.fillRect(v.x + 142, storeY + 26, 116, 16);
  g.fillStyle = FIX.walk;                        // 人行道
  g.fillRect(v.x, v.y + v.h - 22, v.w, 22);
  g.restore();
}

/** 房间：墙/护墙/地板/木地板缝 + 街景 + 窗套窗台中梃 + 半拉卷帘 + 墙上小画框。 */
export function room(g: CanvasCtx, K: RoomKey): void {
  g.fillStyle = K.wall;
  g.fillRect(0, 0, W, FLOOR);
  g.fillStyle = K.dado;
  g.fillRect(0, 428, W, FLOOR - 428);
  g.fillStyle = K.trim;
  g.fillRect(0, 424, W, 6);
  g.fillRect(0, FLOOR - 10, W, 10);
  g.fillStyle = K.floor;
  g.fillRect(0, FLOOR, W, H - FLOOR);
  g.strokeStyle = K.board;
  g.lineWidth = 2;
  for (let k = 1; k < 8; k++) {
    const y = FLOOR + Math.pow(k / 8, 1.5) * (H - FLOOR);
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  street(g);
  const f = WINDOW.frame, v = WINDOW.view;
  g.fillStyle = K.trim;                          // 窗套（白漆）
  g.fillRect(f.x, f.y, f.w, 16);
  g.fillRect(f.x, f.y, 16, f.h);
  g.fillRect(f.x + f.w - 16, f.y, 16, f.h);
  g.fillRect(f.x - 10, f.y + f.h, f.w + 20, 18); // 窗台
  g.fillStyle = K.trimD;
  g.fillRect(f.x - 10, f.y + f.h + 18, f.w + 20, 7);
  g.fillRect(v.x + v.w / 2 - 4, f.y + 16, 8, v.h); // 中梃
  g.fillRect(v.x, f.y + 16 + 130, v.w, 7);         // 横梃
  g.fillStyle = K.blind;                           // 半拉卷帘
  g.fillRect(v.x, f.y + 16, v.w, 44);
  g.fillStyle = K.trimD;
  g.fillRect(v.x, f.y + 60, v.w, 5);
  g.fillStyle = K.trimD;                           // 墙上小画框（霍珀房间的空白小画）
  g.fillRect(1030, 190, 107, 80);
  g.fillStyle = K.dado;
  g.fillRect(1040, 200, 87, 60);
}

let SHADE: HTMLCanvasElement | null = null;
let LIT: HTMLCanvasElement | null = null;

function paintInto(target: HTMLCanvasElement | null, K: RoomKey): HTMLCanvasElement {
  const cv = target ?? document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, W, H);
  room(g, K);
  return cv;
}

/** 背光底版（冷绿）。缓存一次，内容确定性。 */
export function roomShade(): HTMLCanvasElement {
  if (!SHADE) SHADE = paintInto(null, SH);
  return SHADE;
}

/** 受光底版（暖黄）。缓存一次，内容确定性。 */
export function roomLit(): HTMLCanvasElement {
  if (!LIT) LIT = paintInto(null, LT);
  return LIT;
}

/** 油画刷痕：竖向拉长 fbm（x·0.06, y·0.006 主 + 斜向辅），1/4 分辨率生成后放大。 */
let BRUSH: HTMLCanvasElement | null = null;
export function brushTex(): HTMLCanvasElement {
  if (BRUSH) return BRUSH;
  const s = 4, w = W / s, h = H / s;
  const sm2 = document.createElement('canvas');
  sm2.width = w;
  sm2.height = h;
  const sg = sm2.getContext('2d')!;
  const im = sg.createImageData(w, h);
  const d = im.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = fbm(x * 0.06, y * 0.006, 4, 11) * 0.7 + fbm(x * 0.02 + y * 0.02, 3.3, 3, 23) * 0.3;
      const v = 128 + n * 110;
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  sg.putImageData(im, 0, 0);
  const full = document.createElement('canvas');
  full.width = W;
  full.height = H;
  const fg = full.getContext('2d')!;
  fg.imageSmoothingQuality = 'high';
  fg.drawImage(sm2, 0, 0, W, H);
  BRUSH = full;
  return BRUSH;
}

export {TAU};
