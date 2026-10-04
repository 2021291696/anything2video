"""Shared project authority and filesystem boundaries for audio tooling."""
import json
import math
from pathlib import Path
import re
import shutil


class AudioProject:
    def __init__(self, root, legacy_config=False, legacy_fps=None):
        self.root = Path(root).resolve()
        config = self.path('src/config.ts')
        self.config = config.read_text(encoding='utf-8') if config.exists() else ''
        match = re.search(r"\bslug\s*:\s*(['\"])([^'\"]+)\1", self.config)
        config_slug = match.group(2) if match else None
        if self.config and match is None:
            raise ValueError('config.ts has no static slug; migrate its slug to match project.json')
        path = self.path('project.json')
        self.legacy = not path.exists()
        if path.exists():
            self.data = json.loads(path.read_text(encoding='utf-8'))
            if not isinstance(self.data, dict):
                raise ValueError('project.json must be an object')
        elif legacy_config and legacy_fps is not None:
            self.data = {'schemaVersion': 1, 'slug': config_slug, 'fps': legacy_fps, 'status': 'draft'}
        else:
            raise ValueError('project.json is required; migrate or use --legacy-config --fps <integer>')
        self.slug, self.fps = self.data.get('slug'), self.data.get('fps')
        if not isinstance(self.slug, str) or not re.fullmatch(r'[A-Za-z0-9_-]+', self.slug):
            raise ValueError('project.slug must contain only letters, digits, _ and -')
        if isinstance(self.fps, bool) or not isinstance(self.fps, int) or self.fps <= 0:
            raise ValueError('project.fps must be a positive integer')
        if config_slug is not None and config_slug != self.slug:
            raise ValueError('config.ts slug differs from project.slug; migrate src/config.ts and asset '
                             'references to project.slug before running audio tools')
        self.assets = Path('public') / 'assets' / self.slug

    def path(self, value):
        candidate = Path(value)
        if not candidate.is_absolute():
            candidate = self.root / candidate
        resolved = candidate.resolve()
        if resolved != self.root and self.root not in resolved.parents:
            raise ValueError(f'Path escapes the project: {candidate}')
        if candidate.is_symlink():
            raise ValueError(f'Individual file/directory symlink is not an audio input/output: {candidate}')
        return candidate

    def preflight(self, *values):
        for value in values:
            self.path(value)

    def preflight_audio(self, *values):
        self.preflight('project.json', 'src/config.ts', 'audio/cache',
                       'script/timeline.json', 'script/timeline.md',
                       'src/common/subs.ts', 'src/common/timeline.ts',
                       *(self.assets / name for name in ('audio.wav', 'audio_narration.wav',
                                                        'audio.mix.json', 'bgm.wav', 'bgm.mp3')), *values)
        cache = self.path('audio/cache')
        pending = [cache] if cache.exists() else []
        visited = set()
        while pending:
            directory = self.path(pending.pop())
            resolved = directory.resolve()
            if resolved in visited:
                continue
            visited.add(resolved)
            for child in directory.iterdir():
                child = self.path(child)
                if child.is_dir():
                    pending.append(child)

    def mkdir(self, value):
        target = self.path(value)
        if target != self.root:
            self.path(target.parent)
        target.mkdir(parents=True, exist_ok=True)
        self.path(target)

    def read_json(self, value):
        return json.loads(self.path(value).read_text(encoding='utf-8'))

    def write_text(self, value, text):
        target = self.path(value)
        self.mkdir(target.parent)
        self.path(target).write_text(text, encoding='utf-8')

    def write_bytes(self, value, data):
        target = self.path(value)
        self.mkdir(target.parent)
        self.path(target).write_bytes(data)

    def copy(self, source, destination):
        target = self.path(destination)
        self.mkdir(target.parent)
        shutil.copyfile(self.path(source), self.path(target))

    def unlink(self, value):
        self.path(value).unlink(missing_ok=True)

    def save_total(self, total):
        self.data['totalFrames'] = total
        self.write_text('project.json', json.dumps(self.data, ensure_ascii=False, indent=2) + '\n')

    def timeline(self):
        timeline = self.read_json('script/timeline.json')
        if (not isinstance(timeline, dict) or type(timeline.get('fps')) is not int
                or timeline.get('fps') != self.fps):
            raise ValueError('timeline.fps differs from project.fps; regenerate the timeline')
        frames = timeline.get('total_frames')
        declared = self.data.get('totalFrames')
        if self.legacy:
            declared = frames
            self.data['totalFrames'] = frames
        if isinstance(frames, bool) or not isinstance(frames, int) or frames <= 0:
            raise ValueError('timeline.total_frames must be a positive integer')
        if isinstance(declared, bool) or not isinstance(declared, int) or declared != frames:
            raise ValueError('project.totalFrames differs from timeline; regenerate the timeline')
        return timeline

    def validate_audio(self, samples, sample_rate, timeline):
        if len(samples) == 0 or not math.isfinite(len(samples) / sample_rate):
            raise ValueError('Audio must contain valid samples')
        expected = round(timeline['total_frames'] / self.fps * sample_rate)
        if abs(len(samples) - expected) > sample_rate / self.fps:
            raise ValueError('Narration duration differs from project/timeline; regenerate TTS')
