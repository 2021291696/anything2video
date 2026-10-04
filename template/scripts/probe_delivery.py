#!/usr/bin/env python3
"""
probe_delivery.py —— 交付规格实测探针（交付说明的规格数字唯一来源）

用法:
  python scripts/probe_delivery.py renders/<slug>_v1.mp4
  python scripts/probe_delivery.py renders/x.mp4 --expect-height 1080 --expect-duration 48.4

为什么存在：2026-10-03 事故——成片实为 1280x720，交付说明手写「1080P」。
自本探针起，交付说明里的时长/分辨率/fps/大小/音轨一律从这里复制，禁止手写
（SKILL.md 阶段 8 纪律）。

退出码：0 = 通过；1 = 规格断言失败；2 = ffprobe/文件缺失。
"""

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')


def run_ffprobe(cmd):
    # 参数列表调用（shell=False），cmd 由 probe() 内固定 ffprobe 参数 + 已校验存在的文件路径构成
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")


def probe(video: Path) -> dict:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        sys.exit("Error: ffprobe 不在 PATH（渲染管线依赖 ffmpeg，先修环境）")
    if not video.exists():
        sys.exit(f"Error: {video} 不存在")
    cmd = [
        ffprobe, "-v", "error",
        "-show_entries", "stream=codec_type,width,height,r_frame_rate,codec_name,sample_rate,channels",
        "-show_entries", "format=duration,size",
        "-of", "json", str(video),
    ]
    out = run_ffprobe(cmd)
    if out.returncode != 0:
        sys.exit(f"Error: ffprobe 失败：{out.stderr[:300]}")
    return json.loads(out.stdout)


def main() -> None:
    ap = argparse.ArgumentParser(description="交付规格实测（交付说明数字唯一来源）")
    ap.add_argument("video", type=Path)
    ap.add_argument("--expect-height", type=int, help="断言分辨率高（如 1080）")
    ap.add_argument("--expect-fps", type=int, help="断言帧率")
    ap.add_argument("--expect-duration", type=float, help="断言时长（±15%% 容差）")
    ap.add_argument("--json", action="store_true", help="机器可读输出")
    args = ap.parse_args()

    meta = probe(args.video)
    streams = meta.get("streams") or []
    vstream = next((s for s in streams if s.get("width")), {})
    astream = next((s for s in streams if s.get("channels") or s.get("sample_rate")), {})
    fmt = meta.get("format", {})

    width, height = vstream.get("width"), vstream.get("height")
    num, _, den = (vstream.get("r_frame_rate") or "0/1").partition("/")
    fps = round(int(num) / int(den or 1), 2) if den and int(den) else 0
    duration = round(float(fmt.get("duration", 0)), 2)
    size_mb = round(int(fmt.get("size", 0)) / 1024 / 1024, 1)
    vcodec = vstream.get("codec_name", "?")
    acodec = astream.get("codec_name", "无")
    ar = astream.get("sample_rate", "")
    ch = {1: "单声道", 2: "立体声"}.get(astream.get("channels"), f"{astream.get('channels', '?')}ch")

    result = {
        "file": str(args.video), "duration_s": duration, "width": width, "height": height,
        "fps": fps, "vcodec": vcodec, "acodec": acodec, "sample_rate": ar,
        "channels": ch, "size_mb": size_mb,
    }
    if not args.json:
        print("== probe_delivery ==")
        print(f"  时长 {duration}s | {width}x{height} @ {fps}fps ({vcodec}) | {size_mb} MB | "
              f"音轨 {acodec}{(' ' + str(ar) + 'Hz ' + ch) if acodec != '无' else ''}")
        print("  交付说明规格块（复制使用，禁手写）：")
        print(f"  - 成片：{duration}s / {width}x{height} @ {fps}fps / {size_mb} MB"
              f"{f' / 音轨 {acodec} {ar}Hz {ch}' if acodec != '无' else ' / 无音轨'}")

    fails = []
    if args.expect_height and height != args.expect_height:
        fails.append(f"分辨率高实测 {height} ≠ 声明 {args.expect_height}")
    if args.expect_fps and abs(fps - args.expect_fps) > 0.05:
        fails.append(f"帧率实测 {fps} ≠ 声明 {args.expect_fps}")
    if args.expect_duration and abs(duration - args.expect_duration) > args.expect_duration * 0.15:
        fails.append(f"时长实测 {duration}s 偏离目标 {args.expect_duration}s 超 15%")
    if fails:
        if args.json:
            print(json.dumps({**result, 'pass': False, 'errors': fails}, ensure_ascii=False))
            sys.exit(1)
        print("\n❌ 规格断言 FAIL：")
        for f in fails:
            print(f"   - {f}")
        sys.exit(1)
    if args.json:
        print(json.dumps({**result, 'pass': True, 'errors': []}, ensure_ascii=False))
    else:
        print("\nPASS")


if __name__ == "__main__":
    main()
