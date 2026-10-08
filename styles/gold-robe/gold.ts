// ============================================================================
// gold.ts — gold-robe 金色世界基础层（克里姆特金色时期 · 战役 4 批次④ D2）
// 金箔材质：f = 0.5 + fbm(x·.004)·0.55 + noise(x·.003, y·.08)·0.45·0.5 + ±0.05，
//   在金三阶 [120,78,18]→[196,148,52]→[246,216,128] 间插值 + 96px 方块接缝（复用哥特金箔参数，
//   与 gold-leaf 材质卡同源：这是「穿在人物身上的金」的肖像世界，见 SPEC 边界声明）。
// 墙 = 金箔 × 褐金斑驳 multiply + 9000 颗金粉/暗粉。
// 粒子表（金粉 420 上浮 26px/s / 金箔碎片 34 翻面飘落 150px/s / 花 260 点头 0.35 幅）
//   全部模块级一次性 seeded 生成，逐帧代码零随机消费。
// 纪律：mulberry32（状态在工厂闭包，禁函数内重置）/ 值噪声+fbm 全确定性，禁 Math.random/Date。
// 技法借鉴 huashu-art-motion scenes/18_klimt.js + transitions.js goldLeaf (MIT, alchaincyf)，
//   参数级借鉴（f 公式/接缝 96px/9000 金粉/420 金粉星/34 碎片/金三阶 token），TS 重写零代码拷贝。
// ============================================================================
import {W, H} from '../common';

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const inv = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));
export const outC = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);
export const lerp2 = (a: number, b: number, u: number) => a + (b - a) * clamp01(u);
export const outBack = (u: number, s = 1.7) => {
  const x = clamp01(u);
  const c3 = s + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
};

/** mulberry32：状态闭包在工厂层、返回闭包递进——禁止把状态写进返回函数内（会退化为常数序列，amphora 事故）。 */
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---- 值噪声 + fbm（确定性 hash，无状态）----
const hash2 = (x: number, y: number) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
export const fbm = (x: number, y: number, oct = 4) => {
  let s = 0, amp = 0.5, fr = 1;
  for (let i = 0; i < oct; i++) { s += amp * (vnoise(x * fr, y * fr) * 2 - 1); amp *= 0.5; fr *= 2; }
  return s;
};

// ---- 锁死 token：金三阶 + 深褐 + 黑白格 ----
export const GOLD = {lo: [120, 78, 18] as const, mi: [196, 148, 52] as const, hi: [246, 216, 128] as const};
export const INK = '#1d140c';
export const BW = {blk: '#141010', wht: '#f4efe2', trim: '#d6a845'};

export const mixc = (a: readonly number[], b: readonly number[], u: number): [number, number, number] =>
  [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
export const goldAt = (f: number) => {
  const [r, g, b] = f < 0.5 ? mixc(GOLD.lo, GOLD.mi, f * 2) : mixc(GOLD.mi, GOLD.hi, (f - 0.5) * 2);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
};

// ---- 模块级位图缓存（一次渲染，整页复用）----
const cache = new Map<string, HTMLCanvasElement>();
export const cached = (key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement => {
  let cv = cache.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    paint(cv.getContext('2d')!);
    cache.set(key, cv);
  }
  return cv;
};
export const scratch = (key: string) => {
  let cv = cache.get(key);
  if (!cv) { cv = document.createElement('canvas'); cv.width = W; cv.height = H; cache.set(key, cv); }
  const g = cv.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.filter = 'none';
  g.clearRect(0, 0, W, H);
  return g;
};

// ---- 金箔（半分辨率逐像素 + 放大，接缝全分辨率）----
export const goldTex = () => cached('gr_goldtex', W, H, (g) => {
  const tw = 640, th = 360;
  const small = cached('gr_goldtex_small', tw, th, (h2) => {
    const img = h2.createImageData(tw, th), d = img.data, r = mulberry32(19);
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const mott = fbm(x * 0.008 + 3, y * 0.008, 4);
      const brush = vnoise(x * 0.006, y * 0.16) * 0.45;
      const gr = (r() - 0.5) * 0.1;
      const f = clamp01(0.5 + mott * 0.55 + brush * 0.5 + gr);
      const [cr, cg, cb] = f < 0.5 ? mixc(GOLD.lo, GOLD.mi, f * 2) : mixc(GOLD.mi, GOLD.hi, (f - 0.5) * 2);
      const i = (y * tw + x) * 4;
      d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = 255;
    }
    h2.putImageData(img, 0, 0);
  });
  g.imageSmoothingEnabled = true;
  g.drawImage(small, 0, 0, W, H);
  g.strokeStyle = 'rgba(90,55,10,.18)';
  g.lineWidth = 1;
  for (let y = 0; y < H; y += 96) for (let x = ((y / 96) % 2) * 48; x < W; x += 96) g.strokeRect(x + 0.5, y + 0.5, 96, 96);
});

// ---- 墙：金箔 × 褐金斑驳 multiply + 9000 金粉/暗粉 ----
export const wall = () => cached('gr_wall', W, H, (g) => {
  g.drawImage(goldTex(), 0, 0);
  g.globalCompositeOperation = 'multiply';
  const img = cached('gr_mott', 480, 270, (h2) => {
    const im = h2.createImageData(480, 270), d = im.data;
    for (let y = 0; y < 270; y++) for (let x = 0; x < 480; x++) {
      const n = fbm(x * 0.012 + 9, y * 0.012, 4);
      const v = clamp01(0.62 + n * 0.7);
      const i = (y * 480 + x) * 4;
      d[i] = 255 * v; d[i + 1] = 235 * v; d[i + 2] = 190 * v; d[i + 3] = 255;
    }
    h2.putImageData(im, 0, 0);
  });
  g.drawImage(img, 0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  const r = mulberry32(23);
  for (let i = 0; i < 9000; i++) {
    const x = r() * W, y = r() * H, s = 0.6 + r() * 2.2;
    g.fillStyle = r() < 0.7 ? `rgba(250,226,140,${0.3 + r() * 0.5})` : `rgba(70,40,10,${0.2 + r() * 0.3})`;
    g.fillRect(x, y, s, s);
  }
});

// ---- 金粉（420 颗，上浮 26px/s + 四角星闪烁；静止帧治理②）----
export type Dust = {x0: number; y0: number; s: number; ph: number; sp: number};
export const DUST: Dust[] = (() => {
  const r = mulberry32(31), o: Dust[] = [];
  for (let i = 0; i < 420; i++) o.push({x0: r() * W, y0: r() * H, s: 1.5 + r() * 3.5, ph: r() * 6.28, sp: 3 + r() * 6});
  return o;
})();
export const drawDust = (g: CanvasRenderingContext2D, t: number) => {
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const d of DUST) {
    const x = d.x0 + Math.sin(t * 0.8 + d.ph) * 14;
    const y = (((d.y0 - t * 26) % H) + H) % H;
    const tw = Math.sin(t * d.sp + d.ph);
    if (tw < 0.55) continue;
    const a = (tw - 0.55) / 0.45, R = d.s * (0.6 + a * 1.1);
    g.fillStyle = `rgba(255,236,160,${(0.8 * a).toFixed(3)})`;
    g.beginPath();
    g.moveTo(x, y - R * 2); g.lineTo(x + R * 0.35, y - R * 0.35); g.lineTo(x + R * 2, y); g.lineTo(x + R * 0.35, y + R * 0.35);
    g.lineTo(x, y + R * 2); g.lineTo(x - R * 0.35, y + R * 0.35); g.lineTo(x - R * 2, y); g.lineTo(x - R * 0.35, y - R * 0.35);
    g.closePath(); g.fill();
  }
  g.restore();
};

// ---- 金箔碎片（34 片，翻面飘落 150px/s；静止帧治理①）----
export type Frag = {x0: number; ph: number; off: number; s: number; rot: number};
export const FRAGS: Frag[] = (() => {
  const r = mulberry32(77), o: Frag[] = [];
  for (let i = 0; i < 34; i++) o.push({x0: r() * W, ph: r() * 6.28, off: r() * 620, s: r(), rot: (r() - 0.5) * 1.6});
  return o;
})();
export const drawFrags = (g: CanvasRenderingContext2D, t: number) => {
  FRAGS.forEach((p, i) => {
    const x = p.x0 + Math.sin(t * 0.8 + p.ph) * 36;
    const y = -30 + ((p.off + t * 150) % 750);
    const fl = Math.cos(t * 5 + i);
    g.save();
    g.translate(x, y);
    g.rotate(p.rot + t * 1.2 + i * 0.7);
    g.scale(1, Math.max(0.12, Math.abs(fl)));
    const s2 = 7 + p.s * 8;
    const gr = g.createLinearGradient(-s2, -s2, s2, s2);
    gr.addColorStop(0, '#fbe6a0'); gr.addColorStop(1, '#a8741e');
    g.fillStyle = gr;
    if (i % 3) { g.fillRect(-s2, -s2, s2 * 2, s2 * 2); g.strokeStyle = 'rgba(70,40,10,.6)'; g.lineWidth = 1.2; g.strokeRect(-s2, -s2, s2 * 2, s2 * 2); }
    else { g.beginPath(); g.arc(0, 0, s2, 0, Math.PI * 2); g.fill(); }
    g.restore();
  });
};

// ---- 斜向流光（520px α.24 斜切 lighter，1.15s 匀速 −200→2300，周期 4.6s；画在角色之前）----
export const drawSweep = (g: CanvasRenderingContext2D, t: number, x0: number, comp: GlobalCompositeOperation = 'lighter') => {
  const gr = g.createLinearGradient(x0 - 260, 0, x0 + 260, 0);
  gr.addColorStop(0, 'rgba(255,240,180,0)');
  gr.addColorStop(0.5, 'rgba(255,240,180,.24)');
  gr.addColorStop(1, 'rgba(255,240,180,0)');
  g.save();
  g.globalCompositeOperation = comp;
  g.transform(1, 0, -0.45, 1, 0, 0);
  g.fillStyle = gr;
  g.fillRect(x0 - 260 - 600, 0, 520 + 1200, 700);
  g.restore();
};
export const sweepX = (t: number) => {
  const local = t % 4.6;
  return local < 1.15 ? lerp2(-200, 2300, local / 1.15) : -9999;
};

// ---- goldLeaf 钩子转场（72px 方块按「离头距离×0.78 + 方位角×0.12 + 随机」排序 = 从人物头部长出来）----
export const REVEAL_C = {cx: 574, cy: 244};
export const REVEAL_FROM = 2;
export const REVEAL_TO = 26;
export type Tile = {x: number; y: number; key: number; rot: number; m: number};
export const TILES: Tile[] = (() => {
  const ts = 72, r = mulberry32(21), out: Tile[] = [];
  const maxd = Math.hypot(W, H) * 0.8;
  for (let y = 0; y < H; y += ts) for (let x = 0; x < W; x += ts) {
    const mx = x + ts / 2, my = y + ts / 2;
    const d = Math.hypot(mx - REVEAL_C.cx, REVEAL_C.cy - my) / maxd;
    const a = (Math.atan2(my - REVEAL_C.cy, mx - REVEAL_C.cx) / (Math.PI * 2) + 1) % 1;
    out.push({x, y, key: d * 0.78 + a * 0.12 + r() * 0.08, rot: (r() - 0.5) * 0.8, m: (r() * 3) | 0});
  }
  return out.sort((p, q) => p.key - q.key);
})();

/** 钩子金箔铺开合成：暗底 → 按 key 顺序贴金箔（带螺旋/眼形/同心圆压纹）→ 贴实处露出场景。 */
export const compositeReveal = (g: CanvasRenderingContext2D, scene: HTMLCanvasElement, p: number, t = 0) => {
  const ts = 72;
  g.fillStyle = '#140c04';
  g.fillRect(0, 0, W, H);
  // 暗场段也有生命：金粉微光（半强度）飘着，f1 非空屏
  g.save();
  g.globalAlpha = 0.45;
  drawDust(g, t);
  g.restore();
  for (const t of TILES) {
    const q = clamp01((p * 1.32 - t.key) / 0.32);
    if (q <= 0) continue;
    if (q >= 1) { g.drawImage(scene, t.x, t.y, ts, ts, t.x, t.y, ts, ts); continue; }
    const mx = t.x + ts / 2, my = t.y + ts / 2;
    if (q > 0.5) g.drawImage(scene, t.x, t.y, ts, ts, t.x, t.y, ts, ts);
    const u = q < 0.5 ? q / 0.5 : 1;
    const fade = q < 0.5 ? 1 : 1 - (q - 0.5) / 0.5;
    g.save();
    g.translate(mx, my);
    g.rotate(t.rot * (1 - outC(u)));
    const s = 1.3 - 0.3 * outC(u);
    g.scale(s, s);
    g.globalAlpha = Math.min(1, u * 2.5) * fade;
    const gr = g.createLinearGradient(-ts / 2, -ts / 2, ts / 2, ts / 2);
    gr.addColorStop(0, '#a8741e'); gr.addColorStop(clamp01(0.2 + u * 0.5), '#fbe6a0'); gr.addColorStop(1, '#c8962e');
    g.fillStyle = gr;
    g.fillRect(-ts / 2, -ts / 2, ts, ts);
    g.strokeStyle = 'rgba(70,40,10,.75)';
    g.lineWidth = 2.2;
    g.beginPath();
    if (t.m === 0) { for (let a = 0; a < Math.PI * 5; a += 0.25) { const rr = 26 * a / (Math.PI * 5); a ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(0, 0); } }
    else if (t.m === 1) { g.moveTo(-24, 0); g.quadraticCurveTo(0, -20, 24, 0); g.quadraticCurveTo(0, 20, -24, 0); g.moveTo(7, 0); g.arc(0, 0, 7, 0, Math.PI * 2); }
    else { [8, 16, 24].forEach((rr) => { g.moveTo(rr, 0); g.arc(0, 0, rr, 0, Math.PI * 2); }); }
    g.stroke();
    g.restore();
  }
};
