#!/usr/bin/env python3
"""生成原创动作音效集（promo 音效标准轨的来源之一，免许可、可复生成）。

纯 numpy 合成，48k mono 16bit，峰值归一 ≈-12dBFS。生成后用 sfx_landmarks.py 实测
onset/peak 再钉 cue.at（短音钉 onset、whoosh 钉 peak）。手法自研，无外部素材依赖。

用法（项目根跑）：python scripts/make_sfx.py --out public/assets/<slug>/sfx
"""
import argparse, wave
import numpy as np
from pathlib import Path

RATE = 48000
PEAK = 10 ** (-12 / 20)


def env_ad(n, a, d):
    t = np.linspace(0, 1, n)
    return np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-d * t)


def norm(x, peak=PEAK):
    m = float(np.max(np.abs(x))) or 1e-9
    return (x / m) * peak


def write(out: Path, name, x):
    out.mkdir(parents=True, exist_ok=True)
    x = np.clip(x, -1, 1)
    data = (x * 32767).astype('<i2').tobytes()
    with wave.open(str(out / f'{name}.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(data)


def sine_drop(f0, f1, dur):
    n = int(dur * RATE); t = np.arange(n) / RATE
    f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / RATE)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--seed', type=int, default=11)
    args = ap.parse_args()
    rng = np.random.default_rng(args.seed)
    sfx = {}

    n = int(0.03 * RATE)  # click：噪声瞬态 + 短正弦
    x = np.diff(rng.uniform(-1, 1, n + 1)) * env_ad(n, 0.001, 12)
    x += 0.5 * np.sin(2 * np.pi * 1200 * np.arange(n) / RATE) * env_ad(n, 0.001, 14)
    sfx['click'] = x

    n = int(0.07 * RATE)  # pop：正弦下滑
    sfx['pop'] = sine_drop(640, 300, 0.07) * env_ad(n, 0.004, 8)

    n = int(0.5 * RATE)  # ding：基频+泛音长衰减
    t = np.arange(n) / RATE
    sfx['ding'] = (np.sin(2 * np.pi * 880 * t) + 0.3 * np.sin(2 * np.pi * 1760 * t)) * env_ad(n, 0.002, 6)

    n = int(0.34 * RATE)  # success：上行双音
    x = np.zeros(n)
    for i, f in enumerate((1046, 1318)):
        seg = int(0.15 * RATE); t2 = np.arange(seg) / RATE
        x[i * seg:i * seg + seg] += np.sin(2 * np.pi * f * t2) * env_ad(seg, 0.003, 5)
    sfx['success'] = x

    n = int(0.05 * RATE)  # toggle：短促方波质感
    t = np.arange(n) / RATE
    sfx['toggle'] = (np.sign(np.sin(2 * np.pi * 520 * t)) * 0.4 + np.sin(2 * np.pi * 520 * t) * 0.6) * env_ad(n, 0.002, 9)

    n = int(0.3 * RATE)  # error：低频双振
    x = np.zeros(n)
    for st in (0, 0.13):
        seg = int(0.1 * RATE); t2 = np.arange(seg) / RATE
        x[int(st * RATE):int(st * RATE) + seg] += (np.sin(2 * np.pi * 170 * t2) + 0.4 * np.sin(2 * np.pi * 340 * t2)) * env_ad(seg, 0.004, 6)
    sfx['error'] = x

    n = int(0.7 * RATE)  # whoosh：噪声拱形+由暗到亮（一阶差分亮度渐升）
    x = rng.uniform(-1, 1, n) * np.sin(np.linspace(0, np.pi, n)) ** 1.5
    bright = np.linspace(0.25, 1.0, n)
    sfx['whoosh'] = np.diff(x * bright, prepend=0) * 2.2

    n = int(0.4 * RATE)  # sweep：正弦上扫
    x = sine_drop(320, 1250, 0.4)
    sfx['sweep'] = x * np.sin(np.linspace(0, np.pi, n)) ** 0.8

    n = int(0.45 * RATE)  # typing：五连噪声点
    x = np.zeros(n)
    for k in range(5):
        seg = int(0.02 * RATE)
        x[int(k * 0.09 * RATE):int(k * 0.09 * RATE) + seg] += np.diff(rng.uniform(-1, 1, seg + 1)) * env_ad(seg, 0.001, 10)
    sfx['typing'] = x

    n = int(0.8 * RATE)  # resolve：大三和弦软垫收束
    t = np.arange(n) / RATE
    x = sum(np.sin(2 * np.pi * f * t) for f in (523.25, 659.25, 783.99)) / 3
    sfx['resolve'] = x * env_ad(n, 0.05, 3)

    for name, x in sfx.items():
        write(args.out, name, norm(x))
    print(f'written {len(sfx)} sfx → {args.out}（用 sfx_landmarks.py 实测 onset/peak 后钉 cue.at）')


if __name__ == '__main__':
    main()
