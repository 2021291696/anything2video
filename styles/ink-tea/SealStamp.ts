// SealStamp：钤印。朱文方印 + 白文字 + 印面斑驳；盖印 = 1.5->1 压下 0.1s + multiply 落纸。
// 笔墨引擎技法借鉴 huashu-art-motion 17_ink (MIT, alchaincyf), TSX 重写。
import {mulberry32, cached, PAL} from './ink';

/** 建一方印（缓存）：红底方块，白文字 destination-out 镂出，40 粒斑驳 + 印泥洇边 */
export function buildSeal(chars: string[], seed: number, size = 84, fontSize = 30): HTMLCanvasElement {
  return cached(`inktea_seal_${chars.join('')}_${seed}`, size, size, (g) => {
    const half = size / 2;
    g.translate(half, half);
    // 印泥洇边：先铺一圈微晕红
    g.fillStyle = 'rgba(196,40,30,0.35)';
    g.fillRect(-half - 2.5, -half - 2.5, size + 5, size + 5);
    g.fillStyle = PAL.seal;
    g.fillRect(-half, -half, size, size);
    // 白文字：destination-out 镂出（印文是「白文」）
    g.globalCompositeOperation = 'destination-out';
    g.font = `600 ${fontSize}px "Noto Serif SC"`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (chars.length === 1) {
      g.fillText(chars[0], 0, 2);
    } else {
      // 2 字竖排 / 4 字田字格
      if (chars.length === 2) {
        g.fillText(chars[0], 0, -fontSize * 0.5);
        g.fillText(chars[1], 0, fontSize * 0.54);
      } else {
        const off = fontSize * 0.55;
        const pos = [[-off, -off], [off, -off], [-off, off], [off, off]];
        chars.slice(0, 4).forEach((ch, i) => g.fillText(ch, pos[i][0], pos[i][1] + 2));
      }
    }
    // 印面斑驳：细碎镂空点（印泥不匀）
    const r = mulberry32(seed);
    for (let i = 0; i < 40; i++) {
      g.fillRect(-half + r() * size, -half + r() * size, 1 + r() * 3, 1 + r() * 2);
    }
    // 边框残缺：四角轻磨
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 10; i++) {
      const edge = Math.floor(r() * 4);
      const t = r() * size - half;
      const along = r() * 4 + 1;
      if (edge === 0) g.fillRect(t, -half, along, 1.5);
      else if (edge === 1) g.fillRect(t, half - 1.5, along, 1.5);
      else if (edge === 2) g.fillRect(-half, t, 1.5, along);
      else g.fillRect(half - 1.5, t, 1.5, along);
    }
  });
}

/**
 * 盖印：q 0..1 压下进度。s = 1.5 -> 1（提起落下），alpha 随压下变实，multiply 落纸。
 * huashu 实测：0.1s 内完成压下（约 3 帧），印泥在压下后继续微洇（halo 由调用方控制）。
 */
export function stampSeal(
  c: CanvasRenderingContext2D,
  seal: HTMLCanvasElement,
  x: number, y: number, q: number,
): void {
  if (q <= 0) return;
  const e = 1 - Math.pow(1 - Math.min(1, q), 3);
  const s = 1.5 - 0.5 * e;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.globalAlpha = Math.min(1, q * 1.6);
  c.globalCompositeOperation = 'multiply';
  c.drawImage(seal, -seal.width / 2, -seal.height / 2);
  c.restore();
}
