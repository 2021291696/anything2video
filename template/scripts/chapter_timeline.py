#!/usr/bin/env python3
"""Build a chapter timeline from chapters.json and structured project.json.

Frames are 1-based and inclusive. --fit-bgm scales chapters and subtitle
windows. Existing audio is preserved unless --force is explicitly requested.
Legacy config.ts migration requires --legacy-config and an explicit --fps.
"""
import argparse
import copy
import json
import math
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 48000


def _guard(p: pathlib.Path) -> pathlib.Path:
    """Resolve links before checking that project writes stay contained."""
    root = ROOT.resolve()
    rp = p.resolve()
    if rp != root and root not in rp.parents:
        raise ValueError(f'Path escapes the project: {rp}')
    return rp


def _write(rel: pathlib.Path, text: str) -> None:
    target = _guard(rel)
    _guard(target.parent).mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding='utf-8')


def _number(value, label, positive=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'{label} must be a finite number')
    if value < 0 or (positive and value <= 0):
        raise ValueError(f'{label} must be {"positive" if positive else "nonnegative"}')
    return value


def load_project(legacy_config=False, legacy_fps=None):
    target = _guard(ROOT / 'project.json')
    if target.exists():
        project = json.loads(target.read_text(encoding='utf-8'))
        if not isinstance(project, dict):
            raise ValueError('project.json must be an object')
    elif legacy_config:
        if legacy_fps is None:
            raise ValueError('--legacy-config requires an explicit --fps')
        cfg = _guard(ROOT / 'src' / 'config.ts').read_text(encoding='utf-8')
        match = re.search(r"slug:\s*['\"]([A-Za-z0-9_-]+)['\"]", cfg)
        if not match:
            raise ValueError('Legacy config.ts has no valid slug')
        project = {'schemaVersion': 1, 'slug': match.group(1), 'fps': legacy_fps, 'status': 'draft'}
    else:
        raise ValueError('project.json is required; migrate or use --legacy-config --fps')
    if not isinstance(project.get('slug'), str) or not re.fullmatch(r'[A-Za-z0-9_-]+', project['slug']):
        raise ValueError('project.slug must contain only letters, digits, _ and -')
    fps = project.get('fps')
    if isinstance(fps, bool) or not isinstance(fps, int) or fps <= 0:
        raise ValueError('project.fps must be a positive integer')
    return project


def validate_chapters(chapters, fps):
    if not isinstance(chapters, list) or not chapters:
        raise ValueError('chapters.json must be a nonempty array')
    normalized = copy.deepcopy(chapters)
    for index, chapter in enumerate(normalized):
        label = f'Chapter {index + 1}'
        if not isinstance(chapter, dict) or not isinstance(chapter.get('title'), str) or not chapter['title'].strip():
            raise ValueError(f'{label} requires a nonempty title')
        seconds = _number(chapter.get('seconds'), f'{label}.seconds', positive=True)
        if round(seconds * fps) < 1:
            raise ValueError(f'{label} is shorter than one frame')
        lines = chapter.get('lines', [])
        if not isinstance(lines, list):
            raise ValueError(f'{label}.lines must be an array')
        for line_index, line in enumerate(lines):
            name = f'{label}.lines[{line_index}]'
            if not isinstance(line, dict) or not isinstance(line.get('zh'), str) or not line['zh'].strip():
                raise ValueError(f'{name}.zh must be nonempty')
            if line.get('en') is not None and not isinstance(line['en'], str):
                raise ValueError(f'{name}.en must be a string')
            at = _number(line.get('at', 0.5), f'{name}.at')
            duration = _number(line.get('dur', min(6.0, seconds - at)), f'{name}.dur', positive=True)
            if at >= seconds or at + duration > seconds + 1e-9:
                raise ValueError(f'{name} subtitle window escapes the chapter')
            if round(duration * fps) < 1:
                raise ValueError(f'{name} subtitle duration is shorter than one frame')
            line.update(at=at, dur=duration)
    return normalized


def audio_duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                         capture_output=True, text=True)
    try:
        duration = float(out.stdout.strip())
    except ValueError:
        raise ValueError(f'ffprobe cannot read BGM duration: {path}') from None
    if out.returncode or not math.isfinite(duration) or duration <= 0:
        raise ValueError(f'ffprobe cannot read BGM duration: {path}')
    return duration


def layout(chs, fps):
    """章表 → 行（含 from/to/frames）。帧号 1 起含端点，章 from = 前章 to + 1。"""
    rows, cur = [], 1
    for c in chs:
        f = round(c['seconds'] * fps)
        rows.append({**c, 'from': cur, 'to': cur + f - 1, 'frames': f})
        cur = cur + f
    return rows, cur - 1


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bgm', type=pathlib.Path)
    parser.add_argument('--fit-bgm', action='store_true')
    parser.add_argument('--force', action='store_true', help='Explicitly replace existing audio with a silent bed')
    parser.add_argument('--legacy-config', action='store_true')
    parser.add_argument('--fps', type=int, help='Required only for legacy config migration')
    args = parser.parse_args(argv)
    if args.fit_bgm and not args.bgm:
        parser.error('--fit-bgm requires --bgm')
    project = load_project(args.legacy_config, args.fps)
    fps, slug = project['fps'], project['slug']
    chapters = validate_chapters(json.loads(_guard(ROOT / 'script' / 'chapters.json').read_text(encoding='utf-8')), fps)
    bgm_s = audio_duration(args.bgm) if args.bgm else None
    if args.fit_bgm:
        scale = bgm_s / sum(chapter['seconds'] for chapter in chapters)
        for chapter in chapters:
            chapter['seconds'] *= scale
            for line in chapter.get('lines', []):
                line['at'] *= scale
                line['dur'] *= scale
        chapters = validate_chapters(chapters, fps)
    rows, total_frames = layout(chapters, fps)
    total_s = total_frames / fps

    if bgm_s is not None:
        diff = abs(total_s - bgm_s) / bgm_s
        if diff > 0.05 and not args.fit_bgm:
            print(f'[chapter_timeline] 章表总长 {total_s:.1f}s vs BGM {bgm_s:.1f}s 差 {diff*100:.1f}%（>5%）——'
                  f'epic 口径二者应锚定一致（recipes/epic.md §3/§7）：微调章 seconds 重跑，或加 --fit-bgm 按比例缩放。')
            return 3
        if diff > 0.05:
            raise ValueError('Frame quantization differs from BGM by more than 5%; revise short chapters')

    # Relative chapter seconds become inclusive global subtitle frame windows.
    subs = []
    for c in rows:
        base = c['from'] - 1  # 章 from 帧的 0 起帧轴
        for ln in c.get('lines', []):
            at, dur = ln['at'], ln['dur']
            f0 = base + round(at * fps) + 1
            f1 = min(c['to'], f0 + round(dur * fps) - 1)
            if f0 > f1:
                raise ValueError('Subtitle window contains no frames')
            entry = {'from': f0, 'to': f1, 'text': ln['zh']}
            if ln.get('en') is not None:
                entry['en'] = ln['en']
            subs.append(entry)
    subs.sort(key=lambda s: s['from'])
    for a, b in zip(subs, subs[1:]):
        if b['from'] <= a['to']:
            raise ValueError(f'Subtitle windows overlap: {a["text"]} / {b["text"]}')

    # 1) timeline.json（与 tts_build 输出同构 + chapters 明细）
    tl = {'fps': fps, 'total_frames': total_frames, 'sentences': [],
          'chapters': [{**chapter, 'n': index + 1} for index, chapter in enumerate(rows)]}
    # Preflight every write before creating any output (including existing links).
    for relative in ('script/timeline.json', 'src/common/timeline.ts', 'src/common/subs.ts',
                     'script/timeline.md', 'project.json', f'public/assets/{slug}/audio.wav'):
        _guard(ROOT / relative)
    _write(ROOT / 'script' / 'timeline.json', json.dumps(tl, ensure_ascii=False, indent=1))

    # 2) timeline.ts（同构）
    lines = []
    lines.append('// 由 scripts/chapter_timeline.py 生成（epic 无旁白时长契约，recipes/epic.md §3）。帧号 1 起含端点。')
    lines.append(f'export const TOTAL_FRAMES = {total_frames};')
    lines.append('export const CHAPTER_STARTS: Array<{n: number; title: string; from: number}> = '
                 + json.dumps([{'n': i + 1, 'title': c['title'], 'from': c['from']} for i, c in enumerate(rows)], ensure_ascii=False) + ';')
    lines.append('export type Sentence = {id: string; chapter: number; from: number; to: number; text: string};')
    lines.append('export const SENTENCES: Sentence[] = []; // epic 无旁白：恒空（诗行走 subs.ts）')
    _write(ROOT / 'src' / 'common' / 'timeline.ts', '\n'.join(lines) + '\n')

    # 3) subs.ts（诗行字幕：zh→text / en）
    lines = ['// 由 scripts/chapter_timeline.py 生成（epic 诗行字幕，recipes/epic.md §4）。帧号 1 起含端点。',
             'export type SubEntry = {from: number; to: number; text: string; en?: string; cn?: string; emphasis?: boolean};',
             'export const SUBS: SubEntry[] = ' + json.dumps(subs, ensure_ascii=False) + ';']
    _write(ROOT / 'src' / 'common' / 'subs.ts', '\n'.join(lines) + '\n')

    # 4) timeline.md（人读章表）
    md = ['# 章表时间轴（chapter_timeline.py 生成）', '',
          f'总帧 {total_frames}（{total_s:.1f}s @{fps}fps）' + (f'｜BGM 锚 {bgm_s:.1f}s' if bgm_s else ''), '',
          '| 章 | 帧区间 | 秒 | 年代角标 | 地点·主题 | 诗行数 |', '|---|---|---|---|---|---|']
    for i, c in enumerate(rows):
        md.append(f"| {i+1} {c['title']} | {c['from']}-{c['to']} | {c['seconds']} | {c.get('era','')} | {c.get('place','')} | {len(c.get('lines',[]))} |")
    md += ['', '## 诗行字幕', '', '| 帧 | 中文 | 英文 |', '|---|---|---|']
    for s in subs:
        md.append(f"| {s['from']}-{s['to']} | {s['text']} | {s.get('en','')} |")
    _write(ROOT / 'script' / 'timeline.md', '\n'.join(md) + '\n')
    project['totalFrames'] = total_frames
    _write(ROOT / 'project.json', json.dumps(project, ensure_ascii=False, indent=2) + '\n')

    # 5) 静音音频床（占位输入：epic 正式 audio.wav 由 mix_audio.py --epic 产出；缺失时给静音床保证 probe/render 可跑）
    a_dir = _guard(ROOT / 'public' / 'assets' / slug)
    a_dir.mkdir(parents=True, exist_ok=True)
    audio = a_dir / 'audio.wav'
    if audio.exists() and not args.force:
        print(f'[chapter_timeline] Preserved existing audio: {audio}; --force explicitly replaces it.')
    else:
        subprocess.run(['ffmpeg', '-v', 'error', '-y' if args.force else '-n', '-f', 'lavfi',
                        '-i', f'anullsrc=r={SR}:cl=stereo', '-t', f'{total_s:.9f}',
                        '-c:a', 'pcm_s16le', str(audio)], check=True)

    print(f'chapter_timeline ok: {len(rows)} 章 / {total_frames} 帧（{total_s:.1f}s）｜诗行 {len(subs)} 条')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(f'[chapter_timeline] {error}') from None
