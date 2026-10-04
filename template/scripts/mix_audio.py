#!/usr/bin/env python3
"""三层混音：旁白（tts 产物 audio.wav）+ BGM（bgm.wav，兼容 bgm.mp3）+ 程序合成音效 → audio.wav。
用法：uv run python scripts/mix_audio.py [--epic] [--bed 0.055] [--sfx none|sand]
- --epic（epic 无旁白口径，recipes/epic.md §6）：旁白轨为零、片长从 script/timeline.json 读（chapter_timeline.py 产出）、
  响度床缺省 0.12（无旁白压制，音乐可给更大空间）；其余流程同标准模式
- 旁白正本：TTS 同时写 audio_narration.wav；混音只读正本，禁止按 mtime 回拷混音。
  --adopt-legacy 显式迁移旧工程 audio.wav；已有 mix.json 时正本缺失必须重跑 TTS。
- BGM：解码 → 裁/循环到片长 → **RMS 归一到目标响度床**（固定小增益会"混了但听不见"，教训见 lessons）→ 2s 淡入 4s 淡出
- 音效：默认关闭；--sfx sand 显式启用章节铺沙/扫掠。旁白期间音乐平滑降低 7dB。
- 依赖：numpy scipy（低通/带通滤波）；ffmpeg 解码音频
"""
import hashlib, json, os, pathlib, re, shutil, subprocess, sys
import numpy as np
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d
from scipy.signal import butter, lfilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_cfg = pathlib.Path(ROOT, 'src', 'config.ts').read_text(encoding='utf-8')
_m = re.search(r"slug:\s*'([^']+)'", _cfg)
assert _m, 'config.ts 里找不到 slug 单引号字段（config 格式漂移？检查 slug 行）'
SLUG = _m.group(1)
A_DIR = f'{ROOT}/public/assets/{SLUG}'
RAW = f'{A_DIR}/audio_narration.wav'   # 与 SKILL.md / promo.md / orchestration §6 统一口径（旧名 narration_raw.wav 已废）
MIX = f'{A_DIR}/audio.wav'
SR = 48000
# 响度床双档（按片况选）：0.08 标准=音乐可闻不压旁白；0.055 保守=旁白密集/信息优先；0.12 epic=无旁白压制。用法：--bed 0.055
EPIC = '--epic' in sys.argv
BED = 0.12 if EPIC else 0.08
if '--bed' in sys.argv:
    BED = float(sys.argv[sys.argv.index('--bed') + 1])
TARGET_BGM_RMS = BED
assert np.isfinite(BED) and 0 <= BED <= 0.5, '--bed 必须在 0..0.5 之间'
BGM_SCALE_CAP = 8.0
SFX_GAIN = {'pour': 0.15, 'wipe': 0.10}

if EPIC:
    # epic 无旁白（recipes/epic.md §6）：旁白轨为零，片长锚 timeline.json（chapter_timeline.py 产出）
    _tl = json.loads((pathlib.Path(ROOT) / 'script' / 'timeline.json').read_text(encoding='utf-8'))
    total = int(round(_tl['total_frames'] / _tl.get('fps', 30) * SR))
    narr = np.zeros((total, 2))
else:
    _audio = pathlib.Path(A_DIR) / 'audio.wav'
    if not os.path.exists(RAW):
        if '--adopt-legacy' not in sys.argv:
            raise SystemExit('缺 audio_narration.wav：请重跑 TTS；确认 audio.wav 是纯旁白时才用 --adopt-legacy。')
        if pathlib.Path(MIX).with_suffix('.mix.json').exists():
            raise SystemExit('旁白正本缺失，禁止把已有混音当正本：请重跑 TTS。')
        shutil.copyfile(_audio, RAW)

    decoded = subprocess.run(['ffmpeg', '-v', 'error', '-i', RAW, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
    narr = np.frombuffer(decoded, dtype='<f4').reshape(-1, 2).astype(np.float64)
    assert len(narr) > 0 and np.all(np.isfinite(narr)), '旁白为空或含无效采样'
    total = len(narr)
    _tl = json.loads((pathlib.Path(ROOT) / 'script' / 'timeline.json').read_text(encoding='utf-8'))
    _expected = round(_tl['total_frames'] / _tl.get('fps', 30) * SR)
    assert abs(total - _expected) <= SR / _tl.get('fps', 30), '旁白时长与时间轴不一致，请重跑 TTS'

# BGM
_bgm = next((f'{A_DIR}/{_n}' for _n in ('bgm.wav', 'bgm.mp3') if os.path.exists(f'{A_DIR}/{_n}')), None)
if _bgm:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', _bgm, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    bgm = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    assert len(bgm) > 0 and np.all(np.isfinite(bgm)), 'BGM 为空或含无效采样'
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

if EPIC:
    tl = _tl
else:
    tl = json.loads((pathlib.Path(ROOT) / 'script' / 'timeline.json').read_text(encoding='utf-8'))
FPS = tl.get('fps', 30)
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
if '--sfx' in sys.argv:
    preset = sys.argv[sys.argv.index('--sfx') + 1]
    assert preset in ('none', 'sand'), '--sfx 仅支持 none / sand'
    if preset == 'sand':
        for f in starts:
            put(f, pour_buf)
        for f in ends:
            put(f, wipe_buf)

mix = narr + bgm + sfx
peak = float(np.max(np.abs(mix)))
if peak > 0.95:
    mix *= 0.95 / peak
wavfile.write(MIX, SR, (mix * 32767).astype(np.int16))
def digest(file):
    h = hashlib.sha256()
    with open(file, 'rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()
manifest = {'schema_version': 1, 'epic': EPIC, 'narration_sha256': None if EPIC else digest(RAW),
            'music_sha256': digest(_bgm) if _bgm else None, 'output_sha256': digest(MIX), 'sample_rate': SR,
            'channels': 2, 'duration_seconds': total / SR, 'bed': BED,
            'sfx': preset if '--sfx' in sys.argv else 'none', 'peak': float(np.max(np.abs(mix)))}
pathlib.Path(MIX).with_suffix('.mix.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(f'mix ok: {total / SR:.1f}s, peak {peak:.2f} → {MIX}')
