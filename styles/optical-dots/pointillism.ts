// ============================================================================
// pointillism.ts — 修拉点彩「视觉混色」渲染器（optical-dots 图元库数学核心）
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）lib/render.js P.pointillism 与
// references/风格配方/29_seurat.md —— 算法机制与参数搬用，TypeScript 惯用法重写，零代码拷贝。
//
// 签名纪律（RECON-huashu §29，锁死参数）：
//   ① 视觉混色：21 色纯色板两两配对按比例并置逼近目标色——目标色投影到 Pi→Pj 线段得
//      连续比例 w（clamp .2–.8），距离加 0.004·|Pi−Pj|² 惩罚远配对（防黑白混灰）；
//      取色前目标色加 ±20 哈希抖动（R+dj / G+0.8dj / B−0.6dj）——配对色分界变交错点
//      不出竖向色带（两坑：偏好纯色→色带；连续比例→整列切换）；结果按 15bit 量化缓存 Map。
//   ② 等大点固定六角网格 pitch 10 / r 4.5，位置抖动 ±1.2px（防「网格规整」短板底线）。
//   ③ 补色点 8% ＋ 光渗：与 (+14,+6) 邻点比亮度差 >45 → 45% 概率亮侧白点 / 暗侧深蓝点。
//   ④ flicker 6fps：7% 的点换配对色＝空气在颤（huashu 实测 4fps/3% 判定格）。
//   ⑤ shimmer 区域（河面/边界带）按 st 重掷哈希＝波光。
// 确定性：hash2 为纯整数散列（无闭包状态——规避 mulberry32 闭包退化事故族），禁 Math.random。
// ============================================================================

export type RGB = readonly [number, number, number];

/** 锁死色板 token：14 饱和 + 7 淡色（「和白混过的色」），照抄配方 29_seurat（已验证出效果）。 */
export const PAL: readonly string[] = [
  // 14 饱和
  '#1a2058', '#2a3a9a', '#3f6fd0', '#6aaee6', '#1f6a52', '#2f9a5a', '#a8c83a',
  '#f2cf3a', '#f08a2a', '#e0432a', '#c0306a', '#7a4aa8', '#f8f4e8', '#e8b48a',
  // 7 淡色（缺淡色则亮墙=雪花噪声——配方级教训）
  '#f6e49a', '#f6c48a', '#cfe08a', '#b0cff0', '#f2b8c8', '#c99a4a', '#9a7ac8',
];

/** 补色索引：每个色板色对应的「对比色」（蓝↔橙、绿↔红紫、黄↔紫……共 21 条，配方照抄）。 */
export const COMP: Readonly<Record<number, number>> = {
  0: 8, 1: 8, 2: 8, 3: 9, 4: 9, 5: 10, 6: 11, 7: 11, 8: 2, 9: 5, 10: 5,
  11: 7, 12: 17, 13: 17, 14: 20, 15: 17, 16: 18, 17: 15, 18: 16, 19: 2, 20: 14,
};

export const PAL_RGB: readonly RGB[] = PAL.map((hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
});

/** 白点（光渗亮侧）/ 深蓝点（光渗暗侧）= 色板索引 12 / 0（配方调用约定）。 */
export const IDX_WHITE = 12;
export const IDX_DARK = 0;

/** 纯整数散列 → [0,1)。stateless（每次调用只依赖入参），全片可复现。 */
export const hash2 = (i: number, j: number): number => {
  let h = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul(j | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

// ---- 视觉混色配对（15bit 量化缓存，模块级共享）----
const pairCache = new Map<number, readonly [number, number, number]>();

/** 目标色 → 色板配对 [i, j, w]：投影到 Pi→Pj 线段，w clamp [.2,.8]，远配对惩罚 0.004·|Pi−Pj|²。 */
export const pickPair = (r: number, g: number, b: number): readonly [number, number, number] => {
  const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  const hit = pairCache.get(key);
  if (hit) return hit;
  let best = 1e18;
  let bi = 0;
  let bj = 0;
  let bw = 1;
  for (let i = 0; i < PAL_RGB.length; i++) {
    for (let j = i + 1; j < PAL_RGB.length; j++) {
      const pi = PAL_RGB[i];
      const pj = PAL_RGB[j];
      const ex = pi[0] - pj[0];
      const ey = pi[1] - pj[1];
      const ez = pi[2] - pj[2];
      const w = Math.min(0.8, Math.max(0.2,
        ((r - pj[0]) * ex + (g - pj[1]) * ey + (b - pj[2]) * ez) / (ex * ex + ey * ey + ez * ez + 1e-6)));
      const dr = pj[0] + w * ex - r;
      const dg = pj[1] + w * ey - g;
      const db = pj[2] + w * ez - b;
      const d = dr * dr * 0.9 + dg * dg * 1.2 + db * db * 0.8
        + (ex * ex + ey * ey + ez * ez) * 0.004;
      if (d < best) {
        best = d;
        bi = i;
        bj = j;
        bw = w;
      }
    }
  }
  const v: readonly [number, number, number] = [bi, bj, bw];
  pairCache.set(key, v);
  return v;
};

// ---- 点阵渲染 ----
export const FLICKER_FPS = 6; // 活性下限（4fps/3% 判定格 → 6fps/7%）
export const FLICKER_RATE = 0.07;
export const STATES = 5; // 30fps / 6fps = 每态 5 帧，烘焙 5 态循环

export type PointOpts = {
  /** 底稿像素（1280×720×4，来自底稿 canvas 的 getImageData） */
  base: Uint8ClampedArray;
  width: number;
  height: number;
  pitch?: number; // 10
  rad?: number; // 4.5
  posJitter?: number; // 2.4（±1.2px）
  colorJitter?: number; // 40（±20）
  compRate?: number; // 0.08
  flicker?: number; // 0.07
  t?: number; // 秒；flicker 态 = floor(t*fps)
  st?: number; // 直接指定 flicker/shimmer 态（烘焙用，优先于 t）
  shimmer?: (x: number, y: number) => boolean;
  mask?: (x: number, y: number) => boolean; // 命中则跳过（SC02 大点镶嵌区保原样）
  white?: number;
  dark?: number;
  bleed?: number; // 45
  /** 每点半径乘数（钩子结晶：对角梯度 + 点哈希 stagger 从 0 长满）；≤0.05 跳过该点。 */
  radMul?: (px: number, py: number, i: number, j: number) => number;
};

/** 在 g 上铺一整幅点彩（每色一条 Path2D 只 fill 一次）。 */
export const renderPointillism = (g: CanvasRenderingContext2D, opt: PointOpts): void => {
  const {base, width: W, height: H} = opt;
  const pitch = opt.pitch ?? 10;
  const rad = opt.rad ?? 4.5;
  const posJitter = opt.posJitter ?? 2.4;
  const colorJitter = opt.colorJitter ?? 40;
  const compRate = opt.compRate ?? 0.08;
  const flicker = opt.flicker ?? FLICKER_RATE;
  const white = opt.white ?? IDX_WHITE;
  const dark = opt.dark ?? IDX_DARK;
  const bleed = opt.bleed ?? 45;
  const st = opt.st ?? Math.floor((opt.t ?? 0) * FLICKER_FPS);
  const rowh = pitch * 0.866;
  const hj = posJitter / 2;
  const lumAt = (x: number, y: number) => {
    const row = Math.min(H - 1, Math.max(0, y | 0));
    const col = Math.min(W - 1, Math.max(0, x | 0));
    const i = (row * W + col) * 4;
    return base[i] * 0.3 + base[i + 1] * 0.59 + base[i + 2] * 0.11;
  };
  const paths: Array<Path2D | null> = PAL_RGB.map(() => null);
  for (let j = 0, y = 0; y < H + rowh; j++, y += rowh) {
    for (let i = 0, x = (j % 2) * (pitch / 2); x < W + pitch; i++, x += pitch) {
      const jx = (hash2(i, j * 7 + 1) - 0.5) * 2 * hj;
      const jy = (hash2(i * 3, j + 5) - 0.5) * 2 * hj;
      const px = x + jx;
      const py = y + jy;
      if (opt.mask && opt.mask(px, py)) continue;
      const k = ((Math.min(H - 1, Math.max(0, py | 0)) * W) + Math.min(W - 1, Math.max(0, px | 0))) * 4;
      const dj = (hash2(i * 7 + 3, j * 11) - 0.5) * colorJitter;
      const [a, bb, w] = pickPair(
        clamp255(base[k] + dj),
        clamp255(base[k + 1] + dj * 0.8),
        clamp255(base[k + 2] - dj * 0.6),
      );
      const hseed = opt.shimmer && opt.shimmer(px, py) ? hash2(i + st * 977, j) : hash2(i, j);
      let idx = hseed < w ? a : bb;
      const h2 = hash2(i * 5 + 2, j * 3 + 9);
      if (h2 < compRate && COMP[idx] != null) idx = COMP[idx];
      else if (hash2(i * 13 + st * 31, j * 17) < flicker) idx = hash2(i, j + st) < w ? bb : a;
      else {
        const dl = lumAt(px, py) - lumAt(px + 14, py + 6);
        if (Math.abs(dl) > bleed && h2 < 0.45) idx = dl > 0 ? white : dark;
      }
      const rr = rad * (opt.radMul ? opt.radMul(px, py, i, j) : 1);
      if (rr <= 0.05) continue;
      const p = paths[idx] ?? (paths[idx] = new Path2D());
      p.moveTo(px + rr, py);
      p.arc(px, py, rr, 0, Math.PI * 2);
    }
  }
  paths.forEach((p, k) => {
    if (!p) return;
    const c = PAL_RGB[k];
    g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    g.fill(p);
  });
};

/** 打底：底稿 blur(4px) saturate(.85) brightness(1.06) —— 点与点的缝里露出来（配方管线②）。 */
export const drawUnderlay = (g: CanvasRenderingContext2D, baseCanvas: HTMLCanvasElement, W: number, H: number): void => {
  g.save();
  g.filter = 'blur(4px) saturate(0.85) brightness(1.06)';
  g.drawImage(baseCanvas, 0, 0, W, H);
  g.restore();
};

/** s4「变成紫」整幅分级：向紫罗兰映射按亮度加权 lerp（混色完成＝眼睛把点熔成紫光）。
 *  ⚠ 配对族陷阱（首两版实测）：目标色饱和度不够时，算法会挑「金 c99a4a＋淡紫 9a7ac8」配对，
 *  视觉读成橄榄卡其——绿通道压到位（≤150 顶）+ 权重 0.88 才锁进 7a4aa8/9a7ac8 紫配对族。 */
export const gradePurple = (data: Uint8ClampedArray, weight = 0.88): void => {
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11) / 255;
    const t = lum * lum; // 暗部更沉、亮部更淡
    const tr = 30 + (216 - 30) * t; // 深靛 (30,14,110) → 亮丁香 (216,150,252)
    const tg = 14 + (150 - 14) * t;
    const tb = 110 + (252 - 110) * t;
    data[i] = clamp255(data[i] * (1 - weight) + tr * weight);
    data[i + 1] = clamp255(data[i + 1] * (1 - weight) + tg * weight);
    data[i + 2] = clamp255(data[i + 2] * (1 - weight) + tb * weight);
  }
};
