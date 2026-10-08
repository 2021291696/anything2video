// 赛璐珞上色 + 平滑路径 + 离屏缓存 —— cumulus-light。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）lib/render.js P.cel 的机制，
// Remotion(React+TSX)+Canvas2D 重写，非拷贝：
//   阴影带 = clip(自身) ∩ ¬(自身平移 (lx·sd, ly·sd))——evenodd 反选实现；
//   受光亮边 rim = clip(自身) ∩ ¬(自身反向平移 rw)；按部件顺序「填→影→亮边→描线」，遮挡天然正确。
// 参数纪律：sd 大件 22-30 / 脸 10 / 小件 8，rw 3-9，默认光向 lx=-1 ly=-0.55（影落右下），线 #6a4632 2.2px。
import {CanvasCtx, LINE} from './types';

export type CelOpts = {
  sd?: number;   // 阴影带宽度（沿光向反方向偏移量）
  rw?: number;   // 受光亮边宽度
  lx?: number;   // 光方向 x（默认 -1：光从窗来）
  ly?: number;   // 光方向 y（默认 -0.55）
  line?: string | null; // 描线色（null = 不描线）
  lw?: number;   // 描线宽
};

/** 赛璐珞上色：底色 → 背光侧硬阴影带 → 受光侧亮边 → 细描线。 */
export function cel(c: CanvasCtx, p: Path2D, base: string, shade: string | null, rim: string | null, o: CelOpts = {}): void {
  const {sd = 22, rw = 6, lx = -1, ly = -0.55, line = LINE, lw = 2.2} = o;
  c.fillStyle = base;
  c.fill(p);
  if (shade) {
    c.save();
    c.clip(p);
    const band = new Path2D();
    band.rect(-8000, -8000, 16000, 16000);
    band.addPath(p, new DOMMatrix([1, 0, 0, 1, lx * sd, ly * sd]));
    c.clip(band, 'evenodd');
    c.fillStyle = shade;
    c.fill(p);
    c.restore();
  }
  if (rim) {
    c.save();
    c.clip(p);
    const band = new Path2D();
    band.rect(-8000, -8000, 16000, 16000);
    band.addPath(p, new DOMMatrix([1, 0, 0, 1, -lx * rw, -ly * rw]));
    c.clip(band, 'evenodd');
    c.strokeStyle = rim;
    c.lineWidth = rw * 1.3;
    c.stroke(p);
    c.restore();
  }
  if (line) {
    c.strokeStyle = line;
    c.lineWidth = lw;
    c.stroke(p);
  }
}

/** 逆光亮边：沿光向反方向平移后描 lighter 暖色边（猫背光同款，用于发梢/肩线）。 */
export function backlitEdge(c: CanvasCtx, p: Path2D, dx: number, dy: number, w: number, color: string): void {
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.save();
  c.clip(p);
  c.translate(dx, dy);
  c.stroke(p);
  c.restore();
  c.restore();
}

/** 点列 → 平滑闭合路径（Catmull-Rom）。 */
export function smooth(pts: Array<[number, number]>, closed = true): Path2D {
  const p = new Path2D();
  const n = pts.length;
  if (n < 3) {
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) p.lineTo(pts[i][0], pts[i][1]);
    return p;
  }
  const at = (i: number): [number, number] => pts[closed ? (i + n) % n : Math.min(n - 1, Math.max(0, i))];
  p.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    p.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  if (closed) p.closePath();
  return p;
}

// ---- 离屏画布：一次性静态缓存（模块级，禁 Date/网络；内容纯函数） ----
const scratchPool = new Map<string, HTMLCanvasElement>();

/** 取（或建）一张命名离屏画布，重置变换与内容。 */
export function scratch(key: string, w: number, h: number): CanvasCtx {
  let cv = scratchPool.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    scratchPool.set(key, cv);
  }
  const g = cv.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.filter = 'none';
  g.clearRect(0, 0, w, h);
  return g;
}

/** 静态层缓存：首次绘制后直接复用（room/窗框/光柱楔形/地面光斑）。 */
export function cached(key: string, w: number, h: number, paint: (g: CanvasCtx) => void): HTMLCanvasElement {
  let cv = scratchPool.get(key);
  if (!cv) {
    const g = scratch(key, w, h);
    paint(g);
    cv = scratchPool.get(key)!;
  }
  return cv;
}
