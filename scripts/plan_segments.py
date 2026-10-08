#!/usr/bin/env python3
# 移植自 lanshu-create-ai-presenter-video/scripts/plan_segments.py（MIT，cclank），许可登记 LICENSE-THIRDPARTY/MIT-lanshu-create-ai-presenter-video.txt
"""a2v 分段规划器（plan_segments）：路线 C（图生视频）按锁定配音的真实停顿切分段。

定位：Seedance 类图生视频 API 有单请求时长上限，长配音必须切成多段分批生成。
本脚本在锁定配音的**真实停顿**里找切点——切点永远落在 >= --min-gap 秒的词间
静默里，保证没有任何一段在词中间开合；贪心取「窗口内最晚可用停顿」，段尽量
长、接缝尽量少。

用法（纯 stdlib 零依赖）：
  uv run --no-project python <skill>/scripts/plan_segments.py \
    --timings timings.json --audio-duration 96.5 --cap 10 --whole-seconds \
    --output segment_plan.json

--timings 输入格式：[{"start": 秒, "end": 秒, "text": "..."}] —— 词级或句级
时间戳，单位秒。a2v 侧适配口径（二选一）：
  1. 由 script/timeline.json 的 sentences（帧号）除以 fps 换算成秒；
  2. 直接用 ASR 产物（whisper 类 word/sentence 段，锁定配音重转写所得）。
配音时长可用 --audio（ffprobe 实测）或 --audio-duration 直给。

输出 JSON：segments 每段带 requested_seconds（whole-seconds 时向上取整的请求
时长），合计 total_requested_seconds **直接进计费报价**；seams_s 为切点秒位；
ends_in_pause_s 标注每段结尾所在停顿区间（尾段为 null）；authored_* /
source_start_s 供下游剪辑对位。

--self-test：跑内置断言（纯计算、不写文件）——正路径复现 lanshu 冒烟锁定值
（seams_s==[4.0]、requested_seconds==[4,2]），负路径验证时间戳末尾超出音频
时长 0.3s 被拒绝。
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
from pathlib import Path
from typing import Any


EPSILON = 1e-6


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timings", help="ASR spans as a JSON list")
    duration = parser.add_mutually_exclusive_group()
    duration.add_argument("--audio", help="Locked narration file (probed for duration)")
    duration.add_argument("--audio-duration", type=float, help="Narration seconds")
    parser.add_argument(
        "--cap",
        type=float,
        help="Longest segment the provider accepts; use the smallest of its video and reference-audio limits",
    )
    parser.add_argument("--min-gap", type=float, default=0.25, help="Shortest pause to cut in")
    parser.add_argument("--min-segment", type=float, default=2.0, help="Shortest segment to plan")
    parser.add_argument(
        "--whole-seconds",
        action="store_true",
        help="Provider requests and bills whole seconds; prefer integer cuts inside pauses",
    )
    parser.add_argument("--output", help="Also write the plan to this JSON file")
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Run built-in assertions (pure computation, no files written) and exit",
    )
    args = parser.parse_args()
    if not args.self_test:
        missing = []
        if args.timings is None:
            missing.append("--timings")
        if args.cap is None:
            missing.append("--cap")
        if args.audio is None and args.audio_duration is None:
            missing.append("--audio/--audio-duration")
        if missing:
            parser.error("the following arguments are required: " + ", ".join(missing))
    return args


def probe_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def load_spans(path: Path) -> list[tuple[float, float]]:
    data: Any = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict):
        for key in ("sentences", "segments", "words"):
            if isinstance(data.get(key), list):
                data = data[key]
                break
    if not isinstance(data, list) or not data:
        raise ValueError("timings must be a non-empty JSON list of {start, end} spans")
    spans = []
    for item in data:
        try:
            start, end = float(item["start"]), float(item["end"])
        except (KeyError, TypeError, ValueError):
            raise ValueError(f"timing entry needs numeric start and end: {item!r}")
        if end < start:
            raise ValueError(f"timing entry ends before it starts: {item!r}")
        spans.append((start, end))
    return sorted(spans)


def candidate_cuts(
    spans: list[tuple[float, float]], min_gap: float, whole_seconds: bool
) -> list[dict[str, Any]]:
    cuts = []
    speech_end = spans[0][1]
    for start, end in spans[1:]:
        # Overlapping word spans never form a pause.
        if start - speech_end >= min_gap:
            middle = (speech_end + start) / 2
            cut = round(middle, 3)
            if whole_seconds:
                integers = range(math.ceil(speech_end), math.floor(start) + 1)
                if integers:
                    cut = float(min(integers, key=lambda value: abs(value - middle)))
            cuts.append({"cut": cut, "pause": [speech_end, start]})
        speech_end = max(speech_end, end)
    return cuts


def plan(
    spans: list[tuple[float, float]],
    total: float,
    cap: float,
    min_gap: float,
    min_segment: float,
    whole_seconds: bool,
) -> dict[str, Any]:
    if spans[-1][1] > total + 0.25:
        raise ValueError(
            f"timings end at {spans[-1][1]:.3f}s but the narration lasts {total:.3f}s; "
            "use timings from the locked audio"
        )
    limit = math.floor(cap + EPSILON) if whole_seconds else cap
    if limit < min_segment:
        raise ValueError("--cap must be at least --min-segment")

    cuts = candidate_cuts(spans, min_gap, whole_seconds)
    boundaries = [0.0]
    pauses: list[list[float] | None] = []
    while total - boundaries[-1] > limit + EPSILON:
        start = boundaries[-1]
        window = [
            cut
            for cut in cuts
            if start + min_segment <= cut["cut"] <= start + limit + EPSILON
            and total - cut["cut"] >= min_segment
        ]
        if not window:
            raise ValueError(
                f"no pause of at least {min_gap}s between {start:.3f}s and "
                f"{start + limit:.3f}s; supply word-level timings, lower --min-gap, "
                "or rewrite the sentence"
            )
        # The latest usable pause keeps segments long, so the edit has fewer seams.
        chosen = window[-1]
        boundaries.append(chosen["cut"])
        pauses.append(chosen["pause"])
    boundaries.append(total)
    pauses.append(None)

    segments = []
    for index, (start, end) in enumerate(zip(boundaries, boundaries[1:]), start=1):
        duration = round(end - start, 3)
        requested = math.ceil(duration - EPSILON) if whole_seconds else duration
        segments.append(
            {
                "index": index,
                "audio_start_s": round(start, 3),
                "audio_end_s": round(end, 3),
                "requested_seconds": requested,
                "authored_start_s": round(start, 3),
                "authored_duration_s": duration,
                "source_start_s": 0.0,
                "ends_in_pause_s": pauses[index - 1],
            }
        )

    return {
        "audio_duration_s": round(total, 3),
        "cap_s": cap,
        "min_gap_s": min_gap,
        "whole_seconds": whole_seconds,
        "segments": segments,
        "seams_s": [round(value, 3) for value in boundaries[1:-1]],
        "total_requested_seconds": round(
            sum(segment["requested_seconds"] for segment in segments), 3
        ),
    }


def run_self_test() -> int:
    """内置断言：正路径锁定 lanshu 冒烟精确值，负路径锁定超时拒绝。纯计算，不写文件。"""
    # 正路径：6.0s 配音、词级时间戳、四处停顿（[1.0,1.3] [2.4,2.75] [3.8,4.2] [5.3,5.6]），
    # cap=4 + whole-seconds。期望精确复现 lanshu 冒烟测试锁定值：切在 4.0s（停顿
    # [3.8,4.2] 内的唯一整秒），段长 4+2。
    spans = [
        (0.0, 0.5),
        (0.5, 1.0),
        (1.3, 1.9),
        (1.9, 2.4),
        (2.75, 3.3),
        (3.3, 3.8),
        (4.2, 4.7),
        (4.7, 5.3),
        (5.6, 6.0),
    ]
    result = plan(spans, 6.0, 4.0, 0.25, 2.0, whole_seconds=True)
    assert result["seams_s"] == [4.0], f"seams_s = {result['seams_s']!r}, expected [4.0]"
    requested = [segment["requested_seconds"] for segment in result["segments"]]
    assert requested == [4, 2], f"requested_seconds = {requested!r}, expected [4, 2]"
    assert result["total_requested_seconds"] == 6, result["total_requested_seconds"]
    assert result["segments"][0]["ends_in_pause_s"] == [3.8, 4.2], result["segments"][0]

    # 负路径：时间戳末尾 6.3s 超出音频 6.0s 达 0.3s（> 0.25s 容差），必须报错退出。
    late = spans[:-1] + [(5.6, 6.3)]
    try:
        plan(late, 6.0, 4.0, 0.25, 2.0, whole_seconds=True)
    except ValueError as exc:
        assert "use timings from the locked audio" in str(exc), f"unexpected error: {exc}"
    else:
        raise AssertionError("plan() accepted timings ending past the audio duration")

    print("self-test OK: seams_s==[4.0], requested_seconds==[4, 2]; overtime timings rejected")
    return 0


def main() -> int:
    args = parse_args()
    if args.self_test:
        return run_self_test()
    if args.cap <= 0 or args.min_gap < 0 or args.min_segment <= 0:
        raise ValueError("--cap and --min-segment must be positive; --min-gap cannot be negative")
    spans = load_spans(Path(args.timings).expanduser())
    total = (
        probe_duration(Path(args.audio).expanduser())
        if args.audio
        else float(args.audio_duration)
    )
    if total <= 0:
        raise ValueError("narration duration must be positive")

    result = plan(spans, total, args.cap, args.min_gap, args.min_segment, args.whole_seconds)
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        output = Path(args.output).expanduser()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(text, encoding="utf-8")
    print(text, end="")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, subprocess.CalledProcessError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
