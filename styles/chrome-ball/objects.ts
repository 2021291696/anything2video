// chrome-ball 道具层：铬球逐像素环境映射（签名④）、紫环 140 珠深度排序自转、绿锥。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）15_raytrace 的 chromeSphere/torus 机制与锁死参数
// （反射向量向下→棋盘向上→粉紫天、棋盘 u 随 t·4.5 平移=球在转、7rad/s 倾斜 0.35 深度排序），
// Remotion(TSX) 重写，零整段拷贝。
import type {CanvasCtx} from './types';
import {clamp, lerp} from './noise';
import {scratch} from './world';

// ---------- 签名④ 铬球：每帧逐像素环境映射 ----------
// 反射向量 R = 2(N·V)N − V（V=(0,0,1)）：向下看→棋盘（u 随 t·4.5 平移＝球在转），向上→粉紫天＋一条窗光；
// 菲涅尔边缘提亮；最后叠左上硬高光。
const SPH_SCRATCH = {cv: null as HTMLCanvasElement | null};

export function chromeSphere(c: CanvasCtx, t: number, cx: number, cy: number, r: number): void {
  const D = r * 2 + 2;
  if (!SPH_SCRATCH.cv || SPH_SCRATCH.cv.width < D) {
    const cv = document.createElement('canvas');
    cv.width = D + 4;
    cv.height = D + 4;
    SPH_SCRATCH.cv = cv;
  }
  const cv = SPH_SCRATCH.cv;
  const g = cv.getContext('2d')!;
  const im = g.createImageData(D, D);
  const d = im.data;
  const rot = t * 4.5; // 签名④锁死：棋盘 u 坐标随 t·4.5 平移＝球在转
  for (let y = 0; y < D; y++) {
    for (let x = 0; x < D; x++) {
      const nx = (x - r) / r, ny = (y - r) / r;
      const q = nx * nx + ny * ny;
      if (q > 1) continue;
      const nz = Math.sqrt(1 - q);
      const i = (y * D + x) * 4;
      // 反射方向（V=(0,0,1)）：R = 2(N·V)N − V
      const rx = 2 * nz * nx, ry = 2 * nz * ny, rz = 2 * nz * nz - 1;
      let col: number[];
      if (ry > 0.05) {
        // 往下看到棋盘（u 平移＝自转）
        const u = ((rx / ry) * 1.6 + rot) * 2, v = (rz / ry) * 1.6 * 2;
        const ck = (Math.floor(u) + Math.floor(v)) & 1;
        col = ck ? [40, 60, 70] : [225, 225, 235];
      } else {
        // 往上看粉紫天（远端越暗越紫），一条竖直窗光
        const k = clamp(-ry * 1.4, 0, 1);
        col = [lerp(245, 160, k), lerp(160, 80, k), lerp(170, 200, k)];
        if (Math.abs(rx - 0.4) < 0.08 && ry < -0.2 && ry > -0.7) col = [255, 255, 255];
      }
      const f = 0.65 + 0.325 * Math.pow(1 - nz, 0.3); // 边缘更亮（菲涅尔）
      d[i] = col[0] * f + 20;
      d[i + 1] = col[1] * f + 20;
      d[i + 2] = col[2] * f + 25;
      d[i + 3] = 255;
    }
  }
  g.clearRect(0, 0, cv.width, cv.height);
  g.putImageData(im, 0, 0);
  c.drawImage(cv, 0, 0, D, D, cx - r - 1, cy - r - 1, D, D);
  // 左上硬高光（lighter）
  c.save();
  c.globalCompositeOperation = 'lighter';
  const hg = c.createRadialGradient(cx - r * 0.38, cy - r * 0.45, 0, cx - r * 0.38, cy - r * 0.45, r * 0.3);
  hg.addColorStop(0, 'rgba(255,255,255,1)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = hg;
  c.beginPath();
  c.arc(cx - r * 0.38, cy - r * 0.45, r * 0.3, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// ---------- 紫环：140 颗球沿圆环排布，绕竖轴 7rad/s 自转、倾斜 0.35，深度排序 ----------
export function torus(c: CanvasCtx, t: number, cx: number, cy: number, R: number, rr: number): void {
  const th = t * 7, tilt = 0.35, N = 140;
  const out: [number, number, number][] = [];
  for (let k = 0; k < N; k++) {
    const ph = (k / N) * Math.PI * 2;
    const x0 = R * Math.cos(ph), y0 = R * Math.sin(ph);
    const X = x0 * Math.cos(th), Z = x0 * Math.sin(th);
    const Y = y0 * Math.cos(tilt) - Z * Math.sin(tilt);
    const Z2 = y0 * Math.sin(tilt) + Z * Math.cos(tilt);
    out.push([cx + X, cy + Y, Z2]);
  }
  out.sort((a, b) => a[2] - b[2]);
  // 先画一层暗紫底让球连成管，再逐颗径向高光
  for (const [x, y] of out) {
    c.fillStyle = '#7a1aa0';
    c.beginPath();
    c.arc(x, y, rr, 0, Math.PI * 2);
    c.fill();
  }
  for (const [x, y, z] of out) {
    const g = c.createRadialGradient(x - rr * 0.35, y - rr * 0.4, 1, x, y, rr);
    const l = 0.5 + (0.5 * z) / R;
    g.addColorStop(0, `rgba(255,${Math.round(190 + l * 50)},255,1)`);
    g.addColorStop(0.3, '#d850f6');
    g.addColorStop(0.75, '#9a28c4');
    g.addColorStop(1, 'rgba(110,20,150,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, rr * 0.92, 0, Math.PI * 2);
    c.fill();
  }
}

// ---------- 绿锥：塑料着色约定下的锥体（线性渐变横跨） ----------
export function cone(c: CanvasCtx, tipX: number, tipY: number, baseY: number, rx: number): void {
  const p = new Path2D();
  p.moveTo(tipX, tipY);
  p.lineTo(tipX - rx, baseY);
  p.ellipse(tipX, baseY, rx, rx * 0.22, 0, Math.PI, 0, true);
  p.closePath();
  c.fillStyle = '#25835a';
  c.fill(p);
  c.save();
  c.clip(p);
  const g = c.createLinearGradient(tipX - rx, 0, tipX + rx, 0);
  g.addColorStop(0, 'rgba(0,30,20,.35)');
  g.addColorStop(0.3, 'rgba(160,255,200,.55)');
  g.addColorStop(0.4, 'rgba(255,255,255,.15)');
  g.addColorStop(1, 'rgba(0,20,10,.55)');
  c.fillStyle = g;
  c.fillRect(tipX - rx - 4, tipY - 4, rx * 2 + 8, baseY - tipY + 8);
  c.restore();
}

// ---------- SC02「一颗铬球」点名：高光闪 + 扩散环（f105-128） ----------
export function ballPing(c: CanvasCtx, f: number, cx: number, cy: number, r: number): void {
  if (f < 105 || f > 128) return;
  const p = clamp((f - 105) / 18, 0, 1);
  c.save();
  c.globalCompositeOperation = 'lighter';
  // 扩散环
  c.strokeStyle = `rgba(220,255,240,${0.5 * (1 - p)})`;
  c.lineWidth = 2.5;
  c.beginPath();
  c.arc(cx, cy, r + 6 + 64 * p, 0, Math.PI * 2);
  c.stroke();
  // 高光闪（比平时大一圈再回落）
  const k = 1 + 0.9 * (1 - p);
  const hg = c.createRadialGradient(cx - r * 0.38, cy - r * 0.45, 0, cx - r * 0.38, cy - r * 0.45, r * 0.3 * k);
  hg.addColorStop(0, `rgba(255,255,255,${0.8 * (1 - p)})`);
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = hg;
  c.beginPath();
  c.arc(cx - r * 0.38, cy - r * 0.45, r * 0.3 * k, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// 导出 scratch 供 Scene 反射层复用（保持单一临时层池）。
export {scratch};
