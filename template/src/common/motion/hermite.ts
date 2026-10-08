// Catmull-Rom 关键帧轨（多通道 + 'e' 零斜率端点 + m= 切线控制）。
// 技法借鉴 mg-styles-15 demos/12-aurora-glass main.js:39-56（MIT, Vincentwei1021）、
// demos/03-isometric js/main.js:32-49（'e' 标记语义），TS 重写。
// 用途：相机轨 / 光强 / 任意多通道编排——过全部关键帧、段内 C1 连续、端点默认零斜率。
// 纯函数、零依赖（无 React / DOM / 随机源）。

/** 单个关键帧：t 时刻各通道取 v；m 显式切线（值/秒）> e 零斜率 > 端点自动零斜率 > Catmull-Rom 邻点差分 × s。 */
export interface HermiteKey {
  /** 关键帧时刻（秒，须单调递增） */
  t: number;
  /** 该帧各通道取值 */
  v: readonly number[];
  /** 显式切线（值/秒，逐通道）；给出时压过 e 与自动切线 */
  m?: readonly number[];
  /** 'e' = 该点零斜率（缓起/缓收端点、落定帧） */
  e?: boolean;
  /** Catmull-Rom 张力倍率（默认 1；>1 更冲，<1 更缓） */
  s?: number;
}

export type HermiteTrack = (t: number) => number[];

/** 构造 Catmull-Rom Hermite 轨道求值器：f(t) → 各通道值；t 越界钳制取端值。 */
export function hermite(keys: HermiteKey[]): HermiteTrack {
  const n = keys.length;
  if (n === 0) return () => [];
  // 预计算每点切线（一次），求值 O(log 段) 线性扫
  const m: number[][] = keys.map((k, i) => {
    const d = k.v.length;
    if (k.m) return k.m.slice();
    if (k.e || i === 0 || i === n - 1) return new Array<number>(d).fill(0);
    const a = keys[i - 1];
    const b = keys[i + 1];
    const s = k.s ?? 1;
    return k.v.map((_, j) => (s * (b.v[j] - a.v[j])) / (b.t - a.t));
  });
  return (t: number) => {
    if (t <= keys[0].t) return keys[0].v.slice();
    if (t >= keys[n - 1].t) return keys[n - 1].v.slice();
    let i = 0;
    while (t > keys[i + 1].t) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const h = b.t - a.t;
    const u = (t - a.t) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;
    return a.v.map((_, j) => h00 * a.v[j] + h10 * h * m[i][j] + h01 * b.v[j] + h11 * h * m[i + 1][j]);
  };
}

export type HermiteKey1 = [t: number, v: number] | [t: number, v: number, e: 'e'];

/** 标量单通道简写（03-isometric 风格 [t, v, 'e'] 元组）。 */
export function hermite1(keys: HermiteKey1[]): (t: number) => number {
  const vec = hermite(keys.map((k) => ({t: k[0], v: [k[1]], e: (k as [number, number, 'e'])[2] === 'e'})));
  return (t: number) => vec(t)[0];
}
