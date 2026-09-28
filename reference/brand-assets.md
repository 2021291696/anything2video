# 品牌资产包协议（public/assets/brand/）

一句话：品牌资产 = **约定目录 + 一个 JSON**。主会话在阶段 0 把解析值写进 `template/src/recipes/promo.ts` 的主色 token 供全片引用（本 skill **不生成** `src/brand.ts`——品牌化 = 替换配方文件的主色 token，见 §3）；缺什么都**整包回退**到内置 promo palette（正本 `template/src/recipes/promo.ts`，对照表见 §4）——不阻塞、不追问、不留半接包状态。

## 1. 目录约定

```
public/assets/brand/
├── logo.png      必需*   位图 logo：透明底，宽 ≥512px（CTA 端板放大用）
├── logo.svg      推荐    矢量版：有 svg 优先用 svg（任意缩放不糊），png 作加载兜底
├── logo-mono.png 可选    单色反白版（深色底/品牌色底上用；没有就按 §5 垫底板）
├── brand.json    必需*   色板与文案（schema 见 §2）
├── qr.png        可选    CTA 端板二维码图（白底/透明底，显示尺寸 ≥120px；未提供则端板留二维码位不放图）
└── fonts/        可选    品牌字体 woff2/ttf（须 OFL 或已获授权；未提供用模板四款 OFL 字体）
```

\* 「必需」指**接入品牌包时**必给；目录整体不存在 = 未接入品牌包，是合法状态，走 §4 回退。文件放错层（如 `public/assets/brand.png`）一律视为未接入。

## 2. brand.json schema

```json
{
  "colors": { "primary": "#6630F8", "accent": "#F05F41", "neutral": "#A0A0A1" },
  "slogan": "让大模型开卷考试",
  "name": "示例科技",
  "cta": "立即免费试用",
  "contact": "example.com · 400-000-0000",
  "qr": "qr.png"
}
```

| 键 | 必需 | 语义 |
|---|---|---|
| `colors.primary` | 是 | 品牌主色：大字、CTA 端板底、品牌帽胶囊底 |
| `colors.accent` | 是 | 强调色：只给单帧焦点（数字 / 按钮 / 对比中的「我方」） |
| `colors.neutral` | 否 | 次级文字 / 未激活色；缺省 `#A0A0A1` |
| `slogan` | 是 | 品牌条文案，≤16 字；超了截到 16 字加省略号 |
| `name` | 否 | 品牌帽 / 端板的品牌名；缺省用 `config.ts` 的 `title.rest` 或 slug |
| `cta` | 否 | CTA 端板动词短语，≤8 字；缺省由文案 agent 按产品写 |
| `contact` | 否 | CTA 端板联系方式文案，≤24 字；缺省端板不放联系方式（确认点①可现收，见 `recipes/promo.md` §8） |
| `qr` | 否 | CTA 端板二维码文件名（`brand/` 目录内，如 `qr.png`）；缺省端板留二维码位不放图 |

**校验规则**：JSON 解析失败 / 缺必需键 / 色值非 `#RRGGBB` → 按「该键缺失」走 §4 回退，并在 BUILD_NOTES 记一行（哪把钥匙、为什么回退），不中断流程。

## 3. 解析与接线（阶段 0 一次做完）

> ⚠️ **名字错位警告**：brand.json 的 **`colors.primary`** 对应代码 token **`accent`**（主色），brand.json 的 **`colors.accent`** 对应代码 token **`secondary`**（强调位）——两套词表同词不同指，接线时以 §4 对照表为准，**勿按英文名对号入座**。

1. 读 `public/assets/brand/brand.json` → **品牌化 = 替换 `template/src/recipes/promo.ts` 的主色 token**：把 `colors.primary` 写进 `accent`，并按该文件头注的 `accentFromBrand` 规则同步换掉随主色推导的一组 token（accentLight/accentTech/accentDeep/accentPale、glowAccent 系与 accentGlowRgb/haloDark/haloLight/techGlow/pillShadow/pillTextOnAccent）；再把 `colors.accent` 写进 `secondary`，同步换掉 `secondaryAlt`（亮变体）与 `glowSecondary`（光效字符串形状不变、只换基色）；`colors.neutral` 写进 `grey`。`slogan`/`name`/`cta`/`contact`/`qr` 由主脚本随分镜/覆盖层参数带入（不新建 `src/brand.ts`）。改完跑 `npx tsc --noEmit`，`ui.tsx`/`fx.tsx` 与镜头代码零改动（`PURPLE`/`ORANGE` 等是经 `getActiveRecipe()` 派生的别名，值自动随 token 变）。
2. 镜头与覆盖层**只 import `src/ui.tsx` / `src/fx.tsx` 的常量**，禁止写彩色字面量——这是 `promo-style-guide.md` §品牌色纪律的执法点（QC 判据 4 会 grep 镜头源码）。
3. 回退态（未接品牌包）= `recipes/promo.ts` 内置值原样不动；品牌帽与 CTA 端板改用**文字标**（品牌名 Noto 900 大字 + primary 硬投影），不找网图、不生成假 logo。

## 4. 缺省回退 = 内置 promo palette（正本 `template/src/recipes/promo.ts`）

| brand.json 键 | → palette token（回退值） | 出处 |
|---|---|---|
| `colors.primary` | `accent`（#21E6C1，电光青） | `template/src/recipes/promo.ts:18` |
| `colors.accent` | `secondary`（#FF7A45，辅助橙） | `template/src/recipes/promo.ts:24` |
| `colors.neutral` | `grey`（#9A9AA6，非激活文字） | `template/src/recipes/promo.ts:32` |
| 背景 / 文字 | `bg` / `white`（#0B0B12 / #FFFFFF） | 同文件行 29 / 36 |
| slogan | `config.ts` 的 `title.tagline` | — |
| name | `config.ts` 的 `title.rest`，为空则 slug | — |

回退是**整包回退**：任一必需文件缺失即按「未接入品牌包」处理，配色与文案全套用 `recipes/promo.ts` 内置值（§4 表）。不提供「用户给了 slogan 但没给 logo」的半接包形态——半品牌观感比纯内置更差，且让 QC 的 ≤3 色判据失去稳定基准。

## 5. logo 使用规则（安全区与最小尺寸）

| 规则 | 数值 |
|---|---|
| 最小显示高度 | 品牌帽 28px；品牌条 22px（`BrandBar.tsx` 缺省 logo 位即 22×22）；CTA 端板 ≥40px；低于最小尺寸宁可不放 logo 只放文字 |
| 净空（安全区） | 四周留白 ≥ logo 显示高度的 25%（如 40px 高的 logo，四周 10px 内不放其他元素） |
| 变形 | 禁止拉伸：始终按原始宽高比缩放（svg 以 viewBox 等比）；只允许整体缩放与等比裁切容器 |
| 背景 | logo 不直接压复杂画面：要么黑/纯色底，要么垫 8px 圆角底板（黑 75% 不透明或品牌 primary） |
| 反白 | 深色底用 `logo-mono.png`；没有 mono 版时垫浅底板，**禁止**用 CSS 滤镜把彩色 logo 调成反白 |
| 出处 | logo 是用户提供资产，写进交付说明「资产来源」一节；不得用网图或生成图替代真 logo |

## 6. 与 B-roll 的关系

品牌资产包只管 `public/assets/brand/`。B-roll 与其他外来素材走 `public/assets/broll/` + `MANIFEST.md`（字段：sha256 / 来源 URL / 许可 / 用途——沿用 `template/src/common/Footage.tsx` 头注约定），使用规则见 `recipes/promo.md` §素材策略。两个目录不混放：brand/ 里的东西永远不进 MANIFEST（它们不是「采集来的素材」）。
