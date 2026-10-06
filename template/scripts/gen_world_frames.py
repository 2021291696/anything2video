#!/usr/bin/env python3
"""
Epic world-frame specifications, generation and provenance registration.

--generate-prompts reads timeline chapters and project.json native aspect.
--generate [--only 0,3] [--take t1] requires A2V_IMAGE_API_BASE, API_KEY,
MODEL and optionally PROVIDER (openai/minimax), SIZE/ASPECT and ENDPOINT.
OpenAI sizes follow supported orientation presets; MiniMax uses native aspect.
--register FILE requires --source, --license, --model, --prompt (including
negatives), --seed (or n/a), --disclosure. Files must be inside the project.
--overwrite explicitly replaces specifications or same-take candidates.

MANIFEST.json keeps full SHA256 and the actual submitted prompt. Registration
sets all AI QC checks to not_performed; it never certifies image quality.
"""

import argparse
import base64
import hashlib
import ipaddress
import io
import json
import math
import os
import re
import socket
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from PIL import Image

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

MANIFEST_HEADER = "# MANIFEST · 外部素材登记\n\n| 文件 | sha256 | 来源 | 许可 | 用途 |\n|---|---|---|---|---|\n"

# Windows Python 3.14（OpenSSL 3.5+）默认 TLS1.3 ClientHello 携带 ML-KEM 后量子密钥交换，
# 会被部分链路中间盒直接重置（SSL UNEXPECTED_EOF；curl 走 schannel 不受影响）。
# 封顶 TLS 1.2 规避——2026-10-04 api.minimaxi.com 实测。
_TLS_CTX = ssl.create_default_context()
_TLS_CTX.maximum_version = ssl.TLSVersion.TLSv1_2


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def guard(root: Path, path: Path) -> Path:
    root, target = root.resolve(), path.resolve()
    if target != root and root not in target.parents:
        raise ValueError(f'Path escapes the project: {target}')
    return target


def project_config(root: Path) -> dict:
    config = json.loads(guard(root, root / 'project.json').read_text(encoding='utf-8'))
    if not isinstance(config, dict) or not isinstance(config.get('slug'), str) or not re.fullmatch(r'[A-Za-z0-9_-]+', config['slug']):
        raise ValueError('project.json requires a safe slug')
    if any(isinstance(config.get(key), bool) or not isinstance(config.get(key), int) or config[key] <= 0 for key in ('width', 'height')):
        raise ValueError('project.width/height must be positive integers')
    return config


def native_aspect(config: dict) -> str:
    divisor = math.gcd(config['width'], config['height'])
    return f"{config['width'] // divisor}:{config['height'] // divisor}"


def native_prompt(prompt: str, aspect: str) -> str:
    return re.sub(r'\b16\s*:\s*9\b,?\s*', '', prompt).strip() + f' Native {aspect} composition.'


def safe_write(root: Path, path: Path, data: bytes, overwrite=False) -> None:
    target = guard(root, path)
    guard(root, target.parent).mkdir(parents=True, exist_ok=True)
    with target.open('wb' if overwrite else 'xb') as output:
        output.write(data)


def norm(p: Path) -> str:
    return p.as_posix()


def assert_safe_url(url: str) -> str:
    """通道地址边界校验：仅 http(s)、拒私网/环回/链路本地/保留地址（防 SSRF）。"""
    p = urllib.parse.urlparse(url)
    if p.username or p.password:
        raise ValueError('Credentials must not appear in a provider URL')
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


# 通道调用失败要如实告知用户错在哪、怎么办（统一合同「素材与参考片」错误透传条款）
_HTTP_HINTS = {
    401: 'API key 无效或未授权——核对 A2V_IMAGE_API_KEY 与该模型的生图权限',
    402: '通常是账户余额不足——充值后重跑，或走程序材质/手工生成+--register 降级路线',
    403: 'key 被拒——常见于欠费、无该模型权限或地区限制',
    404: '端点或模型名不对——核对 A2V_IMAGE_API_BASE 与 A2V_IMAGE_MODEL',
    429: '限流——稍后用 --only 重跑失败章',
}


def http_hint(code: int) -> str:
    return _HTTP_HINTS.get(code, '上游通道错误——核对 BASE/MODEL/余额后重跑')


def manifest_append(root: Path, asset: dict) -> None:
    json_path, markdown_path = guard(root, root / 'MANIFEST.json'), guard(root, root / 'MANIFEST.md')
    data = json.loads(json_path.read_text(encoding='utf-8')) if json_path.exists() else {'schemaVersion': 1, 'assets': []}
    if not isinstance(data, dict) or data.get('schemaVersion') != 1 or not isinstance(data.get('assets'), list) or any(not isinstance(entry, dict) for entry in data['assets']):
        raise ValueError('MANIFEST.json must contain an assets array')
    data['assets'] = [entry for entry in data['assets'] if entry.get('path') != asset['path']] + [asset]
    json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    def cell(value):
        return str(value).replace('|', '\\|').replace('\n', ' ')
    row = '| ' + ' | '.join(cell(asset[key]) for key in ('path', 'sha256', 'source', 'license', 'usage')) + ' |\n'
    with markdown_path.open('a', encoding='utf-8') as output:
        if markdown_path.stat().st_size == 0:
            output.write(MANIFEST_HEADER)
        output.write(row)


def ai_asset(root, path, blob, source, license_text, usage, model, prompt, seed, disclosure, take):
    for label, value in [('source', source), ('license', license_text), ('usage', usage), ('model', model), ('prompt', prompt), ('disclosure', disclosure)]:
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f'AI registration requires {label}')
    if isinstance(seed, bool) or not ((isinstance(seed, str) and seed.strip()) or (isinstance(seed, (int, float)) and math.isfinite(seed))):
        raise ValueError('AI registration requires seed (use n/a when unavailable)')
    if model.strip().lower() in ('unspecified', 'unknown', 'n/a'):
        raise ValueError('AI registration requires the actual model identifier')
    return {'path': norm(guard(root, path).relative_to(root.resolve())), 'sha256': sha256(blob),
            'source': source, 'license': license_text, 'usage': usage, 'ai': True, 'model': model,
            'prompt': prompt, 'seed': seed, 'disclosure': disclosure, 'take': take,
            'qc': {'textFree': 'not_performed', 'geometry': 'not_performed', 'continuity': 'not_performed'}}


def list_materials() -> None:
    print("=" * 80)
    print("anything2video —— 15 大工艺材质世界注册表（对齐 reference/materials.md）")
    print("=" * 80)
    for k, v in MATERIAL_REGISTRY.items():
        print(f"[{v['id']}] {k:24} -> {v['name']}")
        print(f"     Lum={v['lum']}  R-B={v['rb']}  Vignette={v['vignette']}  Grade={v['grade']}")
    print('\nEach timeline chapter requires an explicit material key; missing/unknown materials are rejected.')


def load_chapters(project_root: Path) -> list:
    timeline = guard(project_root, project_root / 'script' / 'timeline.json')
    if not timeline.exists():
        sys.exit(f"Error: {timeline} 不存在。先跑 chapter_timeline.py 产出 timeline.json。")
    with timeline.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict) or not isinstance(data.get('chapters'), list) or not data['chapters']:
        raise ValueError('timeline.json requires a nonempty chapters array')
    return data['chapters']


def resolve_material(ch: dict, idx: int) -> tuple:
    if not isinstance(ch, dict):
        raise ValueError(f'Chapter {idx} must be an object')
    key = ch.get("material")
    if isinstance(key, str) and key in MATERIAL_REGISTRY:
        return key, MATERIAL_REGISTRY[key]
    raise ValueError(f'Chapter {idx}: select an explicit registered material; got {key!r} (see --list-materials)')


def generate_prompts(project_root: Path, overwrite=False) -> None:
    chapters = load_chapters(project_root)
    config = project_config(project_root)
    slug, aspect = config['slug'], native_aspect(config)
    out_file = guard(project_root, project_root / 'script' / 'world_prompts.json')
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
            'prompt': native_prompt(mat['prompt'], aspect),
            'aspectRatio': aspect,
            "negativePrompt": mat["negative"],
            "targetFile": f"assets/{slug}/footage/ch{idx:02d}_{key}.png",
            "recommendedLum": mat["lum"],
            "recommendedRb": mat["rb"],
            "recommendedVignette": mat["vignette"],
            "recommendedGrade": mat["grade"],
        })
    safe_write(project_root, out_file, (json.dumps(output, ensure_ascii=False, indent=2) + '\n').encode('utf-8'), overwrite)
    print(f"提示词规格已产出: {norm(out_file)}（{len(output)} 章）")
    print("下一步：有图像通道跑 --generate；无通道按 reference/ai-frame-sop.md 手工生成后 --register 登记。")


def generate_images(project_root: Path, only: list, take: str, overwrite=False) -> None:
    config = project_config(project_root)
    aspect = native_aspect(config)
    if not re.fullmatch(r'[A-Za-z0-9_-]+', take):
        raise ValueError('take must contain only letters, digits, _ and -')
    provider = os.environ.get('A2V_IMAGE_PROVIDER', 'openai').lower()
    if provider not in ('openai', 'minimax'):
        raise ValueError('Supported providers: openai / minimax')
    base, key, model = (os.environ.get(name, '').strip() for name in ('A2V_IMAGE_API_BASE', 'A2V_IMAGE_API_KEY', 'A2V_IMAGE_MODEL'))
    if not (base and key and model):
        raise ValueError('No configured image provider; keep prompt specifications and generate/register manually.')
    endpoint = os.environ.get('A2V_IMAGE_ENDPOINT', '/image_generation' if provider == 'minimax' else '/images/generations')
    url = base.rstrip('/') + endpoint
    parsed_url = urllib.parse.urlparse(url)
    if parsed_url.username or parsed_url.password or parsed_url.query or parsed_url.fragment:
        raise ValueError('Provider URL must not contain credentials or query parameters')
    specs_file = guard(project_root, project_root / 'script' / 'world_prompts.json')
    if not specs_file.exists():
        generate_prompts(project_root)
    specs = json.loads(specs_file.read_text(encoding='utf-8'))
    if not isinstance(specs, list) or not specs:
        raise ValueError('world_prompts.json must be a nonempty array')
    selected, seen = [], set()
    candidate_paths = set()
    for spec in specs:
        if not isinstance(spec, dict) or isinstance(spec.get('chapterIndex'), bool) or not isinstance(spec.get('chapterIndex'), int) or spec['chapterIndex'] < 0 or spec['chapterIndex'] in seen:
            raise ValueError('Prompt specifications require unique nonnegative chapterIndex values')
        seen.add(spec['chapterIndex'])
        resolve_material(spec, spec['chapterIndex'])
        if spec.get('aspectRatio') != aspect:
            raise ValueError('Prompt specification aspectRatio must match the project native aspect')
        if any(not isinstance(spec.get(name), str) or not spec[name].strip() for name in ('prompt', 'negativePrompt', 'targetFile')):
            raise ValueError('Prompt specifications require prompt, negativePrompt and targetFile')
        public = guard(project_root, project_root / 'public')
        target = guard(public, public / spec['targetFile'])
        if target.suffix.lower() not in ('.png', '.jpg', '.jpeg'):
            raise ValueError('Candidate targets must use PNG/JPEG extensions')
        target = target.with_name(f'{target.stem}_{take}{target.suffix}')
        if not only or spec['chapterIndex'] in only:
            if target.with_suffix('') in candidate_paths:
                raise ValueError('Selected prompt specifications target the same candidate')
            candidate_paths.add(target.with_suffix(''))
            if not overwrite and any(guard(project_root, target.with_suffix(suffix)).exists() for suffix in ('.png', '.jpg', '.jpeg')):
                raise FileExistsError(f'Candidate already exists: {target}; select a new --take or explicit --overwrite')
            selected.append((spec, target))
    if set(only) - seen or not selected:
        raise ValueError('--only contains unknown chapters or selects no candidates')
    for name in ('MANIFEST.json', 'MANIFEST.md'):
        manifest_path = guard(project_root, project_root / name)
        if name.endswith('.json') and manifest_path.exists():
            manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
            if not isinstance(manifest, dict) or manifest.get('schemaVersion') != 1 or not isinstance(manifest.get('assets'), list) or any(not isinstance(entry, dict) for entry in manifest['assets']):
                raise ValueError('MANIFEST.json must contain a valid assets array')
    for spec, target in selected:
        full_prompt = f"{spec['prompt']}\n\nStrictly avoid in the image: {spec['negativePrompt']}"
        payload = {'model': model, 'prompt': full_prompt}
        if provider == 'minimax':
            size = os.environ.get('A2V_IMAGE_ASPECT', aspect)
            if size != aspect:
                raise ValueError('A2V_IMAGE_ASPECT must match the project native aspect')
            payload.update(aspect_ratio=size, response_format='url', watermark=False)
        else:
            default_size = '1024x1536' if config['height'] > config['width'] else '1536x1024' if config['width'] > config['height'] else '1024x1024'
            if model == 'dall-e-3':
                default_size = '1024x1792' if config['height'] > config['width'] else '1792x1024' if config['width'] > config['height'] else '1024x1024'
            size = os.environ.get('A2V_IMAGE_SIZE', default_size)
            dimensions = re.fullmatch(r'([1-9][0-9]*)x([1-9][0-9]*)', size)
            if not dimensions or (int(dimensions[1]) > int(dimensions[2])) != (config['width'] > config['height']) or (int(dimensions[1]) < int(dimensions[2])) != (config['width'] < config['height']):
                raise ValueError('A2V_IMAGE_SIZE must match the project native orientation')
            payload.update(n=1, size=size)
            if model.startswith('dall-e'):
                payload['response_format'] = 'b64_json'
        try:
            data = post_json(url, payload, key)
        except urllib.error.HTTPError as error:
            detail = ""
            try:
                detail = error.read().decode("utf-8", "replace").strip()[:300]
            except OSError:
                pass
            raise ValueError(f"图像通道 HTTP {error.code} {error.reason}：{http_hint(error.code)}"
                             + (f" 上游返回：{detail}" if detail else "")) from None
        if not isinstance(data, dict):
            raise ValueError('Image provider response must be an object')
        item = data.get('data')
        if provider == 'minimax':
            base = data.get('base_resp') or {}
            if base.get('status_code', 0) != 0 or not isinstance(item, dict) or not item.get('image_urls'):
                msg = base.get('status_msg') or ('响应缺少 image_urls' if base.get('status_code', 0) == 0 else '无 status_msg')
                raise ValueError(
                    f'MiniMax 图像通道失败 status_code={base.get("status_code")} status_msg={msg!r}——'
                    'status_msg 提示余额/balance → 账户欠费：充值后重跑，或改走程序材质/手工生成+--register 降级；'
                    '提示鉴权/invalid → 核对 A2V_IMAGE_API_KEY；已落盘候选不受影响，可用 --only 重跑失败章')
            blob, seed = fetch_bytes(item['image_urls'][0]), item.get('seed', 'n/a')
        else:
            entry = item[0] if isinstance(item, list) and item else {}
            if not isinstance(entry, dict):
                raise ValueError('OpenAI image response entry must be an object')
            blob = base64.b64decode(entry['b64_json'], validate=True) if entry.get('b64_json') else fetch_bytes(entry['url']) if entry.get('url') else b''
            seed = entry.get('seed', 'n/a')
        if blob.startswith(b'\xff\xd8\xff'):
            target = target.with_suffix('.jpg')
        elif blob.startswith(b'\x89PNG\r\n\x1a\n'):
            target = target.with_suffix('.png')
        else:
            raise ValueError('Provider returned no PNG/JPEG bytes')
        with Image.open(io.BytesIO(blob)) as image:
            actual_size = {'width': image.width, 'height': image.height}
            image.verify()
        asset = ai_asset(project_root, target, blob, f'AI generated via {provider}: {url}',
                         'Provider generation terms; verify intended publication rights',
                         f"Epic world background chapter {spec['chapterIndex']} take {take}",
                         model, full_prompt, seed, 'AI-generated image', take)
        asset.update(promptSpec=spec, negativePrompt=spec['negativePrompt'], requestedSize=payload.get('size', payload.get('aspect_ratio')))
        asset['actualSize'] = actual_size
        asset['licenseVerification'] = 'not_performed'
        safe_write(project_root, target, blob, overwrite)
        manifest_append(project_root, asset)
        print(f'Generated {norm(target)}; QC not_performed. Review before production use.')
    print(f'Generated {len(selected)} candidates. Revise failed shots based on their actual defects.')


def register_files(project_root: Path, files: list, chapter: int, source: str, note: str,
                   license_text: str, model: str, prompt: str, seed, disclosure: str, take='manual') -> None:
    if isinstance(chapter, bool) or not isinstance(chapter, int) or chapter < 0:
        raise ValueError('chapter must be a nonnegative chapter index')
    assets = []
    for filename in files:
        candidate = Path(filename)
        target = guard(project_root, candidate if candidate.is_absolute() else project_root / candidate)
        assets.append(ai_asset(project_root, target, target.read_bytes(), source, license_text,
                               f'Epic world background chapter {chapter}: {note or "manual registration"}',
                               model, prompt, seed, disclosure, take))
    for asset in assets:
        manifest_append(project_root, asset)
        print(f"Registered {asset['path']} with full SHA256; QC not_performed.")


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="epic AI 材质世界底：提示词规格/通道生成/MANIFEST 登记")
    ap.add_argument('--overwrite', action='store_true', help='Explicitly replace existing specifications/candidates')
    ap.add_argument("--list-materials", action="store_true")
    ap.add_argument("--project", default=".", help="项目根（缺省当前目录）")
    ap.add_argument("--generate-prompts", action="store_true")
    ap.add_argument("--generate", action="store_true")
    ap.add_argument("--only", default="", help="只生成指定章（逗号分隔索引，如 0,3,5）")
    ap.add_argument("--take", default="t1", help="候选轮次标记（首章样张用 t1-t3）")
    ap.add_argument("--register", nargs="*", default=None, metavar="FILE",
                    help="登记手工产物进 MANIFEST（配合 --chapter/--source）")
    ap.add_argument("--chapter", type=int, default=0, help="--register 用：所属章号")
    ap.add_argument('--source', help='Manual registration: real source')
    ap.add_argument('--license', help='Manual registration: actual usage terms')
    ap.add_argument('--model', help='Manual registration: model identifier')
    ap.add_argument('--prompt', help='Manual registration: full submitted prompt including negatives')
    ap.add_argument('--seed', help='Manual registration: seed or n/a')
    ap.add_argument('--disclosure', help='Manual registration: publication disclosure')
    ap.add_argument("--note", default="", help="--register 用：用途附注")
    args = ap.parse_args(argv)

    if args.list_materials:
        list_materials()
    elif args.generate_prompts:
        generate_prompts(Path(args.project).resolve(), args.overwrite)
    elif args.generate:
        if args.only and not re.fullmatch(r'\d+(?:,\d+)*', args.only):
            ap.error('--only must be comma-separated nonnegative chapter indices')
        only = [int(value) for value in args.only.split(',')] if args.only else []
        generate_images(Path(args.project).resolve(), only, args.take, args.overwrite)
    elif args.register is not None:
        if not args.register:
            ap.error("--register 需要至少一个文件路径")
        register_files(Path(args.project).resolve(), args.register, args.chapter, args.source, args.note,
                       args.license, args.model, args.prompt, args.seed, args.disclosure, args.take)
    else:
        ap.print_help()


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        raise SystemExit(f'[gen_world_frames] {error}') from None
