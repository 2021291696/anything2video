#!/usr/bin/env python3
"""三层混音：旁白（tts 产物 audio.wav）+ BGM（bgm.wav，兼容 bgm.mp3）+ 程序合成音效 → audio.wav。
用法：python scripts/mix_audio.py
- 旁白正本守卫：audio.wav 比 audio_narration.wav 新（=重跑过 tts_build）时自动重新备份——
  陈旧备份把 v1 旁白混回来的坑见 lessons 09-28；备份用拷贝不用移动，混音中途失败原旁白仍在
- BGM：解码 → 裁/循环到片长 → **RMS 归一到目标响度床**（固定小增益会"混了但听不见"，教训见 lessons）→ 2s 淡入 4s 淡出
- 音效：章节起点「铺沙/转场」+ 章节终点「扫掠」由 SCENES/合成器定义（numpy 程序合成，无第三方版权）
- 依赖：numpy scipy（低通/带通滤波）；ffmpeg 解码音频
"""
import json, os, re, shutil, subprocess, sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_cfg = open(f'{ROOT}/src/config.ts', encoding='utf-8').read()
_m = re.search(r"slug:\s*'([^']+)'", _cfg)
assert _m, 'config.ts 里找不到 slug 单引号字段（config 格式漂移？检查 slug 行）'
SLUG = _m.group(1)
A_DIR = f'{ROOT}/public/assets/{SLUG}'
RAW = f'{A_DIR}/audio_narration.wav'   # 与 SKILL.md / promo.md / orchestration §6 统一口径（旧名 narration_raw.wav 已废）
MIX = f'{A_DIR}/audio.wav'
SR = 48000
# 响度床双档（按片况选）：0.08 标准=音乐可闻、有存在感、不压旁白（默认）；0.055 保守=旁白密集/信息优先。用法：--bed 0.055
BED = 0.08
if '--bed' in sys.argv:
    BED = float(sys.argv[sys.argv.index('--bed') + 1])
TARGET_BGM_RMS = BED
BGM_SCALE_CAP = 8.0
SFX_GAIN = {'pour': 0.15, 'wipe': 0.10}

_audio = f'{A_DIR}/audio.wav'
if not os.path.exists(RAW) or (os.path.exists(_audio) and os.path.getmtime(_audio) > os.path.getmtime(RAW)):
    shutil.copyfile(_audio, RAW)

sr, narr = wavfile.read(RAW)
assert sr == SR, f'旁白采样率 {sr} != {SR}'
narr = narr.astype(np.float64) / 32768.0
total = len(narr)

# BGM
_bgm = next((f'{A_DIR}/{_n}' for _n in ('bgm.wav', 'bgm.mp3') if os.path.exists(f'{A_DIR}/{_n}')), None)
assert _bgm, f'缺 BGM：{A_DIR}/bgm.wav（或 bgm.mp3）——出处要登记进交付说明'
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', _bgm, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
bgm = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
while len(bgm) < total:
    bgm = np.concatenate([bgm, bgm])
bgm = bgm[:total]
rms = float(np.sqrt(np.mean(bgm ** 2)))
if rms > 1e-6:
    bgm *= min(BGM_SCALE_CAP, TARGET_BGM_RMS / rms)
for i in range(min(int(2 * SR), total)):
    bgm[i] *= i / (2 * SR)
for i in range(min(int(4 * SR), total)):
    bgm[-1 - i] *= i / (4 * SR)

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

tl = json.load(open(f'{ROOT}/script/timeline.json', encoding='utf-8'))
FPS = tl.get('fps', 30)
_chs = tl.get('chapters') or []
starts = [c['from'] for c in _chs] or [0]
ends = [c['from'] - 14 for c in _chs[1:]] + [tl['total_frames'] - 14]
sfx = np.zeros_like(narr)
def put(cue_f, buf):
    i0 = int(cue_f / FPS * SR)
    i1 = min(i0 + len(buf), total)
    if i0 < total:
        sfx[i0:i1] += buf[:i1 - i0]
pour_buf, wipe_buf = pour(), wipe()
for f in starts:
    put(f, pour_buf)
for f in ends:
    put(f, wipe_buf)
put(starts[0], pour())  # 开场呼应

mix = narr + bgm + sfx
mix = np.tanh(mix * 1.25) * 0.92
peak = float(np.max(np.abs(mix)))
if peak > 0.99:
    mix *= 0.99 / peak
wavfile.write(MIX, SR, (mix * 32767).astype(np.int16))
print(f'mix ok: {total / SR:.1f}s, peak {peak:.2f} → {MIX}')
