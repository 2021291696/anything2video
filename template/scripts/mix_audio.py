#!/usr/bin/env python3
"""三层混音：旁白正本 audio_narration.wav + 可选 BGM/音效 → 派生 audio.wav。
用法：uv run python scripts/mix_audio.py [--epic] [--bed 0.055] [--sfx none|sand]
- --epic（epic 无旁白口径，recipes/epic.md §6）：旁白轨为零、片长从 script/timeline.json 读（chapter_timeline.py 产出）、
  响度床缺省 0.12（无旁白压制，音乐可给更大空间）；其余流程同标准模式
- 旁白正本：TTS 同时写 audio_narration.wav；混音只读正本，禁止按 mtime 回拷混音。
  --adopt-legacy 显式迁移旧工程 audio.wav；已有 mix.json 时正本缺失必须重跑 TTS。
- BGM：解码 → 裁/循环到片长 → **RMS 归一到目标响度床**（固定小增益会"混了但听不见"，教训见 lessons）→ 2s 淡入 4s 淡出
- 音效：默认关闭；--sfx sand 显式启用章节铺沙/扫掠。旁白期间音乐平滑降低 7dB。
- 依赖：numpy scipy（低通/带通滤波）；ffmpeg 解码音频
"""
import argparse, hashlib, json, os, pathlib, subprocess, sys
import numpy as np
from audio_project import AudioProject
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d
from scipy.signal import butter, lfilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--epic', action='store_true')
parser.add_argument('--bed', type=float)
parser.add_argument('--sfx', choices=('none', 'sand'), default='none')
parser.add_argument('--adopt-legacy', action='store_true')
parser.add_argument('--legacy-config', action='store_true')
parser.add_argument('--fps', type=int)
options = parser.parse_args()
try:
    PROJECT = AudioProject(ROOT, options.legacy_config, options.fps)
    SLUG = PROJECT.slug
    A_DIR = PROJECT.path(PROJECT.assets)
    PROJECT.preflight_audio(A_DIR)
    _tl = PROJECT.timeline()
except (ValueError, OSError) as error:
    raise SystemExit(f'[mix_audio] {error}') from None
RAW = f'{A_DIR}/audio_narration.wav'   # 与 SKILL.md / promo.md / orchestration §6 统一口径（旧名 narration_raw.wav 已废）
MIX = f'{A_DIR}/audio.wav'
SR = 48000
# 响度床双档（按片况选）：0.08 标准=音乐可闻不压旁白；0.055 保守=旁白密集/信息优先；0.12 epic=无旁白压制。用法：--bed 0.055
EPIC = options.epic
BED = options.bed if options.bed is not None else (0.12 if EPIC else 0.08)
TARGET_BGM_RMS = BED
if not np.isfinite(BED) or not 0 <= BED <= 0.5:
    raise SystemExit('--bed must be a finite number in 0..0.5')
BGM_SCALE_CAP = 8.0
SFX_GAIN = {'pour': 0.15, 'wipe': 0.10}

if EPIC:
    # epic 无旁白（recipes/epic.md §6）：旁白轨为零，片长锚 timeline.json（chapter_timeline.py 产出）
    total = int(round(_tl['total_frames'] / PROJECT.fps * SR))
    narr = np.zeros((total, 2))
else:
    _audio = pathlib.Path(A_DIR) / 'audio.wav'
    if not os.path.exists(RAW):
        if not options.adopt_legacy:
            raise SystemExit('缺 audio_narration.wav：请重跑 TTS；确认 audio.wav 是纯旁白时才用 --adopt-legacy。')
        if pathlib.Path(MIX).with_suffix('.mix.json').exists():
            raise SystemExit('旁白正本缺失，禁止把已有混音当正本：请重跑 TTS。')
        source = str(PROJECT.path(_audio))
    else:
        source = str(PROJECT.path(RAW))

    decoded = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(PROJECT.path(source)), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
    narr = np.frombuffer(decoded, dtype='<f4').reshape(-1, 2).astype(np.float64)
    if len(narr) == 0 or not np.all(np.isfinite(narr)):
        raise SystemExit('Narration is empty or contains invalid samples')
    total = len(narr)
    PROJECT.validate_audio(narr, SR, _tl)

# BGM
_bgm = next((f'{A_DIR}/{_n}' for _n in ('bgm.wav', 'bgm.mp3') if os.path.exists(f'{A_DIR}/{_n}')), None)
if _bgm:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(PROJECT.path(_bgm)), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    bgm = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    if len(bgm) == 0 or not np.all(np.isfinite(bgm)):
        raise SystemExit('BGM is empty or contains invalid samples')
else:
    bgm = np.zeros((total, 2), dtype=np.float64)
while len(bgm) < total:
    bgm = np.concatenate([bgm, bgm])
bgm = bgm[:total]
rms = float(np.sqrt(np.mean(bgm ** 2)))
if rms > 1e-6:
    bgm *= min(BGM_SCALE_CAP, TARGET_BGM_RMS / rms)
_positions = np.arange(total)
_fade = np.minimum(1, _positions / (2 * SR)) * np.minimum(1, (total - 1 - _positions) / (4 * SR))
bgm *= _fade[:, None]

# 旁白能量驱动平滑压低音乐；无旁白的 epic 保持音乐床。
if not EPIC:
    envelope = np.sqrt(np.maximum(0, uniform_filter1d(np.mean(narr ** 2, axis=1), int(SR * 0.05))))
    activity = uniform_filter1d(np.clip((envelope - 0.006) / 0.035, 0, 1), int(SR * 0.15))
    bgm *= (1 - activity * (1 - 10 ** (-7 / 20)))[:, None]

# 音效（numpy 程序合成）
def lowpass(x, cutoff, order=4):
    b, a = butter(order, cutoff / (SR / 2), btype='low')
    return lfilter(b, a, x)

def pour(dur_s=1.1):
    """铺沙：双重低通噪声 + 缓起缓落（沙瀑感，去静电）"""
    n = int(dur_s * SR)
    x = np.random.default_rng(7).standard_normal(n)
    x = lowpass(lowpass(x, 650), 650)
    env = np.minimum(np.arange(n) / (0.35 * SR), 1.0) * np.exp(-np.linspace(0, 3.6, n))
    return (x * env)[:, None] * SFX_GAIN['pour']

def wipe(dur_s=0.55):
    """扫掠：700–3200Hz 带通气流（抹沙/转场）"""
    n = int(dur_s * SR)
    x = np.random.default_rng(11).standard_normal(n)
    x = lowpass(x, 3200)
    b, a = butter(4, 700 / (SR / 2), btype='high')
    x = lfilter(b, a, x)
    return (x * np.sin(np.linspace(0, np.pi, n)) ** 2.0)[:, None] * SFX_GAIN['wipe']

tl = _tl
FPS = PROJECT.fps
_chs = tl.get('chapters') or []
starts = [c['from'] for c in _chs] or [1]
ends = [c['from'] - 14 for c in _chs[1:]] + [tl['total_frames'] - 14]
sfx = np.zeros_like(narr)
def put(cue_f, buf):
    i0 = max(0, int(round((cue_f - 1) / FPS * SR)))
    i1 = min(i0 + len(buf), total)
    if i0 < total:
        sfx[i0:i1] += buf[:i1 - i0]
pour_buf, wipe_buf = pour(), wipe()
# 沙音只由显式 preset 启用，其他视觉语言不自动注入。
if options.sfx == 'sand':
    for f in starts:
        put(f, pour_buf)
    for f in ends:
        put(f, wipe_buf)

mix = narr + bgm + sfx
peak = float(np.max(np.abs(mix)))
if peak > 0.95:
    mix *= 0.95 / peak
PROJECT.preflight_audio(RAW, MIX, pathlib.Path(MIX).with_suffix('.mix.json'))
PROJECT.mkdir(A_DIR)
if not EPIC and not PROJECT.path(RAW).exists():
    PROJECT.copy(source, RAW)
wavfile.write(str(PROJECT.path(MIX)), SR, (mix * 32767).astype(np.int16))
def digest(file):
    h = hashlib.sha256()
    with open(PROJECT.path(file), 'rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()
manifest = {'schema_version': 1, 'epic': EPIC, 'narration_sha256': None if EPIC else digest(RAW),
            'music_sha256': digest(_bgm) if _bgm else None, 'output_sha256': digest(MIX), 'sample_rate': SR,
            'channels': 2, 'duration_seconds': total / SR, 'bed': BED,
            'sfx': options.sfx, 'peak': float(np.max(np.abs(mix)))}
PROJECT.write_text(pathlib.Path(MIX).with_suffix('.mix.json'), json.dumps(manifest, indent=2) + '\n')
if PROJECT.legacy:
    PROJECT.save_total(tl['total_frames'])
print(f'mix ok: {total / SR:.1f}s, peak {peak:.2f} → {MIX}')
