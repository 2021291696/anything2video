#!/usr/bin/env python3
"""程序化原创配乐（promo BGM 三级来源第 3 级）：段落按句/镜头边界排，乐谱源码随项目交付。

手法自研（借鉴 guizang product video skill 的思路：编曲即代码、段落=叙事段、按主体气质选声音；
实现为全新编写，无外部代码/采样/模型依赖）。BPM 按段落总长自动微调对齐小节边界。

用法（项目根跑）：
  python scripts/score_gen.py --timeline script/timeline.json --out public/assets/<slug>/bgm_score.wav \
      --mood cinematic --seed 7
mood：cinematic（小调电影感，默认 100bpm）/ light（大调轻快，112bpm）/ lofi（慢拍电钢，88bpm）
产出：48k 立体声 16bit wav，RMS 归一到 ≈-26dBFS 响度床（混音命令会再归一/压低）。
验收：先试听（或看波形/RMS），过了才进混音；乐谱源码即本脚本 + 命令行参数，随项目归档。
"""
import argparse, json, math, wave, struct
import numpy as np
from pathlib import Path

RATE = 48000
MOODS = {
    # mood: (bpm, 根音midi, 级数进行 [半音偏移 × 4 和弦]，音色亮度)
    'cinematic': (100, 57, [0, -4, 3, -2], 0.9),   # Am–F–C–G 感（小调下沉→明亮收）
    'light':     (112, 60, [0, 7, 9, 5], 1.0),     # C–G–Am–F（大调轻快）
    'lofi':      (88, 53, [0, -2, -4, -5], 0.7),   # F–E–D–C 七和感（慵懒下行）
}
SEC_PER_BEAT = lambda bpm: 60.0 / bpm


def chord_notes(root, degree):
    """根音 + 三度堆叠（小三/大三按级数内嵌），返回 4 音和弦 midi。"""
    seq = [0, 3, 7, 10] if degree % 2 else [0, 4, 7, 11]  # 交替小三/大七质感
    return [root + degree + s for s in seq]


def env_ad(n, a, d):
    t = np.linspace(0, 1, n)
    e = np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-d * t)
    return e


def tone(freq, dur, amp, bright, rng):
    n = int(dur * RATE)
    t = np.arange(n) / RATE
    p = 2 * math.pi * freq * t
    w = np.sin(p) + bright * 0.28 * np.sin(2 * p) + bright * 0.12 * np.sin(3 * p)
    det = np.sin(2 * math.pi * freq * 1.0015 * t)  # 微失谐厚度
    return amp * (w + 0.35 * det) / 2.2


def add(buf_l, buf_r, start_s, sig, pan):
    off = int(start_s * RATE)
    n = min(len(sig), len(buf_l) - off)
    if n <= 0:
        return
    lg = math.sqrt((1 - pan) / 2); rg = math.sqrt((1 + pan) / 2)
    buf_l[off:off + n] += sig[:n] * lg
    buf_r[off:off + n] += sig[:n] * rg


def kick(dur=0.16):
    n = int(dur * RATE); t = np.arange(n) / RATE
    f = 130 * np.exp(-14 * t) + 42
    return 0.5 * np.sin(2 * np.pi * np.cumsum(f) / RATE) * env_ad(n, 0.002, 7)


def shaker(dur=0.05, rng=None):
    n = int(dur * RATE)
    x = rng.uniform(-1, 1, n)
    return 0.16 * np.diff(x, prepend=0) * env_ad(n, 0.01, 9)  # 一阶差分≈高通


def riser(dur=0.6, rng=None):
    n = int(dur * RATE)
    x = rng.uniform(-1, 1, n) * np.linspace(0.15, 1.0, n) ** 2
    return 0.2 * np.diff(x, prepend=0)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--timeline', type=Path, required=True, help='script/timeline.json（段落=句边界）')
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--mood', default='cinematic', choices=list(MOODS))
    ap.add_argument('--bpm', type=float, default=0, help='覆盖 mood 默认 bpm（会在 ±8%% 内自动微调对齐小节）')
    ap.add_argument('--seed', type=int, default=7)
    args = ap.parse_args()

    tl = json.loads(args.timeline.read_text(encoding='utf-8'))
    total_s = tl['total_frames'] / 30.0
    bounds = [s['from'] / 30.0 for s in tl['sentences']] + [total_s]
    sections = [(bounds[i], bounds[i + 1]) for i in range(len(bounds) - 1)]
    n_sec = len(sections)

    base_bpm, root, prog, bright = MOODS[args.mood]
    bpm = args.bpm or base_bpm
    # 段落=整数小节：在 ±8% 内搜 bpm，最小化各段 |bars - round(bars)|
    def fit(b):
        spb = SEC_PER_BEAT(b)
        err = 0.0
        for a, z in sections:
            bars = (z - a) / (spb * 4)
            err += abs(bars - round(bars))
        return err
    bpm = min(np.linspace(bpm * 0.92, bpm * 1.08, 65), key=fit)
    spb = SEC_PER_BEAT(bpm)

    rng = np.random.default_rng(args.seed)
    L = np.zeros(int(total_s * RATE) + RATE); R = np.zeros_like(L)

    # 能量曲线：intro 低起 → 中段爬升（证明段最高）→ 尾段收束
    levels = [1] + [min(2 + int(3 * i / max(n_sec - 2, 1)), 4) for i in range(n_sec - 2)] + [1] if n_sec > 2 else [2] * n_sec
    print(f'mood={args.mood} bpm={bpm:.2f} sections={n_sec} total={total_s:.2f}s levels={levels}')

    for si, (a, z) in enumerate(sections):
        lvl = levels[si]
        bars = max(1, round((z - a) / (spb * 4)))
        degree = prog[(si + rng.integers(0, 2)) % 4]
        notes = chord_notes(root, degree)
        for bar in range(bars):
            bt = a + bar * 4 * spb
            if bt >= z:
                break
            # pad：全能量段铺底
            for i, nn in enumerate(notes):
                f = 440 * 2 ** ((nn - 69) / 12)
                add(L, R, bt, tone(f, 4 * spb, 0.05 * (0.6 + 0.1 * lvl), bright * 0.6, rng), (i - 1.5) * 0.22)
            if lvl >= 2:  # bass：1/3 拍根音
                for beat in (0, 2):
                    f = 440 * 2 ** ((notes[0] - 24 - 69) / 12)
                    sig = tone(f, spb * 0.9, 0.16, 0.4, rng) * env_ad(int(spb * 0.9 * RATE), 0.01, 3)
                    add(L, R, bt + beat * spb, sig, 0)
            if lvl >= 3:  # keys 琶音：八分音符上行
                pattern = [1, 2, 3, 2, 1, 3, 2, 3]
                for st, idx in enumerate(pattern):
                    nn = notes[idx] + 12
                    f = 440 * 2 ** ((nn - 69) / 12)
                    sig = tone(f, spb * 0.55, 0.055 + 0.012 * (lvl - 3), bright, rng) * env_ad(int(spb * 0.55 * RATE), 0.004, 5)
                    add(L, R, bt + st * spb / 2, sig, -0.3 if st % 2 == 0 else 0.3)
            if lvl >= 4:  # 鼓组：底拍 kick + 反拍 shaker
                add(L, R, bt, kick(), 0); add(L, R, bt + 2 * spb, kick(), 0)
                for st in range(8):
                    if st % 2 == 1:
                        add(L, R, bt + st * spb / 2, shaker(rng=rng), 0.2 * rng.standard_normal())
        # 段落边界标记：软 riser 接下段（末段除外）
        if si < n_sec - 1 and lvl >= 2:
            add(L, R, z - 0.55, riser(rng=rng), 0)

    # 母带：软限幅 + RMS 归一到响度床 + 首尾淡入淡出
    mix = np.stack([L[:int(total_s * RATE)], R[:int(total_s * RATE)]])
    mix = np.tanh(mix * 1.2)
    rms = math.sqrt(float(np.mean(mix ** 2))) or 1e-9
    mix *= (10 ** (-26 / 20)) / rms
    fi, fo = int(0.8 * RATE), int(1.5 * RATE)
    mix[:, :fi] *= np.linspace(0, 1, fi)[None, :]
    mix[:, -fo:] *= np.linspace(1, 0, fo)[None, :]

    args.out.parent.mkdir(parents=True, exist_ok=True)
    data = (np.clip(mix, -1, 1) * 32767).astype('<i2').T.tobytes()
    with wave.open(str(args.out), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(data)
    print(f'written: {args.out} ({total_s:.1f}s, rms≈-26dBFS) — 试听验收后再进混音')


if __name__ == '__main__':
    main()
