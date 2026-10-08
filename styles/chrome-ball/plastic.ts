// chrome-ball 塑料着色约定（签名①②，配方 15_raytrace 锁死参数）。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）references/风格配方/15_raytrace.md 与
// scripts/engine/scenes/15_raytrace.js 的 plastic()/cyl() 四步着色约定——机制与参数照搬、
// Remotion(TSX)+Canvas2D 惯用法重写，零整段拷贝。
// 「90 年代塑料感」= 每个部件：底色 → 径向渐变（高光点亮/边缘压暗）→ lighter 青绿环境反光 → 硬边白椭圆镜面高光。
import type {CanvasCtx, Pt} from './types';
import {clamp, lerp} from './noise';

export type PlasticOpts = {
  /** 边缘压暗量（深紫 rgba(10,0,30,dark)）。 */
  dark?: number;
  /** 硬高光透明度（0 = 关）。 */
  spec?: number;
  /** 硬高光半径比。 */
  specR?: number;
  /** 青绿环境反光描边开关。 */
  rim?: boolean;
  /** 硬高光倾角。 */
  specAng?: number;
};

/**
 * 签名① 塑料着色四步（锁死参数）：
 * 底色填充 → (hx,hy) 为心 R 为半径的四段径向渐变 0→白.55 / 0.28→白.06 / 0.62→透明 / 1→深紫 rgba(10,0,30,.42)
 * → lighter 叠 rgba(70,150,150,.28) 描边（宽 0.18R，整体左偏 0.04R——墙是青绿色反光就是青绿色）
 * → 硬边白椭圆高光（0.16R×0.09R，α.85）——这一笔最像 90 年代 Phong。
 */
export function plastic(c: CanvasCtx, path: Path2D, base: string, hx: number, hy: number, R: number, o: PlasticOpts = {}): void {
  const {dark = 0.42, spec = 0.85, specR = 0.16, rim = true, specAng = -0.5} = o;
  c.fillStyle = base;
  c.fill(path);
  c.save();
  c.clip(path);
  const g = c.createRadialGradient(hx, hy, 0, hx + R * 0.25, hy + R * 0.3, R);
  g.addColorStop(0, 'rgba(255,255,255,.55)');
  g.addColorStop(0.28, 'rgba(255,255,255,.06)');
  g.addColorStop(0.62, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(10,0,30,${dark})`);
  c.fillStyle = g;
  c.fillRect(hx - R * 3, hy - R * 3, R * 6, R * 6);
  if (rim) {
    c.globalCompositeOperation = 'lighter';
    c.lineWidth = R * 0.18;
    c.strokeStyle = 'rgba(70,150,150,.28)';
    c.translate(-R * 0.04, 0);
    c.stroke(path);
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
  if (spec > 0) {
    c.save();
    c.clip(path);
    c.fillStyle = `rgba(255,255,255,${spec})`;
    c.beginPath();
    c.ellipse(hx, hy, R * specR, R * specR * 0.55, specAng, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

/** 短板修正·哑光面（脸不做塑料）：底色 + 单向软渐变（窗光侧亮），无白高光、无 lighter 反光描边。 */
export function matte(c: CanvasCtx, path: Path2D, base: string, lx: number, ly: number, R: number): void {
  c.fillStyle = base;
  c.fill(path);
  c.save();
  c.clip(path);
  const g = c.createRadialGradient(lx, ly, 0, lx, ly, R);
  g.addColorStop(0, 'rgba(255,255,255,.28)');
  g.addColorStop(0.55, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,0,30,.26)');
  c.fillStyle = g;
  c.fillRect(lx - R * 2, ly - R * 2, R * 4, R * 4);
  c.restore();
}

/**
 * 签名② 圆柱感（肢体）：渐变横跨 A→B 的法线方向（暗.25 → 白.5 窄带在 22% → 暗.45），
 * 再沿 20%–75% 画一道白色细高光线（宽 0.09w、偏向法线上方 0.22w）。
 */
export function cyl(c: CanvasCtx, path: Path2D, base: string, A: Pt, B: Pt, w: number, spec = 0.7): void {
  c.fillStyle = base;
  c.fill(path);
  const a = Math.atan2(B[1] - A[1], B[0] - A[0]);
  const nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
  const M: Pt = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const s = ny < 0 ? -1 : 1; // 让渐变从「上方」到「下方」
  const g = c.createLinearGradient(M[0] - nx * s * w * 0.5, M[1] - ny * s * w * 0.5, M[0] + nx * s * w * 0.5, M[1] + ny * s * w * 0.5);
  g.addColorStop(0, 'rgba(10,0,30,.25)');
  g.addColorStop(0.22, 'rgba(255,255,255,.5)');
  g.addColorStop(0.34, 'rgba(255,255,255,.08)');
  g.addColorStop(0.7, 'rgba(0,0,0,.05)');
  g.addColorStop(1, 'rgba(10,0,30,.45)');
  c.save();
  c.clip(path);
  c.fillStyle = g;
  c.fillRect(Math.min(A[0], B[0]) - w * 2, Math.min(A[1], B[1]) - w * 2, Math.abs(B[0] - A[0]) + w * 4, Math.abs(B[1] - A[1]) + w * 4);
  if (spec > 0) {
    c.strokeStyle = `rgba(255,255,255,${spec})`;
    c.lineWidth = w * 0.09;
    c.lineCap = 'round';
    const o = w * 0.22 * s;
    c.beginPath();
    c.moveTo(lerp(A[0], B[0], 0.2) - nx * o, lerp(A[1], B[1], 0.2) - ny * o);
    c.lineTo(lerp(A[0], B[0], 0.75) - nx * o, lerp(A[1], B[1], 0.75) - ny * o);
    c.stroke();
  }
  c.restore();
}

/** 锥形肢体路径（A 端宽 w0 → B 端宽 w1；短板修正：腿不再直柱，配球关节做两段）。 */
export function taper(A: Pt, B: Pt, w0: number, w1: number): Path2D {
  const a = Math.atan2(B[1] - A[1], B[0] - A[0]);
  const nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
  const p = new Path2D();
  p.moveTo(A[0] + nx * w0 * 0.5, A[1] + ny * w0 * 0.5);
  p.lineTo(B[0] + nx * w1 * 0.5, B[1] + ny * w1 * 0.5);
  p.arc(B[0], B[1], w1 * 0.5, a + Math.PI / 2, a - Math.PI / 2);
  p.lineTo(A[0] - nx * w0 * 0.5, A[1] - ny * w0 * 0.5);
  p.arc(A[0], A[1], w0 * 0.5, a - Math.PI / 2, a + Math.PI / 2);
  p.closePath();
  return p;
}

/** 球关节（玩具人偶的关节感）：塑料小球。 */
export function joint(c: CanvasCtx, x: number, y: number, r: number, base: string): void {
  const p = new Path2D();
  p.arc(x, y, r, 0, Math.PI * 2);
  plastic(c, p, base, x - r * 0.3, y - r * 0.35, r * 1.3, {spec: 0.8, specR: 0.14});
}

/** 值域钳制工具（着色参数微调用）。 */
export const specScale = (base: number, k: number): number => clamp(base * k, 0, 1);
