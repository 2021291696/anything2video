// R.stretch 移植（签名③）：非等比拉长的正确实现——统一 DOMMatrix 变换几何（Path2D+点列+锚点），
// **线宽不变**。setTransform 会把描边一起压扁；这里把矩阵烘进几何坐标，之后一律在恒等变换下
// stroke/fill，5px 普鲁士蓝轮廓保持等宽。
// 技法借鉴 huashu-art-motion (MIT, alchaincyf) scripts/engine/lib/rig.js R.stretch（机制级），TSX 重写。
export type Stretch = {sx: number; sy: number; ax: number; ay: number};
export type Pt = [number, number];

/** anchor 为轴的非等比缩放矩阵。 */
export function stretchMatrix(s: Stretch): DOMMatrix {
  return new DOMMatrix().translate(s.ax, s.ay).scale(s.sx, s.sy).translate(-s.ax, -s.ay);
}

export function stPt(m: DOMMatrix, p: Pt): Pt {
  const r = m.transformPoint(new DOMPoint(p[0], p[1]));
  return [r.x, r.y];
}

/** 把矩阵烘进 Path2D 几何（addPath 支持变换矩阵），返回新路径。 */
export function stPath(m: DOMMatrix, p: Path2D): Path2D {
  const out = new Path2D();
  out.addPath(p, m);
  return out;
}

/** 部件：平滑路径 + 保留原点列（后续褶线/包围计算用）。 */
export type Part = {path: Path2D; pts: Pt[]; closed: boolean};
/** 几何包：部件表 + 命名锚点表。 */
export type Geom = {parts: Record<string, Part>; A: Record<string, Pt>};

/** Catmull-Rom → 三次贝塞尔（机制借鉴 rig.js R.smooth，重写）。 */
export function smoothPath(pts: Pt[], closed = true, k = 0.5): Part {
  const p = new Path2D();
  const n = pts.length;
  if (n < 2) return {path: p, pts, closed};
  const P = (i: number): Pt => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  p.moveTo(pts[0][0], pts[0][1]);
  const seg = closed ? n : n - 1;
  for (let i = 0; i < seg; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    p.bezierCurveTo(
      p1[0] + ((p2[0] - p0[0]) * k) / 3, p1[1] + ((p2[1] - p0[1]) * k) / 3,
      p2[0] - ((p3[0] - p1[0]) * k) / 3, p2[1] - ((p3[1] - p1[1]) * k) / 3,
      p2[0], p2[1]);
  }
  if (closed) p.closePath();
  return {path: p, pts, closed};
}

/** 对整包几何应用拉长矩阵：所有 Path2D、点列、锚点一起变换（线宽不参与）。 */
export function stretchGeom(g: Geom, m: DOMMatrix): Geom {
  const parts: Record<string, Part> = {};
  for (const k in g.parts) {
    const part = g.parts[k];
    parts[k] = {path: stPath(m, part.path), pts: part.pts.map((q) => stPt(m, q)), closed: part.closed};
  }
  const A: Record<string, Pt> = {};
  for (const k in g.A) A[k] = stPt(m, g.A[k]);
  return {parts, A};
}
