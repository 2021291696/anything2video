#!/usr/bin/env python3
"""BGM 拍点网格：实测 BPM、拍点与重拍（4/4 假设）秒表/帧表，供分镜卡点（motion-language.md §6）。

手法自研（通用 DSP：频谱通量 onset 包络 + 自相关测速 + 相位扫描对格），只依赖 ffmpeg 解码与 numpy。
流程位置：阶段 2 选定 BGM 后、阶段 3 分镜前由主脚本跑；程序编曲（score_gen）BPM 已知直接引用，静音片跳过。

用法（项目根跑）：
  python scripts/beat_grid.py public/assets/<slug>/bgm.wav --out script/beat_grid.json [--fps 30]
产出 JSON：bpm / bpm_confidence / reliable（conf<CONF_MIN=false，此曲无清晰拍点勿卡拍）/ beat_interval_s / first_beat_s / beats_s / downbeats_s（含帧表）。
诚实口径：BPM 由自相关估计（置信度=峰均值比）；重拍按 4/4 假设对齐，非 4/4 曲目重拍行仅供参考。
自测：python scripts/beat_grid.py --selftest   # 合成 120BPM 点击轨，断言测速/对格误差
"""
import argparse, json, math, subprocess, sys
import numpy as np
from pathlib import Path

RATE = 22050
N_FFT = 1024
HOP = 256
BPM_MIN, BPM_MAX = 60.0, 180.0
CONF_MIN = 3.0  # 置信度门槛：低于此值视为无清晰拍点（自测合成轨 ≈2.4、真实乐句 ≈8.6，门槛设在两者之间偏下）


def samples(path: Path) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(RATE),
                          '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768.0


def onset_envelope(x: np.ndarray) -> np.ndarray:
    """频谱通量（半波整流的幅度谱增量），再做 3 帧滑动平均。"""
    n = (len(x) - N_FFT) // HOP + 1
    if n < 8:
        raise SystemExit('音频太短，无法分析（<0.2s）')
    win = np.hanning(N_FFT)
    frames = np.lib.stride_tricks.as_strided(
        x, shape=(n, N_FFT), strides=(x.strides[0] * HOP, x.strides[0])).copy()
    mag = np.abs(np.fft.rfft(frames * win, axis=1))
    flux = np.maximum(0.0, np.diff(mag, axis=0)).sum(axis=1)
    flux = np.concatenate([[0.0], flux])
    if flux.max() > 0:
        flux /= flux.max()
    kernel = np.ones(3) / 3.0
    return np.convolve(flux, kernel, mode='same')


def pick_peaks(env: np.ndarray, hop_s: float, min_gap_s=0.12, delta=0.08) -> np.ndarray:
    """自适应阈值取峰：局部均值 + delta，峰间距下限防抖。"""
    half = max(1, int(round(0.35 / hop_s)))
    peaks = []
    for i in range(1, len(env) - 1):
        if env[i] < env[i - 1] or env[i] < env[i + 1]:
            continue
        lo, hi = max(0, i - half), min(len(env), i + half + 1)
        if env[i] >= env[lo:hi].mean() + delta * (env.max() if env.max() > 0 else 1.0):
            if peaks and (i - peaks[-1]) * hop_s < min_gap_s:
                if env[i] > env[peaks[-1]]:
                    peaks[-1] = i
                continue
            peaks.append(i)
    return np.array(peaks, dtype=int)


def estimate_bpm(env: np.ndarray, hop_s: float):
    """自相关测速：60–180 BPM 拉格窗内取最大峰；置信度=峰/均值。"""
    ac = np.correlate(env, env, mode='full')[len(env) - 1:]
    lag_lo = int(round(60.0 / BPM_MAX / hop_s))
    lag_hi = min(len(ac) - 1, int(round(60.0 / BPM_MIN / hop_s)))
    if lag_hi <= lag_lo + 2:
        return None, 0.0
    seg = ac[lag_lo:lag_hi + 1]
    k = int(np.argmax(seg)) + lag_lo
    # 二分精化：抛物线插值峰位
    if 0 < k - lag_lo < len(seg) - 1:
        y0, y1, y2 = seg[k - lag_lo - 1], seg[k - lag_lo], seg[k - lag_lo + 1]
        denom = (y0 - 2 * y1 + y2)
        shift = 0.5 * (y0 - y2) / denom if abs(denom) > 1e-12 else 0.0
        k = k + shift
    bpm = 60.0 / (k * hop_s)
    conf = float(seg.max() / max(seg.mean(), 1e-9))
    return bpm, conf


def beat_phase(env: np.ndarray, hop_s: float, period_s: float) -> float:
    """相位扫描：在 [0, period) 内找与 onset 包络对齐最好的第一个拍点。"""
    n_phase = max(8, int(round(period_s / hop_s)))
    best, best_score = 0.0, -1.0
    for p in range(n_phase):
        t0 = p * hop_s
        idx = np.arange(t0, len(env) * hop_s, period_s) / hop_s
        idx = idx[idx < len(env)].astype(int)
        if len(idx) == 0:
            continue
        score = float(env[idx].mean())
        if score > best_score:
            best_score, best = score, t0
    return best


def downbeat_offset(beats_s: np.ndarray, env: np.ndarray, meter=4):
    """4/4 假设：在 meter 个候选小节头对齐里选 onset 能量总和最大的一路。"""
    if len(beats_s) < meter:
        return 0
    hop_s = HOP / RATE
    best, best_score = 0, -1.0
    for off in range(meter):
        idx = ((beats_s[off::meter]) / hop_s).astype(int)
        idx = idx[idx < len(env)]
        score = float(env[idx].mean()) if len(idx) else -1.0
        if score > best_score:
            best_score, best = score, off
    return best


def analyze(x: np.ndarray, fps: int) -> dict:
    hop_s = HOP / RATE
    env = onset_envelope(x)
    duration = len(x) / RATE
    bpm, conf = estimate_bpm(env, hop_s)
    if bpm is None:
        raise SystemExit('拍点估计失败：曲目节奏成分不足（60–180 BPM 窗内无自相关峰）')
    period = 60.0 / bpm
    first = beat_phase(env, hop_s, period)
    beats_s = np.arange(first, duration, period)
    off = downbeat_offset(beats_s, env)
    downbeats_s = beats_s[off::4]
    return {
        'duration_s': round(duration, 3),
        'bpm': round(float(bpm), 2),
        'bpm_confidence': round(conf, 2),
        'beat_interval_s': round(period, 4),
        'first_beat_s': round(float(first), 4),
        'beats_s': [round(float(t), 3) for t in beats_s],
        'downbeats_s': [round(float(t), 3) for t in downbeats_s],
        'fps': fps,
        'beats_frame': [int(round(t * fps)) for t in beats_s],
        'downbeats_frame': [int(round(t * fps)) for t in downbeats_s],
        'meter_assumption': '4/4',
    }


def selftest() -> int:
    """合成 120 BPM、强拍在 1/3 拍位的 12s 点击轨，断言测速与对格误差。"""
    rng = np.random.default_rng(7)
    bpm_true = 120.0
    period = 60.0 / bpm_true
    t = np.arange(0, 12.0, 1 / RATE)
    x = np.zeros_like(t)
    for i, bt in enumerate(np.arange(0.0, 12.0, period)):
        amp = 0.9 if i % 4 == 0 else 0.55
        n = int(bt * RATE)
        m = min(int(0.05 * RATE), len(x) - n)
        click_t = np.arange(m) / RATE
        x[n:n + m] += amp * np.sin(2 * np.pi * 1000 * click_t) * np.exp(-click_t * 90)
    x += rng.normal(0, 0.01, len(x))
    g = analyze(x, 30)
    bpm_err = abs(g['bpm'] - bpm_true)
    expect = np.arange(0.0, 12.0, period)
    got = np.array(g['beats_s'])
    phase_err = float(np.abs(((got[0] - expect[0]) + period / 2) % period - period / 2))
    grid_err = np.abs((got[:, None] - expect[None, :]))
    dev = float(grid_err.min(axis=1).mean())
    ok = bpm_err <= 2.0 and phase_err <= 0.05 and dev <= 0.05
    print(f"selftest: bpm={g['bpm']} (err {bpm_err:.2f}) phase_err={phase_err * 1000:.0f}ms "
          f"grid_dev={dev * 1000:.0f}ms conf={g['bpm_confidence']} -> {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('audio', nargs='?', help='BGM 音频路径（wav/mp3）')
    ap.add_argument('--out', default='script/beat_grid.json', help='输出 JSON 路径（默认 script/beat_grid.json）')
    ap.add_argument('--fps', type=int, default=30, help='帧率换算（默认 30）')
    ap.add_argument('--selftest', action='store_true', help='跑内置合成轨自测')
    a = ap.parse_args()
    if a.selftest:
        sys.exit(selftest())
    if not a.audio:
        ap.error('需要 audio 路径（或 --selftest）')
    g = analyze(samples(Path(a.audio)), a.fps)
    g['input'] = str(a.audio)
    g['reliable'] = g['bpm_confidence'] >= CONF_MIN
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"beat_grid: BPM≈{g['bpm']} (conf {g['bpm_confidence']}, 4/4 假设) 拍点 {len(g['beats_s'])} 个"
          f" / 重拍 {len(g['downbeats_s'])} 个，首拍 {g['first_beat_s']}s -> {out}")
    print(f"  重拍前 8 个(s): {g['downbeats_s'][:8]}")
    print(f"  重拍前 8 个(帧): {g['downbeats_frame'][:8]}")
    if not g['reliable']:
        print(f"  ⚠ 置信度 {g['bpm_confidence']} < {CONF_MIN}：此曲节奏成分弱、拍点网格不可靠——"
              f"节拍列按字幕块起始帧排（不卡拍），见 reference/motion-language.md §6 可靠性门")


if __name__ == '__main__':
    main()
