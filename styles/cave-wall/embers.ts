// 签名⑤：火光 overlay 合成（禁 lighter——lighter 洗白暖色、失赭石饱和）+ 呼吸暗角 + 金色余烬 + 手印相位呼吸。
// 技法借鉴 huashu-art-motion scenes/01_cave.js（MIT, alchaincyf），TS 重写。
// 运动量配方（返修口径）：火光强度 0.14+0.11·noise(9.5t)+0.04·sin23t+0.03·sin37t、中心游移 ±60/±36；
//   余烬 49 颗三组上漂、亮核 r2.6-5.4、光晕 3.6 倍、|sin| 闪烁、sin(qπ) 首尾淡入淡出；手印各自独立相位。
import {PAL, WORLD, type CanvasCtx} from './types';
import {clamp, hash2, tnoise} from './noise';
import {GLOW_HANDS} from './handprint';

/** 火光强度（含谐波抖动）。 */
export function fireFlicker(t: number): number {
  return 0.14 + 0.11 * tnoise(t * 9.5, 3) + 0.04 * Math.sin(t * 23) + 0.03 * Math.sin(t * 37);
}

/** 火光中心游移（世界坐标偏移量）。 */
export function fireCenter(t: number): [number, number] {
  return [tnoise(t * 3.1, 17) * 60, tnoise(t * 2.3, 18) * 36];
}

/**
 * 火光 overlay（屏幕空间）：中心 (sx,sy)=火把世界点经相机变换后的屏幕点，z=相机缩放。
 * hookK∈[0,1]：钩子期火光从 0 绽放。
 */
export function drawFirelight(c: CanvasCtx, sx: number, sy: number, z: number, t: number, hookK: number): void {
  const fl = fireFlicker(t) * clamp(hookK);
  const R = (700 + tnoise(t * 2.3, 18) * 60) * z;
  const gr = c.createRadialGradient(sx, sy, 10, sx, sy, R);
  gr.addColorStop(0, `rgba(255,196,110,${fl * 2.6})`);
  gr.addColorStop(0.5, `rgba(255,160,80,${fl * 1.3})`);
  gr.addColorStop(1, 'rgba(255,140,60,0)');
  c.save();
  c.globalCompositeOperation = 'overlay'; // 保饱和的暖化——lighter 会把颜料洗成粉白
  c.fillStyle = gr;
  c.fillRect(0, 0, 1280, 720);
  c.restore();
  // 暗处随火光反向呼吸
  const dk = c.createRadialGradient(sx, sy, 380 * z, sx, sy, 1150 * z);
  dk.addColorStop(0, 'rgba(20,8,2,0)');
  dk.addColorStop(1, `rgba(20,8,2,${clamp(0.2 - fl * 0.4)})`);
  c.fillStyle = dk;
  c.fillRect(0, 0, 1280, 720);
}

/** 手印呼吸暖光：每印独立噪声相位，lighter 小半径暖斑（世界→屏幕坐标）。 */
export function drawHandGlows(c: CanvasCtx, toScreen: (x: number, y: number) => [number, number], t: number, z: number, vis: number): void {
  if (vis <= 0) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  GLOW_HANDS.forEach(([wx, wy], k) => {
    const v = clamp(0.5 + 0.9 * tnoise(t * 7 + k * 3.7, 40 + k));
    if (v < 0.05) return;
    const [sx, sy] = toScreen(wx, wy);
    const r = 105 * z;
    const hg = c.createRadialGradient(sx, sy, 5, sx, sy, r);
    hg.addColorStop(0, `rgba(255,150,80,${0.2 * v * vis})`);
    hg.addColorStop(1, 'rgba(255,120,60,0)');
    c.fillStyle = hg;
    c.fillRect(sx - r, sy - r, r * 2, r * 2);
  });
  c.restore();
}

/** 金色余烬：三组（火把周 20 / 右侧 20 / 中部 9）缓慢上漂 + 闪烁 + 首尾淡入淡出。 */
export function drawEmbers(c: CanvasCtx, t: number, vis: number): void {
  if (vis <= 0) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  const groups: Array<[number, number, number, number]> = [
    [320, 860, 20, 300], [1500, 2100, 20, 301], [760, 1480, 9, 302],
  ];
  groups.forEach(([x0, x1, n, seed]) => {
    for (let i = 0; i < n; i++) {
      const h1 = hash2(i, seed, 11), h2 = hash2(i, seed, 12), h3 = hash2(i, seed, 13);
      const life = 4.6 + h3 * 1.8;
      const q = ((t / life + h1) % 1);
      const x = x0 + (x1 - x0) * h2 + Math.sin(t * 0.8 + i * 1.9) * 22 * (0.5 + h3);
      const y = WORLD.h + 30 - q * (WORLD.h - 60);
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 7 + i * 1.9));
      const fade = Math.sin(q * Math.PI);
      const r0 = 2.6 + h1 * 2.8;
      c.fillStyle = `rgba(255,170,60,${0.32 * tw * fade * vis})`;
      c.beginPath();
      c.arc(x, y, r0 * 3.6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = `rgba(255,224,130,${0.95 * tw * fade * vis})`;
      c.beginPath();
      c.arc(x, y, r0, 0, Math.PI * 2);
      c.fill();
    }
  });
  c.restore();
  void PAL.ember;
}

/** 钩子暗场：k∈[0,1] 场亮系数（0=全黑 → 1=正常亮度），火把绽放用。 */
export function drawHookDark(c: CanvasCtx, k: number): void {
  if (k >= 1) return;
  c.fillStyle = `rgba(8,4,2,${clamp(1 - k)})`;
  c.fillRect(0, 0, 1280, 720);
}

/** 火把焰（世界空间，画在颜料层）：三层噪动焰形 + 炭柄。 */
export function drawTorchFlame(g: CanvasCtx, x: number, y: number, t: number): void {
  // 柄（炭线）
  g.strokeStyle = 'rgba(33,21,13,.9)';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y + 150);
  g.lineTo(x, y + 8);
  g.stroke();
  // 三层焰：外赭/中黄赭/内白垩，形随噪声摆
  const sway = tnoise(t * 11, 51) * 9 + Math.sin(t * 21) * 3;
  const hgt = 62 + tnoise(t * 9.5, 52) * 14;
  const layer = (w: number, h: number, col: string, alpha: number): void => {
    g.fillStyle = col;
    g.globalAlpha = alpha;
    g.beginPath();
    g.moveTo(x - w, y + 6);
    g.quadraticCurveTo(x - w * 0.5 + sway * 0.4, y - h * 0.45, x + sway, y - h);
    g.quadraticCurveTo(x + w * 0.6 + sway * 0.3, y - h * 0.4, x + w, y + 6);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
  };
  layer(13, hgt, PAL.ochre, 0.85);
  layer(8, hgt * 0.66, '#cf8f2c', 0.9);
  layer(4, hgt * 0.36, PAL.chalk, 0.95);
}
