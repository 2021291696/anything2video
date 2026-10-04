#!/usr/bin/env python3
"""
gen_world_frames.py —— epic 配方 AI 材质世界底：提示词规格 / 通道生成 / MANIFEST 登记

用法（--project 缺省 = 当前目录）:
  python scripts/gen_world_frames.py --list-materials
  python scripts/gen_world_frames.py --generate-prompts            # timeline.json 章表 -> script/world_prompts.json
  python scripts/gen_world_frames.py --generate [--only 0,3,5] [--take t1]
                                                                   # 有图像通道时直出 PNG 并自动登记 MANIFEST
  python scripts/gen_world_frames.py --register <file...> --chapter 0 --source "AI 生成 · model=xxx"
                                                                   # 手工生成的产物补登记 MANIFEST

图像通道环境变量:
  A2V_IMAGE_PROVIDER    openai（缺省，OpenAI 兼容 /images/generations）| minimax（原生 /image_generation + image_urls）
  A2V_IMAGE_API_BASE   如 https://api.minimaxi.com/v1（必填才走 --generate）
  A2V_IMAGE_API_KEY    密钥（必填）
  A2V_IMAGE_MODEL      模型名（必填，如 gpt-image-2 / image-01）
  A2V_IMAGE_SIZE       openai 尺寸，缺省 1920x1080；A2V_IMAGE_ASPECT minimax 画幅，缺省 16:9
  A2V_IMAGE_ENDPOINT   缺省按 provider（/images/generations 或 /image_generation）

纪律（对齐 reference/ai-frame-sop.md）:
  - AI 只出世界底；信息层一律代码绘制；负向禁字句逐条保留。
  - 无通道时 --generate 拒跑并明说（诚实降级），产出停留在 world_prompts.json 提示词规格。
  - 每个生成文件自动写 MANIFEST.md 行（sha256/来源/许可/用途 + model/prompt/seed/take/qc）；
    qc 登记为 pending，伪影三查（SOP §4）仍须人工过。
"""

import argparse
import base64
import hashlib
import ipaddress
import json
import os
import socket
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# 15 大材质世界注册表（与 reference/materials.md 矩阵逐条对齐；M 编号一致）
MATERIAL_REGISTRY = {
    "cave_stone": {
        "id": "M01", "name": "旧石器洞穴岩石与赭石矿物手印",
        "prompt": "Paleolithic cave painting style, close-up textured limestone wall with ancient ochre and charcoal hand stencils, subtle earthy deer silhouette, soft flickering warm torchlight from bottom-left, deep shadows, rich ancient stone crevices, 16:9, cinematic still, hyper-tactile mineral pigments.",
        "negative": "text, letters, words, modern, digital, watermark, neon, typography.",
        "lum": 78, "rb": 38, "vignette": "deep", "grade": "dark",
    },
    "underwater_shipwreck": {
        "id": "M02", "name": "爱琴海古沉船与深海青铜",
        "prompt": "Underwater archaeological documentary photography, ancient shipwreck on sandy Aegean seabed, heavily encrusted ancient bronze gears and celestial mechanism partially buried in sand, god rays filtering through deep turquoise water, floating sea particles, atmospheric cinematic lighting, 16:9.",
        "negative": "text, inscriptions, modern diver, trash, cartoon, text watermark.",
        "lum": 62, "rb": -18, "vignette": "deep", "grade": "dark",
    },
    "bronze_astrolabe": {
        "id": "M03", "name": "青铜星盘与天文机械",
        "prompt": "Ancient Greek Antikythera mechanism macro photography, corroded bronze astronomical gear wheels with triangular teeth and embedded celestial dial fragments, dark museum backdrop with subtle cosmic nebula glow behind, dramatic single warm spotlight from upper left, rich verdigris patina and hand-cut metal texture, 16:9, cinematic still.",
        "negative": "text, greek letters, readable engravings, modern, plastic, cartoon.",
        "lum": 95, "rb": 28, "vignette": "cinematic", "grade": "dark",
    },
    "persian_miniature": {
        "id": "M04", "name": "巴格达智慧宫细密画",
        "prompt": "Authentic 14th century Persian illuminated manuscript miniature painting, House of Wisdom astronomical study, intricate Islamic golden geometric arabesque tile patterns, lapis lazuli and vermilion gouache on antique parchment, soft ambient daylight, 16:9, museum quality.",
        "negative": "arabic text, calligraphy, modern, 3d, realistic human face.",
        "lum": 132, "rb": 24, "vignette": "paper", "grade": "none",
    },
    "ink_wash_bagua": {
        "id": "M05", "name": "宋代水墨宣纸与阴阳意象",
        "prompt": "Minimalist traditional Song Dynasty ink wash painting, high-texture handmade Xuan paper with subtle fibrous pulp, flowing dark sumi ink wash gradients, delicate misty negative space, soft ambient natural daylight, 16:9, timeless Zen aesthetics.",
        "negative": "calligraphy, characters, stamps, red seals, modern, glossy.",
        "lum": 172, "rb": 2, "vignette": "paper", "grade": "none",
    },
    "jacquard_loom": {
        "id": "M06", "name": "雅卡尔提花机与穿孔卡带",
        "prompt": "Victorian Industrial Revolution Jacquard loom close-up, complex dark walnut wooden frames and polished brass mechanical components, punch cards with hole grids suspended in depth, soft diagonal natural factory window lighting, tactile machinery, 16:9.",
        "negative": "text, modern, computer, digital, person, face.",
        "lum": 105, "rb": 22, "vignette": "cinematic", "grade": "dark",
    },
    "steel_engraving": {
        "id": "M07", "name": "十九世纪铜版雕刻分析机",
        "prompt": "19th century copperplate engraving style print, intricate analytical difference engine with thousands of fine hatched gears and stacked register columns, aged warm ivory paper with foxing spots and faint fold marks, fine crosshatch linework, soft even daylight, 16:9, museum archival quality.",
        "negative": "readable text, numbers, signatures, modern, color photograph, 3d.",
        "lum": 140, "rb": 18, "vignette": "paper", "grade": "none",
    },
    "bauhaus_infographic": {
        "id": "M08", "name": "五十年代包豪斯信息图印刷",
        "prompt": "1950s Bauhaus flat graphic print style, mid-century modernist poster composition with abstract geometric signal motifs, circles grids and waveform curves in muted vermilion ochre and ink black on warm aged paper, subtle letterpress texture and slight misregistration, soft studio light, 16:9.",
        "negative": "text, letters, numbers, typography, labeled diagrams, glossy gradient, 3d.",
        "lum": 150, "rb": 14, "vignette": "paper", "grade": "none",
    },
    "typewriter_paper": {
        "id": "M09", "name": "图灵时代打字机与重磅纸",
        "prompt": "Macro photography of blank heavy cotton typewriter paper sheet held in a vintage 1950 typewriter platen, crisp embossed empty paper texture with subtle mechanical roller feed marks, warm ivory tones, soft directional window light from left, shallow depth of field, 16:9, meditative still life.",
        "negative": "typed text, letters, characters, keys with letters, hands, modern.",
        "lum": 160, "rb": 8, "vignette": "paper", "grade": "none",
    },
    "ukiyo_e_snow": {
        "id": "M10", "name": "江户浮世绘冬夜与暖灯",
        "prompt": "Authentic Edo period Japanese ukiyo-e woodblock print style, snowy winter twilight over traditional dark timber house, delicate falling snowflakes, deep indigo blue night sky, warm glowing paper shoji screen lantern emitting soft golden amber light, subtle woodcut relief grain, 16:9.",
        "negative": "kanji, modern text, photo-realism, 3d render, glossy.",
        "lum": 72, "rb": -12, "vignette": "deep", "grade": "dark",
    },
    "go_board_tactile": {
        "id": "M11", "name": "榧木围棋盘与云石对弈",
        "prompt": "Top-down macro photography of traditional ancient Japanese kaya wood Go board, fine black slate and natural white clam shell stones arrayed in intricate pattern, tactile wood grain rings, dramatic angled side lighting, rich organic shadows, 16:9, meditative still life.",
        "negative": "text, letters, hands, human face, modern, artificial.",
        "lum": 98, "rb": 26, "vignette": "cinematic", "grade": "none",
    },
    "dusk_murmuration": {
        "id": "M12", "name": "暮光天际与椋鸟群",
        "prompt": "Cinematic dusk skyscape, vast murmuration of starlings forming fluid organic shapes against deep indigo and violet twilight gradient, distant flat horizon silhouette, last warm amber glow low on the horizon, atmospheric haze, 16:9, painterly nature documentary still.",
        "negative": "text, close-up birds with readable features, daytime, harsh light.",
        "lum": 82, "rb": 6, "vignette": "cinematic", "grade": "none",
    },
    "genealogy_xuan_scroll": {
        "id": "M13", "name": "古典宣纸长卷底",
        "prompt": "Top-down macro shot of antique blank Chinese mulberry paper scroll, textured aged deckle edges, subtle golden flecks embedded in warm ivory parchment, clean minimalist background with ample breathing room, soft warm studio rim light, 16:9.",
        "negative": "text, writing, drawings, ink marks, dirty, noisy.",
        "lum": 178, "rb": 16, "vignette": "paper", "grade": "none",
    },
    "nocturne_rain_screen": {
        "id": "M14", "name": "现代雨夜毛玻璃与微光屏幕",
        "prompt": "Cinematic night view through condensation-covered rain-streaked window glass, soft diffuse warm city bokeh outside, cool glowing phosphor screen reflection in foreground, meditative melancholic nocturne atmosphere, 16:9, artistic depth of field.",
        "negative": "readable text, bright logos, cartoon, daytime, sharp UI.",
        "lum": 48, "rb": -15, "vignette": "deep", "grade": "dark",
    },
    "final_cave_ember": {
        "id": "M15", "name": "终篇岩壁与余烬（首尾同景闭环）",
        "prompt": "Weathered paleolithic limestone cave wall extreme close-up, faint residual ochre smudges and a single warm ember glow at center, deep encircling shadows, torchlight from below casting dancing warm highlights, ancient mineral pigment texture, 16:9, cinematic still.",
        "negative": "text, letters, readable hand prints, modern, digital.",
        "lum": 78, "rb": 38, "vignette": "deep", "grade": "dark",
    },
}

MANIFEST_HEADER = "# MANIFEST · 外部素材登记\n\n| 文件 | sha256（前 32 位） | 来源 URL | 许可 | 用途 |\n|---|---|---|---|---|\n"

# Windows Python 3.14（OpenSSL 3.5+）默认 TLS1.3 ClientHello 携带 ML-KEM 后量子密钥交换，
# 会被部分链路中间盒直接重置（SSL UNEXPECTED_EOF；curl 走 schannel 不受影响）。
# 封顶 TLS 1.2 规避——2026-10-04 api.minimaxi.com 实测。
_TLS_CTX = ssl.create_default_context()
_TLS_CTX.maximum_version = ssl.TLSVersion.TLSv1_2


def sha32(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:32]


def norm(p: Path) -> str:
    return p.as_posix()


def assert_safe_url(url: str) -> str:
    """通道地址边界校验：仅 http(s)、拒私网/环回/链路本地/保留地址（防 SSRF）。"""
    p = urllib.parse.urlparse(url)
    if p.scheme not in ("http", "https"):
        sys.exit(f"拒绝非 http(s) 通道地址: {url}")
    host = p.hostname or ""
    try:
        infos = socket.getaddrinfo(host, p.port or (443 if p.scheme == "https" else 80),
                                   proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        sys.exit(f"通道域名解析失败: {host} ({e})")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            sys.exit(f"拒绝内网/环回/保留通道地址: {host} -> {ip}")
    return url


def fetch_bytes(url: str, timeout: int = 180) -> bytes:
    safe = assert_safe_url(url)
    with urllib.request.urlopen(safe, timeout=timeout, context=_TLS_CTX) as r:
        return r.read()


def post_json(url: str, payload: dict, key: str, timeout: int = 180) -> dict:
    safe = assert_safe_url(url)
    req = urllib.request.Request(
        safe,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout, context=_TLS_CTX) as resp:
        return json.loads(resp.read().decode("utf-8"))


def manifest_append(project_root: Path, row: str) -> None:
    mf = project_root / "MANIFEST.md"
    if not mf.exists():
        mf.write_text(MANIFEST_HEADER, encoding="utf-8")
    with mf.open("a", encoding="utf-8") as f:
        f.write(row.rstrip("\n") + "\n")


def ai_manifest_row(relpath: str, digest: str, model: str, chapter: dict, mat: dict,
                    take: str, seed: str) -> str:
    usage = (f"epic 世界底 · ch{chapter.get('n', '?')} {chapter.get('title', '')} · take {take} · "
             f"seed {seed} · prompt：\"{mat['prompt']}\" · negative：\"{mat['negative']}\" · "
             f"qc：pending（伪影三查待人工，SOP §4）")
    return (f"| {relpath} | {digest} | AI 生成 · model={model} | "
            f"生成式素材（AI 世界帧例外③，交付说明须披露） | {usage} |")


def list_materials() -> None:
    print("=" * 80)
    print("anything2video —— 15 大工艺材质世界注册表（对齐 reference/materials.md）")
    print("=" * 80)
    for k, v in MATERIAL_REGISTRY.items():
        print(f"[{v['id']}] {k:24} -> {v['name']}")
        print(f"     Lum={v['lum']}  R-B={v['rb']}  Vignette={v['vignette']}  Grade={v['grade']}")
    print("\n章表（timeline.json chapters[]）可用 material 键逐章指定；未指定的章回退 cave_stone 并告警。")


def load_chapters(project_root: Path) -> list:
    timeline = project_root / "script" / "timeline.json"
    if not timeline.exists():
        sys.exit(f"Error: {timeline} 不存在。先跑 chapter_timeline.py 产出 timeline.json。")
    with timeline.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("chapters", [])


def resolve_material(ch: dict, idx: int) -> tuple:
    key = ch.get("material")
    if key and key in MATERIAL_REGISTRY:
        return key, MATERIAL_REGISTRY[key]
    if key:
        print(f"  ⚠ ch{idx}: material=\"{key}\" 不在注册表，回退 cave_stone（可用键见 --list-materials）")
    else:
        print(f"  ⚠ ch{idx}: 章表未指定 material，回退 cave_stone（建议在 chapters.json 逐章写 material 键）")
    return "cave_stone", MATERIAL_REGISTRY["cave_stone"]


def generate_prompts(project_root: Path) -> None:
    chapters = load_chapters(project_root)
    slug = project_root.name
    out_file = project_root / "script" / "world_prompts.json"
    output = []
    for idx, ch in enumerate(chapters):
        key, mat = resolve_material(ch, idx)
        output.append({
            "chapterIndex": idx,
            "chapterId": ch.get("id", f"ch_{idx}"),
            "title": ch.get("title", f"Chapter {idx}"),
            "era": ch.get("era", ""),
            "place": ch.get("place", ""),
            "material": key,
            "materialId": mat["id"],
            "prompt": mat["prompt"],
            "negativePrompt": mat["negative"],
            "targetFile": f"assets/{slug}/footage/ch{idx:02d}_{key}.png",
            "recommendedLum": mat["lum"],
            "recommendedRb": mat["rb"],
            "recommendedVignette": mat["vignette"],
            "recommendedGrade": mat["grade"],
        })
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with out_file.open("w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"提示词规格已产出: {norm(out_file)}（{len(output)} 章）")
    print("下一步：有图像通道跑 --generate；无通道按 reference/ai-frame-sop.md 手工生成后 --register 登记。")


def generate_images(project_root: Path, only: list, take: str) -> None:
    base = os.environ.get("A2V_IMAGE_API_BASE", "").rstrip("/")
    key = os.environ.get("A2V_IMAGE_API_KEY", "")
    model = os.environ.get("A2V_IMAGE_MODEL", "")
    if not (base and key and model):
        sys.exit(
            "无图像生成通道（A2V_IMAGE_API_BASE / A2V_IMAGE_API_KEY / A2V_IMAGE_MODEL 未配齐）。\n"
            "诚实降级：本命令不跑。当前产物停留在 world_prompts.json 提示词规格；\n"
            "手工生成后用 --register 登记 MANIFEST，或配好通道再来。通道纪律见 reference/ai-frame-sop.md。"
        )
    provider = os.environ.get("A2V_IMAGE_PROVIDER", "openai").lower()
    if provider == "minimax":
        endpoint = os.environ.get("A2V_IMAGE_ENDPOINT", "/image_generation")
        size = os.environ.get("A2V_IMAGE_ASPECT", "16:9")
    else:
        endpoint = os.environ.get("A2V_IMAGE_ENDPOINT", "/images/generations")
        size = os.environ.get("A2V_IMAGE_SIZE", "1920x1080")
    url = base + endpoint

    specs_file = project_root / "script" / "world_prompts.json"
    if not specs_file.exists():
        generate_prompts(project_root)
    with specs_file.open("r", encoding="utf-8") as f:
        specs = json.load(f)

    chosen = [s for s in specs if not only or s["chapterIndex"] in only]
    print(f"通道: {provider}:{model} @ {url} | 待生成 {len(chosen)}/{len(specs)} 章")
    ok = 0
    RETRIES = 3
    for s in chosen:
        target = project_root / "public" / s["targetFile"]
        target.parent.mkdir(parents=True, exist_ok=True)
        if provider == "minimax":
            # MiniMax 原生形态：/v1/image_generation + data.image_urls（临时 OSS 链接，需即时下载）
            full_prompt = f"{s['prompt']}\n\nStrictly avoid in the image: {s['negativePrompt']}"
            payload = {"model": model, "prompt": full_prompt, "aspect_ratio": size,
                       "response_format": "url", "watermark": False}
        else:
            full_prompt = f"{s['prompt']} Negative prompt: {s['negativePrompt']}"
            payload = {"model": model, "prompt": full_prompt, "n": 1, "size": size,
                       "response_format": "b64_json"}

        blob = None
        item = None
        last_err = ""
        for attempt in range(1, RETRIES + 1):
            try:
                try:
                    data = post_json(url, payload, key)
                except urllib.error.HTTPError as e:
                    body = e.read().decode("utf-8", "replace")[:300]
                    if e.code == 400 and "response_format" in body:
                        payload.pop("response_format", None)
                        data = post_json(url, payload, key)
                    else:
                        last_err = f"HTTP {e.code} {body}"
                        continue
                item = data.get("data")
                if provider == "minimax":
                    status = (data.get("base_resp") or {}).get("status_code", 0)
                    if status != 0:
                        last_err = f"base_resp {status} {str(data)[:200]}"
                        continue
                    urls = (item or {}).get("image_urls") or []
                    if not urls:
                        last_err = f"无 image_urls：{str(data)[:200]}"
                        continue
                    blob = fetch_bytes(urls[0])
                else:
                    entry = (item or [{}])[0] if isinstance(item, list) else {}
                    if entry.get("b64_json"):
                        blob = base64.b64decode(entry["b64_json"])
                    elif entry.get("url"):
                        blob = fetch_bytes(entry["url"])
                    else:
                        last_err = f"响应无 b64_json/url 字段：{str(data)[:200]}"
                        continue
                break  # 本章成功
            except Exception as e:  # 网络抖动（SSL EOF / RemoteDisconnected 等）按次重试
                last_err = f"{type(e).__name__}: {e}"
                time.sleep(3 * attempt)
        if blob is None:
            print(f"  ✗ ch{s['chapterIndex']}: {RETRIES} 次尝试后失败（{last_err}）")
            continue
        # 按魔数落正确扩展名（通道可能返回 jpeg 字节而规格名是 .png）
        if blob[:3] == b"\xff\xd8\xff" and target.suffix.lower() == ".png":
            target = target.with_suffix(".jpg")
        target.write_bytes(blob)
        rel = "public/" + s["targetFile"].rsplit(".", 1)[0] + target.suffix
        chapter = {"n": s["chapterIndex"] + 1, "title": s["title"]}
        mat = MATERIAL_REGISTRY[s["material"]]
        seed = item.get("seed", "n/a") if isinstance(item, dict) else "n/a"
        manifest_append(project_root, ai_manifest_row(
            rel, sha32(blob), model, chapter, mat, take, str(seed)))
        print(f"  ✓ ch{s['chapterIndex']} -> {norm(target)}（已登记 MANIFEST，qc=pending 三查待做）")
        ok += 1
    print(f"完成 {ok}/{len(chosen)}。失败章可 --only <idx> 单独重试（批量轮次纪律：SOP §6 全片最多两轮）。")
    if ok < len(chosen):
        sys.exit(1)


def register_files(project_root: Path, files: list, chapter: int, source: str, note: str) -> None:
    for f in files:
        p = Path(f)
        if not p.exists():
            sys.exit(f"Error: {f} 不存在")
        blob = p.read_bytes()
        try:
            rel = norm(p.resolve().relative_to(project_root.resolve()))
        except ValueError:
            rel = norm(p.resolve())
        usage = f"epic 世界底 · ch{chapter} · {note or '手工登记'} · qc：pending（伪影三查待人工，SOP §4）"
        manifest_append(project_root, f"| {rel} | {sha32(blob)} | {source} | 生成式素材（交付说明须披露） | {usage} |")
        print(f"  ✓ 已登记 {rel}（sha32 {sha32(blob)[:8]}…）")
    print("登记完成；来源字段必须如实（AI 生成写模型；外部素材写 URL+许可；参考片抽帧=违规，不接受登记）。")


def main() -> None:
    ap = argparse.ArgumentParser(description="epic AI 材质世界底：提示词规格/通道生成/MANIFEST 登记")
    ap.add_argument("--list-materials", action="store_true")
    ap.add_argument("--project", default=".", help="项目根（缺省当前目录）")
    ap.add_argument("--generate-prompts", action="store_true")
    ap.add_argument("--generate", action="store_true")
    ap.add_argument("--only", default="", help="只生成指定章（逗号分隔索引，如 0,3,5）")
    ap.add_argument("--take", default="t1", help="候选轮次标记（首章样张用 t1-t3）")
    ap.add_argument("--register", nargs="*", default=None, metavar="FILE",
                    help="登记手工产物进 MANIFEST（配合 --chapter/--source）")
    ap.add_argument("--chapter", type=int, default=0, help="--register 用：所属章号")
    ap.add_argument("--source", default="AI 生成 · model=unspecified", help="--register 用：来源字段")
    ap.add_argument("--note", default="", help="--register 用：用途附注")
    args = ap.parse_args()

    if args.list_materials:
        list_materials()
    elif args.generate_prompts:
        generate_prompts(Path(args.project).resolve())
    elif args.generate:
        only = [int(x) for x in args.only.split(",") if x.strip().isdigit()] if args.only else []
        generate_images(Path(args.project).resolve(), only, args.take)
    elif args.register is not None:
        if not args.register:
            ap.error("--register 需要至少一个文件路径")
        register_files(Path(args.project).resolve(), args.register, args.chapter, args.source, args.note)
    else:
        ap.print_help()


if __name__ == "__main__":
    main()
