// common/motion 断言套件（纯 TS、零依赖、无 node/react import）——node 直跑见文件尾注释。
// 覆盖：hermite 过点 + C1 + 端点/'e' 斜率 + 显式 m；monotone 单调 + cue 导数 0 + 越界钳制；
//       quantize 输出离散档位 + jit 步内恒定/步间跳变/幅度有界；smear 参数合法 + 渐变停点序列。
// 跑法：npx esbuild src/common/motion/motion.test.ts --bundle --format=cjs --outfile=.motion-test.cjs
//       node -e "require('./.motion-test.cjs').runAllMotionTests().forEach(l => console.log(l))"

import {hermite, hermite1} from './hermite';
import {monotone} from './monotone';
import {hash2, K, ks, Q12, Q6, qT, jit} from './quantize';
import {smearCap, smearStops} from './smear';

const ok = (cond: boolean, msg: string) => {
  if (!cond) throw new Error('FAIL: ' + msg);
};
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;

function testHermite(): string[] {
  const out: string[] = [];
  // 1) 过点：每个关键帧处取值精确等于帧值
  const keys = [
    {t: 0, v: [0, 0]},
    {t: 1, v: [1, 3]},
    {t: 3, v: [2, -1]},
    {t: 5, v: [4, 0]},
  ];
  const f = hermite(keys);
  keys.forEach((k, i) => ok(near(f(k.t)[0], k.v[0]) && near(f(k.t)[1], k.v[1]), `hermite 过点 #${i}`));
  out.push('PASS hermite: 过全部关键帧（值精确）');
  // 2) C1：内点两侧数值导数一致（自动 Catmull-Rom 切线）
  const e = 1e-4;
  const dl = (f(1)[0] - f(1 - e)[0]) / e;
  const dr = (f(1 + e)[0] - f(1)[0]) / e;
  ok(near(dl, dr, 1e-2), `hermite C1 内点导数 left=${dl} right=${dr}`);
  out.push(`PASS hermite: 内点 C1（左导 ${dl.toFixed(4)} ≈ 右导 ${dr.toFixed(4)}）`);
  // 3) 端点零斜率（自动端点 + 'e' 标记）
  const g = hermite1([
    [0, 0],
    [1, 5],
    [2, 5, 'e'],
    [3, 0],
  ]);
  ok(Math.abs((g(e) - g(0)) / e) < 0.02, 'hermite 首端点斜率≈0');
  ok(Math.abs(g(2 + 1e-3) - g(2)) < 1e-4, "hermite 'e' 键零斜率");
  out.push("PASS hermite: 端点与 'e' 键斜率 0");
  // 4) 显式 m 压过自动切线：v0=0,v1=10,m1=10,m0 自动 0 → f(0.5)=3.75（解析值）
  const h = hermite([
    {t: 0, v: [0]},
    {t: 1, v: [10], m: [10]},
  ]);
  ok(near(h(0.5)[0], 3.75, 1e-9), `hermite 显式 m f(0.5)=${h(0.5)[0]}`);
  // 5) 越界钳制
  ok(near(h(-2)[0], 0) && near(h(9)[0], 10), 'hermite 越界取端值');
  out.push('PASS hermite: m= 切线控制 + 越界钳制');
  return out;
}

function testMonotone(): string[] {
  const out: string[] = [];
  // 1) 单调数据 → 曲线单调（200 点采样）
  const f = monotone([0, 1, 2, 3, 4], [0, 0.2, 0.9, 2.5, 4]);
  let prev = -Infinity;
  for (let i = 0; i <= 200; i++) {
    const v = f(i / 50);
    ok(v >= prev - 1e-12, `monotone 单调 @${i / 50}: ${v} < ${prev}`);
    prev = v;
  }
  out.push('PASS monotone: 单调数据全程不过冲');
  // 2) cue 点（差分变号）导数 0：ys [0,1,0] 在 x=1 变号 → 切线 0
  const g = monotone([0, 1, 2], [0, 1, 0]);
  const e = 1e-4;
  const d = (g(1 + e) - g(1 - e)) / (2 * e);
  ok(Math.abs(d) < 1e-3, `monotone cue 导数=${d}`);
  out.push(`PASS monotone: cue 点导数 0（实测 ${d.toExponential(2)}）`);
  // 3) 过点 + 越界钳制（x=0 取首值 ys[0]=0，x=1 取节点值，x=9 越界取末值 ys[2]=0）
  ok(near(g(1), 1) && near(g(0), 0) && near(g(9), 0), 'monotone 过点 + 越界钳制');
  out.push('PASS monotone: 过节点 + 越界取端值');
  return out;
}

function testQuantize(): string[] {
  const out: string[] = [];
  // 1) 离散档位：qT 落 1/30 网格、Q12 落 1/12、Q6 落 1/6（用「到最近整数距离」防浮点 %1 环绕）
  const gridDist = (v: number) => Math.abs(v - Math.round(v));
  for (let i = 1; i < 400; i++) {
    const t = i * 0.0137;
    ok(gridDist(qT(t, 30) * 30) <= 1e-6, `qT 网格 @${t}`);
    ok(gridDist(Q12(t) * 12) <= 1e-6, `Q12 网格 @${t}`);
    ok(gridDist(Q6(t) * 6) <= 1e-6, `Q6 网格 @${t}`);
    ok(Number.isInteger(K(t)), `K 整数 @${t}`);
  }
  out.push('PASS quantize: qT/Q12/Q6 输出离散档位、K 整数');
  // 2) 同一步内恒定：K=14 的两个时刻 Q12/jit 全等
  ok(Q12(1.201) === Q12(1.24), 'Q12 步内恒定');
  const j1 = jit(7, 1.2);
  const j2 = jit(7, 1.24);
  ok(j1[0] === j2[0] && j1[1] === j2[1] && j1[2] === j2[2], 'jit 步内恒定');
  const j3 = jit(7, 1.26);
  ok(j3[0] !== j1[0] || j3[1] !== j1[1] || j3[2] !== j1[2], 'jit 步间跳变');
  out.push('PASS quantize: jit 同步恒定 / 步间跳变');
  // 3) 幅度有界：|dxy|≤amp，|drot|≤0.2·amp·DEG
  for (let id = 0; id < 200; id++) {
    const [dx, dy, dr] = jit(id, 3.37 + id * 0.011);
    ok(Math.abs(dx) <= 2 + 1e-12 && Math.abs(dy) <= 2 + 1e-12, `jit px 有界 id=${id}`);
    ok(Math.abs(dr) <= 0.4 * (Math.PI / 180) + 1e-12, `jit rot 有界 id=${id}`);
    ok(hash2(id, 1) >= 0 && hash2(id, 1) < 1, `hash2 ∈ [0,1) id=${id}`);
  }
  out.push('PASS quantize: jit 幅度有界（±2px / ±0.4°）+ hash2 ∈ [0,1)');
  // 4) ks 整数、命中帧为 0
  ok(ks(2.0, 2.0) === 0 && ks(2.5, 2.0) === 6 && Number.isInteger(ks(3.31, 2.0)), 'ks 整数步数');
  out.push('PASS quantize: ks 整数（k=0 = 命中帧）');
  return out;
}

function testSmear(): string[] {
  const out: string[] = [];
  // 1) 位移过小 → degenerate 圆盘
  const dg = smearCap(0, 0, 1, 0, 5);
  ok(dg.degenerate && near(dg.am, 1) && near(dg.o1, 0), 'smear 退化：L<1.5 画圆盘');
  out.push('PASS smear: 位移过小退化为圆盘（L<1.5 阈值同源码）');
  // 2) 参数合法：T = L+2r、单位轴、am ∈ (0,1]、o1 ∈ (0, 1/2]
  const c = smearCap(100, 200, 352, 164, 18);
  const L = Math.hypot(252, -36);
  ok(!c.degenerate && near(c.L, L, 1e-9), 'smear L=位移长');
  ok(near(c.T, L + 36, 1e-9), `smear T=L+2r (${c.T})`);
  ok(near(c.ux * c.ux + c.uy * c.uy, 1, 1e-12), 'smear 单位轴');
  ok(c.am > 0 && c.am <= 1, `smear am=${c.am} ∈ (0,1]`);
  ok(c.o1 > 0 && c.o1 <= 0.5, `smear o1=${c.o1} ∈ (0,0.5]`);
  ok(near((c.gx1 - c.gx0) * c.ux + (c.gy1 - c.gy0) * c.uy, c.T, 1e-9), 'smear 渐变轴长 = T');
  out.push(`PASS smear: 胶囊几何合法（L=${c.L.toFixed(2)} T=${c.T.toFixed(2)} am=${c.am.toFixed(3)} o1=${c.o1.toFixed(3)}）`);
  // 3) 渐变停点序列：offsets [0, o1, 1-o1, 1]，平台 alpha = am
  const stops = smearStops(c, [230, 80, 60]);
  ok(stops.length === 4, 'smear 停点数 4');
  ok(near(stops[0][0], 0) && near(stops[1][0], c.o1) && near(stops[2][0], 1 - c.o1) && near(stops[3][0], 1), 'smear 停点位置');
  const alphas = stops.map(([, col]) => Number(col.slice(col.lastIndexOf(',') + 1, -1)));
  ok(near(alphas[0], 0) && near(alphas[1], c.am) && near(alphas[2], c.am) && near(alphas[3], 0, 1e-12), 'smear 停点 alpha 序列 0→am→am→0');
  out.push('PASS smear: 渐变停点 [0,o1,1-o1,1] × alpha [0,am,am,0]');
  return out;
}

/** 跑全部断言；任一失败 throw Error('FAIL: …')。返回 PASS 行列表。 */
export function runAllMotionTests(): string[] {
  const lines: string[] = [];
  lines.push(...testHermite());
  lines.push(...testMonotone());
  lines.push(...testQuantize());
  lines.push(...testSmear());
  return lines;
}
