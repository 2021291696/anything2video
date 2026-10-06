---
name: anything2video-zcode
description: 在 ZCode 中从主题、文章或产品制作原创教学、科普、宣传与品牌视频；普通 CLI 或可用 workflow 编排均可，交付可复现工程和真实质量证据。Use for original video production in ZCode.
metadata:
  version: "3.7.0"
---

构建期宿主身份定义：本文件只承载 frontmatter（发布身份与发现描述）。专属包入口正文 = 本 frontmatter + 共享 `SKILL.md` 正文（构建时拼合，见 `scripts/build-editions.mjs`）；宿主加载方式、执行边界与验证等级见 `docs/adapters.md`。
