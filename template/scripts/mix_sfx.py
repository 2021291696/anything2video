#!/usr/bin/env python3
"""SFX 钉帧表混音：官方 mix_audio.py 之后的第三步（v3.7.0 统一工具，收敛自 samples-v34/d8 工程内副本）。
读 public/assets/<slug>/audio.wav（旁白+BGM 混音产物），按 cues 表把音效逐条叠加到指定帧，
写回 audio.wav 并在 audio/sfx/sfx-mix.json 记台账（帧/增益/输入输出 sha256）。同输入同表=同输出。

- cues 表：默认 audio/sfx/cues.json，可 --cues 指定。schema：
  {"schemaVersion": 1, "cues": [
    {"frame": 210, "file": "seal-stamp.wav", "gain": 0.30, "offset": 0.0, "dur": null, "note": "SC02 朱印落"}
  ]}
  frame 1 起含端点（分镜阶段按 sound-design §4.5 相对 shot 起点换算成绝对帧再登记）；
  file 相对工程 audio/sfx/（也接受绝对路径）；offset/dur 在样本侧切片取音效片段。
- 防双混：台账 output_sha256 与当前 audio.wav 一致 = 已叠过，拒绝重跑；重跑 mix_audio 后
  audio.wav 变化，直接重跑本步即可，确要同输入重叠才用 --force。
用法：uv run python scripts/mix_sfx.py [--cues audio/sfx/cues.json] [--force] [--legacy-config] [--fps N]
依赖：numpy scipy（wav 读写）；ffmpeg（音效解码）
"""
import argparse, hashlib, json, os, pathlib, subprocess, sys

import numpy as np
from audio_project import AudioProject
from scipy.io import wavfile

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as stream:
        for block in iter(lambda: stream.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def decode(path, offset=0.0, dur=None):
    # 参数列表内联直跑（不进 shell）；offset/dur 在样本侧切片（音效文件都很小，不值得输入寻址）。
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
        capture_output=True, check=True, shell=False).stdout
    x = np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(np.float64)
    if offset > 0:
        x = x[int(round(offset * SR)):]
    if dur is not None:
        x = x[:int(dur * SR)]
    return x


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cues')
parser.add_argument('--force', action='store_true')
parser.add_argument('--legacy-config', action='store_true')
parser.add_argument('--fps', type=int)
options = parser.parse_args()
try:
    PROJECT = AudioProject(ROOT, options.legacy_config, options.fps)
    A_DIR = PROJECT.path(PROJECT.assets)
    SFX_DIR = os.path.join(ROOT, 'audio', 'sfx')
    WAV = os.path.join(A_DIR, 'audio.wav')
    cues_path = options.cues or os.path.join(SFX_DIR, 'cues.json')
    PROJECT.preflight(WAV, cues_path)
except (ValueError, OSError) as error:
    raise SystemExit(f'[mix_sfx] {error}') from None

LEDGER = os.path.join(SFX_DIR, 'sfx-mix.json')
spec = json.loads(pathlib.Path(cues_path).read_text(encoding='utf-8'))
if not isinstance(spec, dict) or spec.get('schemaVersion') != 1 or not isinstance(spec.get('cues'), list):
    raise SystemExit('[mix_sfx] cues 表需 {"schemaVersion":1,"cues":[...]}')
for index, cue in enumerate(spec['cues']):
    if not isinstance(cue, dict) or not isinstance(cue.get('frame'), int) or isinstance(cue.get('frame'), bool) or cue['frame'] < 1:
        raise SystemExit(f'[mix_sfx] cues[{index}] 缺 1 起的整数 frame')
    if not isinstance(cue.get('file'), str) or not cue['file'].strip():
        raise SystemExit(f'[mix_sfx] cues[{index}] 缺 file')
    gain = cue.get('gain', 0.2)
    if not isinstance(gain, (int, float)) or isinstance(gain, bool) or not 0 < gain <= 1:
        raise SystemExit(f'[mix_sfx] cues[{index}] gain 需在 (0,1]：{gain}')
    if cue.get('offset', 0) < 0 or (cue.get('dur') is not None and cue.get('dur') <= 0):
        raise SystemExit(f'[mix_sfx] cues[{index}] offset/dur 非法')

def resolve(file):
    return file if os.path.isabs(file) else os.path.join(SFX_DIR, file)

missing = sorted({cue['file'] for cue in spec['cues'] if not os.path.exists(resolve(cue['file']))})
if missing:
    raise SystemExit('[mix_sfx] 音效文件缺失（从 skill 的 assets/audio/sfx 拷入工程 audio/sfx/）：' + ', '.join(missing))

if os.path.exists(LEDGER):
    prior = json.loads(pathlib.Path(LEDGER).read_text(encoding='utf-8'))
    if not options.force and prior.get('output_sha256') == sha256_file(WAV):
        raise SystemExit('[mix_sfx] 台账显示当前 audio.wav 已叠过本表（output_sha256 一致）；'
                         '重跑 mix_audio 后再跑本步，或 --force 才允许同输入重叠。')

mix_in_sha = sha256_file(WAV)
master = decode(WAV)
total = len(master)
FPS = PROJECT.fps
sfx = np.zeros_like(master)
entries = []
for cue in spec['cues']:
    buf = decode(resolve(cue['file']), cue.get('offset') or 0.0, cue.get('dur'))
    i0 = int(round((cue['frame'] - 1) / FPS * SR))
    if i0 >= total:
        entries.append({**cue, 'skipped': 'cue beyond film end'})
        continue
    i1 = min(i0 + len(buf), total)
    sfx[i0:i1] += buf[:i1 - i0] * cue['gain']
    entries.append({**cue, 'placed_at_frame': cue['frame'], 'src_frames': round(len(buf) / SR * FPS)})

out = master + sfx
peak = float(np.max(np.abs(out)))
renorm = None
if peak > 0.95:
    out *= 0.95 / peak
    renorm = 0.95 / peak
wavfile.write(WAV, SR, (out * 32767).astype(np.int16))
ledger = {
    'schema_version': 2,
    'tool': 'template/scripts/mix_sfx.py (v3.7.0 unified; step 3 after mix_audio)',
    'cues_source': os.path.relpath(cues_path, ROOT).replace('\\', '/'),
    'narration_bgm_mix_sha256': mix_in_sha,
    'output_sha256': sha256_file(WAV),
    'sample_rate': SR, 'channels': 2, 'fps': FPS,
    'peak_before_renorm': peak, 'renorm_scale': renorm,
    'cues': entries,
}
pathlib.Path(LEDGER).write_text(json.dumps(ledger, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
placed = sum(1 for entry in entries if 'skipped' not in entry)
print(f'sfx mix ok: {placed}/{len(entries)} cues, peak {peak:.2f} -> {WAV}')
