# 语料源注册表（corpus-sources）

> 2026-10-09《命》首战验证后设立（用户拍板：题材路由+源注册表，两阶段取用，全面调研一次到位）。
> 作用：文化/历史/文学/科普等选题在**方向候选前**先摸语料（候选基于真材料），**选定后**再做全文提取与逐条核对。
> 软件教程/产品宣传等现代题材不触发本表，走常规 WebSearch/官方站（见 §降级路线）。

## 两阶段取用（判例：《命》2026-10-09）

1. **轻摸底（喂方向候选，分钟级）**：只 grep 文件清单/目录结构（如 daizhige `all_files.txt`），确认「有什么可引」，不提内容。候选的方向与引文范围据此设计。
2. **重核对（喂定稿，选定方向后）**：按候选需要提取全文，**引文逐条 grep 原文核对**；版本异文按所用库本引用并在事实表登记（判例：《命》「寿十八」按库本、通行本或作「寿四八」；「我命在我不在于天」库本多「于」字）；每条引文进 `storyboard.json` claims 带溯源路径。

## 通用取用 SOP

- **大仓取文件**（殆知阁级，GB 级仓）：`git -c http.proxy=127.0.0.1:7890 clone --filter=blob:none --no-checkout` → `git -c core.quotepath=false ls-tree -r HEAD` 存清单 → 按 blob SHA `cat-file blob <sha>` 逐部提取（sparse-checkout 走代理会崩，勿用）。
- **单文件**：raw.githubusercontent.com 直取（中文路径 URL 编码）。
- **引文纪律**：LLM 凭记忆写引文必翻车——《命》实抓两处异文；一切引文以库内原文为准，库外典籍（如《说文解字》）单独标注「库外公共典籍」。
- **许可登记**：每源记许可状态；无明确 License 的库（殆知阁）片内署名来源、发布说明如实标注。

## 注册表

状态标注：✅ 已验证（真片跑过）｜🟡 结构性验证（仓库/规模/许可已核，未跑片）｜⬜ 候选（仅搜索发现）

## ⭐ star 快照（2026-10-09，gh api 实查）

HowToCook 102,563｜chinese-poetry 53,601｜daizhigev20（garychowcmu 原主仓）3,475｜shiji-kb 3,411｜scripta-sinica 374｜cbeta-org/xml-p5 78｜gujilab 15｜daozang 8｜idiom-dict 4｜Chinese-Myth 2。另：daizhige-org 组织镜像 617（引文取材两仓内容一致，原主仓星更多）。star=社区热度参考，取材前仍按验证状态纪律走。

### 1. 古籍 / 玄学 / 术数

> ⭐ 收录规则（2026-10-09 用户拍板）：**star>50 的源全收录，对应题材查这些资料**；star 快照见上节。

| 源 | ⭐ | 规模 | 许可 | 取用 | 状态 |
|---|---|---|---|---|---|
| [daizhigev20](https://github.com/daizhige-org/daizhigev20)（殆知阁）·[原主仓 garychowcmu](https://github.com/garychowcmu/daizhigev20) ⭐3475 | 617/3475 | 13 亿字级，31491 文件，四部分类 md | 无明确 License（署名来源） | 本地已有 blob:none 克隆（`tmp/daizhige/repo`，含 all_files.txt 清单与提取件 extracts/） | ✅《命》 |
| [scripta-sinica](https://github.com/mahavivo/scripta-sinica) ⭐374 | 374 | 同殆知阁源再打包（README 自述原始文本下载自殆知阁），转格式+众包校对 | 继承殆知阁 | 与殆知阁二选一即可，**非独立源** | 🟡 同源包 |
| [gujilab/chinese-classical-corpus](https://github.com/zi6me/chinese-classical-corpus) | 15 | 1724 万字清洗精选，统一 JSON | **CC0**（许可最干净） | HuggingFace `datasets.load_dataset()` 直取 | 🟡 |
| [ctext.org](https://ctext.org) 中国哲学书电子化计划 | — | 在线全库 | 不开放批量下载 | 单句外部佐证（网页引用） | 🟡 |

### 2. 诗词
| 源 | ⭐ | 规模 | 许可 | 取用 | 状态 |
|---|---|---|---|---|---|
| [chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) | 53601 | 5.5 万唐诗+26 万宋诗+2.1 万宋词，结构化 JSON | MIT | clone 直用 | 🟡 |

### 3. 佛经 / 宗教典籍
| 源 | ⭐ | 规模 | 许可 | 取用 | 状态 |
|---|---|---|---|---|---|
| [CBETA](https://cbeta.org) 汉文佛典（[XML](https://github.com/cbeta-org/xml-p5) ⭐78） | 78 | 大正藏/卍续藏/嘉兴藏 | 佛典电子化开放许可 | XML 全文 + [Web API](http://cbdata.dila.edu.tw/stable) | 🟡 |
| [daozang](https://github.com/yeyangchen2009/daozang) 道藏 | 8 | 正统道藏+续藏文本 | 待核 | clone | ⬜（<50 星，备选） |

### 4. 历史人物 / 事件
| 源 | ⭐ | 规模 | 许可 | 取用 | 状态 |
|---|---|---|---|---|---|
| [shiji-kb](https://github.com/baojie/shiji-kb) 史记知识图谱 | 3411 | 《史记》57 万字图谱化，可跳转/搜索/推理 | 待核 | clone | 🟡 |
| [CBDB](https://projects.iq.harvard.edu/cbdb) 历代人物传记资料库 | — | 哈佛维护，权威人物结构化库 | 开放学术使用 | 官方下载/API | ⬜ |
| Wikidata SPARQL | — | 全域结构化事实（多语标签） | CC0 | [SPARQL endpoint](https://query.wikidata.org) | 🟡 |

### 5. 成语 / 典故 / 字词
| 源 | 规模 | 许可 | 取用 | 状态 |
|---|---|---|---|---|
| [idiom-dict](https://github.com/smeteor/idiom-dict) 中华成语大词典 JSON | 典故释义全 | 待核 | clone | 🟡 |
| [Chinese-fixed-phrases-idioms](https://github.com/jaaack-wang/Chinese-fixed-phrases-idioms) | 30310 条语例 JSON | 待核 | clone | ⬜ |

### 6. 神话 / 志怪
| 源 | 规模 | 许可 | 取用 | 状态 |
|---|---|---|---|---|
| [Chinese-Myth](https://github.com/laffycat/Chinese-Myth) 神源·神话人物关系 | 人物关系可视化数据 | 待核 | clone | ⬜ |
| daizhigev20 内《山海经校注》等 | 见 §1 | 同殆知阁 | 同 §1 | ✅ 同源 |

### 7. 科学 / 科普事实
| 源 | 规模 | 许可 | 取用 | 状态 |
|---|---|---|---|---|
| Wikidata SPARQL + Wikipedia | 全域 | CC0/CC-BY-SA | SPARQL/API | 🟡 |

### 8. 美食
| 源 | ⭐ | 规模 | 许可 | 取用 | 状态 |
|---|---|---|---|---|---|
| [HowToCook](https://github.com/Anduin2017/HowToCook) 程序员做饭指南 | 102563 | 精选菜谱 markdown，格式规范 | 待核（仓库广泛使用） | clone | 🟡 |
| [XiaChuFang Recipe Corpus](https://opendatalab.com/OpenDataLab/XiaChuFang_Recipe_Corpus) | — | 152 万食谱 | 待核（OpenDataLab 下载） | 数据集 | ⬜ |

### 9. 地理 / 旅行
| 源 | 规模 | 许可 | 取用 | 状态 |
|---|---|---|---|---|
| OpenStreetMap 中国区（[Geofabrik](https://download.geofabrik.de/asia/china.html)） | 全域 POI/路网 | ODbL | PBF/Shapefile 下载 | 🟡 |

### 10. 心理 / 健康
| 源 | 规模 | 许可 | 取用 | 状态 |
|---|---|---|---|---|
| [PsyQA](https://github.com/thu-coai/PsyQA) 中文心理健康问答 | 22 万问答 | 待核 | clone | ⬜ |

### 11. 西方经典 / 神话
| 源 | 规模 | 许可 | 取用 | 状态 |
|---|---|---|---|---|
| [Project Gutenberg](https://www.gutenberg.org) | 7.5 万+公版书（含神话/KJV） | 公有领域 | 直下 | 🟡 |
| [Perseus Digital Library](https://www.perseus.tufts.edu) | 希腊拉丁原典+学术注释 | 学术使用 | 在线 | ⬜ |

### 降级路线（现代题材：产品/教程/时事/生活方式）

无权威开源集合的题材，调研走 WebSearch + agent-reach + 官方站/官方文档；事实照样进事实表带 URL 与访问日期，只是没有「库」可 grep——引文纪律不变：转述要可溯源，数字要双源。

## 扩展索引（高星索引型仓库，找新源先翻这里）

| 索引 | ⭐ | 用途 |
|---|---|---|
| [funNLP](https://github.com/fighting41love/funNLP) | 83760 | 中英文 NLP 资源大汇总（语料/词典/知识图谱索引）——找新语料源的第一入口 |
| [ECDICT](https://github.com/skywind3000/ECDICT) | 8394 | 英汉词典数据库（西方题材转译参考） |
| [kanripo](https://github.com/kanripo) 系列 | — | 古籍文本+版本对照（涵芬楼/四部丛刊/正统道藏），按 KR 编号分仓 |

## 短板登记

- gujilab CC0 源未跑片验证（1724 万字是否覆盖术数冷门书存疑）——首片验证后转正。
- 道藏/神话/成语/美食/心理各源均为 🟡⬜，按「下一个做该题材的片时先验证再入库」纪律推进。
