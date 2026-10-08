// 光影几何（本卡的心脏）—— hard-light。
// 签名②：硬边光斑三块（墙 WP / 地 FP / 人物光带 OP），全片由单一 dx 驱动整体平移；
// dx 分段：钩子 0.5s 内光斑快速入画 → 缓漂 → 光边扫脸（hero，60-75% 窗口）→ 定住。
// 签名③：墙上人影 = 人物剪影平移 (+100,+12) 画进离屏，source-in 透出背光底版，再画回光斑区。
// 签名④：光带里 26 颗浮尘（只在光边右侧显示，lighter）。
// 纪律：光斑边缘全部为多边形裁切硬边，禁 blur / 禁渐变羽化。
import {FLOOR, FPS, H, TS, W, type CanvasCtx} from './types';
import {clamp, easeOutCubic, lerp, mulberry32, smoothstep} from './noise';
import {roomShade} from './room';
import {drawWoman, pose} from './woman';
import {SENTENCES, TOTAL_FRAMES} from '../common/timeline';

/** 光斑锚点（按校准后的句表推导）：钩子入画 → 缓漂 → 扫脸 → 收定。 */
const HOOK_END = 15; // 0.5s 钩子：光斑入画完成
const S = SENTENCES;
const SWEEP_FROM = S[2].from + 34; // 光边扫脸起点（f234）
const SWEEP_TO = S[3].from - 1;    // 扫脸终点（f272，S03 结束/S04 起接上）
const SETTLE_TO = SWEEP_TO + 24;

/** 光斑横向位移主曲线：+340（画外）→ +95 → +58 → −45（扫过脸）→ −52（定住）。 */
export function lightDx(f: number): number {
  if (f <= HOOK_END) return lerp(340, 95, easeOutCubic((f - 1) / (HOOK_END - 1)));
  if (f <= SWEEP_FROM) return lerp(95, 58, smoothstep((f - HOOK_END) / (SWEEP_FROM - HOOK_END)));
  if (f <= SWEEP_TO) return lerp(58, -45, smoothstep((f - SWEEP_FROM) / (SWEEP_TO - SWEEP_FROM)));
  if (f <= SETTLE_TO) return lerp(-45, -52, easeOutCubic((f - SWEEP_TO) / (SETTLE_TO - SWEEP_TO)));
  return -52;
}

export const DX_END = -52;

export type Poly = Array<[number, number]>;

/** 墙上光斑（左缘竖直，上沿斜向下右）。 */
export function wallPatch(dx: number): Poly {
  return [[947 + dx, 167], [W, 313], [W, FLOOR], [947 + dx, FLOOR]];
}

/** 地上光斑（接墙光斑下方，往右下展开）。 */
export function floorPatch(dx: number): Poly {
  return [[947 + dx, FLOOR], [W, FLOOR], [W, H], [1133 + dx, H]];
}

/** 人物光带（斜向，左缘上 (935+dx,0) → 下 (830+dx,720)；光边在这一段里扫过她的脸）。 */
export function personBand(dx: number): Poly {
  return [[935 + dx, 0], [W, 0], [W, H], [830 + dx, H]];
}

/** 光斑左缘在高度 y 处的 x（人物光带 OP；浮尘可见性判定用）。 */
export function bandEdge(dx: number, y: number): number {
  return 935 + dx - (105 * y) / H;
}

/** 硬边裁切：把 draw() 的内容只画进多边形并集内（剪后硬边，无羽化）。 */
export function litClip(c: CanvasCtx, polys: Poly[], draw: () => void): void {
  c.save();
  c.beginPath();
  for (const poly of polys) {
    poly.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
    c.closePath();
  }
  c.clip();
  draw();
  c.restore();
}

let SH_SCRATCH: HTMLCanvasElement | null = null;

/**
 * 光斑区内的窗棂影（竖条 + 平行于上沿的斜条）与人影：
 * 全部以黑填形 → source-in 透出背光底版 → 得到「光斑里透出冷绿墙」的硬边影。
 */
export function wallShadow(c: CanvasCtx, dx: number, f: number): void {
  if (!SH_SCRATCH) {
    SH_SCRATCH = document.createElement('canvas');
    SH_SCRATCH.width = W;
    SH_SCRATCH.height = H;
  }
  const sg = SH_SCRATCH.getContext('2d')!;
  sg.setTransform(1, 0, 0, 1, 0, 0);
  sg.globalAlpha = 1;
  sg.globalCompositeOperation = 'source-over';
  sg.clearRect(0, 0, W, H);
  sg.fillStyle = '#000';
  sg.fillRect(1120 + dx, 250, 16, FLOOR - 250); // 窗棂竖影
  sg.beginPath();                                // 窗棂斜影（平行于光斑上沿）
  sg.moveTo(947 + dx, 272);
  sg.lineTo(W, 418);
  sg.lineTo(W, 434);
  sg.lineTo(947 + dx, 288);
  sg.closePath();
  sg.fill();
  sg.save(); // 人影：剪影平移 (+100,+12)
  sg.translate(100, 12);
  drawWoman(sg, TS, pose(f, FPS), true);
  sg.restore();
  sg.globalCompositeOperation = 'source-in';
  sg.drawImage(roomShade(), 0, 0);
  sg.globalCompositeOperation = 'source-over';
  c.drawImage(SH_SCRATCH, 0, 0);
}

const DUST_N = 26;

/** 签名④：光带里的 26 颗浮尘。seeded 循环上漂，只在光边右侧显示，lighter 微闪。 */
export function dust(c: CanvasCtx, t: number, dx: number): void {
  const rnd = mulberry32(47202611);
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < DUST_N; i++) {
    const x0 = 990 + rnd() * 275;
    const y0 = 390 + rnd() * 80;
    const ph = rnd();
    const sz = 1.3 + rnd() * 1.7;
    const life = 7 + rnd() * 5; // 上漂周期 7-12s（速度差异）
    const cyc = ((t + ph * life) % life) / life;
    const y = lerp(y0, 120, cyc);
    const x = x0 + 16 * Math.sin(cyc * Math.PI * 3 + i * 1.7);
    if (x <= bandEdge(dx, y)) continue; // 光边左侧不显示
    const fade = Math.sin(cyc * Math.PI);
    const a = Math.max(0, (0.3 + 0.25 * Math.sin(t * 5 + i * 2.1)) * fade);
    if (a < 0.02) continue;
    c.fillStyle = `rgba(255,235,180,${a.toFixed(3)})`;
    c.beginPath();
    c.arc(x, y, sz, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/** 结尾定帧的相机推入完成帧（推入在此钳制，之后画面框定死）。 */
export const FREEZE_FROM = TOTAL_FRAMES - 29;

/** 全片缓推（1.00→1.03，定帧段钳在 1.03）。 */
export function camZoom(f: number): number {
  const p = clamp((f - 1) / Math.max(1, FREEZE_FROM - 1));
  return 1 + 0.03 * smoothstep(p);
}
