"""Synthetic audio regression checks. Run: uv run python -m unittest discover -s tests."""
import hashlib
import asyncio
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

import numpy as np
from scipy.io import wavfile

SCRIPTS = Path(__file__).resolve().parent.parent / 'scripts'
SR = 48000


class AudioPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.assets = self.root / 'public' / 'assets' / 'test'
        self.assets.mkdir(parents=True)
        (self.root / 'scripts').mkdir()
        (self.root / 'src').mkdir()
        (self.root / 'src' / 'common').mkdir()
        (self.root / 'script').mkdir()
        (self.root / 'src' / 'config.ts').write_text("export const VIDEO = {slug: 'test'};", encoding='utf-8')
        (self.root / 'project.json').write_text(json.dumps({'slug': 'test', 'fps': 30, 'totalFrames': 90,
                                                          'status': 'draft'}), encoding='utf-8')
        for name in ('mix_audio.py', 'probe_av_sync.mjs', 'tts_build.py', 'probe_delivery.py', 'audio_project.py'):
            shutil.copyfile(SCRIPTS / name, self.root / 'scripts' / name)
        self.timeline(31)
        self.tone('audio_narration.wav', onset=1, stop=2.5)
        self.tone('bgm.wav', onset=0, stop=3, frequency=100, gain=0.05)

    def tearDown(self):
        self.temporary.cleanup()

    def timeline(self, first):
        data = {'fps': 30, 'total_frames': 90, 'chapters': [{'from': 1}],
                'sentences': [{'id': 'S01', 'from': first, 'to': 75}]}
        (self.root / 'script' / 'timeline.json').write_text(json.dumps(data), encoding='utf-8')

    def tone(self, name, onset, stop, frequency=700, gain=0.3, stereo=False):
        positions = np.arange(3 * SR) / SR
        signal = gain * np.sin(2 * np.pi * frequency * positions)
        signal[(positions < onset) | (positions >= stop)] = 0
        samples = (signal * 32767).astype(np.int16)
        if stereo:
            samples = np.column_stack((samples, samples))
        wavfile.write(self.assets / name, SR, samples)

    def run_script(self, name, *args):
        executable = 'node' if name.endswith('.mjs') else sys.executable
        return subprocess.run([executable, str(self.root / 'scripts' / name), *args],
                              cwd=self.root, capture_output=True, text=True, encoding='utf-8',
                              env={**os.environ, 'PYTHONUTF8': '1'})

    def digest(self, name):
        return hashlib.sha256((self.assets / name).read_bytes()).hexdigest()

    def test_repeated_mix_preserves_master_and_output(self):
        master = self.digest('audio_narration.wav')
        first = self.run_script('mix_audio.py')
        self.assertEqual(first.returncode, 0, first.stderr)
        mixed = self.digest('audio.wav')
        second = self.run_script('mix_audio.py')
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual(self.digest('audio_narration.wav'), master)
        self.assertEqual(self.digest('audio.wav'), mixed)
        _, samples = wavfile.read(self.assets / 'audio.wav')
        self.assertEqual(samples.shape, (3 * SR, 2))
        self.assertLessEqual(np.max(np.abs(samples.astype(np.int32))), 31130)

    def test_updated_master_changes_mix(self):
        # Also verify that music is optional, matching the production contract.
        (self.assets / 'bgm.wav').unlink()
        # Fresh TTS replaces the master; remix must use it without mtime heuristics.
        self.assertEqual(self.run_script('mix_audio.py').returncode, 0)
        previous = self.digest('audio.wav')
        self.tone('audio_narration.wav', onset=1, stop=2.5, frequency=900)
        self.assertEqual(self.run_script('mix_audio.py').returncode, 0)
        self.assertNotEqual(self.digest('audio.wav'), previous)

    def test_missing_master_cannot_adopt_previous_mix(self):
        self.assertEqual(self.run_script('mix_audio.py').returncode, 0)
        (self.assets / 'audio_narration.wav').unlink()
        self.assertNotEqual(self.run_script('mix_audio.py').returncode, 0)

    def test_av_ignores_music_and_rejects_shift(self):
        self.assertEqual(self.run_script('mix_audio.py').returncode, 0)
        normal = self.digest('audio.wav')
        self.assertEqual(self.run_script('mix_audio.py', '--sfx', 'sand').returncode, 0)
        self.assertNotEqual(normal, self.digest('audio.wav'))
        self.assertEqual(self.run_script('mix_audio.py').returncode, 0)
        valid = self.run_script('probe_av_sync.mjs')
        self.assertEqual(valid.returncode, 0, valid.stderr)
        self.timeline(61)
        self.assertEqual(self.run_script('probe_av_sync.mjs').returncode, 1)

    def test_silent_narration_fails(self):
        # Silent masters must never be mistaken for speech at frame one.
        self.tone('audio_narration.wav', onset=0, stop=0)
        self.timeline(1)
        self.assertEqual(self.run_script('probe_av_sync.mjs').returncode, 1)

    def test_first_internal_pause_is_not_leading_silence(self):
        self.tone('audio_narration.wav', onset=0, stop=1)
        self.timeline(1)
        valid = self.run_script('probe_av_sync.mjs')
        self.assertEqual(valid.returncode, 0, valid.stderr)
        self.timeline(31)
        self.assertEqual(self.run_script('probe_av_sync.mjs').returncode, 1)

    def test_bad_file_is_environment_error(self):
        # ffmpeg nonzero exit is a tool failure rather than a plausible onset.
        (self.assets / 'audio_narration.wav').write_bytes(b'not an audio file')
        self.assertEqual(self.run_script('probe_av_sync.mjs').returncode, 2)

    def test_truncated_media_is_rejected(self):
        # Media timing is checked separately from pure narration speech onset.
        short = np.zeros(SR, dtype=np.int16)
        wavfile.write(self.assets / 'short.wav', SR, short)
        self.assertEqual(self.run_script('probe_av_sync.mjs', '--media',
                         str(self.assets / 'short.wav')).returncode, 1)

    def test_tts_refreshes_master_and_clears_mix_provenance(self):
        # Stub only synthesis; exercise actual WAV/timeline/subtitle generation.
        specification = importlib.util.spec_from_file_location('tts_fixture', self.root / 'scripts' / 'tts_build.py')
        module = importlib.util.module_from_spec(specification)
        sys.path.insert(0, str(self.root / 'scripts'))
        try:
            specification.loader.exec_module(module)
        finally:
            sys.path.pop(0)
        module.ENGINE = 'edge'
        module.EDGE_DELAY = 0
        module.LEAD = module.TAIL = module.GAP = 0
        async def fake_sentence(chunks, sep=''):
            positions = np.arange(SR) / SR
            samples = (0.3 * np.sin(2 * np.pi * 700 * positions)).astype(np.float32)
            return samples, [0], 1.0
        module.synth_sentence = fake_sentence
        narration = self.root / 'script' / 'narration.txt'
        narration.write_text('This is a test.\n', encoding='utf-8')
        manifest = self.assets / 'audio.mix.json'
        manifest.write_text('{}', encoding='utf-8')
        asyncio.run(module.main(str(narration), force=True))
        self.assertEqual(self.digest('audio.wav'), self.digest('audio_narration.wav'))
        self.assertFalse(manifest.exists())
        generated = json.loads((self.root / 'script' / 'timeline.json').read_text(encoding='utf-8'))
        self.assertEqual(generated['sentences'][0]['from'], 1)
        self.assertEqual(generated['total_frames'], 30)

    def test_epic_has_explicit_no_narration_validation(self):
        # Machine-readable delivery output must contain exactly one JSON object.
        delivery = self.run_script('probe_delivery.py', str(self.assets / 'bgm.wav'), '--json')
        self.assertEqual(delivery.returncode, 0, delivery.stderr)
        self.assertTrue(json.loads(delivery.stdout)['pass'])
        (self.assets / 'audio_narration.wav').unlink()
        mixed = self.run_script('mix_audio.py', '--epic')
        self.assertEqual(mixed.returncode, 0, mixed.stderr)
        valid = self.run_script('probe_av_sync.mjs', '--no-narration')
        self.assertEqual(valid.returncode, 0, valid.stderr)


if __name__ == '__main__':
    unittest.main()
