#!/usr/bin/env python3
"""bgm_generate — a2v 程序编曲通道（轴 C，长片编曲适配层，底层 = audio-engine/mgaudio）。

把工程章表/beat sheet 派生成多段结构的确定性配乐候选，供 bgm-bakeoff 双通道圈选。
程序编曲的落点真值 = beat sheet 本身（曲库曲才走 beat_grid 实测，见全案轴 B 定案）。

用法（Windows 冒烟验证过的依赖集，见 audio-engine/VENDOR.md）：
  uv run --with numpy --with scipy --with soundfile --with numba --with pedalboard \
    --with pyloudnorm --python 3.12 python <skill>/scripts/bgm_generate.py <工程根> \
    [--style <卡ID|配方slug>] [--seed N] [--drop 秒] [--duration 秒] [--variations N]
    [--spec bgm_spec.json] [--out 文件或目录] [--selftest]

时长与落点解析优先级：
  duration: --duration > spec.duration > project.json(totalFrames/fps)
  drop:     --drop > spec.hero > 章表 hero 章 > 默认 42%（mgaudio 惯例）
能量曲线：spec.sections[{from,to,energy}] 或章表[{seconds,energy}] → 分段常量 + 0.5s 斜坡；
  无 spec 时用默认轮廓（开场 0.3 → hero 1.0 → 尾段 0.25）。
输出：候选 wav（48k/24bit，母带 -14 LUFS / ≤-1 dBTP）+ stdout 的登记行
  （seed/配方/时长/响度/峰值 → 粘进 MANIFEST）。
限制（首片验证制）：单配方贯穿全片，长片形态靠能量曲线 + form 分段；跨章换配方是后续工作。
"""
import argparse
import json
import os
import sys

# ---------------------------------------------------------------- a2v 卡ID → mgaudio 配方
# 值 = 风格 slug（STYLES 注册表只收 01-22 编号 slug；recipe 名如 'explainer' 会 KeyError——
# 2026-10-06 实测修正）。不传 extras：flavor 等走 slug 注册默认，防重复 kwarg。口味锚=冷峻优先。
STYLE_MAP = {
    'deep-space': '22-hud',        # darksynth 冷峻
    'mg-purple': '01-flat-vector', # pop 扁平 MG
    'epic-paper': '12-aurora-glass',  # ambient
    'sand': '12-aurora-glass',     # ambient glass
    'chalk': '05-cel-boil',        # lofi
    'blueprint': '09-bauhaus',     # techno
    'neon': '10-synthwave',
    'pixel-arcade': '20-pixel',    # chiptune
    'paper-collage': '06-collage', # lofi
    'swiss-print': '09-bauhaus',   # techno
    'crt-terminal': '22-hud',      # darksynth
    # 轴 D 新卡
    'paperclip-sticker': '19-paperclip',  # explainer marimba bed
    'isometric-city': '03-isometric',     # explainer bed
    'aurora-glass': '12-aurora-glass',
    'liquid-flow': '07-liquid',    # future_bass
    'guofeng-scroll': '15-guochao',# 国风（筝合成回退已验证）
    'hanazi-916': '18-hanazi',     # variety bouncy
    'line-art': '02-line-art',
    'morph': '08-morph',           # future_bass
    # 轴 L 新卡（lanshu 技法吸收，2026-10-07）
    'pop-comic': '01-flat-vector',      # pop
    'popup-book': '19-paperclip',       # explainer marimba
    'clay-town': '03-isometric',        # explainer bed
    'studio-oneshot': '10-synthwave',   # cinematic
    # v4.0.0 战役新卡（2026-10-08，值逐卡实测自 科普视频/samples-v4/<slug>/research/audio-notes.md
    # 的 BGM-GENERATED 登记行与 --style 命令行，双源一致）
    'pop-dot': '01-flat-vector',
    'ink-boil': '05-cel-boil',
    'ink-plate': '09-bauhaus',
    'vhs-outrun': '10-synthwave',
    'soft-jelly': '12-aurora-glass',
    'target-lock': '22-hud',
    'ink-tea': '15-guochao',
    'swirl-oil': '12-aurora-glass',
    'cave-wall': '06-collage',
    'tomb-wall': '12-aurora-glass',
    'amphora': '12-aurora-glass',
    'mosaic': '12-aurora-glass',
    'gold-leaf': '12-aurora-glass',
    'whiplash-line': '12-aurora-glass',
    'grain-flat': '01-flat-vector',
    'gold-robe': '12-aurora-glass',
    'dot-infinity': '07-liquid',
    'hard-light': '12-aurora-glass',
    'dance-line': '18-hanazi',
    'rubberhose': '05-cel-boil',
    'shadow-play': '15-guochao',
    'sfumato': '12-aurora-glass',
    # light-dabs：audio-notes 因会话中断缺失，--style 值按战役派工单（CAMPAIGN-4 §3.2 D4-1 任务书）回填
    'light-dabs': '12-aurora-glass',
    'facets': '12-aurora-glass',
    'chrome-ball': '10-synthwave',
    'scream-warp': '12-aurora-glass',
    'soft-clock': '12-aurora-glass',
    'watercolor-cel': '12-aurora-glass',
    'lily-pond': '12-aurora-glass',
    'optical-dots': '12-aurora-glass',
    'candle-light': '12-aurora-glass',
    'cumulus-light': '12-aurora-glass',
    'blue-period': '12-aurora-glass',
    'whiteboard': '19-paperclip',
    'kinetic-type': '18-hanazi',
    'riso-print': '06-collage',
    'math-lab': '12-aurora-glass',
    'hypnotic': '07-liquid',
}


def setup_engine(skill_root):
    """vendor 引擎路径 + 采样索引磁盘过滤 shim。

    上游 GitHub 仓只随附 598 个采样声明中的 102 个；mgaudio 的 available() 只查
    index.json 不查磁盘，缺失乐器会在 sf.read 崩溃。这里把索引过滤成磁盘真实存在
    的文件——乐器清空后 guzheng 等 auto 引擎自动落 KS 合成回退（2026-10-06 8 配方
    冒烟全绿）。不改 mgaudio 源码，保 upstream 可合并。
    """
    sys.path.insert(0, os.path.join(skill_root, 'audio-engine'))
    import mgaudio.samples as S

    orig_index = S._index.__wrapped__

    def disk_filtered():
        idx = orig_index()
        out = {}
        for inst, entries in idx.items():
            kept = [e for e in entries
                    if isinstance(e, dict) and os.path.exists(os.path.join(S.ROOT, e.get('file', '')))]
            if kept:
                out[inst] = kept
        return out

    S._index = disk_filtered
    import mgaudio as mg
    from mgaudio import recipes
    return mg, recipes


def load_duration(project_root, args, spec):
    if args.duration:
        return float(args.duration)
    if spec and spec.get('duration'):
        return float(spec['duration'])
    pj = os.path.join(project_root, 'project.json')
    if os.path.exists(pj):
        with open(pj, encoding='utf-8') as f:
            p = json.load(f)
        fps = p.get('fps') or 30
        tf = p.get('totalFrames')
        if tf:
            return round(tf / fps, 3)
    sys.exit('[bgm_generate] 无时长来源：给 --duration、spec.duration 或工程 project.json')


def load_spec(project_root, args):
    path = args.spec
    if not path:
        for cand in ('research/bgm-spec.json', 'research/beat-sheet.json'):
            p = os.path.join(project_root, cand)
            if os.path.exists(p):
                path = p
                break
    if not path:
        return None
    with open(path, encoding='utf-8') as f:
        spec = json.load(f)
    if isinstance(spec, list):  # 章表形态 [{title,seconds,energy?}] / [{from,to,energy?}]
        spec = {'sections': spec}
    return spec


def energy_curve(duration, spec, drop):
    """spec.sections → [(t, 0..1)]；无 spec 用默认轮廓。hero 前抬升、hero 后回落。"""
    secs = (spec or {}).get('sections') or []
    pts = []
    t = 0.0
    for s in secs:
        if 'from' in s:
            a, b = float(s['from']), float(s['to'])
        else:
            a, b = t, t + float(s.get('seconds', 0))
        e = float(s.get('energy', 0.5))
        if pts and a > pts[-1][0]:
            pts.append((a - 0.25, pts[-1][1]))  # 0.5s 斜坡
        pts.append((a, e))
        pts.append((b, e))
        t = b
    if not pts:
        h = drop if drop else duration * 0.42
        pts = [(0, 0.3), (h * 0.5, 0.45), (max(0.0, h - 4), 0.6), (h, 1.0),
               (min(duration, h + 8), 0.8), (duration - 6, 0.5), (duration - 1.5, 0.25)]
    # 排序去越界，末端必须顶到 duration
    pts = sorted([(max(0.0, min(duration, t)), e) for t, e in pts])
    if pts[-1][0] < duration:
        pts.append((duration, pts[-1][1]))
    return pts


def main():
    ap = argparse.ArgumentParser(description='a2v 程序编曲（mgaudio 长片适配层）')
    ap.add_argument('project', nargs='?', default='.', help='工程根目录')
    ap.add_argument('--style', default=None, help='a2v 卡ID（见 STYLE_MAP）或 mgaudio 配方/风格 slug')
    ap.add_argument('--seed', type=int, default=20261006)
    ap.add_argument('--drop', type=float, default=None, help='hero moment 秒（落点真值来自 beat sheet）')
    ap.add_argument('--duration', type=float, default=None)
    ap.add_argument('--variations', type=int, default=1, help='生成 N 个 seed 变体（bakeoff 圈选用）')
    ap.add_argument('--spec', default=None, help='bgm_spec.json / beat-sheet.json / 章表 json')
    ap.add_argument('--out', default=None, help='输出 wav（单文件）或目录（多变体）')
    ap.add_argument('--tail', type=float, default=2.5, help='outro 收尾预留秒数')
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args()

    skill_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    mg, recipes = setup_engine(skill_root)

    if args.selftest:
        for slug in sorted(set(STYLE_MAP.values())):  # 全映射回归：每个 style slug 都必须能渲染
            m = recipes.for_style(slug, duration=8.0, drop=3.0)
            assert m is not None
        print(f'[selftest] STYLE_MAP 全部 {len(set(STYLE_MAP.values()))} 个 style slug 渲染 OK')
        return

    spec = load_spec(args.project, args)
    duration = load_duration(args.project, args, spec)
    if duration > 300:
        print(f'[bgm_generate] 警告：时长 {duration:.0f}s 超过验证上限 300s，继续但结果未验证')
    drop = args.drop
    if drop is None and spec:
        drop = spec.get('hero')
    if drop is None and spec and spec.get('sections'):
        heroes = [s for s in spec['sections'] if s.get('hero')]
        if heroes:
            s = heroes[0]
            drop = float(s.get('from', 0)) + float(s.get('seconds', 0)) / 2
    outro = max(0.0, duration - args.tail)
    energy = energy_curve(duration, spec, drop)

    style = args.style
    if style is None and spec:
        style = spec.get('style')
    if style is None:
        sys.exit('[bgm_generate] 缺 --style（a2v 卡ID 或 mgaudio slug，如 19-paperclip / guofeng）')
    extra: dict = {}
    if style in STYLE_MAP:
        style = STYLE_MAP[style]

    out = args.out or os.path.join(args.project, 'bgm_bakeoff', 'generated')
    if args.out and not args.out.lower().endswith('.wav'):
        out = args.out
    os.makedirs(out if not out.lower().endswith('.wav') else os.path.dirname(out) or '.', exist_ok=True)

    hits = tuple(float(h) for h in (spec or {}).get('hits', [])) or None
    lines = []
    for k in range(max(1, args.variations)):
        seed = args.seed + k
        mg.core.reset_rng(seed)  # 确定性来源：配方本体不收 seed，全局 RNG 在渲染前重置
        kwargs = dict(duration=duration, drop=drop, outro=outro, energy=energy, **extra)
        if hits and len(hits) >= 2:
            kwargs['hits'] = hits
        t0 = __import__('time').time()
        m = recipes.for_style(style, **kwargs)
        if out.lower().endswith('.wav') and args.variations == 1:
            path = out
        else:
            path = os.path.join(out, f'bgm-candidate-{k + 1}-seed{seed}.wav')
        m.export(path)
        try:
            import soundfile as sf
            x, _ = sf.read(path, dtype='float32', always_2d=True)
            l = mg.master.lufs(x.T)
            loud = f'{l:.1f} LUFS'
        except Exception:
            loud = 'LUFS n/a（export 目标 -14 / ≤-1dBTP 已由母带链保证）'
        lines.append(f'BGM-GENERATED | style={style} | seed={seed} | dur={duration:.1f}s | '
                     f'drop={drop if drop is not None else "auto(42%)"} | {loud} | {path} | '
                     f'render {__import__("time").time() - t0:.1f}s | 许可=CC0(VCSL via mg-styles-15, MIT code)')
    for ln in lines:
        print(ln)
    print('[bgm_generate] 候选进 bgm-bakeoff 试听页圈选（双通道：本候选 + 曲库曲同页）')


if __name__ == '__main__':
    main()
