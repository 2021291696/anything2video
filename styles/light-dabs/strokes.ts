// ============================================================================
// strokes.ts — 油画族共享「流场笔触」渲染器（swirl-oil 正本 → samples-v4/shared/paint/）
// 移植自 huashu-art-motion lib/paint.js (MIT, alchaincyf), TS 重写
// （机制与参数级借鉴：抖动网格取底稿色 / 沿方向场画线段先描后画 / swatch 区域抽色混底稿 /
//   boilSeed 沸腾换种子；结构、命名、API 全部按 Remotion/TS 惯用法重写，零代码拷贝。）
//
// 机制（对应 huashu P.strokes）：在抖动网格的每个格点上读底稿像素色 → palette 按
// 所在区域抽一支区域色并混入底稿色保留明暗 → 沿 angle(x,y,t) 画一条线段——先用
// 「主体色混深蓝」描一条宽 +2.5 的底衬（outline），再画主体线段。整帧重画一遍即可
// 把一张平涂底稿变成「油画笔触面」。
//
// 必须吸收的坑（RECON-huashu §08，v2 返修教训）：
//   随机数是顺序流。若 palette 依赖底稿色（如「高光格跳过」）导致有的格子多消费、
//   有的格子少消费随机数，底稿一动，后面所有格子的抽色全部错位重洗 = 满屏频闪。
//   → 一切 palette 都过 stable()：每格恰好消费 1 个随机数、永不返回 null；
//     「这格要不要用抽到的色」只允许由 不吃随机数 的纯函数（区域/亮度阈值）决定。
// ============================================================================

export type RGB = [number, number, number];
export type Rng = () => number;
/** 方向场：返回该点的笔触走向（弧度）。t=时间秒（供漩涡切线旋转/墙体摇曳等时间项）。 */
export type AngleFn = (x: number, y: number, t: number) => number;
export type MaskFn = (x: number, y: number) => boolean;
/** palette 原始形态：可返回 null 表示「这格不用区域色」（stable 包装保证仍只消费固定随机数） */
export type RawPaletteFn = (x: number, y: number, col: RGB, r: Rng) => RGB | null;
/** palette 合规形态：恰好消费固定个数随机数、永不返回 null */
export type PaletteFn = (x: number, y: number, col: RGB, r: Rng) => RGB;

// ---------------------------------------------------------------------------
// 确定性随机（mulberry32；禁 Math.random/Date）
// ---------------------------------------------------------------------------
export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---------------------------------------------------------------------------
// 颜色小件
// ---------------------------------------------------------------------------
export const hex2rgb = (h: string): RGB => {
  let s = h.replace('#', '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgbStr = (c: RGB, a = 1): string =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mixRGB = (a: RGB, b: RGB, u: number): RGB => [
  a[0] + (b[0] - a[0]) * u,
  a[1] + (b[1] - a[1]) * u,
  a[2] + (b[2] - a[2]) * u,
];
/** 每通道 ±amt/2 抖动（梵高笔触内部的碎色） */
export const jitterRGB = (c: RGB, r: Rng, amt: number): RGB => [
  c[0] + (r() - 0.5) * amt,
  c[1] + (r() - 0.5) * amt,
  c[2] + (r() - 0.5) * amt,
];
export const luma = (c: RGB): number => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;

// ---------------------------------------------------------------------------
// 噪声（梯度噪声 2D，约 [-1,1]）——墙体「火苗般摇曳」等连续方向场用
// ---------------------------------------------------------------------------
export const makeNoise2d = (seed = 1337): ((x: number, y: number) => number) => {
  const p = new Uint8Array(512);
  const r = mulberry32(seed);
  const base = Array.from({length: 256}, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = (r() * (i + 1)) | 0;
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  const fade = (u: number) => u * u * u * (u * (u * 6 - 15) + 10);
  const grad = (hsh: number, x: number, y: number) => {
    const u = hsh & 1 ? x : -x;
    const v = hsh & 2 ? y : -y;
    return (hsh & 4 ? u + v * 0.5 : u * 0.5 + v * 0.5);
  };
  return (x: number, y: number) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = p[X] + Y;
    const ab = p[X + 1] + Y;
    const ba = p[aa] ?? 0;
    const bb = p[ab] ?? 0;
    const x1 = mix2(grad(p[ba], xf, yf), grad(p[bb], xf - 1, yf), u);
    const x2 = mix2(grad(p[ba + 1], xf, yf - 1), grad(p[bb + 1], xf - 1, yf - 1), u);
    return mix2(x1, x2, v);
  };
};
const mix2 = (a: number, b: number, u: number) => a + (b - a) * u;

// ---------------------------------------------------------------------------
// 沸腾换种子：boilFps 次每秒换一次随机种子（手绘动画的 boiling line）。
// fps=0 → 恒 0（笔触位置完全固定，方向场仍可随 t 摇曳）。
// ---------------------------------------------------------------------------
export const boilSeed = (t: number, boilFps = 8): number => Math.floor(t * boilFps);

// ---------------------------------------------------------------------------
// stable 防重洗包装（本库默认纪律）：
// 把「可能返回 null / 消费随机数个数不定」的 palette 包成合规形态——
// 抽取结果为 null 时回落到底稿色 col，且消费个数由 pal 自身保证恒定。
// 使用契约：pal 内部只允许恰好消费固定个数随机数（通常 1 个 = swatch 抽色），
// 「用不用」的判定只能基于 不吃随机数 的量（坐标/底稿亮度/区域编号）。
// ---------------------------------------------------------------------------
export const stable = (pal: RawPaletteFn): PaletteFn => (x, y, col, r) => pal(x, y, col, r) ?? col;

/** 区域色板：给一组 hex 与混底比例 mixBase，返回「按 r() 抽一色再混底稿色」的函数。
 *  恰好消费 1 个随机数。mixBase 0.3–0.45 保明暗——只有颜色抖动=同一个蓝的噪点，
 *  梵高的感觉来自区域色板里十几种色相（配方级教训，huashu 09/08）。 */
export const swatch =
  (hexes: string[], mixBase = 0.35): PaletteFn => {
    const cs = hexes.map(hex2rgb);
    return (_x, _y, col, r) => {
      const k = cs[(r() * cs.length) | 0];
      return mixRGB(k, col, mixBase);
    };
  };

/** 区域路由：按坐标把格子分发给各自 swatch（分发本身不吃随机数），再过 stable 兜底。 */
export const regionPalette = (route: (x: number, y: number) => PaletteFn | null): PaletteFn =>
  stable((x, y, col, r) => {
    const sw = route(x, y);
    return sw ? sw(x, y, col, r) : null;
  });

// ---------------------------------------------------------------------------
// 流场笔触主渲染器（FlowFieldStrokes）
// 对一张底稿 canvas 做整帧「重画」：dst 已清空/叠好下层，src 提供底稿像素色。
// ---------------------------------------------------------------------------

export interface StrokePass {
  /** 网格间距 px（密度：huashu 09 标杆 = 墙 14 / 地 12 / 其余 10） */
  cell: number;
  /** 线段长度 px（huashu 09 标杆 = 墙 64 / 地 46 / 其余 22；实际长度 ×(0.7+1.2r)） */
  len: number;
  /** 线宽 px */
  width: number;
  /** 方向场（缺省 0 = 水平） */
  angle?: AngleFn;
  /** 母种子（与 boilSeed 合成实际种子） */
  seed?: number;
  /** 时间秒：只进 angle 场与 boilSeed；重渲染由调用方按 boilSeed 缓存 */
  t?: number;
  /** 沸腾频率 fps；0 = 种子固定 */
  boil?: number;
  /** 深色描边透明度（huashu 09 = 0.8–0.9；0 关闭） */
  outline?: number;
  outlineCol?: RGB;
  /** 描边混深色比例（huashu 09 = 0.38–0.45） */
  outlineMix?: number;
  /** 主体色逐笔抖动幅度 */
  jitterCol?: number;
  /** 区域色板（stable 包装后的合规形态） */
  palette?: PaletteFn | null;
  /** 只画 mask 为真的格子 */
  mask?: MaskFn | null;
  /** 只画 src 不透明像素（道具层/角色层 source-atop 用） */
  alphaMask?: boolean;
  /** 宽笔(≥30)密排用 'butt'，圆头会连成「人头阵」（huashu 迁移测试 D 踩坑回流） */
  cap?: CanvasLineCap;
}

export function paintStrokes(
  dst: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  opts: StrokePass,
): void {
  const {
    cell, len, width, angle, seed = 1, t = 0, boil = 8,
    outline = 0.35, outlineCol = [20, 25, 60] as RGB, outlineMix = 0.55,
    jitterCol = 18, palette = null, mask = null, alphaMask = false, cap = 'round',
  } = opts;
  const w = src.width;
  const h = src.height;
  const sctx = src.getContext('2d');
  if (!sctx) throw new Error('paintStrokes: src canvas has no 2d context');
  const sd = sctx.getImageData(0, 0, w, h).data;
  const r = mulberry32((seed * 1000 + boilSeed(t, boil)) | 0);
  dst.lineCap = cap;
  for (let y = 0; y < h + cell; y += cell) {
    for (let x = 0; x < w + cell; x += cell) {
      // 注意随机数顺序契约：先 px/py 两个，再 palette 的 1 个，再长度 1 个——恒定个数
      const px = x + (r() - 0.5) * cell;
      const py = y + (r() - 0.5) * cell;
      const ix = Math.min(Math.max(px | 0, 0), w - 1);
      const iy = Math.min(Math.max(py | 0, 0), h - 1);
      const i = (iy * w + ix) * 4;
      if (mask && !mask(px, py)) continue;
      if (alphaMask && sd[i + 3] < 200) continue;
      const base: RGB = [sd[i], sd[i + 1], sd[i + 2]];
      const col = palette ? palette(px, py, base, r) : base;
      const a = angle ? angle(px, py, t) : 0;
      const l = len * (0.7 + r() * 0.6);
      const dx = Math.cos(a) * (l / 2);
      const dy = Math.sin(a) * (l / 2);
      if (outline > 0) {
        dst.strokeStyle = rgbStr(mixRGB(col, outlineCol, outlineMix), outline);
        dst.lineWidth = width + 2.5;
        dst.beginPath();
        dst.moveTo(px - dx, py - dy);
        dst.lineTo(px + dx, py + dy);
        dst.stroke();
      }
      dst.strokeStyle = rgbStr(jitterRGB(col, r, jitterCol));
      dst.lineWidth = width;
      dst.beginPath();
      dst.moveTo(px - dx, py - dy);
      dst.lineTo(px + dx, py + dy);
      dst.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// Remotion 性能纪律的配套缓存：底稿 + N 遍笔触预渲染为一张静态位图，
// 仅 boilSeed 变化时重渲染（8fps boil），热帧只做 drawImage。
// LRU 上限防内存膨胀（每张 1280×720≈3.7MB）。
// ---------------------------------------------------------------------------
export class StrokeCache {
  private map = new Map<string, HTMLCanvasElement>();
  constructor(private max = 4) {}
  get(key: string): HTMLCanvasElement | undefined {
    const hit = this.map.get(key);
    if (hit) {
      this.map.delete(key);
      this.map.set(key, hit); // 触碰置新
    }
    return hit;
  }
  put(key: string, canvas: HTMLCanvasElement): void {
    this.map.set(key, canvas);
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }
}

export const newCanvas = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
