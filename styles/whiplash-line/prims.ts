// ============================================================================
// prims.ts — whiplash-line 绘制原语（慕夏新艺术 · 战役 4 批次④ D2-2）
// 技法借鉴 huashu-art-motion（MIT）scenes/10_nouveau.js 与 references/风格配方/10_nouveau.md，
// 一律 Remotion/TSX 惯用法重写（禁整段拷贝）。
// 核心原语（SPEC 标注「可被其他卡借用的绘制原语」）：
//   ribbonPath —— 可变线宽路径：点列 Catmull-Rom 加密 → 每点沿法线两侧偏 w(q)/2 → 闭合多边形 fill。
//     比 SVG stroke（等宽）强一档：书法/藤蔓/飘带/河流/鞭线全通用。
//   swellW（两头尖中间粗）/ taperW（宽→细递减）/ spiralPts（半径线性收到 15% 的螺旋收尾）。
// 全确定性：mulberry32（状态在工厂作用域，禁 Math.random/Date/网络）。
// ============================================================================

export type Pt = [number, number];

// ---- 确定性随机（mulberry32；状态必须留在工厂闭包外层，防序列退化常数——amphora 事故模式）----
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---- 缓动 ----
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const inv = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
export const outC = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);
export const inOutC = (u: number) => {
  const x = clamp01(u);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const outBack = (u: number, s = 1.7) => {
  const x = clamp01(u);
  const c3 = s + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
};
export const lerp = (a: number, b: number, u: number) => a + (b - a) * clamp01(u);

// ---- Catmull-Rom 加密：每段 per 点 ----
export const dense = (pts: Pt[], per = 8): Pt[] => {
  const out: Pt[] = [];
  const n = pts.length;
  const at = (i: number) => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push([pts[n - 1][0], pts[n - 1][1]]);
  return out;
};

// ---- ★ribbon 可变线宽路径：沿点列两侧偏 w(q)/2，闭合 Path2D ----
export const ribbonPath = (pts: Pt[], wf: (q: number) => number): Path2D => {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const w = wf(i / (n - 1)) / 2;
    left.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
    right.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  const p = new Path2D();
  left.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
  for (let i = n - 1; i >= 0; i--) p.lineTo(right[i][0], right[i][1]);
  p.closePath();
  return p;
};

// ---- 宽度包络 ----
export const swellW = (wmax: number, wend = 1.2) => (q: number) =>
  wend + (wmax - wend) * Math.sin(Math.PI * clamp01(q)); // 两头尖中间粗（慕夏线条的粗细呼吸）
export const taperW = (w0: number, w1: number) => (q: number) =>
  w1 + (w0 - w1) * Math.pow(1 - clamp01(q), 0.6); // 宽→细递减（发绺）

// ---- 螺旋收尾点列：半径线性收到 15%（新艺术鞭线的「转弯」）----
export const spiralPts = (cx: number, cy: number, r0: number, a0: number, turns: number, dir = 1, n = 28): Pt[] => {
  const o: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const q = i / n;
    const a = a0 + dir * q * turns * Math.PI * 2;
    const r = r0 * (1 - q * 0.85);
    o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return o;
};

// ---- 平滑闭合多边形（发团/猫身/花境界）：Catmull-Rom 过点列闭合成 path ----
export const smoothClosed = (pts: Pt[]): Path2D => {
  const n = pts.length;
  const p = new Path2D();
  const at = (i: number) => pts[((i % n) + n) % n];
  p.moveTo((at(0)[0] + at(1)[0]) / 2, (at(0)[1] + at(1)[1]) / 2);
  for (let i = 1; i <= n; i++) {
    const cur = at(i), nxt = at(i + 1);
    p.quadraticCurveTo(cur[0], cur[1], (cur[0] + nxt[0]) / 2, (cur[1] + nxt[1]) / 2);
  }
  p.closePath();
  return p;
};

// ---- 描画进行中：按比例取点列前段 ----
export const partial = (pts: Pt[], u: number): Pt[] => {
  if (u <= 0) return [];
  const n = Math.max(2, Math.ceil(pts.length * clamp01(u)));
  return pts.slice(0, Math.min(n, pts.length));
};

// ---- 双色描线：深棕宽底 + 本色窄面（「外轮廓粗、内线细」的线稿版）----
export const twoTone = (
  g: CanvasRenderingContext2D, raw: Pt[], wf: (q: number) => number,
  col: string, edge: string, edgeW = 2.6, per = 8,
) => {
  const pts = dense(raw, per);
  g.fillStyle = edge;
  g.fill(ribbonPath(pts, (q) => wf(q) + edgeW));
  g.fillStyle = col;
  g.fill(ribbonPath(pts, wf));
};

// ---- 确定性值噪声 fbm（石版印刷斑驳用；缓存层一次性调用）----
export const hash2 = (x: number, y: number): number => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const vnoise = (x: number, y: number): number => {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
};
export const fbm = (x: number, y: number, oct = 4): number => {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += vnoise(x * f, y * f) * amp;
    amp *= 0.5;
    f *= 2;
  }
  return v;
};
