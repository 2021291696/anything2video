// InkBrush：毛笔。笔压起收 + 湿笔芯 + 逐根笔毛飞白，可按 reveal 写出（白描衣纹/竹枝/窗框共用）。
// 笔墨引擎技法借鉴 huashu-art-motion 17_ink (MIT, alchaincyf), TSX 重写（P.brush 数学移植）。
// 八参数：w 最大宽 / tone 墨色透明度 / dry 飞白程度 / reveal 写出比例 / head·tail 起收笔占比
//        / bristles 笔毛数 / col 墨色（per 加密倍数为内部实现细节）。
// 坑：笔毛必须每根一条连续 path + butt cap；按小段 stroke + round 头会在接头叠出深点（竹节/麻绳）。
import {clamp, densify, resample, ribbon, makeNoise2D, mulberry32, pathOf, PAL, type Pt} from './ink';

const noiseFor = new Map<number, (x: number, y: number) => number>();
function brushNoise(seed: number): (x: number, y: number) => number {
  const key = seed | 0;
  let n = noiseFor.get(key);
  if (!n) { n = makeNoise2D(key * 7919 + 13); noiseFor.set(key, n); }
  return n;
}

export interface BrushOpts {
  /** 最大笔宽 px */
  w?: number;
  /** 墨色透明度（墨五色：焦.9 浓.8 重.6 淡.35 清.15） */
  tone?: number;
  /** 0..1 飞白程度，越到笔尾越干 */
  dry?: number;
  /** 随机种子（确定性） */
  seed?: number;
  /** 0..1 写出比例：0 一笔未落，1 整笔写完 */
  reveal?: number;
  /** 笔毛根数 */
  bristles?: number;
  /** 墨色 [r,g,b]，默认浓墨 */
  col?: readonly number[];
  /** 起笔占比 */
  head?: number;
  /** 收笔占比 */
  tail?: number;
}

export function inkBrush(c: CanvasRenderingContext2D, pts: Pt[], o: BrushOpts = {}): void {
  const {w = 10, tone = 0.85, dry = 0.45, seed = 1, bristles = 8, col = PAL.ink, head = 0.12, tail = 0.4} = o;
  const reveal = clamp(o.reveal ?? 1);
  if (reveal <= 0) return;
  const D = resample(densify(pts, 5), 4);
  const n = D.length;
  if (n < 2) return;
  const m = Math.max(2, Math.ceil(n * reveal));
  const r = mulberry32((seed * 7919) | 0);
  const nz = brushNoise(seed);
  const ss01 = (a: number, b: number, v: number): number => {
    const t = clamp((v - a) / (b - a || 1e-6));
    return t * t * (3 - 2 * t);
  };
  // 笔压剖面：起笔按 head 展开、收笔按 tail 提锋，叠 15% 噪声 + 0.08 底压
  const prof = (q: number): number =>
    ss01(0, head, q) * (1 - 0.7 * ss01(1 - tail, 1, q)) * (0.85 + 0.15 * nz(seed * 3.3, q * 6)) + 0.08;
  c.save();
  c.lineCap = 'butt';
  c.lineJoin = 'round';
  // 法线表
  const N: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const A = D[Math.max(0, i - 1)], B = D[Math.min(n - 1, i + 1)];
    let dx = B[0] - A[0], dy = B[1] - A[1];
    const d = Math.hypot(dx, dy) || 1;
    N.push([-dy / d, dx / d]);
  }
  const core = (q: number): number => w * prof(q) * (1 - dry * 0.85 * Math.pow(q, 0.8));
  // 湿笔芯：整笔都有，越往后越细越淡（墨在用完）
  c.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${tone * 0.72})`;
  const shown = D.slice(0, m);
  c.fill(pathOf(ribbon(shown, (q, i) => core(i / (n - 1))), true));
  // 笔毛：每根一条连续线，按噪声断开（飞白＝笔毛之间露出的纸），越到笔尾断得越多
  for (let k = 0; k < bristles; k++) {
    const off = (k / (bristles - 1) - 0.5) * 0.95;
    const bw = (w / bristles) * (0.9 + r() * 0.9);
    const ph = r() * 50;
    c.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${tone * (0.45 + r() * 0.35)})`;
    c.lineWidth = Math.max(0.7, bw);
    c.beginPath();
    let on = false;
    for (let i = 0; i < m; i++) {
      const q = i / (n - 1);
      const dryness = dry * Math.pow(q, 1.2);
      const vis = nz(k * 1.9 + ph, i * 0.09) * 0.5 + 0.5 > dryness * 0.95 + 0.05;
      const oo = off * w * prof(q);
      const x = D[i][0] + N[i][0] * oo, y = D[i][1] + N[i][1] * oo;
      if (vis) { if (on) c.lineTo(x, y); else c.moveTo(x, y); on = true; } else on = false;
    }
    c.stroke();
  }
  c.restore();
}
