#!/usr/bin/env python3
"""epic 无旁白时长契约（recipes/epic.md §3）：章表 → 时间轴三件套 + 诗行字幕 + 静音音频床。

用法：python scripts/chapter_timeline.py [--bgm <bgm 路径>] [--fit-bgm] [--force]
输入 script/chapters.json（结构见 recipes/epic.md §3）：章条目 {"title","era","place","seconds",
"lines":[{"zh","en","at","dur"}]}。帧号 1 起含端点；章 from = 前章 to + 1。
退出码：0=成功｜3=章表与 BGM 时长差 >5%（--fit-bgm 可自动缩放）。
产出五件：script/timeline.json ／ src/common/timeline.ts ／ script/timeline.md ／ src/common/subs.ts
／ public/assets/<slug>/audio.wav（静音床，>100KB 视为已混成片需 --force 覆盖）。
"""
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FPS = 30
SR = 48000


def _guard(p: pathlib.Path) -> pathlib.Path:
    """写路径守卫：resolve 后必须落在工程根内（防拼装逃逸），返回规范化路径。"""
    rp = p.resolve()
    if rp != ROOT and ROOT not in rp.parents:
        raise SystemExit('[chapter_timeline] 输出路径越出工程根，拒绝写入：' + str(rp))
    return rp


def _write(rel: pathlib.Path, text: str) -> None:
    _guard(rel).write_text(text, encoding='utf-8')


def audio_duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                         capture_output=True, text=True)
    try:
        return float(out.stdout.strip())
    except ValueError:
        return None


def layout(chs):
    """章表 → 行（含 from/to/frames）。帧号 1 起含端点，章 from = 前章 to + 1。"""
    rows, cur = [], 1
    for c in chs:
        f = round(c['seconds'] * FPS)
        rows.append({**c, 'from': cur, 'to': cur + f - 1, 'frames': f})
        cur = cur + f
    return rows, cur - 1


def main():
    fit = '--fit-bgm' in sys.argv
    force = '--force' in sys.argv
    bgm = sys.argv[sys.argv.index('--bgm') + 1] if '--bgm' in sys.argv else None

    cfg = (ROOT / 'src' / 'config.ts').read_text(encoding='utf-8')
    m = re.search(r"slug:\s*'([^']+)'", cfg)
    assert m, 'config.ts 里找不到 slug 单引号字段（config 格式漂移？）'
    slug = m.group(1)
    if not re.fullmatch(r'[A-Za-z0-9_-]+', slug):
        raise SystemExit('[chapter_timeline] slug 含非法字符：' + slug)

    chapters = json.loads(_guard(ROOT / 'script' / 'chapters.json').read_text(encoding='utf-8'))
    assert isinstance(chapters, list) and chapters, 'chapters.json 为空或不是数组'
    for i, c in enumerate(chapters):
        assert c.get('seconds', 0) > 0, f'第 {i+1} 章缺 seconds'

    bgm_s = audio_duration(bgm) if bgm else None
    if bgm and bgm_s is None:
        raise SystemExit('[chapter_timeline] ffprobe 读不到 BGM 时长：' + str(bgm))

    if fit and bgm_s:
        k = bgm_s / sum(c['seconds'] for c in chapters)
        for c in chapters:
            c['seconds'] = round(c['seconds'] * k, 3)

    rows, total_frames = layout(chapters)
    total_s = total_frames / FPS

    if bgm_s is not None:
        diff = abs(total_s - bgm_s) / bgm_s
        if diff > 0.05 and not fit:
            print(f'[chapter_timeline] 章表总长 {total_s:.1f}s vs BGM {bgm_s:.1f}s 差 {diff*100:.1f}%（>5%）——'
                  f'epic 口径二者应锚定一致（recipes/epic.md §3/§7）：微调章 seconds 重跑，或加 --fit-bgm 按比例缩放。')
            sys.exit(3)

    # 诗行字幕：line.at（章内相对秒）→ 绝对帧窗；dur 缺省 min(6, 章内剩余 −0.5s)
    subs = []
    for c in rows:
        base = c['from'] - 1  # 章 from 帧的 0 起帧轴
        for ln in c.get('lines', []):
            at = ln.get('at', 0.5)
            dur = ln.get('dur', min(6.0, max(1.0, c['seconds'] - at - 0.5)))
            f0 = base + round(at * FPS) + 1
            f1 = min(c['to'], f0 + round(dur * FPS) - 1)
            subs.append({'from': f0, 'to': f1, 'text': ln['zh'], 'en': ln.get('en')})
    subs.sort(key=lambda s: s['from'])
    for a, b in zip(subs, subs[1:]):
        assert b['from'] > a['to'], f'诗行帧窗重叠（同屏唯一纪律）：{a["text"]} {a["from"]}-{a["to"]} vs {b["text"]} {b["from"]}-{b["to"]}——缩短前条 dur 或后移 at'

    # 1) timeline.json（与 tts_build 输出同构 + chapters 明细）
    tl = {'fps': FPS, 'total_frames': total_frames, 'sentences': [],
          'chapters': [{**{k: c[k] for k in ('title', 'era', 'place', 'seconds', 'from', 'to')}, 'n': i + 1}
                       for i, c in enumerate(rows)]}
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
          f'总帧 {total_frames}（{total_s:.1f}s @30fps）' + (f'｜BGM 锚 {bgm_s:.1f}s' if bgm_s else ''), '',
          '| 章 | 帧区间 | 秒 | 年代角标 | 地点·主题 | 诗行数 |', '|---|---|---|---|---|---|']
    for i, c in enumerate(rows):
        md.append(f"| {i+1} {c['title']} | {c['from']}-{c['to']} | {c['seconds']} | {c.get('era','')} | {c.get('place','')} | {len(c.get('lines',[]))} |")
    md += ['', '## 诗行字幕', '', '| 帧 | 中文 | 英文 |', '|---|---|---|']
    for s in subs:
        md.append(f"| {s['from']}-{s['to']} | {s['text']} | {s.get('en','')} |")
    _write(ROOT / 'script' / 'timeline.md', '\n'.join(md) + '\n')

    # 5) 静音音频床（占位输入：epic 正式 audio.wav 由 mix_audio.py --epic 产出；缺失时给静音床保证 probe/render 可跑）
    a_dir = _guard(ROOT / 'public' / 'assets' / slug)
    a_dir.mkdir(parents=True, exist_ok=True)
    audio = a_dir / 'audio.wav'
    if audio.exists() and audio.stat().st_size > 100_000 and not force:
        print(f'[chapter_timeline] {audio} 已存在且非占位（>100KB，疑似已混成片）——跳过静音床写入（--force 覆盖）')
    else:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'anullsrc=r={SR}:cl=stereo',
                        '-t', f'{total_s:.3f}', '-c:a', 'pcm_s16le', str(audio)], check=True)

    print(f'chapter_timeline ok: {len(rows)} 章 / {total_frames} 帧（{total_s:.1f}s）｜诗行 {len(subs)} 条')


if __name__ == '__main__':
    main()
