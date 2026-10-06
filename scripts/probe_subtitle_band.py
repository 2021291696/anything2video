#!/usr/bin/env python3
# /// script
# dependencies = ["numpy"]
# ///
"""字幕带门禁：扫「无字幕版」成片，字幕带里出现画面内容（深色或高亮像素簇）就报时间码。

    uv run python scripts/probe_subtitle_band.py <无字幕版成片.mp4> [--band-ratio 0.73] [--fps 10] [--dark 95] [--bright 0] [--thresh 150]

移植自 huashu-art-motion subzone_gate.py（MIT），按本 skill 的画幅参数化：
  竖屏 1080×1920 的字幕带约 y1400–1570 → --band-ratio 0.73（production-contract「竖屏」节的
  保守制作区）；横屏 1280×720 建议 0.78。发布预览按实际设备复核，这里只是制作侧门禁。

判读：
  --dark 95   数灰度 <95 的深色像素——浅底干净风格（版式/拼贴/蓝图/等轴）的主路，默认开。
  --bright 0  数灰度 >--bright 的亮像素，默认关。深底片（深空/黑板/终端）理论上内容是亮的，
              但星点/粒子/颗粒层会 flood（deep-space 样片实测 128/128 帧命中、单帧 13.8 万像素），
              要用就把 --thresh 抬到背景噪声之上并逐条看帧定性；纹理底两类路都大量误报。
  命中只给时间码区间与峰值像素数，**不定罪**：逐条看帧定性后记进该轮 QC，豁免口径随交付说明承接。
阈值是经验起点：换风格先拿已知好/坏两帧校 --thresh（huashu 实测 1080p 字幕带缩半后 >150 个像素）。
"""
import argparse, json, subprocess
from pathlib import Path
import numpy as np

ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
ap.add_argument('video')
ap.add_argument('--band-ratio', type=float, default=0.73, help='字幕带上沿占画高比例（竖屏 0.73，横屏 0.78）')
ap.add_argument('--fps', type=float, default=10)
ap.add_argument('--dark', type=int, default=95, help='深色像素阈值灰度；0=关闭该路')
ap.add_argument('--bright', type=int, default=0, help='亮像素阈值灰度；默认关闭。深底片慎用：星点/粒子/颗粒层会把命中刷满（实测 deep-space 样片 128/128 帧命中），只适合查特定亮色内容并把 --thresh 调高')
ap.add_argument('--thresh', type=int, default=150, help='命中像素数门槛（分析分辨率下）')
ap.add_argument('--width', type=int, default=960, help='分析分辨率宽')
ap.add_argument('--out', default='qc/subtitle-band', help='报告输出目录')
a = ap.parse_args()
out = Path(a.out); out.mkdir(parents=True, exist_ok=True)

def probe():
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', a.video], capture_output=True, text=True)
    s = json.loads(r.stdout)['streams'][0]
    return int(s['width']), int(s['height'])

W, H = probe()
band_top = round(H * a.band_ratio)
band_h = H - band_top
if band_h <= 0: raise SystemExit('band-ratio 必须在 0..1 之间且小于 1')
AW = a.width; AH = max(2, round(band_h * AW / W) // 2 * 2)
cmd = ['ffmpeg', '-v', 'error', '-i', a.video, '-vf',
       f'fps={a.fps},scale={AW}:{round(AW * H / W) // 2 * 2},crop={AW}:{AH}:0:{round(AW * band_top / W) // 2 * 2}',
       '-f', 'rawvideo', '-pix_fmt', 'gray', '-']
raw = subprocess.run(cmd, capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8)
if fr.size == 0: raise SystemExit(2)
frames = fr.reshape(-1, AH, AW)
modes = {}
if a.dark > 0: modes['dark'] = a.dark
if a.bright > 0 and a.bright > a.dark: modes['bright'] = a.bright

report = {'tool': 'probe_subtitle_band', 'video': str(Path(a.video).resolve()), 'size': [W, H],
          'band_top_px': band_top, 'band_ratio': a.band_ratio, 'analyze_fps': a.fps, 'frames': len(frames), 'hits': {}}
for name, th in modes.items():
    bad = []
    for i, f in enumerate(frames):
        cnt = int((f < th).sum()) if name == 'dark' else int((f > th).sum())
        if cnt > a.thresh: bad.append((i / a.fps, cnt))
    runs = []
    for t, c in bad:
        if runs and t - runs[-1][1] <= 1.5 / a.fps: runs[-1][1] = t; runs[-1][2] = max(runs[-1][2], c)
        else: runs.append([round(t, 2), round(t, 2), c])
    report['hits'][name] = {'threshold_gray': th, 'hit_frames': len(bad), 'runs': [{'from_sec': r[0], 'to_sec': r[1], 'max_px': r[2]} for r in runs]}
    print(f"[{name}] {len(bad)} 帧命中 / {len(frames)} 帧")
    for r in runs: print(f"   {r[0]:7.2f}–{r[1]:7.2f}s  最多 {r[2]} 像素")
(out / 'subtitle_band.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
print('->', out / 'subtitle_band.json')
print('线索不定罪：命中逐条看帧定性，豁免口径随交付说明承接。')
