// 窗外小件与杯口热气 —— hard-light。
// 签名⑤：窗外对街的理发店旋转柱（红/蓝斜纹 60px/s 上行，锁死速度）。
// 结尾定帧微动效：旋转柱 + 卷帘拉绳轻摆 + 热气 + 浮尘（见 light.ts）。
// 纪律：无 blur、无渐变羽化（热气为低α细线，非光斑边缘，允许柔曲线但不用 filter）。
import {FIX, WINDOW, type CanvasCtx} from './types';
import {tnoise} from './noise';

/** 理发店旋转柱：奶油底 + 红/蓝斜纹，60px/s 上行（% 条纹周期 14px）。 */
export function barberPole(c: CanvasCtx, t: number): void {
  const bx = 508, by = 296, bw = 11, bh = 36;
  c.save();
  c.beginPath();
  c.rect(bx, by, bw, bh);
  c.clip();
  c.fillStyle = FIX.poleCream;
  c.fillRect(bx, by, bw, bh);
  const off = ((t * 60) % 14 + 14) % 14;
  c.lineWidth = 4;
  for (let k = -2; k < 5; k++) {
    const y = by + k * 14 - off;
    c.strokeStyle = k % 2 ? FIX.poleRed : FIX.poleBlue;
    c.beginPath();
    c.moveTo(bx - 3, y + 9);
    c.lineTo(bx + bw + 3, y);
    c.stroke();
  }
  c.restore();
  c.fillStyle = FIX.poleCap;
  c.fillRect(bx - 2, by - 5, bw + 4, 5);
  c.fillRect(bx - 2, by + bh, bw + 4, 5);
}

/** 卷帘拉绳轻摆（sin 4.2 rad/s × 0.07rad，锚在卷帘右下角）。 */
export function blindCord(c: CanvasCtx, t: number): void {
  const ax = WINDOW.view.x + WINDOW.view.w - 24;
  const ay = WINDOW.frame.y + 65;
  const sw = Math.sin(t * 4.2) * 0.07;
  c.save();
  c.translate(ax, ay);
  c.rotate(sw);
  c.strokeStyle = FIX.cord;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, 44);
  c.stroke();
  c.strokeStyle = FIX.cordRing;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, 50, 4.5, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

/** 杯口热气：两缕低α细线上升（无 filter；摆动由时间维噪声驱动，确定性）。 */
export function steam(c: CanvasCtx, t: number, x: number, y: number): void {
  c.save();
  c.strokeStyle = 'rgba(255,248,230,1)';
  c.lineCap = 'round';
  for (let j = 0; j < 2; j++) {
    const ph = t * 0.9 + j * 2.6;
    const a = 0.24 + 0.1 * tnoise(t * 1.3, 40 + j * 7);
    c.globalAlpha = Math.max(0.05, a);
    c.lineWidth = 2.2 - j * 0.5;
    c.beginPath();
    c.moveTo(x + j * 3, y);
    c.bezierCurveTo(
      x + j * 3 + Math.sin(ph) * 6, y - 12,
      x + j * 3 - Math.sin(ph * 1.3) * 7, y - 24,
      x + j * 3 + Math.sin(ph * 0.7) * 5, y - 36,
    );
    c.stroke();
  }
  c.restore();
}
