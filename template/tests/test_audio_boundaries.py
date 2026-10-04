"""Offline checks for project authority and audio filesystem boundaries."""
import asyncio
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

import numpy as np
from scipy.io import wavfile

SCRIPTS = Path(__file__).resolve().parent.parent / 'scripts'
SR = 48000


class AudioBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.base = Path(self.temporary.name)
        self.root = self.base / 'project'
        for directory in ('scripts', 'script', 'src/common', 'public/assets/canonical'):
            (self.root / directory).mkdir(parents=True, exist_ok=True)
        self.assets = self.root / 'public/assets/canonical'
        self.project = {'schemaVersion': 1, 'slug': 'canonical', 'fps': 24, 'totalFrames': 48,
                        'status': 'draft', 'custom': {'keep': ['all', 'metadata']}}
        self.save_project()
        self.set_config('canonical')
        self.narration = self.root / 'script/narration.txt'
        self.narration.write_text('Alpha|Beta\n', encoding='utf-8')
        self.timeline()
        for script in ('tts_build.py', 'mix_audio.py', 'audio_project.py'):
            shutil.copyfile(SCRIPTS / script, self.root / 'scripts' / script)
        specification = importlib.util.spec_from_file_location('tts_boundary', self.root / 'scripts/tts_build.py')
        self.tts = importlib.util.module_from_spec(specification)
        sys.path.insert(0, str(self.root / 'scripts'))
        try:
            specification.loader.exec_module(self.tts)
        finally:
            sys.path.pop(0)
        self.tts.ENGINE = 'edge'
        self.tts.EDGE_DELAY = 0
        self.tts.LEAD = self.tts.TAIL = self.tts.GAP = 0
        positions = np.arange(2 * SR) / SR
        self.samples = (0.3 * np.sin(2 * np.pi * 700 * positions)).astype(np.float32)
        self.synthesis = mock.AsyncMock(return_value=(self.samples, [0.0, 1.0], 2.0))
        self.tts.synth_sentence = self.synthesis
        self.outside = self.base / 'outside'
        self.outside.mkdir()
        self.sentinel = self.outside / 'sentinel'
        self.sentinel.write_bytes(b'outside files must remain byte-identical')

    def tearDown(self):
        self.temporary.cleanup()

    def save_project(self):
        (self.root / 'project.json').write_text(json.dumps(self.project), encoding='utf-8')

    def set_config(self, slug):
        (self.root / 'src/config.ts').write_text(f'export const VIDEO = {{slug: "{slug}", lang: "en"}};', encoding='utf-8')

    def timeline(self):
        (self.root / 'script/timeline.json').write_text(json.dumps({
            'fps': self.project['fps'], 'total_frames': self.project['totalFrames'],
            'chapters': [], 'sentences': []}), encoding='utf-8')

    def run_tts(self, **options):
        return asyncio.run(self.tts.main(self.narration, **options))

    def run_mix(self, *args):
        return subprocess.run([sys.executable, str(self.root / 'scripts/mix_audio.py'), *args],
                              cwd=self.root, capture_output=True, text=True, encoding='utf-8',
                              env={**os.environ, 'PYTHONUTF8': '1'})

    def master(self, seconds=2):
        wavfile.write(self.assets / 'audio_narration.wav', SR,
                      (self.samples[:round(seconds * SR)] * 32767).astype(np.int16))

    def digest(self, file):
        return hashlib.sha256(Path(file).read_bytes()).hexdigest()

    def link(self, target, destination, directory=False, junction=False):
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            shutil.rmtree(target) if target.is_dir() else target.unlink()
        if junction and os.name == 'nt':
            result = subprocess.run(['cmd', '/c', 'mklink', '/J', str(target), str(destination)],
                                    capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
        else:
            try:
                target.symlink_to(destination, target_is_directory=directory)
            except OSError as error:
                self.skipTest(f'Symlink unavailable: {error}')

    def test_mock_synthesis_24_and_30fps_preserves_metadata(self):
        for fps in (24, 30):
            with self.subTest(fps=fps):
                self.project['fps'] = fps
                self.save_project()
                self.run_tts(force=True)
                timeline = json.loads((self.root / 'script/timeline.json').read_text())
                self.assertEqual(timeline['fps'], fps)
                self.assertEqual(timeline['total_frames'], 2 * fps)
                self.assertEqual([(chunk['from'], chunk['to']) for chunk in timeline['sentences'][0]['subs']],
                                 [(1, fps), (fps + 1, 2 * fps)])
                project = json.loads((self.root / 'project.json').read_text())
                self.assertEqual(project['totalFrames'], 2 * fps)
                self.assertEqual(project['custom'], self.project['custom'])
                self.assertEqual(project['status'], 'draft')
                self.assertTrue((self.assets / 'audio_narration.wav').exists())
                self.assertEqual(self.digest(self.assets / 'audio.wav'), self.digest(self.assets / 'audio_narration.wav'))
                mixed = self.run_mix()
                self.assertEqual(mixed.returncode, 0, mixed.stderr)
                _, sound = wavfile.read(self.assets / 'audio.wav')
                self.assertEqual(sound.shape, (2 * SR, 2))

    def test_invalid_project_and_config_mismatch_reject_before_cache_or_synthesis(self):
        for changes in ({'slug': '../../../outside'}, {'fps': True}, {'fps': 0}, {'fps': 24.5}):
            with self.subTest(changes=changes):
                current = self.project.copy()
                self.project.update(changes)
                self.save_project()
                with self.assertRaises(ValueError):
                    self.run_tts()
                self.assertNotEqual(self.run_mix('--epic').returncode, 0)
                self.assertFalse((self.root / 'audio').exists())
                self.project = current
        self.save_project()
        self.set_config('old-slug')
        with self.assertRaisesRegex(ValueError, 'migrate'):
            self.run_tts()
        rejected = self.run_mix('--epic')
        self.assertIn('migrate', rejected.stderr)
        self.synthesis.assert_not_called()
        self.assertFalse((self.root / 'audio').exists())

    def test_malformed_project_rejects_without_writes(self):
        (self.root / 'project.json').write_text('{bad json', encoding='utf-8')
        with self.assertRaises(ValueError):
            self.run_tts()
        self.assertNotEqual(self.run_mix('--epic').returncode, 0)
        self.assertFalse((self.root / 'audio').exists())
        self.synthesis.assert_not_called()

    def test_missing_project_needs_explicit_legacy_and_fps(self):
        (self.root / 'project.json').unlink()
        for options in ({}, {'legacy_config': True}, {'fps': 24}):
            with self.assertRaises(ValueError):
                self.run_tts(**options)
        self.assertFalse((self.root / 'audio').exists())
        self.run_tts(legacy_config=True, fps=24)
        project = json.loads((self.root / 'project.json').read_text())
        self.assertEqual((project['slug'], project['fps'], project['totalFrames']), ('canonical', 24, 48))
        (self.root / 'project.json').unlink()
        rejected = self.run_mix('--legacy-config')
        self.assertNotEqual(rejected.returncode, 0)
        accepted = self.run_mix('--legacy-config', '--fps', '24')
        self.assertEqual(accepted.returncode, 0, accepted.stderr)
        self.assertEqual(json.loads((self.root / 'project.json').read_text())['totalFrames'], 48)

    def test_existing_narration_requires_force_and_mix_never_changes_master(self):
        self.master()
        before = self.digest(self.assets / 'audio_narration.wav')
        with self.assertRaisesRegex(ValueError, '--force'):
            self.run_tts()
        self.synthesis.assert_not_called()
        self.assertFalse((self.root / 'audio').exists())
        self.assertEqual(self.digest(self.assets / 'audio_narration.wav'), before)
        for _ in range(2):
            mixed = self.run_mix()
            self.assertEqual(mixed.returncode, 0, mixed.stderr)
            self.assertEqual(self.digest(self.assets / 'audio_narration.wav'), before)
        self.synthesis.return_value = (-self.samples, [0.0, 1.0], 2.0)
        self.run_tts(force=True)
        self.assertNotEqual(self.digest(self.assets / 'audio_narration.wav'), before)
        self.assertFalse((self.assets / 'audio.mix.json').exists())

    def test_traversing_narration_input_rejects_before_cache(self):
        outside = self.outside / 'narration.txt'
        outside.write_text('Alpha|Beta', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'escapes'):
            asyncio.run(self.tts.main(outside))
        self.assertFalse((self.root / 'audio').exists())
        self.synthesis.assert_not_called()

    def test_escaping_parent_junction_rejects_both_scripts(self):
        self.link(self.root / 'public/assets', self.outside, directory=True, junction=True)
        before = self.digest(self.sentinel)
        with self.assertRaisesRegex(ValueError, 'escapes'):
            self.run_tts(force=True)
        self.assertNotEqual(self.run_mix('--epic').returncode, 0)
        self.synthesis.assert_not_called()
        self.assertFalse((self.root / 'audio').exists())
        self.assertEqual(self.digest(self.sentinel), before)
        self.assertEqual([file.name for file in self.outside.iterdir()], ['sentinel'])

    def test_all_tts_individual_input_and_output_links_reject_before_synthesis(self):
        paths = ['project.json', 'src/config.ts', 'script/narration.txt', 'script/timeline.json',
                 'script/timeline.md', 'src/common/subs.ts', 'src/common/timeline.ts',
                 'public/assets/canonical/audio.wav', 'public/assets/canonical/audio_narration.wav',
                 'public/assets/canonical/audio.mix.json']
        for relative in paths:
            with self.subTest(relative=relative):
                target = self.root / relative
                previous = target.read_bytes() if target.exists() else None
                before = self.digest(self.sentinel)
                self.link(target, self.sentinel)
                try:
                    with self.assertRaises(ValueError):
                        self.run_tts(force=True)
                    self.assertEqual(self.digest(self.sentinel), before)
                    self.assertFalse((self.root / 'audio').exists())
                    self.synthesis.assert_not_called()
                finally:
                    target.unlink()
                    if previous is not None:
                        target.write_bytes(previous)

    def test_all_mix_individual_input_and_output_links_reject_before_writes(self):
        self.master()
        for relative in ('project.json', 'src/config.ts', 'script/timeline.json',
                         'public/assets/canonical/audio.wav', 'public/assets/canonical/audio_narration.wav',
                         'public/assets/canonical/audio.mix.json', 'public/assets/canonical/bgm.wav',
                         'public/assets/canonical/bgm.mp3'):
            with self.subTest(relative=relative):
                target = self.root / relative
                previous = target.read_bytes() if target.exists() else None
                before = self.digest(self.sentinel)
                self.link(target, self.sentinel)
                try:
                    rejected = self.run_mix()
                    self.assertNotEqual(rejected.returncode, 0)
                    self.assertEqual(self.digest(self.sentinel), before)
                    if relative != 'public/assets/canonical/audio.wav':
                        self.assertFalse((self.assets / 'audio.wav').exists())
                finally:
                    target.unlink()
                    if previous is not None:
                        target.write_bytes(previous)

    def test_cache_parent_and_computed_file_links_reject_before_synthesis(self):
        self.link(self.root / 'audio/cache', self.outside, directory=True, junction=True)
        with self.assertRaises(ValueError):
            self.run_tts()
        self.synthesis.assert_not_called()
        (self.root / 'audio/cache').rmdir()
        self.tts.PROJECT = self.tts.AudioProject(self.root)
        cache = Path(self.tts.cache_path('Alpha Beta', '.mp3'))
        self.link(cache, self.sentinel)
        with self.assertRaises(ValueError):
            self.run_tts()
        self.synthesis.assert_not_called()
        self.assertFalse((self.assets / 'audio.wav').exists())

    def test_recheck_rejects_link_created_during_synthesis_before_any_audio_write(self):
        async def raced_link(chunks, sep=''):
            self.link(self.root / 'src/common/subs.ts', self.sentinel)
            return self.samples, [0.0, 1.0], 2.0
        self.tts.synth_sentence = raced_link
        before = self.digest(self.sentinel)
        with self.assertRaises(ValueError):
            self.run_tts()
        self.assertEqual(self.digest(self.sentinel), before)
        self.assertFalse((self.assets / 'audio.wav').exists())

    def test_mix_rejects_inconsistent_fps_frames_and_audio_duration_without_writes(self):
        self.master()
        for data in ({'fps': 30, 'total_frames': 48}, {'fps': 24, 'total_frames': 49}):
            (self.root / 'script/timeline.json').write_text(json.dumps(data))
            self.assertNotEqual(self.run_mix().returncode, 0)
            self.assertFalse((self.assets / 'audio.wav').exists())
        self.timeline()
        self.master(seconds=1)
        self.assertNotEqual(self.run_mix().returncode, 0)
        self.assertFalse((self.assets / 'audio.wav').exists())

    def test_legacy_adoption_is_explicit_validated_and_never_adopts_previous_mix(self):
        self.master()
        master = self.assets / 'audio_narration.wav'
        master.rename(self.assets / 'audio.wav')
        original = self.digest(self.assets / 'audio.wav')
        self.assertNotEqual(self.run_mix().returncode, 0)
        self.assertFalse(master.exists())
        accepted = self.run_mix('--adopt-legacy')
        self.assertEqual(accepted.returncode, 0, accepted.stderr)
        self.assertEqual(self.digest(master), original)
        master.unlink()
        self.assertNotEqual(self.run_mix('--adopt-legacy').returncode, 0)
        self.assertFalse(master.exists())
        (self.assets / 'audio.mix.json').unlink()
        wavfile.write(self.assets / 'audio.wav', SR, np.zeros(SR, dtype=np.int16))
        self.assertNotEqual(self.run_mix('--adopt-legacy').returncode, 0)
        self.assertFalse(master.exists())

    def test_preflight_also_rejects_unused_cache_and_shared_output_links(self):
        self.master()
        for relative in ('audio/cache/unused.mp3', 'src/common/subs.ts'):
            with self.subTest(relative=relative):
                target = self.root / relative
                before = self.digest(self.sentinel)
                self.link(target, self.sentinel)
                try:
                    with self.assertRaises(ValueError):
                        self.run_tts(force=True)
                    self.assertNotEqual(self.run_mix().returncode, 0)
                    self.assertEqual(self.digest(self.sentinel), before)
                    self.assertFalse((self.assets / 'audio.wav').exists())
                    self.synthesis.assert_not_called()
                finally:
                    target.unlink()

    def test_invalid_synthesis_duration_rejects_before_writing_audio(self):
        self.synthesis.return_value = (self.samples, [0.0, 1.0], 1.0)
        with self.assertRaisesRegex(ValueError, 'inconsistent'):
            self.run_tts()
        self.assertFalse((self.assets / 'audio.wav').exists())
        self.assertFalse((self.assets / 'audio_narration.wav').exists())

    def test_pipe_only_narration_refuses_before_cache_or_synthesis(self):
        self.narration.write_text('| |\n', encoding='utf-8')
        with self.assertRaises(SystemExit):
            self.run_tts()
        self.synthesis.assert_not_called()
        self.assertFalse((self.root / 'audio').exists())

if __name__ == '__main__':
    unittest.main()
