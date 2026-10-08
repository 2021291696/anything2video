# common/motion —— 共享运动数学层（template 新工程模板通用）

四个纯函数数学件：零依赖（无 React/DOM/随机源）、渲染无关（canvas/SVG/DOM 任一侧组装）、全确定性（禁 Math.random/Date/网络）。这是**新工程模板共享层**，不属于任何单卡；单卡库（如 `styles/paper-collage/paper.tsx`）保持自包含，各自内嵌同族实现。

| 文件 | 一句话用途 | 借鉴登记 |
|---|---|---|
| `hermite.ts` | Catmull-Rom 关键帧轨：过点平滑、段内 C1，`'e'` 零斜率端点 / `m=` 显式切线——相机/光强/多通道编排 | mg-styles-15 `demos/12-aurora-glass/main.js:39-56` + `demos/03-isometric/js/main.js:32-49`（'e' 语义）(MIT, Vincentwei1021), TS 重写 |
| `monotone.ts` | 单调三次样条：数据单调则曲线单调不过冲，差分变号点切线归零（cue 标点休止）——时间重参数化/禁过冲电平轨 | `demos/02-line-art/film.js:37-51` (MIT, Vincentwei1021), TS 重写 |
| `quantize.ts` | 帧中心量化闸门 `qT` + 12/6fps 步进时基（`K/Q12/Q6/ks`）+ hash 手摆抖动 `jit`——定格抽帧观感 / mb 子样本不跨硬切 | `demos/08-morph/index.html:31`、`demos/09-bauhaus/film.js:23`、`demos/06-collage/index.html:45-53` (MIT, Vincentwei1021), TS 重写 |
| `smear.ts` | 解析 smear 胶囊几何：shutter 两端采样 + 平台 alpha + 四停渐变参数——快动作解析运动模糊，不靠渲染器累积 | `demos/08-morph/index.html:604-611` (MIT, Vincentwei1021), TS 重写 |

## 新卡引用方式

```ts
import {hermite, hermite1} from '../common/motion/hermite';   // 相机/光强关键帧轨
import {monotone} from '../common/motion/monotone';           // 节奏重映射、禁过冲
import {qT, K, Q12, Q6, ks, jit} from '../common/motion/quantize'; // 定格抽帧 + 手摆
import {smearCap, smearStops} from '../common/motion/smear';  // 快段解析模糊
```

- **相机/多通道编排**：`hermite([{t, v, e?} | {t, v, m}])` → `f(t): number[]`；标量简写 `hermite1([[t, v], [t, v, 'e']])`。
- **节奏/休止**：`monotone(xs, ys)`——转角/节拍点两侧数据变号时速度自然归零。
- **定格签名**：连续缓动的**输入时间**换 `Q12(t)`（主体）/`Q6(t)`（静置件）；静置件叠 `jit(id, t, 1.1, 6)`、运动件 `jit(id, t, 2, 12)`（注意 `jit` 第三轴为弧度）。
- **硬切安全**：给 blur/子样本管线喂 `qT(t)`，同一 shutter 内所有子样本取同一帧心时刻。
- **快动作模糊**：`smearCap(x0,y0,x1,y1,r)` 取几何，`smearStops(geom, [r,g,b])` 取渐变停点，按 `gx0/gy0→gx1/gy1` 轴组装。

## 断言

`motion.test.ts`（同目录，纯 TS、零依赖）：hermite 过点+C1+端点斜率 / monotone 单调+cue 导数 0 / quantize 离散档位+jit 有界 / smear 参数合法。node 直跑：

```bash
npx esbuild src/common/motion/motion.test.ts --bundle --format=cjs --outfile=.motion-test.cjs
node -e "require('./.motion-test.cjs').runAllMotionTests().forEach(l => console.log(l))"
```
