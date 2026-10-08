// 单调三次样条（Fritsch–Carlson 型加权切线）：数据单调则曲线单调、绝不过冲；
// 转折点（相邻差分变号）切线强制为 0——「cue 标点休止」（节奏点到速度归零）。
// 技法借鉴 mg-styles-15 demos/02-line-art film.js:37-51 (MIT, Vincentwei1021), TS 重写。
// 用途：时间重参数化（弧长→笔速/笔速→弧长）、禁过冲的尺寸/电平轨、节拍点减速归零。
// 纯函数、零依赖（无 React / DOM / 随机源）。

export type MonotoneTrack = (x: number) => number;

/**
 * 由节点 (xs, ys) 构造单调三次样条求值器。x 越界钳制取端值。
 * m0scale：首点切线缩放（默认 1）；mEnd：末点切线显式值（null = 抄末段差分，同源默认）。
 * 前提：xs 严格递增、ys 与 xs 等长（调用方保证；非法输入行为未定义）。
 */
export function monotone(xs: readonly number[], ys: readonly number[], m0scale = 1, mEnd: number | null = null): MonotoneTrack {
  const n = xs.length;
  const d: number[] = [];
  const m: number[] = new Array<number>(n);
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
  m[0] = d[0] * m0scale;
  m[n - 1] = mEnd == null ? d[n - 2] : mEnd;
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const h0 = xs[i] - xs[i - 1];
      const h1 = xs[i + 1] - xs[i];
      const w1 = 2 * h1 + h0;
      const w2 = h1 + 2 * h0;
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let k = 0;
    while (x > xs[k + 1]) k++;
    const h = xs[k + 1] - xs[k];
    const s = (x - xs[k]) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[k] + (s3 - 2 * s2 + s) * h * m[k] + (-2 * s3 + 3 * s2) * ys[k + 1] + (s3 - s2) * h * m[k + 1];
  };
}
