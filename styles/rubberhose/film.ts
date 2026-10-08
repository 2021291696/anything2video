// 签名④ 胶片层全套 + 签名⑥ 去色褪色 + 老片头倒计时钩子。
// 机制借鉴 huashu-art-motion lib/post.js P.film/P.gateWeave/P.fade (MIT)，TSX 重写：
// 24fps 闪烁 / 划痕 floor(t·6) 换位跨格存活 / 灰尘毛发 / 颗粒抖动 / 圆角片门+暗角；
// 去色 = saturation 合成灰 + multiply 染色（手套残留暖色的坑：必须角色画完再统一做）。
import {mulberry32, clamp} from './prims';
import {H, INK, TINT, W, type CanvasCtx} from './types';

/** 抖片（gate weave）：画的内容整体按 24fps 微抖 ±amp/2 */
export function gateWeave(c: CanvasCtx, t: number, fn: () => void, amp: [number, number] = [3, 4]): void {
  const r = mulberry32(Math.floor(t * 24) * 31 + 7);
  c.save();
  c.translate((r() - 0.5) * amp[0], (r() - 0.5) * amp[1]);
  fn();
  c.restore();
}

let GRAIN: HTMLCanvasElement | null = null;
/** 颗粒贴片：256² 一次性生成（seed 固定），每格换偏移制造「颗粒在跳」 */
function grainTile(): HTMLCanvasElement {
  if (GRAIN) return GRAIN;
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  const r = mulberry32(913);
  for (let i = 0; i < 2600; i++) {
    const v = r();
    g.fillStyle = v < 0.5 ? 'rgba(20,18,16,.28)' : 'rgba(255,250,238,.22)';
    const s = 0.8 + r() * 1.6;
    g.fillRect(r() * 256, r() * 256, s, s);
  }
  GRAIN = cv;
  return cv;
}

let GATE: HTMLCanvasElement | null = null;
/** 圆角片门：外圈压黑 + 暗角（缓存一次） */
function gateMask(): HTMLCanvasElement {
  if (GATE) return GATE;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(10,8,5,0)');
  vg.addColorStop(0.7, 'rgba(10,8,5,.18)');
  vg.addColorStop(1, 'rgba(10,8,5,.85)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#0c0a07';
  g.beginPath();
  g.rect(0, 0, W, H);
  g.roundRect(14, 10, W - 28, H - 20, 44);
  g.fill('evenodd');
  GATE = cv;
  return cv;
}

/** 胶片层：闪烁双叠 + 跨格存活的竖划痕 + 灰尘/毛发 + 颗粒抖动 + 片门。全按 24fps 换格。 */
export function filmLayer(c: CanvasCtx, t: number): void {
  const fq = Math.floor(t * 24);
  const r = mulberry32(fq * 7919 + 11);
  // 闪烁：白叠 + 黑叠双份
  c.fillStyle = `rgba(255,250,235,${(0.02 + r() * 0.07).toFixed(3)})`;
  c.fillRect(0, 0, W, H);
  c.fillStyle = `rgba(20,16,10,${(r() * 0.06).toFixed(3)})`;
  c.fillRect(0, 0, W, H);
  // 竖划痕：floor(t*6) 当寿命，一条划痕活好几格（换位不换活）
  const r6 = mulberry32(Math.floor(t * 6) * 131 + 5);
  for (let k = 0; k < 3; k++) {
    const x = r6() * W + (r() - 0.5) * 6;
    c.strokeStyle = r6() < 0.5 ? 'rgba(255,252,240,.55)' : 'rgba(20,16,10,.5)';
    c.lineWidth = 1 + r6() * 2;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + (r() - 0.5) * 12, H);
    c.stroke();
  }
  // 灰尘 14 点 + 偶发一根毛发
  for (let k = 0; k < 14; k++) {
    c.fillStyle = r() < 0.6 ? 'rgba(20,16,10,.7)' : 'rgba(255,252,240,.8)';
    c.beginPath();
    c.arc(r() * W, r() * H, 1 + r() * 3.5, 0, 7);
    c.fill();
  }
  if (r() < 0.5) {
    c.strokeStyle = 'rgba(20,16,10,.6)';
    c.lineWidth = 1.6;
    const x = r() * W;
    const y = r() * H;
    c.beginPath();
    c.moveTo(x, y);
    c.bezierCurveTo(x + 30, y - 20, x + 10, y + 40, x + 50, y + 30);
    c.stroke();
  }
  // 颗粒每格平移 ±20px
  c.globalAlpha = 0.5;
  c.drawImage(grainTile(), (r() - 0.5) * 40, (r() - 0.5) * 40);
  c.globalAlpha = 1;
  c.drawImage(gateMask(), 0, 0);
}

/** 签名⑥：saturation 去色 + multiply 暖灰染色。必须角色画完再统一做，否则手套/杯子残留暖色。 */
export function fadeMono(c: CanvasCtx, extraFade = 0): void {
  c.save();
  c.globalCompositeOperation = 'saturation';
  c.fillStyle = 'rgba(128,128,128,1)';
  c.fillRect(0, 0, W, H);
  c.restore();
  if (extraFade > 0) {
    // 定格褪色：向纸白再提一档（alpha 混合 TINT）+ 轻白纱
    c.save();
    c.globalAlpha = clamp(extraFade * 0.5, 0, 1);
    c.fillStyle = TINT;
    c.fillRect(0, 0, W, H);
    c.globalAlpha = extraFade * 0.22;
    c.fillStyle = '#fffaec';
    c.fillRect(0, 0, W, H);
    c.restore();
  }
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = TINT;
  c.fillRect(0, 0, W, H);
  c.restore();
}

/** 老片头倒计时（钩子，f1-13）：圆圈 + 楔形扫掠 + 十字线 + 数字 3；胶片划痕更密。
 *  k: 0→1 开启进度（圆心不缩，整层淡入淡出由调用方 alpha 控制）。 */
export function drawCountdown(c: CanvasCtx, k: number): void {
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) * 0.36;
  c.save();
  // 楔形扫掠：亮楔随 k 旋转一周
  const a0 = -Math.PI / 2;
  const a1 = a0 + clamp(k) * Math.PI * 2;
  c.fillStyle = 'rgba(252,246,228,.16)';
  c.beginPath();
  c.moveTo(cx, cy);
  c.arc(cx, cy, R, a0, a1);
  c.closePath();
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 7;
  c.beginPath();
  c.arc(cx, cy, R, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(cx - R, cy);
  c.lineTo(cx + R, cy);
  c.moveTo(cx, cy - R);
  c.lineTo(cx, cy + R);
  c.stroke();
  c.fillStyle = INK;
  c.font = `900 ${Math.round(R * 0.9)}px "Noto Serif SC", serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('3', cx, cy + R * 0.04);
  c.restore();
}

/** 圆形片门开合（iris）：r 从 60→全开；返回是否还有遮挡需要画。 */
export function drawIris(c: CanvasCtx, open: number): void {
  const r = 60 + clamp(open) * (Math.hypot(W, H) / 2 + 40);
  if (r >= Math.hypot(W, H) / 2 + 40) return;
  c.save();
  c.fillStyle = '#0c0a07';
  c.beginPath();
  c.rect(0, 0, W, H);
  c.arc(W / 2, H / 2, r, 0, Math.PI * 2);
  c.fill('evenodd');
  c.strokeStyle = INK;
  c.lineWidth = 6;
  c.beginPath();
  c.arc(W / 2, H / 2, r, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}
