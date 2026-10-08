// melt 转场（签名⑥）：新画面像颜料一样从上往下「流」下来——下缘是整体下落线＋一排圆头液滴
// （剖面 (1−u²)^0.3：长条＋圆头，往下挂）；旧画面被压着逐列下垂（融化）；液面一道高光＋一道暗边。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）scripts/engine/transitions.js T.melt（已核行 663-680）
// （MIT）——机制与参数级借鉴，Remotion(React+TSX)+Canvas2D 重写，参数按 1280×720 重定标，零整段拷贝。
import {W, H, type CanvasCtx} from './types';
import {mulberry32, clamp, lerp, seg, ease} from './noise';

/** 本工程特写画（cam1）与全景画（cam2）的整帧草稿层（ melt 窗口内每帧重画）。 */
export function scratchFrame(key: 'A' | 'B'): HTMLCanvasElement {
  let cv = (scratchFrame as unknown as {store?: Map<string, HTMLCanvasElement>}).store?.get(key);
  const store = (scratchFrame as unknown as {store?: Map<string, HTMLCanvasElement>}).store ?? new Map<string, HTMLCanvasElement>();
  (scratchFrame as unknown as {store?: Map<string, HTMLCanvasElement>}).store = store;
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    store.set(key, cv);
  }
  return cv;
}

/** 圆头液滴表：seeded 每帧同序重建（26 滴：x 全宽散布、宽 7-21、长 40-187、相位 0-0.25）。 */
function drips(): Array<[number, number, number, number]> {
  const r = mulberry32(41);
  const out: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 26; i++) out.push([r() * W, 7 + r() * 14, 40 + r() * 147, r() * 0.25]);
  return out;
}

/** 融化下缘：整体下落线 + 各液滴剖面 (1−u²)^0.3（长条＋圆头）+ 一道缓 sin 起伏。 */
function edgeAt(x: number, drip: Array<[number, number, number, number]>, p: number, fall: number): number {
  let d = 0;
  for (const [dx, w, h, t0] of drip) {
    const u = (x - dx) / w;
    if (u > -1 && u < 1) d = Math.max(d, h * seg(p, t0, t0 + 0.5) * Math.pow(1 - u * u, 0.3));
  }
  return fall + d + Math.sin(x * 0.0067 + 1) * 16;
}

/** 双画面融化合成：A（旧画）逐列下垂 → B（新画）裁在液面以上 → 液面暗边（厚度）＋高光。 */
export function meltTransition(c: CanvasCtx, A: HTMLCanvasElement, B: HTMLCanvasElement, p: number): void {
  const drip = drips();
  const e = ease.inOut(clamp(p));
  const fall = lerp(-107, H + 40, e);
  // 旧画面逐列下垂（越靠近液面压得越多）
  const sw = 3;
  for (let x = 0; x < W; x += sw) {
    const ed = edgeAt(x, drip, p, fall);
    const sag = Math.max(0, ed) * 0.22 * e;
    c.drawImage(A, x, 0, sw, H, x, sag, sw, H + sag * 0.3);
  }
  // 新画面：液面以上
  c.save();
  c.beginPath();
  c.moveTo(0, -10);
  for (let x = 0; x <= W; x += 3) c.lineTo(x, edgeAt(x, drip, p, fall));
  c.lineTo(W, -10);
  c.closePath();
  c.clip();
  c.drawImage(B, 0, 0);
  c.restore();
  // 液面：内侧暗边（厚度感）＋高光
  c.save();
  c.beginPath();
  for (let x = 0; x <= W; x += 3) {
    const y = edgeAt(x, drip, p, fall);
    if (x) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  c.strokeStyle = 'rgba(40,20,10,.35)';
  c.lineWidth = 6;
  c.filter = 'blur(2px)';
  c.stroke();
  c.filter = 'none';
  c.translate(0, -3);
  c.strokeStyle = 'rgba(255,250,232,.7)';
  c.lineWidth = 2;
  c.stroke();
  c.restore();
}
