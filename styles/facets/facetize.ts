// 切面器 facetize —— facets 签名②+⑥。RIG 平涂进离屏 → 读回像素 → 抖动三角网（每格随机对角线）→
// 质心取色 ×(0.8+0.38rand) + 顶点 0→2 亮暗渐变 → **三角不裁剪画回**（轮廓被切成锯齿直边=平面溢出轮廓）。
// 沸腾：顶点每 8fps 抖 ±8% cell（floor(t·8) 步进 + hash 逐点相位），boilFrac 16-35% 的三角明暗跳 ±12%。
// ★确定性坑（RECON 点名，必须遵守）：要 getImageData 的离屏层必须 (a) getContext('2d',{willReadFrequently:true})，
//   (b) 每次重画开头 g.reset()（清像素+清 lineJoin/lineCap 等状态）而不是 clearRect——
//   状态残留会让第一帧与之后不一致（同帧多 pass 场景同样适用）。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）scenes/11_cubism.js 的 facetize，TSX 重写非拷贝。
import {type CanvasCtx, type Pt} from './types';
import {clamp, hash2, hex2rgb, mix, mulberry32, rgba} from './rand';

const CREAM: [number, number, number] = [250, 244, 228];
const DARK: [number, number, number] = [40, 32, 24];

/** 离屏层注册表：所有要读回像素的层经此创建（willReadFrequently），每次取用时 reset（清像素+清状态）。 */
const LAYERS = new Map<string, HTMLCanvasElement>();
export function layer(key: string, w = 1280, h = 720): {cv: HTMLCanvasElement; g: CanvasCtx} {
  let cv = LAYERS.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    LAYERS.set(key, cv);
  }
  const g = cv.getContext('2d', {willReadFrequently: true}) as CanvasCtx;
  g.reset(); // 确定性：清像素+清状态（替代 clearRect）
  return {cv, g};
}

/** 静态层（帧无关内容，画一次缓存复用；不 reset）。 */
export function staticLayer(key: string, w: number, h: number, draw: (g: CanvasCtx) => void): HTMLCanvasElement {
  let cv = LAYERS.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    LAYERS.set(key, cv);
    draw(cv.getContext('2d', {willReadFrequently: true}) as CanvasCtx);
  }
  return cv;
}

/** 当前沸腾步（8fps 步进；t 钳死后步冻结）。 */
export function boilStep(t: number, freezeT: number): number {
  return Math.floor(Math.min(t, freezeT) * 8);
}

export interface FacetOpts {
  boilFrac?: number;   // 明暗跳三角占比（16-35%）
  alpha?: number;
  edge?: string;
  light?: number;
  dark?: number;
  minA?: number;       // 质心 alpha 低于此跳过
  only?: ((s: [number, number, number, number]) => boolean) | null;
  scatter?: number;    // 碎面散落幅度 px（>0 时每三角按 hash 相位平移，HERO 重组时收回 0）
  scatterSeed?: number;
}

/** 切面器主函数：从 src 层读 box 像素，切三角网画回 g。 */
export function facetize(
  g: CanvasCtx,
  src: HTMLCanvasElement,
  box: [number, number, number, number],
  cell: number,
  seed: number,
  st: number,
  opts: FacetOpts = {},
): void {
  const {boilFrac = 0.25, alpha = 0.95, edge = 'rgba(40,30,20,0.25)', light = 0.2, dark = 0.32, minA = 120, only = null, scatter = 0, scatterSeed = 11} = opts;
  const [x0, y0, x1, y1] = box;
  const w = x1 - x0, h = y1 - y0;
  const d = (src.getContext('2d') as CanvasCtx).getImageData(x0, y0, w, h).data;
  const nx = Math.ceil(w / cell), ny = Math.ceil(h / cell);
  const r = mulberry32(seed);
  const pts: Pt[] = [];
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const k = j * (nx + 1) + i;
      // 静态抖动（建网）+ 沸腾抖动（±8% cell，8fps 步进 hash 相位）
      pts.push([
        x0 + i * cell + (r() - 0.5) * cell * 0.85 + (hash2(k, st * 3 + seed, 101) - 0.5) * cell * 0.16,
        y0 + j * cell + (r() - 0.5) * cell * 0.85 + (hash2(k, st * 5 + seed, 202) - 0.5) * cell * 0.16,
      ]);
    }
  }
  const at = (x: number, y: number): [number, number, number, number] => {
    const ix = clamp(Math.round(x - x0), 0, w - 1), iy = clamp(Math.round(y - y0), 0, h - 1);
    const k = (iy * w + ix) * 4;
    return [d[k], d[k + 1], d[k + 2], d[k + 3]];
  };
  g.lineJoin = 'round';
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const P0 = pts[j * (nx + 1) + i], P1 = pts[j * (nx + 1) + i + 1], P2 = pts[(j + 1) * (nx + 1) + i], P3 = pts[(j + 1) * (nx + 1) + i + 1];
      const tris: Pt[][] = r() < 0.5 ? [[P0, P1, P3], [P0, P3, P2]] : [[P0, P1, P2], [P1, P3, P2]];
      tris.forEach((tri, k) => {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
        const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const s = at(cx, cy);
        const shadeR = r();
        if (s[3] < minA || (only && !only(s))) return;
        // 碎面散落（拆开冲击/HERO 重组）：hash 方向 × 幅度
        let dx = 0, dy = 0;
        if (scatter > 0) {
          const a = hash2(i * 31 + j, k + scatterSeed, 303) * Math.PI * 2;
          const m = (0.4 + hash2(i, j + k, 404) * 0.9) * scatter;
          dx = Math.cos(a) * m;
          dy = Math.sin(a) * m * 0.7;
        }
        // 明暗跳：boilFrac 比例的三角 ±0.12（8fps 步进）
        const flick = hash2(i * 31 + j, k + st * 7, 505) < boilFrac ? (hash2(i, j + st, 606) - 0.5) * 0.25 : 0;
        const sh = 0.8 + shadeR * 0.38 + flick;
        const col: [number, number, number] = [s[0] * sh, s[1] * sh, s[2] * sh];
        const gr = g.createLinearGradient(tri[0][0] + dx, tri[0][1] + dy, tri[2][0] + dx, tri[2][1] + dy);
        gr.addColorStop(0, rgba(mix(col, CREAM, light), alpha));
        gr.addColorStop(1, rgba(mix(col, DARK, dark), alpha));
        g.fillStyle = gr;
        g.beginPath();
        tri.forEach((p, q) => (q ? g.lineTo(p[0] + dx, p[1] + dy) : g.moveTo(p[0] + dx, p[1] + dy)));
        g.closePath();
        g.fill();
        g.strokeStyle = edge;
        g.lineWidth = 1;
        g.stroke();
      });
    }
  }
}

/** 散落冲击包络：CUT 瞬间冲击衰减到余量，HERO 段缓入缓出收到 0。 */
export function scatterAmp(f: number, cut: number, heroFrom: number, heroTo: number): number {
  if (f < cut) return 0;
  if (f < heroFrom) return 9 * Math.exp(-(f - cut) / 55) + 2.5;
  if (f <= heroTo) {
    const base = 9 * Math.exp(-(heroFrom - cut) / 55) + 2.5;
    const k = (f - heroFrom) / (heroTo - heroFrom);
    const u = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    return base * (1 - u);
  }
  return 0;
}

/** hex → rgb 数组便捷（re-export 用）。 */
export {hex2rgb};
