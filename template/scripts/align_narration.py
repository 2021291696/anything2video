#!/usr/bin/env python3
"""成品配音 wav 自动对齐 + 时间轴生成（用户自带配音专用，替代手填 timeline.ts / subs.ts）。

定位：用户指定音色 / 真人录音 / 品牌方提供成品配音——品牌方高频需求。
tts_build.py 走不通这条路的场合（其文件头第 24 行明文的手工缺口）：让用户给成品配音 wav，
本脚本听音频里的停顿，自动切句并发射与 tts_build 同形状的全套产物，
SubEntry.chars（逐字符起始帧）与 SENTENCES 也不再手填。

用法（工程根运行；wav 先放进工程内，如 public/assets/<slug>/narration-raw.wav）：
  uv run python scripts/align_narration.py <配音.wav> [--force]
  narration.txt 语法与 tts_build 完全一致：# CHAPTER n 标题 / ## gap 帧 / 一句话|按竖线切字幕块 / @EN: 对照。
  环境变量 GAP / CHAPTER_GAP / LEAD / TAIL（帧）与 tts_build 同名同默认（10/45/40/90）。
  脚本在 skill 包内被直接调用（而非工程 scripts/ 副本）时，若包根没有 project.json
  而 cwd 有，则取 cwd 为工程根——两条路径都可用。

对齐算法（能量停顿对齐）：
  1. ffmpeg 解码为 48k 单声道 f32，trim 首尾静音（能量阈 0.004，首留 0.03s 尾留 0.12s）
  2. RMS 能量包络（10ms 窗），自适应阈值 = max(包络峰值dB − 35dB, 底噪dB + 6dB)，
     静音段（≥0.18s）为候选切点
  3. 动态规划把 n 句对齐到候选停顿：代价 = Σ(句时长偏差²) − 长停顿奖励（0.3×min(停顿s,1s)）；
     句时长期望 = 该句字符数占比 × 总语音时长（语音活动帧合计）；句 i 的结束必须落在
     第 j 个停顿内（末句落在音频末尾）
  4. 切点落在停顿内：前句留 0.12s 尾气口、后句留 0.03s 起气口（同 trim_edges 口径），
     停顿中段连同原录音句间停顿一起被移除，句间距改由帧循环的 GAP 统一给——
     片子节奏与 tts_build 产物一致，不随录音者呼吸习惯漂移

对齐精度声明：句级 from/to 来自真实能量停顿，误差 ≈ 帧取整 + 10ms 窗量化（≤±0.05s）；
字幕块起点与逐字符帧是块内按字符数线性估计，±~0.15s。**词时间源为能量停顿对齐，
字符级为块内线性估计**——若 beat sheet 按词级锚点卡帧（WordLitCaption 卡到具体词），
对成片前需人工复核重点句。

产物（与 tts_build 同形状）：public/assets/<slug>/audio_narration.wav（正本：归一后 48k 立体声）
+ audio.wav（同内容）+ 删除陈旧 audio.mix.json + script/timeline.json（engine='external'）
+ timeline.md + src/common/subs.ts（SubEntry 含 chars）+ timeline.ts + project.json totalFrames。
已有旁白正本必须 --force 才能重生成；缺 project.json 直接报错（不做 legacy 迁移）。

# 机制借鉴 lanshu-create-ai-presenter-video story.py --audio（MIT，cclank）
"""
import argparse, json, os, re, subprocess, sys
import numpy as np
from pathlib import Path
from audio_project import AudioProject

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if not os.path.exists(os.path.join(ROOT, 'project.json')):
    cwd = os.getcwd()
    if os.path.exists(os.path.join(cwd, 'project.json')):
        ROOT = cwd
        print(f'注：脚本运行于 skill 包内，工程根取 cwd：{ROOT}')
PROJECT = None
SLUG = FPS = None
SR = 48000
GAP = int(os.environ.get('GAP', 10))          # 句间空白帧
CHAPTER_GAP = int(os.environ.get('CHAPTER_GAP', 45))  # 章节前空白帧
LEAD = int(os.environ.get('LEAD', 40))        # 片头静音帧
TAIL = int(os.environ.get('TAIL', 90))        # 片尾静音帧
WIN = 0.01            # RMS 包络窗（秒）
MIN_PAUSE = 0.18      # 候选切点最短静音（秒）
PAUSE_TAIL = 0.12     # 切点：前句保留的尾气口（秒，同 trim_edges）
PAUSE_LEAD = 0.03     # 切点：后句保留的起气口（秒，同 trim_edges）
PAUSE_REWARD = 0.3    # DP 长停顿奖励系数（每句 −0.3×min(停顿秒,1)）
# 供线性铺开时"继承前字符"的字符类（标点/空白不消耗时间轴；与 tts_build 词匹配剥离表同源再补全角书名号）
INHERIT_RE = re.compile(r'[\s，。、！？：；“”‘’（）《》〈〉「」『』,.!?:;()\-—…·]')


def parse(path):
    """narration.txt 精简 parser，行为与 tts_build.parse 对齐（空行跳过 / 章节 / 额外 gap / | 切块 / @EN:@CN: 挂上一句）。"""
    items = []
    chap = 0
    chap_title = ''
    pending_gap = 0
    for raw in Path(path).read_text(encoding='utf-8').splitlines():
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


def detect_lang(items):
    """解说词里 CJK 占比 ≥20% → 'zh'，否则 'en'（同 tts_build）。"""
    txt = ''.join(it['raw'] for it in items if it['type'] == 'sent')
    cjk = sum(1 for c in txt if '一' <= c <= '鿿')
    return 'zh' if cjk >= 0.2 * max(1, len(txt)) else 'en'


def decode(wav):
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(PROJECT.path(wav)), '-f', 'f32le',
                          '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(out, dtype=np.float32).copy()
    if len(x) == 0:
        raise SystemExit(f'配音 wav 解码后为空：{wav}')
    return x


def trim_edges(x, thr=0.004):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        raise SystemExit('配音里找不到语音段（整条都在能量阈 0.004 以下）——检查是否拿错了文件')
    a = max(0, idx[0] - int(0.03 * SR)); b = min(len(x), idx[-1] + int(0.12 * SR))
    return x[a:b], a / SR


def find_pauses(x):
    """RMS 10ms 窗 → 自适应阈值 → ≥MIN_PAUSE 的静音段列表 [(start_s, end_s)] 与总语音活动时长。"""
    n = len(x) // int(WIN * SR)
    if n == 0:
        raise SystemExit('配音 wav 短于一个分析窗（10ms）')
    win = x[:n * int(WIN * SR)].reshape(n, int(WIN * SR))
    rms = np.sqrt(np.mean(win.astype(np.float64) ** 2, axis=1))
    db = 20 * np.log10(rms + 1e-12)
    peak_db = float(db.max())
    noise_db = float(np.percentile(db, 5))
    thr_db = max(peak_db - 35.0, noise_db + 6.0)
    active = db > thr_db
    if not active.any():
        raise SystemExit('配音里找不到语音段（自适应阈值下无活动帧）——检查音轨是否只是底噪/音乐')
    pauses = []
    run = None
    for k, on in enumerate(active):
        if not on:
            run = k if run is None else run
        elif run is not None:
            if (k - run) * WIN >= MIN_PAUSE:
                pauses.append((run * WIN, k * WIN))
            run = None
    if run is not None and (n - run) * WIN >= MIN_PAUSE:
        pauses.append((run * WIN, n * WIN))
    return pauses, float(active.sum() * WIN)


def align_bounds(chunks_cnt, pauses, speech_sec, total_sec):
    """DP：n 句 → 每句音频区间 [(start_s, end_s)]（trimmed 坐标）。
    句 i（非末句）的结束必须落在某个停顿内；代价 = Σ(句时长偏差²) − 长停顿奖励。"""
    n = len(chunks_cnt)
    if n == 1:
        return [(0.0, total_sec)]
    exp = [c / max(1, sum(chunks_cnt)) * speech_sec for c in chunks_cnt]
    if len(pauses) < n - 1:
        print(f'⚠ 能量停顿只有 {len(pauses)} 个，少于句界所需的 {n - 1} 个——退化为按字符占比线性切分，'
              f'句级对齐不可靠：确认 narration.txt 句数与配音一致、句间是否有 0.18s 以上停顿')
        cum = np.cumsum([0.0] + [c / max(1, sum(chunks_cnt)) * total_sec for c in chunks_cnt])
        return [(float(cum[i]), float(cum[i + 1]) if i + 1 < n else total_sec) for i in range(n)]

    def reward(p):
        return PAUSE_REWARD * min(p[1] - p[0], 1.0)

    INF = float('inf')
    m = len(pauses)
    dp = [[INF] * m for _ in range(n)]
    parent = [[-1] * m for _ in range(n)]
    for j, p in enumerate(pauses):
        dp[0][j] = (p[0] + PAUSE_TAIL - exp[0]) ** 2 - reward(p)
    for i in range(1, n):
        last = (i == n - 1)
        for j in ([0] if last else range(m)):   # 末句固定止于音频末尾，j 只是占位
            for jp in (range(m) if last else range(j)):
                if dp[i - 1][jp] == INF:
                    continue
                start = pauses[jp][1] - PAUSE_LEAD
                end = total_sec if last else pauses[j][0] + PAUSE_TAIL
                cost = dp[i - 1][jp] + (end - start - exp[i]) ** 2 - (0.0 if last else reward(pauses[j]))
                if cost < dp[i][j]:
                    dp[i][j] = cost
                    parent[i][j] = jp
    ends = [min(range(m), key=lambda j: dp[n - 1][j])]
    for i in range(n - 1, 0, -1):
        ends.append(parent[i][ends[-1]])
    picks = list(reversed(ends))            # picks[i] = 句 i 止于的停顿下标（末句无意义）
    spans = []
    start = 0.0
    for i in range(n):
        end = total_sec if i == n - 1 else pauses[picks[i]][0] + PAUSE_TAIL
        spans.append((start, end))
        if i < n - 1:
            start = pauses[picks[i]][1] - PAUSE_LEAD
    return spans


def spread_chars(t0, t1, text):
    """块内逐字符起始秒：可读字符按位置线性铺开，标点/空白继承前一字符（SubEntry.chars 底料）。"""
    n = len(text)
    if n == 0:
        return []
    spoken = [i for i, ch in enumerate(text) if not INHERIT_RE.match(ch)]
    times = [None] * n
    denom = max(1, len(spoken) - 1)
    for k, i in enumerate(spoken):
        times[i] = t0 + (t1 - t0) * (k / denom if len(spoken) > 1 else 0.0)
    prev = t0
    for i in range(n):
        if times[i] is None:
            times[i] = prev
        else:
            prev = times[i]
    return times


def write_wav(path, x, sr):
    """x：float32 单声道 (n,) 或立体声 (n,2) → 16bit PCM wav（同 tts_build）。"""
    import wave
    a = np.asarray(x, dtype=np.float32)
    pcm = (np.clip(a, -1.0, 1.0) * 32767).astype(np.int16)
    PROJECT.mkdir(PROJECT.path(path).parent)
    with wave.open(str(PROJECT.path(path)), 'wb') as w:
        w.setnchannels(1 if a.ndim == 1 else a.shape[1]); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def main(dub, *, force=False):
    global PROJECT, SLUG, FPS
    try:
        PROJECT = AudioProject(ROOT)
    except ValueError as e:
        if 'project.json is required' in str(e):
            raise SystemExit('缺 project.json——本脚本不做 legacy 迁移：请在工程根（含 project.json 与 src/config.ts）运行')
        raise
    SLUG, FPS = PROJECT.slug, PROJECT.fps
    narr = Path(ROOT) / 'script' / 'narration.txt'
    wav_in = dub or f'public/assets/{SLUG}/narration-raw.wav'
    outputs = [PROJECT.assets / name for name in ('audio.wav', 'audio_narration.wav', 'audio.mix.json')]
    destinations = [*outputs, 'script/timeline.json', 'script/timeline.md',
                    'src/common/subs.ts', 'src/common/timeline.ts', 'project.json']
    PROJECT.preflight_audio(narr, wav_in, *destinations)
    if PROJECT.path(outputs[1]).exists() and not force:
        raise ValueError('Existing audio_narration.wav is protected; use --force to regenerate narration')
    if not narr.exists():
        raise SystemExit('缺 script/narration.txt——先写解说词（语法同 tts_build：# CHAPTER / ## gap / | 切块 / @EN: 对照）')
    items = parse(narr)
    sents = [it for it in items if it['type'] == 'sent' and it['raw'].replace('|', '').strip()]
    if not sents:
        raise SystemExit('narration.txt 没有可朗读句子，拒绝生成静音交付。')
    lang = detect_lang(items)
    match = re.search(r"lang:\s*['\"](zh|en)['\"]", PROJECT.config)
    cfg_lang = match.group(1) if match else 'zh'
    if lang != cfg_lang:
        print(f"⚠ src/config.ts 的 lang: '{cfg_lang}' 与解说词语言 {lang} 不一致——改过来，"
              f"否则标题压窄与居中基线会按错的语言算")
    sep = ' ' if lang == 'en' else ''
    # 听音频
    x, _lead_cut = trim_edges(decode(wav_in))
    pauses, speech_sec = find_pauses(x)
    total_sec = len(x) / SR
    spans = align_bounds([len(sep.join(c.strip() for c in it['raw'].split('|') if c.strip())) for it in sents],
                         pauses, speech_sec, total_sec)
    # 帧累加：与 tts_build main 循环完全一致
    t = LEAD / FPS
    audio_parts = []
    sentences = []; chapters = []
    sid = 0
    total_chars = 0; total_words = 0
    for it in items:
        if it['type'] == 'chapter':
            t += CHAPTER_GAP / FPS
            chapters.append({'n': it['chapter'], 'title': it['title'], 'from': int(round(t * FPS)) + 1})
            continue
        t += it['gap_before'] / FPS
        chunks = [c.strip() for c in it['raw'].split('|') if c.strip()]
        if not chunks:
            continue
        a, b = spans[sid]
        piece = x[int(round(a * SR)):int(round(b * SR))]
        dur = len(piece) / SR
        if dur <= 0:
            raise SystemExit(f'第 {sid + 1} 句切出零长度音频——停顿检测与句数不匹配')
        tts_text = sep.join(chunks)
        sid += 1
        cum = 0; ctotal = max(1, sum(len(c) for c in chunks))
        f0 = int(round(t * FPS)) + 1; f1 = int(round((t + dur) * FPS))
        subs = []
        for k, c in enumerate(chunks):
            a_k = dur * cum / ctotal; b_k = dur * (cum + len(c)) / ctotal
            cum += len(c)
            subs.append({'from': int(round((t + a_k) * FPS)) + 1,
                         'to': int(round((t + b_k) * FPS)),
                         'text': c,
                         'chars': [int(round((t + cs) * FPS)) + 1
                                   for cs in spread_chars(a_k, b_k, c)]})
        rec = {'id': f'S{sid:02d}', 'chapter': it['chapter'], 'from': f0, 'to': f1, 'text': tts_text,
               'subs': subs}
        for k in ('en', 'cn'):
            if it.get(k):
                rec[k] = it[k]
                rec['subs'][0][k] = it[k]  # 对照行挂句首块（同 tts_build）
                break
        sentences.append(rec)
        audio_parts.append((t, piece))
        total_chars += len(re.sub(r'[，。、！？：；“”（）,.!?:;()\-—…\s]', '', tts_text))
        total_words += len(tts_text.split())
        t += dur + GAP / FPS
    t += TAIL / FPS
    total = int(np.ceil(t * FPS))
    # 正本音轨（同 tts_build：归一 0.89、validate、写 audio.wav → copy 正本 → 删混音清单）
    y = np.zeros(int(total / FPS * SR) + SR, dtype=np.float32)
    for st, piece in audio_parts:
        a = int(st * SR); y[a:a + len(piece)] += piece
    y = y[: int(total / FPS * SR)]
    peak = float(np.max(np.abs(y))) or 1.0
    y = y / peak * 0.89
    PROJECT.validate_audio(y, SR, {'total_frames': total})
    PROJECT.preflight_audio(*destinations)
    if PROJECT.path(outputs[1]).exists() and not force:
        raise ValueError('Narration master appeared during alignment; rerun with --force if intended')
    PROJECT.mkdir(PROJECT.assets)
    wav = str(PROJECT.path(outputs[0]))
    write_wav(wav, np.stack([y, y], 1), SR)
    PROJECT.copy(wav, outputs[1])
    PROJECT.unlink(outputs[2])
    # 字幕修正：相邻句字幕不重叠；同句块间连续（同 tts_build）
    all_subs = []
    for s in sentences:
        for sb in s['subs']:
            if sb['to'] < sb['from']:
                sb['to'] = sb['from']
            all_subs.append(dict(sb))
    for i in range(len(all_subs) - 1):
        if all_subs[i]['to'] >= all_subs[i + 1]['from']:
            all_subs[i]['to'] = all_subs[i + 1]['from'] - 1
    for sb in all_subs:  # chars 契约"1 起含端点"：线性铺开的末字符会落在 to+1，钳回块内
        if sb.get('chars'):
            sb['chars'] = [min(c, sb['to']) for c in sb['chars']]
    # 产物
    tl = {'fps': FPS, 'total_frames': total, 'engine': 'external', 'voice': 'user-provided',
          'timing': 'aligned',
          'aligned_note': '词时间源为能量停顿对齐，字符级为块内线性估计 ±~0.15s',
          'rate': None,
          'gap': GAP, 'chapter_gap': CHAPTER_GAP, 'lead': LEAD, 'tail': TAIL,
          'lang': lang, 'chapters': chapters, 'sentences': sentences, 'chars': total_chars,
          'words': total_words, 'speech_sec': round(sum(pb - pa for pa, pb in spans), 2)}
    unit, cnt = ('字', total_chars) if lang == 'zh' else ('词', total_words)
    PROJECT.mkdir('script'); PROJECT.mkdir('src/common')
    PROJECT.write_text('script/timeline.json', json.dumps(tl, ensure_ascii=False, indent=1))
    md = [f"# 时间轴（external · 用户成品配音，共 {total} 帧 = {total/FPS:.1f}s，{cnt} {unit}，"
          f"语速 {cnt/max(1e-6, tl['speech_sec']):.2f} {unit}/s）\n\n",
          '| 句 | 章 | 帧 from–to | 时长 | 文本（| 为字幕切分） |\n|---|---|---|---|---|\n']
    for s in sentences:
        md.append(f"| {s['id']} | {s['chapter']} | {s['from']}–{s['to']} | {(s['to']-s['from']+1)/FPS:.1f}s | "
                  f"{'｜'.join(sb['text'] for sb in s['subs'])} |\n")
    md.append('\n## 章节起始帧\n')
    for c in chapters:
        md.append(f"- 第{c['n']}章 {c['title']}：f{c['from']}\n")
    Path(PROJECT.path('script/timeline.md')).write_text(''.join(md), encoding='utf-8')
    # 文本一律走 json.dumps：JSON 字符串就是合法的 TS 字面量（同 tts_build，手工拼引号会被文本破坏语法）
    def lit(s):
        return json.dumps(s, ensure_ascii=False)
    ts = ['// 自动生成：scripts/align_narration.py（成品配音能量停顿对齐 → 字幕块）。手改请改 script/narration.txt 后重跑。\n',
          "export type SubEntry = {from: number; to: number; text: string; en?: string; cn?: string; emphasis?: boolean;\n"
          "  /** 逐字符起始帧（词级点亮字幕 WordLitCaption 的底料，1 起含端点，长度==text 字符数）。\n"
          "   *  external 引擎为块内线性估计（±~0.15s）：标点/空白继承前字符；词级锚点需人工复核。 */\n"
          "  chars?: number[]};\nexport const SUBS: SubEntry[] = [\n"]
    for sb in all_subs:
        alt = ''.join(f", {k}: {lit(sb[k])}" for k in ('en', 'cn') if sb.get(k))
        ch = f", chars: [{','.join(str(v) for v in sb['chars'])}]" if sb.get('chars') else ''
        ts.append(f"  {{from: {sb['from']}, to: {sb['to']}, text: {lit(sb['text'])}{alt}{ch}}},\n")
    ts.append('];\n')
    Path(PROJECT.path('src/common/subs.ts')).write_text(''.join(ts), encoding='utf-8')
    tl_ts = ['// 自动生成：scripts/align_narration.py（用户成品配音对齐）。帧号 1 起含端点。\n',
             f'export const TOTAL_FRAMES = {total};\n',
             'export const CHAPTER_STARTS: Array<{n: number; title: string; from: number}> = [\n']
    for c in chapters:
        tl_ts.append(f"  {{n: {c['n']}, title: {lit(c['title'])}, from: {c['from']}}},\n")
    tl_ts.append('];\nexport type Sentence = {id: string; chapter: number; from: number; to: number; text: string};\n'
                 'export const SENTENCES: Sentence[] = [\n')
    for s in sentences:
        tl_ts.append(f"  {{id: {lit(s['id'])}, chapter: {s['chapter']}, from: {s['from']}, to: {s['to']}, "
                     f"text: {lit(s['text'])}}},\n")
    tl_ts.append('];\n')
    Path(PROJECT.path('src/common/timeline.ts')).write_text(''.join(tl_ts), encoding='utf-8')
    print(f'lang={lang} engine=external(用户配音) total_frames={total} ({total/FPS:.1f}s) '
          f'sentences={len(sentences)} {unit}={cnt} pauses={len(pauses)} speech={tl["speech_sec"]:.1f}s '
          f'rate={cnt/max(1e-6, tl["speech_sec"]):.2f} {unit}/s')
    PROJECT.save_total(total)
    for c in chapters:
        print(f"  chapter {c['n']} {c['title']} from f{c['from']}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dub', nargs='?', help='成品配音 wav（工程内相对路径或绝对路径）')
    parser.add_argument('--force', action='store_true')
    options = parser.parse_args()
    try:
        main(options.dub, force=options.force)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(f'[align_narration] {error}') from None
