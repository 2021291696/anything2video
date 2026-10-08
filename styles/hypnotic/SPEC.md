# SPEC：hypnotic（迷幻催眠视幻觉）

**正本源工程**：`D:\MyAIWorkspace\科普视频\samples-v4\hypnotic`（2026-10-08 验证交付，战役 4 批次⑤）
**图元库**：`src/style/`——kit.tsx（token/数学/辉光滤镜）/ eye.tsx（眼与同心环）/ tunnel.tsx / kaleido.tsx / moire.tsx / scene.tsx（合成+后期+字幕+片名）
**风格句**：虚空暗底 + 高饱和互补色对辉光 + 强对称中心构图（眼/隧道/万花筒/曼陀罗）+ 恒速收缩与线性呼吸的视幻觉沉浸——反信息、纯感知，一切发光服务于视错觉。

**手法来源**：prompt-motion monokern「PHOSPHENE」看片裁决（RECON-pm-watch §2.7，P2）——手法参考、重写实现、零素材搬运（ATTRIBUTION 框架）。

## 锁死项
- **色 token**：void `#07030d`｜void2 `#12081f`｜magenta `#FF3E9D`｜cyan `#2EE6FF`｜amber `#FFB347`｜blue `#4D7CFF`｜violet `#9D5CFF`｜core `#ffffff`。互补对分工：品红↔青（主）、琥珀↔蓝（辅）。
- **主呼吸周期**：`BREATH_P=120f`（4.0s = 0.25Hz）全片恒定，相位连续可 seek；「越来越慢」由运动幅度/吞环间隔表达，**不改呼吸周期**（确定性 > 拟态）。
- **运动纪律**：`tri()` 三角波 = 唯一往复原语（线性恒速）；**禁 easeInOut 弹跳**——催眠运动忌加速度戏法，可预测性即风格。
- **辉光三层**（styles/neon 辉光纪律，机制重写）：`#hyp-glow` = feGaussianBlur 9（α0.38）+ blur 3（α0.6）+ SourceGraphic；`#hyp-soft` 给填充面。
- **签名六件**：①同心环恒速收缩（全局呼吸 ±0.055 + 逐环 10f 相位行波 ±0.04；S02 全帧吞环 r470→34 线性、出生间隔 30+3i 逐圈变慢）②隧道 14 层八边形环（z=frac(i/14+t·0.392) 线性、透视投影 r=6+z^2.35×1500、扭 24°/z、i%4 四色）③万花筒 D8 二面体（8 旋转×奇偶镜像，楔内花瓣/弧/点 seeded 分层铺满 45° 楔；展开 0→430 线性 33f，收拢 250）④摩尔纹双环族（gap 24 vs 25.2px、1.5px 描边、反向漂移 3px@480f 周期）⑤互补色对+暗底辉光（幕底径向 void2→void→#04020a）⑥呼吸循环节奏（辉光/半径/展开全走 breathDir）。
- **版式**：字幕 SANS 300 22px 字距 6 底部 y40；片名 SERIF 600 36px 字距 14 + EN 副行 11px 字距 7，底部 scrim 渐变保对比；字体 Noto Sans SC / Noto Serif SC（OFL，public/fonts 副本）。

## 闪烁合规（本卡安全纪律 = 伦理也是风格）
- **红线**：大面积亮度翻转 <3Hz（光敏性癫痫防护惯例阈值，样片自检口径非医疗建议）。
- **实现纪律**：不设任何快闪件（neon 的 4 帧 flick / VhsMode OSD 闪在本卡**禁止**；flick 机制仅作纪律研究对象，实现以 `tri()/breathDir()` 亚 0.3Hz 确定性调制替代）；一切运动恒速可预测。
- **实测**：376 帧 YAVG FFT 主峰 0.32Hz，≥3Hz 残余=主峰 8.9%（隧道环局部结构）；方法与数据见 qc/self-check.json `flickerCompliance`。

## 差异边界
- **vs neon（装饰性霓虹灯牌）**：neon 的发光服务城市符号（招牌/图标/雨夜），本卡发光服务视错觉与沉浸（收缩环/隧道/摩尔纹），无符号语义、无文字灯牌；neon 有 flick 灯管闪烁，本卡明令快闪。
- **vs target-lock（信息可读 HUD）**：target-lock 一切元素承载读数（方位/进度/坐标），本卡反信息——无读数、无面板、无 scramble 数据流，观者唯一任务是盯着中心。
- **vs dot-infinity（平面波点）**：dot-infinity 是平面点阵呼吸，本卡是同心几何的透视纵深（隧道/嵌套）+ 镜像对称（万花筒），且强中心注视构图。
- **vs morph（形变）**：本卡形体不变形状语义，只做半径/相位/深度的循环运动；万花筒楔内容全片恒定（seeded 排布），靠对称复制而非插值。

## 复用适配点
- `kit.tsx` 的 `tri/breathDir/hash/octPath` + `#hyp-glow/#hyp-soft` 滤镜组可直接拷库复用；`moire.tsx` 参数（GAP_A/GAP_B/DRIFT_P）为防闪屏锁死值，改小 gap 前必须重跑闪烁 FFT 自检。
- 主题换片：改 `eye.tsx` RING_BASE/RING_COL 与 `kaleido.tsx` 楔内容 seed 即可换母题（眼→花→星轨），签名几何不变。

## 借鉴登记
- 技法借鉴 anything2video styles/neon SPEC（辉光三层纪律、确定性调制原语思路），Remotion/TSX 机制重写。
- 手法参考 prompt-motion monokern「PHOSPHENE」（RECON-pm-watch §2.7）——手法研究、重写实现、零素材搬运。
- 确定性 hash 机制与 campaign 内 target-lock/line-art 同源（FNV-1a 族），独立重写实现。

## QC 豁免档
- 摩尔纹双细环族（1.5px×2 层）压缩后可能被帧差探针读作高频碎屑——风格本体不修（漂移 <0.5px/帧，人工判读连续干涉纹）。
- 结尾定帧段 f338-376 为纪律内定帧收束（1.13s 微动效，liveness 0 静止对通过）——登记备查。
- 瞳孔/洞底辉光呼吸 0.25Hz 为亚阈值周期调制——设计声明非豁免。

## 样张
`skill-intake/sample.jpg` = 正片 f265 实测截图（HERO：万花筒展开中 + 隧道 + 残眼 + 摩尔纹同帧），回归对照基准。
