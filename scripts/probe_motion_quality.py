#!/usr/bin/env python3
# /// script
# dependencies = ["numpy", "pillow"]
# ///
"""成片级运动连续性探针：运动面积 / 静止帧对 / 孤立跳变 / 最长静止段，出数字＋跳变证据拼图。

    uv run python scripts/probe_motion_quality.py <成片.mp4> [--fps 10] [--thresh 12] [--out qc/motion]

判据移植自 huashu-art-motion qa.py（MIT），判读阈值是经验值、线索不定罪（豁免与定性纪律见
production-contract「三轮证据」）：呼吸章、结尾定帧、阅读镜头是合法静止——先对 beat-sheet 与
分镜的豁免登记再定性，不能拿本探针的数字直接判过或判死。

  运动面积%   相邻采样帧变化像素（三通道最大差 > --thresh）占比的均值；0.5–8% 多数镜头健康，
              >15% 连续多帧通常是推拉/全屏转场（对照跳变表读）。
  静止帧对%   相邻帧几乎不变（变化像素 <0.05%）的比例；>40% 读作卡——合法静止另算。
  孤立跳变    单帧差 >3% 且 >6× 局部中位数（±3 对中位数）；连续多帧的大差是运镜不是跳变。
              每处跳变都要去看帧：穿帮、闪烁、整层低帧率换种子重洗（huashu 实测读作「画在闪」）
              都冒在这里。证据拼图已给出前后帧对照。
  最长静止    连续静止秒数；对照分镜的定帧设计核（结尾定帧 0.8–1.2s 是合同值）。

产物：<out>/motion.json（全部数字）、<out>/spikes.jpg（每处跳变前后帧并排，最多 8 处）、
<out>/heat.jpg（全片运动热图，红色越亮动得越多）。
退出码：0=已出报告（线索性工具）；2=无法读取视频。它证明所测项，不替代整片播放（motion
check 仍是 method=playback）；本探针的 JSON 与拼图可作为该轮 motion check 的 evidence 之一。
"""
import argparse, json, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
ap.add_argument('video'); ap.add_argument('--fps', type=float, default=10)
ap.add_argument('--thresh', type=float, default=12, help='像素差阈值（0-255，单通道最大差）')
ap.add_argument('--out', default='qc/motion'); ap.add_argument('--width', type=int, default=320, help='分析分辨率宽（高按画幅比）')
a = ap.parse_args()
out = Path(a.out); out.mkdir(parents=True, exist_ok=True)

def probe():
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,duration', '-of', 'json', a.video], capture_output=True, text=True)
    s = json.loads(r.stdout)['streams'][0]
    n, d = s['r_frame_rate'].split('/')
    return int(s['width']), int(s['height']), float(n) / float(d), float(s.get('duration') or 0)

W, H, FPS, DUR = probe()
if W <= 0 or H <= 0: raise SystemExit(2)
AH = max(2, round(a.width * H / W) // 2 * 2)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.video, '-vf', f'fps={a.fps},scale={a.width}:{AH}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8)
if fr.size == 0:
    print(json.dumps({'pass': False, 'errors': ['cannot read frames from video']}, ensure_ascii=False)); raise SystemExit(2)
frames = fr.reshape(-1, AH, a.width, 3).astype(np.int16)
n = len(frames)
if n < 4:
    print(json.dumps({'pass': False, 'errors': [f'too few sampled frames: {n}']}, ensure_ascii=False)); raise SystemExit(2)

diffs = np.array([(np.abs(frames[i + 1] - frames[i]).max(axis=2) > a.thresh).mean() * 100 for i in range(n - 1)])
med = float(np.median(diffs)) if len(diffs) else 0.0
# 片级探针按「动一下、定住」的整片形态读：跳变只认孤立尖峰（比前后 ±3 对的中位数大 6 倍），
# 连续多帧的大差是推拉/全屏转场，单列区间不逐帧记。
def loc(i): return float(np.median(np.r_[diffs[max(0, i - 3):i], diffs[i + 1:i + 4]])) if len(diffs) > 1 else 0.0
spikes = [round((i + 1) / a.fps, 3) for i, dv in enumerate(diffs) if dv > 3 and dv > 6 * max(loc(i), 0.05)]
still = float((diffs < 0.05).mean() * 100)
# 最长连续静止段
longest, cur = 0.0, 0
for dv in diffs:
    if dv < 0.05: cur += 1; longest = max(longest, cur)
    else: cur = 0
longest_s = round(longest / a.fps, 2)

heat = np.zeros((AH, a.width), np.float32)
for i in range(n - 1): heat += (np.abs(frames[i + 1] - frames[i]).max(axis=2) > a.thresh)
hm = np.clip(heat / max(1.0, heat.max()) * 255, 0, 255).astype(np.uint8)
base = Image.fromarray(frames[0].astype(np.uint8)).convert('L').convert('RGB')
red = np.zeros((AH, a.width, 3), np.uint8); red[..., 0] = hm
Image.blend(base, Image.fromarray(red), 0.6).save(out / 'heat.jpg', quality=85)

# 跳变证据拼图：每处跳变的前后采样帧并排
cap = spikes[:8]
if cap:
    cell_w, cell_h = a.width, AH
    S = Image.new('RGB', (2 * cell_w * min(len(cap), 4), ((len(cap) + 3) // 4) * (cell_h + 18) or (cell_h + 18)), 'white')
    dr = ImageDraw.Draw(S)
    for k, ts in enumerate(cap):
        i0 = min(n - 1, max(0, round(ts * a.fps)))
        row, col = k % 4, k // 4
        for j, fi in enumerate((max(0, i0 - 1), min(n - 1, i0 + 1))):
            S.paste(Image.fromarray(frames[fi].astype(np.uint8)), ((row * 2 + j) * cell_w, col * (cell_h + 18) + 18))
        dr.text(((row * 2) * cell_w + 4, col * (cell_h + 18) + 3), f'{ts}s diff {diffs[i0 - 1] if 0 < i0 <= len(diffs) else 0:.1f}%', fill='black')
    S.save(out / 'spikes.jpg', quality=85)

report = {
    'tool': 'probe_motion_quality', 'video': str(Path(a.video).resolve()), 'analyze_fps': a.fps, 'analyze_size': [a.width, AH],
    'sampled_frames': n, 'duration_sec': round(n / a.fps, 2),
    'motion_pct_mean': round(float(diffs.mean()), 2), 'motion_pct_max': round(float(diffs.max()), 2),
    'still_pairs_pct': round(still, 1), 'longest_still_sec': longest_s,
    'isolated_spikes': spikes, 'spike_count': len(spikes),
    'thresholds': {'thresh': a.thresh, 'spike_rule': '>3% and >6x local median (±3 pairs)', 'still_pair': '<0.05% pixels changed'},
    'advisory': '线索不定罪：合法静止（呼吸章/定帧/阅读镜头）以分镜与 beat-sheet 豁免登记为准；定性归三轮验收。',
    'artifacts': {'heat': str(out / 'heat.jpg'), 'spikes': str(out / 'spikes.jpg') if cap else None},
}
(out / 'motion.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
print(f"运动 {report['motion_pct_mean']}%（峰 {report['motion_pct_max']}%）  静止帧对 {report['still_pairs_pct']}%  最长静止 {longest_s}s  孤立跳变 {len(spikes)} 处 {spikes[:5]}")
print('->', out / 'motion.json')
