#!/usr/bin/env python3
"""实测每条音效的听感 landmarks：时长、onset（首瞬态）、peak 时间与电平。

用于音效落点对齐：短音（click/pop/ding）钉 onset——cue.at = 动作帧/30 − onset；
whoosh/impact 钉 peak；peak 电平用于定增益（合成音效常在 -12~-20dBFS，录音素材近 0dBFS）。
只依赖 ffmpeg 解码。手法自研（通用 DSP 测量）。

用法：python scripts/sfx_landmarks.py sfx/*.wav [--json]
"""
import argparse, json, math, subprocess, sys
import numpy as np
from pathlib import Path

RATE = 48000


def samples(path: Path) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(RATE), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768


def landmarks(path: Path, threshold=0.3):
    x = samples(path)
    if len(x) == 0:
        raise ValueError(f'{path}: 无音频')
    env = np.abs(x)
    peak_i = int(np.argmax(env))
    peak = env[peak_i]
    onset_i = next((i for i, v in enumerate(env) if v >= threshold * peak), 0)
    return {
        'file': path.name,
        'duration': round(len(x) / RATE, 3),
        'onset': round(onset_i / RATE, 3),
        'peak_time': round(peak_i / RATE, 3),
        'peak_dbfs': round(20 * math.log10(max(peak, 1e-9)), 1),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('files', nargs='+', type=Path)
    ap.add_argument('--json', action='store_true')
    args = ap.parse_args()
    rows = [landmarks(f) for f in args.files]
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=1))
        return
    print(f"{'file':<16} {'dur':>6} {'onset':>7} {'peak_t':>7} {'peak_dBFS':>9}")
    for r in rows:
        print(f"{r['file']:<16} {r['duration']:>6} {r['onset']:>7} {r['peak_time']:>7} {r['peak_dbfs']:>9}")
    print('— cue.at = 动作帧/30 − onset（短音）；whoosh/impact 用 peak_time 对齐顶点')


if __name__ == '__main__':
    main()
