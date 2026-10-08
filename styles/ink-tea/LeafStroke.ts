// LeafStroke：两头尖的单笔（个字竹叶 / 兰叶 / 鸟翅 / 虾尾）。
// 笔墨引擎技法借鉴 huashu-art-motion 17_ink (MIT, alchaincyf), TSX 重写（P.leaf 数学移植）。
import {ribbon, pathOf, type Pt, PAL} from './ink';

/**
 * 从 (x,y) 沿 ang 方向画长 L、最宽 wmax 的微弯单笔：
 * 宽度剖面 sin^0.7（两头尖中间鼓）+ 0.6px 底宽 + 8% 弯度。
 * reveal 0..1 时叶长从根部写出（写意「个字」组叶的逐笔落纸）。
 */
export function leafStroke(
  c: CanvasRenderingContext2D,
  x: number, y: number, ang: number, L: number, wmax: number,
  tone = 0.88, col: readonly number[] = PAL.ink, reveal = 1,
): void {
  const len = L * Math.max(0, Math.min(1, reveal));
  if (len <= 0.5) return;
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const q = i / 10;
    const bend = Math.sin(q * Math.PI) * 0.08 * L;
    pts.push([
      x + Math.cos(ang) * len * q - Math.sin(ang) * bend,
      y + Math.sin(ang) * len * q + Math.cos(ang) * bend,
    ]);
  }
  c.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${tone})`;
  c.fill(pathOf(ribbon(pts, (q) => wmax * Math.pow(Math.sin(Math.PI * Math.min(1, q * 1.1)), 0.7) + 0.6), true));
}
