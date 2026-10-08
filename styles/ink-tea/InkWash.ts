// InkWash + BlankOut + paperInside：墨晕洇开 / destination-out 留白 / 剪影补纸。
// 笔墨引擎技法借鉴 huashu-art-motion 17_ink (MIT, alchaincyf), TSX 重写（P.inkWash 移植）。
// 坑（huashu 踩过）：multiply 对透明区无效，背后的墨线会透过晕染（窗台线透过猫耳）——
// 晕染前先在剪影里补一层纸色（paperInside），等于「先留出这块地方」。

/** 墨晕：fn(g) 在 scratch 上画实色形状 -> grow 0..1 控洇开，外晕 blur 随 grow 变宽、本体 blur 随 grow 收紧，multiply 两遍叠纸。 */
export function inkWash(
  c: CanvasRenderingContext2D,
  scratch: HTMLCanvasElement,
  grow: number,
  fn: (g: CanvasRenderingContext2D) => void,
  o: {blur?: number; halo?: number; haloA?: number; alpha?: number} = {},
): void {
  const {blur = 2, halo = 10, haloA = 0.22, alpha = 1} = o;
  const g = scratch.getContext('2d') as CanvasRenderingContext2D;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.filter = 'none';
  g.clearRect(0, 0, scratch.width, scratch.height);
  fn(g);
  if (grow <= 0) return;
  c.save();
  c.globalCompositeOperation = 'multiply';
  const sstep = (a: number, b: number, v: number): number => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a || 1e-6)));
    return t * t * (3 - 2 * t);
  };
  c.globalAlpha = haloA * alpha * grow;
  c.filter = `blur(${(halo * (0.4 + grow)).toFixed(2)}px)`;
  c.drawImage(scratch, 0, 0);
  c.globalAlpha = alpha * sstep(0, 0.6, grow);
  c.filter = `blur(${(blur * (1.6 - grow * 0.6)).toFixed(2)}px)`;
  c.drawImage(scratch, 0, 0);
  c.filter = 'none';
  c.restore();
}

/** 留白：destination-out 挖掉墨层露纸（一切「纸底」风格的负形画法）。 */
export function blankOut(c: CanvasRenderingContext2D, draw: (cc: CanvasRenderingContext2D) => void): void {
  c.save();
  c.globalCompositeOperation = 'destination-out';
  draw(c);
  c.restore();
}

/** 剪影补纸：clip 进 buildPath 画的形状后把宣纸原样铺回去（防 multiply 透字/透线）。 */
export function paperInside(
  c: CanvasRenderingContext2D,
  paper: HTMLCanvasElement,
  buildPath: (cc: CanvasRenderingContext2D) => void,
): void {
  c.save();
  buildPath(c);
  c.clip();
  c.drawImage(paper, 0, 0);
  c.restore();
}
