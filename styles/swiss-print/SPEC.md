# SPEC：瑞士版式（swiss-print）

**入库日期**：2026-09-29（用户确认）｜**正本源工程**：`style-samples/src/styles-try/swiss-print/`（样片《少即是多》12s，用户确认）｜**图元库**：`swiss.tsx`（无纹理/字体文件依赖）
**风格句**：瑞士国际主义版式——严格 12 列模数网格、超大 grotesk 黑字 900、唯一红色几何强调、大量留白、非对称但精确对齐、硬切精确位移。

## 锁死项
- **色 token**（`SWISS_TOKENS`）：**严格四色** white `#fafafa`｜black `#111111`｜red `#e63329`（唯一强调）｜grey `#9a9a9a`——禁任何其它色。
- **纯平契约**：无发光/无渐变/无阴影；动画纯位移硬切 + easeOut（无回弹）。
- **版式常量**：12 列模数网格（`SWISS_COLS=12`、页边距 80）；`MIN_FONT=22`；随机只用 `swissHash` 种子杂凑（禁 Math.random/Date）。
- **字体**：系统栈 `'Helvetica Neue','Helvetica','Arial',sans-serif`（不随库分发——Helvetica/Arial 就是最正宗的 Grotesk）；字宽用 `swissTextW` 估算表（误差 <2%）。

## 词汇清单
`SwissText`（900 大字 + `fitSwiss` fit 逻辑）｜`SwissGrid`（12 列网格线层，"闪现一瞬"版式自证）｜`RedCircle`（唯一强调几何）｜`Hatch45`（45° 斜线束单次横扫）｜`MarginNote`（22px 边注系统）｜`Rule`（细线精确画出，红下划线用）｜`SwissFrame`（海报收束框）｜缓动 `easeOutCubic/easeInOutCubic`。

## 复用适配点
1. 无任何 staticFile 依赖，直接拷库即用；不同机器无 Arial 时回退其它 sans，`fitSwiss` 保证不溢出（下划线对齐可能轻偏）。
2. 红圆的几何角色变奏（正圆→裁半圆→缩落交点）是样片的构图记忆点，新片应有自己的变奏（台账维度）。

## QC 豁免档
- 网格参考线"闪现"是有意的版式自证（白名单申报时计入）；静止挂底>45 帧在瑞士风格下仍算缺陷（留白≠静止）。

## 样张
`sample.jpg` = 样片 11.6s 处（海报构图：LESS IS MORE + 红圆 + 图框 + 边注），回归三查对照基准。
