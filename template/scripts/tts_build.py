#!/usr/bin/env python3
"""配音 + 时间轴生成。项目根 = 本脚本所在 scripts/ 的上级目录。
输入 narration.txt：
  # CHAPTER <n> <标题>      章节标记（章节前自动加 chapter_gap 帧空白）
  ## gap <帧数>             在下一句前额外插入空白帧
  一句话|按竖线分成字幕短句            → 竖线只切字幕，不影响朗读
                                       每块预算：中文 ≤16 字 / 英文 ≤48 字符（超了会打 ⚠ 并自动缩字号）
                                       块首尾空格会去掉；英文片把块用空格拼回整句给 TTS（"a|b" 与 "a | b" 等价），中文直接拼接
  @EN: English line                  → 双语字幕：对照语言挂上一句（@EN/@CN 均可，谁不是旁白语言谁当对照），subs.ts 输出对应字段；config.subs='bilingual' 时渲染两行
输出：
  public/assets/<slug>/audio.wav（48k 立体声 16bit；slug/fps 读 project.json）
  script/timeline.json / timeline.md
  src/common/subs.ts（字幕表）、src/common/timeline.ts（TOTAL_FRAMES / CHAPTER_STARTS / SENTENCES）
逐句（或逐字幕块）缓存于 audio/cache/，改一句只重合成一句。

TTS 引擎（`TTS_ENGINE`，默认 `auto` = 按解说词语言选；**跑之前先问用户有没有偏好的 TTS**——按 SKILL.md 基准确认点 3 叠加所选配方 §确认点差异执行，如 promo 已删除独立确认点、并入确认点 ① 一句话带过，用户在 ① 给过偏好就照办）：
  edge     中文默认。edge-tts 云端合成，有词级边界 → 字幕节拍最准。VOICE=zh-CN-YunyangNeural RATE=+8%
           英文降级路径：kokoro 不可用时 auto 自动切到 edge + en-US-ChristopherNeural（EDGE_EN_VOICE 可换音色）
  kokoro   英文默认（本地推理，`uv add kokoro soundfile` + espeak-ng）。**注意：2026-09 起 PyPI 的
           kokoro 0.7.16 钉死 numpy==1.26.4（py3.12+ 无 wheel）且要求不存在的 misaki>=0.7.16，装不上是常态**；
           auto 会自动降级到 edge 英文，无需手动处理。
           KOKORO_VOICE=am_liam（Liam，男声，与中文云详同定位）KOKORO_LANG=a KOKORO_SPEED=1.0
  kokoro 没有词边界 → 改为「逐字幕块分别合成再拼接」，块起始帧因此也是精确的（CHUNK_PAD 调块间静音）。
  用户有别的 TTS 偏好时不走本脚本：让他给成品配音 wav，按逐句/逐块时间轴手填 timeline.ts 与 subs.ts。
其它环境变量：GAP/CHAPTER_GAP/LEAD/TAIL（帧）。
已有旁白正本必须 --force 才能重生成。缺 project.json 时仅 --legacy-config --fps 允许显式迁移。
"""
import argparse, asyncio, hashlib, json, os, re, subprocess, sys
import numpy as np
from pathlib import Path
from audio_project import AudioProject

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT = None
SLUG = FPS = None
CFG_LANG = 'zh'
SR = 48000
ENGINE = os.environ.get('TTS_ENGINE', 'auto')
VOICE = os.environ.get('VOICE', 'zh-CN-YunyangNeural')
RATE = os.environ.get('RATE', '+8%')
# edge-tts 云端限流（连续请求会被拒、返回空音频）：重试次数 / 退避基数秒 / 句间隔秒
EDGE_RETRIES = int(os.environ.get('EDGE_RETRIES', 4))
EDGE_RETRY_DELAY = float(os.environ.get('EDGE_RETRY_DELAY', 1.5))
EDGE_DELAY = float(os.environ.get('EDGE_DELAY', 0.6))
KOKORO_VOICE = os.environ.get('KOKORO_VOICE', 'am_liam')
KOKORO_LANG = os.environ.get('KOKORO_LANG', 'a')       # a=American English, b=British
KOKORO_SPEED = float(os.environ.get('KOKORO_SPEED', 1.0))
KOKORO_SR = 24000
CHUNK_PAD = float(os.environ.get('CHUNK_PAD', 0.06))  # 无词边界引擎：块间静音秒
GAP = int(os.environ.get('GAP', 10))          # 句间空白帧
CHAPTER_GAP = int(os.environ.get('CHAPTER_GAP', 45))  # 章节前空白帧
LEAD = int(os.environ.get('LEAD', 40))        # 片头静音帧
TAIL = int(os.environ.get('TAIL', 90))        # 片尾静音帧
CACHE = f'{ROOT}/audio/cache'
if ENGINE not in ('auto', 'edge', 'kokoro'):
    raise SystemExit(f'未知 TTS_ENGINE={ENGINE}（可选 auto / edge / kokoro）')


def parse(path):
    items = []
    chap = 0
    chap_title = ''
    pending_gap = 0
    for raw in PROJECT.path(path).read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line:
            continue
        m = re.match(r'^#\s*CHAPTER\s+(\d+)\s+(.*)$', line)
        if m:
            chap = int(m.group(1)); chap_title = m.group(2).strip()
            items.append({'type': 'chapter', 'chapter': chap, 'title': chap_title})
            continue
        m = re.match(r'^##\s*gap\s+(\d+)', line)
        if m:
            pending_gap += int(m.group(1)); continue
        m = re.match(r'^@(EN|CN):\s*(.+)$', line)
        if m:
            # 双语字幕：对照语言行挂到上一句（无上一句则忽略），随 subs.ts 输出对应字段
            tag = m.group(1).lower()
            for it in reversed(items):
                if it['type'] == 'sent':
                    it[tag] = m.group(2).strip()
                    break
            continue
        if line.startswith('#'):
            continue
        items.append({'type': 'sent', 'chapter': chap, 'raw': line, 'gap_before': pending_gap})
        pending_gap = 0
    return items


def cache_path(text, ext):
    sig = f'{ENGINE}|{VOICE}|{RATE}|{KOKORO_VOICE}|{KOKORO_LANG}|{KOKORO_SPEED}|{text}'
    p = os.path.join(CACHE, hashlib.sha1(sig.encode()).hexdigest()[:16] + ext)
    return str(PROJECT.path(p))


def detect_lang(items):
    """解说词里 CJK 占比 ≥20% → 'zh'，否则 'en'。"""
    txt = ''.join(it['raw'] for it in items if it['type'] == 'sent')
    cjk = sum(1 for c in txt if '一' <= c <= '鿿')
    return 'zh' if cjk >= 0.2 * max(1, len(txt)) else 'en'


# 字幕块宽度预判：与 src/common/textfit.ts 用同一张 em 宽表（字体 fontTools 实测），
# 直接算「44px 下会不会超过安全区 1160px」——比按字数判准，中英混排（如「几百个 token 一块」）不会误报。
# 授稿建议仍是每块中文 ≤16 字 / 英文 ≤48 字符（见 narration-storyboard.md）。
SUB_MAX_W = 1160
SUB_SIZE = 44
SUB_BUDGET = {'zh': '16 字', 'en': '48 字符'}


def text_em(s):
    """与 src/common/textfit.ts 的 textEm() 同一张表（改一处要同步另一处）。"""
    t = 0.0
    for ch in s:
        c = ord(ch)
        if c >= 0x2000:
            t += 1.0                     # CJK / 全角，以及 U+2000 起的标点 / 箭头 / 数学符号（— … “ ” → ∑ 在 Noto 里都是 1em）
        elif ch == ' ':
            t += 0.227
        elif 'A' <= ch <= 'Z':
            t += 0.668
        elif '0' <= ch <= '9':
            t += 0.59
        elif 'a' <= ch <= 'z':
            t += 0.566
        elif 0xc0 <= c < 0x250:
            t += 0.58                    # 带重音的拉丁字母
        else:
            t += 0.325                   # 半角标点
    return t


def write_wav(path, x, sr):
    """x：float32 单声道 (n,) 或立体声 (n,2) → 16bit PCM wav。"""
    import wave
    a = np.asarray(x, dtype=np.float32)
    pcm = (np.clip(a, -1.0, 1.0) * 32767).astype(np.int16)
    PROJECT.mkdir(PROJECT.path(path).parent)
    with wave.open(str(PROJECT.path(path)), 'wb') as w:
        w.setnchannels(1 if a.ndim == 1 else a.shape[1]); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(pcm.tobytes())


async def synth_edge(text, retries=None, base_delay=None):
    """edge-tts：整句合成 + 词级边界（会把 text 发送到微软云端端点）。

    云端有速率限制：连续快速请求会返回空音频（edge_tts 抛 NoAudioReceived）。
    2026-09-10 实测：29 句的片子跑到第 7 句起大面积失败，而脚本原先既无重试也无句间隔 → 整批作废。
    现在带指数退避重试，main 循环还会在句间留 EDGE_DELAY；已成功的句子走缓存，重跑不会重复合成。"""
    import edge_tts
    from pathlib import Path
    retries = EDGE_RETRIES if retries is None else retries
    base_delay = EDGE_RETRY_DELAY if base_delay is None else base_delay
    mp3 = Path(cache_path(text, '.mp3')); js = Path(cache_path(text, '.json'))
    if mp3.exists() and js.exists():
        return str(PROJECT.path(mp3)), json.loads(PROJECT.path(js).read_text(encoding='utf-8'))
    last = None
    for attempt in range(retries):
        try:
            # boundary 必须显式传 'WordBoundary'：edge-tts 7.2.8 默认 SentenceBoundary（整句一条事件、零词边界），
            # 词级点亮的 chars 会退化成块起始帧平铺（2026-10-07 live 复验实锤，见 docs/optimization-v3.9.md）
            comm = edge_tts.Communicate(text, VOICE, rate=RATE, boundary='WordBoundary')
            audio = bytearray(); words = []
            async for ch in comm.stream():
                if ch['type'] == 'audio':
                    audio += ch['data']
                elif ch['type'] == 'WordBoundary':
                    words.append({'t': ch['offset'] / 1e7, 'd': ch['duration'] / 1e7, 'text': ch['text']})
            if not audio:
                raise RuntimeError('云端返回空音频')
            PROJECT.write_bytes(mp3, bytes(audio))
            PROJECT.write_text(js, json.dumps(words, ensure_ascii=False))
            if attempt:
                print(f'    ↻ 第 {attempt + 1} 次重试成功：{text[:22]}')
            return str(mp3), words
        except Exception as e:
            last = e
            if attempt < retries - 1:
                d = base_delay * (2 ** attempt)
                print(f'    ⚠ {type(e).__name__}，{d:.1f}s 后重试 {attempt + 2}/{retries}：{text[:22]}')
                await asyncio.sleep(d)
    raise SystemExit(
        f'edge-tts 连续 {retries} 次未取到音频（最后错误：{last}）\n'
        f'  失败句：{text}\n'
        f'  多半是云端限流：等几分钟重跑即可（成功句有缓存，不会重合成）；\n'
        f'  也可调大 EDGE_RETRIES（重试次数）/ EDGE_RETRY_DELAY（退避基数秒）/ EDGE_DELAY（句间隔秒）')


_kokoro = None


def synth_kokoro(text):
    """kokoro-82m：本地推理，24kHz，无词边界。"""
    global _kokoro
    au = cache_path(text, '.wav')
    if os.path.exists(au):
        return au
    if _kokoro is None:
        try:
            from kokoro import KPipeline
        except ImportError:
            raise SystemExit('TTS_ENGINE=kokoro 需要 kokoro 包；但 PyPI 当前版本 0.7.16 钉死 numpy==1.26.4（py3.12+ 无 wheel）'
                             '且要求的 misaki>=0.7.16 不存在，一般装不上。英文请改用 TTS_ENGINE=edge + VOICE=en-US-ChristopherNeural')
        _kokoro = KPipeline(lang_code=KOKORO_LANG)
    parts = []
    for r in _kokoro(text, voice=KOKORO_VOICE, speed=KOKORO_SPEED):
        a = getattr(r, 'audio', None)
        if a is None:
            a = r[2]                                    # 旧版 yield (graphemes, phonemes, audio)
        if hasattr(a, 'detach'):
            a = a.detach().cpu().numpy()                # torch tensor
        parts.append(np.asarray(a, dtype=np.float32).reshape(-1))
    if not parts:
        raise SystemExit(f'kokoro 没有产出音频：{text[:24]}…')
    write_wav(au, np.concatenate(parts), KOKORO_SR)
    return au


def decode(mp3):
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(PROJECT.path(mp3)), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def trim_edges(x, thr=0.004):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x, 0.0
    a = max(0, idx[0] - int(0.03 * SR)); b = min(len(x), idx[-1] + int(0.12 * SR))
    return x[a:b], a / SR


def chunk_starts(tts_text, chunks, words, lead_cut, dur, sep=''):
    """按 | 切出的字幕短句 → (每块起始秒, 每块逐字符起始秒)。word 边界按字符游标对到原句。
    tts_text == sep.join(chunks)：英文 sep=' '，游标要跳过块间的那个空格。
    逐字符秒（词级点亮字幕 SubEntry.chars 的底料）：无词边界的字符（标点/未匹配）继承前一个有边界字符。"""
    # 每个字符的起始时间（按 word 边界填充）
    char_t = [None] * len(tts_text)
    cur = 0
    for w in words:
        wt = re.sub(r'[\s，。、！？：；“”（）,.!?:;()\-—…]', '', w['text'])
        if not wt:
            continue
        p = tts_text.find(wt, cur)
        if p < 0:
            p = tts_text.find(wt[0], cur)
            if p < 0:
                continue
        for i in range(p, min(len(tts_text), p + len(wt))):
            char_t[i] = (w['t'] - lead_cut, w['d'])
        cur = p + len(wt)
    # 每块首字时间
    starts = []
    pos = 0
    for c in chunks:
        seg = tts_text[pos:pos + len(c)]
        st = None
        for i in range(pos, pos + len(c)):
            if char_t[i] is not None:
                st = char_t[i][0]; break
        starts.append(st)
        pos += len(c) + len(sep)
    # 兜底：无边界的块按字数线性插值
    for i, st in enumerate(starts):
        if st is None:
            prev = starts[i - 1] if i > 0 and starts[i - 1] is not None else 0.0
            starts[i] = prev + dur * len(chunks[i - 1]) / max(1, len(tts_text)) if i > 0 else 0.0
    starts[0] = 0.0
    starts = [max(0.0, s) for s in starts]
    # 逐字符秒：继承链从块起始秒出发，块内跟最近的词边界
    char_secs = []
    pos = 0
    for ci, c in enumerate(chunks):
        prev = starts[ci]
        frames = []
        for i in range(pos, pos + len(c)):
            if i < len(char_t) and char_t[i] is not None:
                prev = char_t[i][0]
            frames.append(prev)
        pos += len(c) + len(sep)
        char_secs.append(frames)
    return starts, char_secs


async def synth_sentence(chunks, sep=''):
    """一句 → (音频 float32 单声道, 每块起始秒, 每块逐字符起始秒, 句长秒)。sep 是块之间的连接符（英文 ' '，中文 ''）。
    edge：整句合成一次，块起点与逐字符时间都按词边界对齐（最准）。
    kokoro：无词边界 → 逐字幕块分别合成再拼接，块起点因此是精确的（块内字符按位置线性铺开=估计计时），代价是块界断句略生硬。"""
    text = sep.join(chunks)
    if ENGINE == 'edge':
        au, words = await synth_edge(text)
        x, lead_cut = trim_edges(decode(au))
        dur = len(x) / SR
        starts, char_secs = chunk_starts(text, chunks, words, lead_cut, dur, sep)
        return x, starts, char_secs, dur
    pad = np.zeros(int(CHUNK_PAD * SR), dtype=np.float32)
    parts = []; starts = []; pos = 0.0
    for i, c in enumerate(chunks):
        xi, _ = trim_edges(decode(synth_kokoro(c)))
        if i:
            parts.append(pad); pos += len(pad) / SR
        starts.append(pos)
        parts.append(xi); pos += len(xi) / SR
    x = np.concatenate(parts) if parts else np.zeros(0, dtype=np.float32)
    dur = len(x) / SR
    char_secs = []
    for i, c in enumerate(chunks):
        a = starts[i]; b = starts[i + 1] if i + 1 < len(starts) else dur
        n = max(1, len(c))
        char_secs.append([a + (b - a) * j / n for j in range(len(c))])
    return x, starts, char_secs, dur


async def main(narr=None, *, force=False, legacy_config=False, fps=None):
    global ENGINE, VOICE, RATE, PROJECT, SLUG, FPS, CFG_LANG, CACHE
    PROJECT = AudioProject(ROOT, legacy_config, fps)
    SLUG, FPS = PROJECT.slug, PROJECT.fps
    CACHE = str(Path(ROOT) / 'audio' / 'cache')
    match = re.search(r"lang:\s*['\"](zh|en)['\"]", PROJECT.config)
    CFG_LANG = match.group(1) if match else 'zh'
    narr = narr or Path(ROOT) / 'script' / 'narration.txt'
    outputs = [PROJECT.assets / name for name in ('audio.wav', 'audio_narration.wav', 'audio.mix.json')]
    destinations = [*outputs, 'script/timeline.json', 'script/timeline.md',
                    'src/common/subs.ts', 'src/common/timeline.ts', 'project.json']
    PROJECT.preflight_audio(narr, CACHE, *destinations)
    if PROJECT.path(outputs[1]).exists() and not force:
        raise ValueError('Existing audio_narration.wav is protected; use --force to regenerate narration')
    items = parse(narr)
    if not any(item['type'] == 'sent' and item['raw'].replace('|', '').strip() for item in items):
        raise SystemExit('narration.txt 没有可朗读句子，拒绝生成静音交付。')
    lang = detect_lang(items)
    if ENGINE == 'auto':
        if lang == 'zh':
            ENGINE = 'edge'
        else:
            ENGINE = 'kokoro'
            try:
                import kokoro  # noqa: F401  仅探测；真正实例化在 synth_kokoro 里懒加载
            except ImportError:
                # 2026-09 实测：PyPI 的 kokoro==0.7.16 钉死 numpy==1.26.4（py3.12+ 无 wheel 装不上），
                # 且要求的 misaki>=0.7.16 不存在于 PyPI → `pip install kokoro` 当前必败。
                # edge-tts 的英文音色同一条云端链路、带词级边界（字幕更准），直接降级。
                ENGINE = 'edge'
                VOICE = os.environ.get('EDGE_EN_VOICE', 'en-US-ChristopherNeural')
                RATE = os.environ.get('RATE', '+0%')   # +8% 是为中文定的；英文回原速（≈2.9 词/s 预算）
                print(f'⚠ 英文默认引擎 kokoro 装不上（见脚本头注释）→ 降级 TTS_ENGINE=edge + {VOICE}'
                      f'（想换音色：VOICE=en-US-… 或 EDGE_EN_VOICE=…）')
        print(f'解说词语言 {lang} → TTS_ENGINE={ENGINE}（有偏好请显式传 TTS_ENGINE=…）')
    if lang != CFG_LANG:
        print(f"⚠ src/config.ts 的 lang: '{CFG_LANG}' 与解说词语言 {lang} 不一致——改过来，"
              f"否则标题压窄与居中基线会按错的语言算")
    # 字幕块拼回整句给 TTS 时的连接符：英文词与词之间要有空格（否则 "powerful|but" 会被念成 powerfulbut），中文直接拼
    sep = ' ' if lang == 'en' else ''
    for item in items:
        if item['type'] == 'sent':
            chunks = [chunk.strip() for chunk in item['raw'].split('|') if chunk.strip()]
            for text in ([sep.join(chunks)] if ENGINE == 'edge' else chunks):
                for extension in (('.mp3', '.json') if ENGINE == 'edge' else ('.wav',)):
                    cache_path(text, extension)
    PROJECT.mkdir(CACHE)
    t = LEAD / FPS
    audio_parts = []  # (start_sec, np.array)
    sentences = []; chapters = []
    sid = 0
    total_chars = 0; total_words = 0; speech_sec = 0.0
    for it in items:
        if it['type'] == 'chapter':
            t += CHAPTER_GAP / FPS
            chapters.append({'n': it['chapter'], 'title': it['title'], 'from': int(round(t * FPS)) + 1})
            continue
        t += it['gap_before'] / FPS
        raw = it['raw']
        chunks = [c.strip() for c in raw.split('|') if c.strip()]
        if not chunks:
            continue
        tts_text = sep.join(chunks)
        x, starts, char_secs, dur = await synth_sentence(chunks, sep)
        if (x.ndim != 1 or len(x) == 0 or not np.all(np.isfinite(x))
                or not np.isfinite(dur) or abs(dur - len(x) / SR) > 1 / SR
                or len(starts) != len(chunks) or starts != sorted(starts)
                or any(not np.isfinite(start) or start < 0 or start >= dur for start in starts)
                or len(char_secs) != len(chunks) or any(len(fc) != len(c) for fc, c in zip(char_secs, chunks))
                or any(not np.isfinite(cs) for fc in char_secs for cs in fc)):
            raise ValueError('Synthesized samples/duration/subtitle boundaries are inconsistent')
        # edge-tts 云端限流：句间留间隔（缓存命中的句子在上面已提前返回）
        if ENGINE == 'edge' and EDGE_DELAY > 0:
            await asyncio.sleep(EDGE_DELAY)
        sid += 1
        subs = [(t + starts[i], t + (starts[i + 1] if i + 1 < len(starts) else dur)) for i in range(len(chunks))]
        f0 = int(round(t * FPS)) + 1; f1 = int(round((t + dur) * FPS))
        rec = {'id': f'S{sid:02d}', 'chapter': it['chapter'], 'from': f0, 'to': f1, 'text': tts_text,
               'subs': [{'from': int(round(a * FPS)) + 1, 'to': int(round(b * FPS)), 'text': c,
                         'chars': [int(round((t + cs) * FPS)) + 1 for cs in fc]}
                        for c, (a, b), fc in zip(chunks, subs, char_secs)]}
        for k in ('en', 'cn'):
            if it.get(k):
                rec[k] = it[k]
                rec['subs'][0][k] = it[k]  # 对照行挂句首块（逐块对照需在 | 切块时自行对齐）
                break
        sentences.append(rec)
        audio_parts.append((t, x))
        total_chars += len(re.sub(r'[，。、！？：；“”（）,.!?:;()\-—…\s]', '', tts_text))
        total_words += len(tts_text.split()); speech_sec += dur
        t += dur + GAP / FPS
    t += TAIL / FPS
    total = int(np.ceil(t * FPS))
    # 合成音轨
    y = np.zeros(int(total / FPS * SR) + SR, dtype=np.float32)
    for st, x in audio_parts:
        a = int(st * SR); y[a:a + len(x)] += x
    y = y[: int(total / FPS * SR)]
    peak = float(np.max(np.abs(y))) or 1.0
    y = y / peak * 0.89
    PROJECT.validate_audio(y, SR, {'total_frames': total})
    PROJECT.preflight_audio(*destinations)
    if PROJECT.path(outputs[1]).exists() and not force:
        raise ValueError('Narration master appeared during synthesis; rerun with --force if intended')
    PROJECT.mkdir(PROJECT.assets)
    wav = str(PROJECT.path(outputs[0]))
    write_wav(wav, np.stack([y, y], 1), SR)
    # 混音只读此正本；不再通过 audio.wav 的修改时间猜测来源。
    PROJECT.copy(wav, outputs[1])
    PROJECT.unlink(outputs[2])
    # 修正字幕：相邻句字幕不重叠；同句块间连续
    all_subs = []
    for s in sentences:
        for k, sb in enumerate(s['subs']):
            if sb['to'] < sb['from']:
                sb['to'] = sb['from']
            all_subs.append(dict(sb))
    for i in range(len(all_subs) - 1):
        if all_subs[i]['to'] >= all_subs[i + 1]['from']:
            all_subs[i]['to'] = all_subs[i + 1]['from'] - 1
    # 字幕块宽度体检：超安全区的块会被 Subtitle.tsx 缩字号（>1.3 倍还会折两行压进内容区），正确做法是回去切文案
    over = [(sb, text_em(sb['text']) * SUB_SIZE) for sb in all_subs]
    over = [(sb, w) for sb, w in over if w > SUB_MAX_W]
    if over:
        print(f'⚠ {len(over)}/{len(all_subs)} 块字幕在 {SUB_SIZE}px 下超过安全区 {SUB_MAX_W}px'
              f'（会自动缩字号；建议每块 {SUB_BUDGET[lang]}，用 | 再切一刀）：')
        for sb, w in over[:5]:
            print(f"    f{sb['from']} (≈{w:.0f}px{'，会折两行' if w > SUB_MAX_W * 1.3 else ''}) {sb['text']}")
    # 输出
    tl = {'fps': FPS, 'total_frames': total, 'engine': ENGINE,
          'voice': VOICE if ENGINE == 'edge' else KOKORO_VOICE,
          'rate': RATE if ENGINE == 'edge' else KOKORO_SPEED,
          'gap': GAP, 'chapter_gap': CHAPTER_GAP, 'lead': LEAD, 'tail': TAIL,
          'lang': lang, 'chapters': chapters, 'sentences': sentences, 'chars': total_chars, 'words': total_words,
          'speech_sec': round(speech_sec, 2)}
    unit, cnt = ('字', total_chars) if lang == 'zh' else ('词', total_words)
    PROJECT.mkdir('script')
    PROJECT.mkdir('src/common')
    PROJECT.write_text('script/timeline.json', json.dumps(tl, ensure_ascii=False, indent=1))
    md = [f"# 时间轴（{ENGINE} · {tl['voice']} {tl['rate']}，共 {total} 帧 = {total/FPS:.1f}s，{cnt} {unit}，语速 {cnt/max(1e-6,speech_sec):.2f} {unit}/s）\n\n",
          '| 句 | 章 | 帧 from–to | 时长 | 文本（| 为字幕切分） |\n|---|---|---|---|---|\n']
    for s in sentences:
        md.append(f"| {s['id']} | {s['chapter']} | {s['from']}–{s['to']} | {(s['to']-s['from']+1)/FPS:.1f}s | {'｜'.join(sb['text'] for sb in s['subs'])} |\n")
    md.append('\n## 章节起始帧\n')
    for c in chapters:
        md.append(f"- 第{c['n']}章 {c['title']}：f{c['from']}\n")
    Path(PROJECT.path('script/timeline.md')).write_text(''.join(md), encoding='utf-8')
    # 文本一律走 json.dumps：JSON 字符串就是合法的 TS 字面量，且会转义 " \ 与控制字符
    # （手工拼引号会被解说词里的 \ ' ` ${} 破坏语法，甚至把文本写成代码）
    def lit(s):
        return json.dumps(s, ensure_ascii=False)
    ts = ['// 自动生成：scripts/tts_build.py（词边界 / 逐块合成 → 字幕块）。手改请改 script/narration.txt 后重跑。\n',
          "export type SubEntry = {from: number; to: number; text: string; en?: string; cn?: string; emphasis?: boolean;\n"
          "  /** 逐字符起始帧（词级点亮字幕 WordLitCaption 的底料，1 起含端点，长度==text 字符数；无词边界字符继承前字符）。\n"
          "   *  edge 引擎为实测词边界；kokoro 为块内线性估计。缺省（旧数据）时 WordLitCaption 退化为整块淡入，与旧渲染逐值等价。 */\n"
          "  chars?: number[]};\nexport const SUBS: SubEntry[] = [\n"]
    for sb in all_subs:
        alt = ''.join(f", {k}: {lit(sb[k])}" for k in ('en', 'cn') if sb.get(k))
        ch = f", chars: [{','.join(str(x) for x in sb['chars'])}]" if sb.get('chars') else ''
        ts.append(f"  {{from: {sb['from']}, to: {sb['to']}, text: {lit(sb['text'])}{alt}{ch}}},\n")
    ts.append('];\n')
    Path(PROJECT.path('src/common/subs.ts')).write_text(''.join(ts), encoding='utf-8')
    tl_ts = ['// 自动生成：scripts/tts_build.py。帧号 1 起含端点。\n',
             f'export const TOTAL_FRAMES = {total};\n',
             'export const CHAPTER_STARTS: Array<{n: number; title: string; from: number}> = [\n']
    for c in chapters:
        tl_ts.append(f"  {{n: {c['n']}, title: {lit(c['title'])}, from: {c['from']}}},\n")
    tl_ts.append('];\nexport type Sentence = {id: string; chapter: number; from: number; to: number; text: string};\nexport const SENTENCES: Sentence[] = [\n')
    for s in sentences:
        tl_ts.append(f"  {{id: {lit(s['id'])}, chapter: {s['chapter']}, from: {s['from']}, to: {s['to']}, text: {lit(s['text'])}}},\n")
    tl_ts.append('];\n')
    Path(PROJECT.path('src/common/timeline.ts')).write_text(''.join(tl_ts), encoding='utf-8')
    print(f'lang={lang} engine={ENGINE} voice={tl["voice"]} total_frames={total} ({total/FPS:.1f}s) '
          f'sentences={len(sentences)} {"chars" if lang == "zh" else "words"}={cnt} speech={speech_sec:.1f}s '
          f'rate={cnt/max(1e-6,speech_sec):.2f} {unit}/s')
    PROJECT.save_total(total)
    for c in chapters:
        print(f"  chapter {c['n']} {c['title']} from f{c['from']}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('narration', nargs='?')
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--legacy-config', action='store_true')
    parser.add_argument('--fps', type=int)
    options = parser.parse_args()
    try:
        asyncio.run(main(options.narration, force=options.force,
                         legacy_config=options.legacy_config, fps=options.fps))
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(f'[tts_build] {error}') from None
