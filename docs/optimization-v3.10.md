# v3.10.0 — 纪律层吸收：状态机 + 交付终检 + 自带配音对齐 + 分段规划

日期：2026-10-07 ｜ 前置：v3.9.0 配方层 ｜ 来源：lanshu 纪律件四项全搬（用户指令"有价值就一起搬"）

## 四件套

### 1. check_state.mjs — 证据驱动状态机（新，scripts/）

- 七态证据阶梯映射 a2v 0-8 工作流：`intake → scripted → voiced → planned → rendered → reviewed → delivered`
- 证据从磁盘**计算**而非声明：文档验存在非空、媒体验 ffprobe 流类型、`planned` 直接复用 check-plan 全门禁、`delivered` 深核交付报告（status=verified 且 loudness_passed=true）
- overclaim 检测：project.json 可选 `state` 字段超前于证据 → 退出 1；`--write` 同步证据态（证据丢失会回拨）；`missing_for_next` 给精确待办
- `status`（draft/production）保持独立语义不受污染；证据达 rendered 而 status=draft 时出 note
- 纯函数 `computeState/syncState` + io 全可注入 → 20/20 runtime 测试覆盖（阶梯顺序/overclaim/落后追平/无效态名/夹具三处 Windows 路径分隔符坑）

### 2. finalize_delivery.mjs — 交付终检与原子发布（新，scripts/）

- 临时目录全建全验：两遍 loudnorm（先测后线性）→ master（CRF16/slow/256k）+ share（CRF24/medium/160k）双编码 bt709+faststart → 两个编码各 `-xerror` 全解码 → **对最终编码重测响度**（|Δ|≤0.5 LU 且 TP≤-1.0 dBTP——mono→stereo 复制会高约 3 LU，必须验交付物）→ blackdetect/freezedetect 事件计数 → 3×3 接触表
- 原子发布：全过才 mv 进 `delivery/`，**报告最后落位当完成标记**；任一失败不发布任何文件；拒绝覆盖已有交付物（有意设计）
- 报告可移植（只写文件名）；check_state 的 delivered 态以它为证据
- 实测（finalize-lab）：正路径 6s 合成片四件产物落位、响度 -15.98 收敛 ±0.5；负路径静音片 exit 1 且零发布；覆盖拒绝 exit 1
- 纯函数 `parseLoudnormReport/loudnessPassed/countEvents` 进单元测试

### 3. align_narration.py — 自带配音自动对齐（新，template/scripts/，后台 worker 交付）

- 消灭 tts_build.py 明文的手工缺口（"让他给成品配音 wav，按逐句/逐块时间轴手填"）
- 能量包络找停顿 + DP 把句对齐到停顿（时长偏差²代价+长停顿奖励），块内线性铺开 chars；产同一套正本/timeline/subs 产物（engine:'external'、timing:'aligned'、±~0.15s 诚实标注）
- 同款保护：正本存在无 --force 拒绝；(验收记录见文末)

### 4. plan_segments.py — 停顿分段规划（移植，scripts/，后台 worker 交付）

- 自 lanshu 移植（MIT），核心算法 diff 逐字节一致：真实停顿切分、`--whole-seconds` 整数只取停顿内、贪心最晚停顿（段最长接缝最少）、`ends_in_pause_s` 接缝遮罩、`total_requested_seconds` 计费报价
- 用途：路线 C 图生视频遇单请求时长上限（Seedance 类）时按锁定配音分段；`--self-test` 内嵌 lanshu 冒烟锁定值（seams [4.0] / requested [4,2]）

## 文档与版本

SKILL.md（§0 续作 check_state、§2 align_narration、§8 finalize_delivery、资产段关键脚本清单、版本 3.10.0）/ hosts ×6 / 本文档。LICENSE-THIRDPARTY 的 lanshu MIT 登记已随 v3.8.0 落位，本轮四件全部在其覆盖下。

## 边界与未做

- check_state 的 reviewed 态只验"存在+结构"，深度验证仍归 check-qc.mjs（两层各司其职，不重复建门）
- finalize 不动 check-qc 证据链：delivery/ 是发布层，qc/ 是验收层；delivery 报告不进 check-qc 的 8 项检查
- 未为 finalize 加 node 单测级集成（ffmpeg 依赖会破坏测试 hermeticity）——纯函数已测，端到端靠上面的手动负路径实测记录
