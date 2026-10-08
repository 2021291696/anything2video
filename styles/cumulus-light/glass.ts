// 窗玻璃水珠 + 白纱窗帘 —— cumulus-light。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）scenes/35_shinkai.js，TSX+Canvas2D 重写：
//   水珠只画「下缘弧线 + α0.22 透明体 + 高光点」三件（画成实心圆 = 气泡坑，禁）；
//   一颗大水珠沿玻璃滑下带水痕（英雄拍：f196 起滑，f252 到窗台）；
//   白纱窗帘右缘贝塞尔随风鼓起，gust 时幅值增大。
import {CanvasCtx, GLASS, MULLION} from './types';
import {clamp, mulberry32, smoothstep} from './noise';

type Drop = {x: number; y: number; r: number};

const DROPS: Drop[] = (() => {
  const d = mulberry32(64202611);
  const out: Drop[] = [];
  for (let i = 0; i < 20; i++) {
    const x = GLASS.x + 10 + d() * (GLASS.w - 20);
    const y = GLASS.y + 16 + d() * (GLASS.h - 40);
    const r = 1.5 + d() * 2.6;
    if (x > MULLION.x - 6 && x < MULLION.x + MULLION.w + 6) continue;
    out.push({x, y, r});
  }
  return out;
})();

/** 静态小水珠 20 颗（下缘弧 + 透明体 + 高光点）。 */
export function drawDrops(c: CanvasCtx): void {
  DROPS.forEach((d) => {
    c.strokeStyle = 'rgba(30,60,120,.45)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(d.x, d.y, d.r, 0.3, Math.PI - 0.3);
    c.stroke();
    c.fillStyle = 'rgba(220,240,255,.22)';
    c.beginPath();
    c.arc(d.x, d.y, d.r, 0, 7);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(d.x - d.r * 0.35, d.y - d.r * 0.35, d.r * 0.28, 0, 7);
    c.fill();
  });
}

/** 英雄水珠：f196-252 沿左片玻璃滑下（带渐细水痕），滑到窗台上缘停住。f=1 起帧号。 */
export function drawSliderDrop(c: CanvasCtx, f: number): void {
  const x = 268, y0 = 150, y1 = 462;
  const k = smoothstep((f - 196) / 56);
  if (f < 196) return;
  const y = y0 + (y1 - y0) * k;
  // 水痕：从起点到当前，随距离变淡
  c.strokeStyle = `rgba(230,245,255,${0.5 * (1 - k * 0.45)})`;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x, y0);
  c.lineTo(x, y);
  c.stroke();
  // 透明体 + 下缘弧 + 高光（下缘弧在中下段加粗 = 重力感）
  c.fillStyle = 'rgba(225,242,255,.28)';
  c.beginPath();
  c.ellipse(x, y, 7.5, 10 + 2.5 * k, 0, 0, 7);
  c.fill();
  c.strokeStyle = 'rgba(30,60,120,.55)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.arc(x, y, 8 + 2 * k, 0.35, Math.PI - 0.35);
  c.stroke();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(x - 2.6, y - 3.5, 2.3, 0, 7);
  c.fill();
}

/** 白纱窗帘（玻璃右缘内侧，贝塞尔边缘随风摆；gust 0..1 风阵增幅）。 */
export function drawCurtain(c: CanvasCtx, t: number, gust: number): void {
  const wv = (Math.sin(t * 2.6) * 15 + Math.sin(t * 5.3) * 4) * (1 + gust * 0.7);
  const top = GLASS.y - 6, bot = GLASS.y + GLASS.h + 6;
  const xr = GLASS.x + GLASS.w - 34;
  const cur = new Path2D();
  cur.moveTo(xr - 52, top);
  cur.lineTo(xr, top);
  cur.bezierCurveTo(xr + 8, top + 150, xr - 10 + wv * 0.3, top + 280, xr + 4, bot);
  cur.lineTo(xr - 52 - wv, bot);
  cur.bezierCurveTo(xr - 86 - wv * 1.3, top + 230, xr - 60 - wv * 0.6, top + 120, xr - 52, top);
  cur.closePath();
  c.fillStyle = 'rgba(255,255,255,.5)';
  c.fill(cur);
  c.strokeStyle = 'rgba(200,210,230,.45)';
  c.lineWidth = 1.4;
  for (let k = 0; k < 3; k++) {
    c.beginPath();
    c.moveTo(xr - 40 + k * 14, top + 2);
    c.bezierCurveTo(xr - 36 + k * 14, top + 130, xr - 40 + k * 12 - wv * (0.4 + k * 0.1), top + 250, xr - 36 + k * 14 - wv * (0.8 - k * 0.15), bot - 2);
    c.stroke();
  }
}

/** 结尾定帧用的姿态冻结钳制（水珠已停，不再动）。 */
export function dropDone(f: number): boolean {
  return clamp((f - 196) / 56, 0, 1) >= 1;
}
