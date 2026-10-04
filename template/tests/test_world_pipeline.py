"""Offline regressions for chapter timing and world-frame provenance."""
import base64
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
import wave
from unittest import mock

from PIL import Image

SCRIPTS = Path(__file__).resolve().parent.parent / 'scripts'


def load_script(name):
    specification = importlib.util.spec_from_file_location(name, SCRIPTS / f'{name}.py')
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


class WorldPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name) / 'different-directory-name'
        self.root.mkdir()
        (self.root / 'script').mkdir()
        (self.root / 'src' / 'common').mkdir(parents=True)
        self.assets = self.root / 'public' / 'assets' / 'portrait'
        self.assets.mkdir(parents=True)
        self.audio = self.assets / 'audio.wav'
        self.audio.write_bytes(b'existing short mixed audio')
        self.chapter = load_script('chapter_timeline')
        self.chapter.ROOT = self.root
        self.world = load_script('gen_world_frames')
        self.config = {'schemaVersion': 1, 'slug': 'portrait', 'fps': 24,
                       'width': 1080, 'height': 1920, 'totalFrames': None, 'status': 'draft'}
        self.save('project.json', self.config)
        self.chapters = [{'id': 'opening', 'title': 'Opening', 'seconds': 4,
                          'material': 'ink_wash_bagua', 'custom': {'preserved': True},
                          'lines': [{'zh': 'Test', 'en': 'Example', 'at': 1, 'dur': 1}]}]
        self.save('script/chapters.json', self.chapters)
        self.env = {'A2V_IMAGE_API_BASE': 'https://example.com/v1',
                    'A2V_IMAGE_API_KEY': 'never-write-this-token',
                    'A2V_IMAGE_MODEL': 'gpt-image-2', 'A2V_IMAGE_PROVIDER': 'openai'}
        process_env = {name: value for name, value in os.environ.items() if not name.startswith('A2V_IMAGE_')}
        self.environment = mock.patch.dict(os.environ, {**process_env, **self.env}, clear=True)
        self.environment.start()
        image = io.BytesIO()
        Image.new('RGB', (9, 16), '#225544').save(image, format='PNG')
        self.png = image.getvalue()
        self.response = {'data': [{'b64_json': base64.b64encode(self.png).decode(), 'seed': 123}]}

    def tearDown(self):
        self.environment.stop()
        self.temporary.cleanup()

    def save(self, relative, data):
        (self.root / relative).write_text(json.dumps(data), encoding='utf-8')

    def read(self, relative):
        return json.loads((self.root / relative).read_text(encoding='utf-8'))

    def create_prompts(self):
        self.assertEqual(self.chapter.main([]), 0)
        self.world.generate_prompts(self.root)
        return self.read('script/world_prompts.json')

    def generated_assets(self):
        return self.read('MANIFEST.json')['assets']

    def register(self, target, **changes):
        options = {'source': 'user:manual image', 'note': 'World background',
                   'license_text': 'User authorized', 'model': 'actual-model',
                   'prompt': 'Full edited prompt. Avoid text.', 'seed': 'n/a',
                   'disclosure': 'AI-generated image'}
        options.update(changes)
        self.world.register_files(self.root, [str(target)], 0, **options)

    def test_timeline_preserves_material_metadata_fps_and_existing_audio(self):
        preserved = self.audio.read_bytes()
        with mock.patch.object(self.chapter.subprocess, 'run') as runner:
            self.assertEqual(self.chapter.main([]), 0)
        runner.assert_not_called()
        timeline = self.read('script/timeline.json')
        self.assertEqual(timeline['fps'], 24)
        self.assertEqual(timeline['total_frames'], 96)
        self.assertEqual(timeline['chapters'][0]['material'], 'ink_wash_bagua')
        self.assertEqual(timeline['chapters'][0]['id'], 'opening')
        self.assertEqual(timeline['chapters'][0]['custom'], {'preserved': True})
        self.assertEqual(self.read('project.json')['totalFrames'], 96)
        self.assertEqual(self.audio.read_bytes(), preserved)
        self.assertIn('@24fps', (self.root / 'script' / 'timeline.md').read_text(encoding='utf-8'))

    def test_fit_bgm_scales_subtitle_windows(self):
        with mock.patch.object(self.chapter, 'audio_duration', return_value=8):
            self.assertEqual(self.chapter.main(['--bgm', 'fake.wav']), 3)
        self.assertFalse((self.root / 'script' / 'timeline.json').exists())
        with mock.patch.object(self.chapter, 'audio_duration', return_value=8):
            self.assertEqual(self.chapter.main(['--bgm', 'fake.wav', '--fit-bgm']), 0)
        timeline = self.read('script/timeline.json')
        self.assertEqual(timeline['total_frames'], 192)
        self.assertEqual(timeline['chapters'][0]['seconds'], 8)
        self.assertEqual(timeline['chapters'][0]['lines'][0]['at'], 2)
        self.assertEqual(timeline['chapters'][0]['lines'][0]['dur'], 2)
        subs = (self.root / 'src' / 'common' / 'subs.ts').read_text(encoding='utf-8')
        self.assertIn('"from": 49, "to": 96', subs)

    def test_missing_audio_creates_a_real_silent_bed_and_force_is_explicit(self):
        self.save('script/chapters.json', [{**self.chapters[0], 'seconds': 1, 'lines': []}])
        self.audio.unlink()
        self.assertEqual(self.chapter.main([]), 0)
        with wave.open(str(self.audio), 'rb') as bed:
            self.assertEqual(bed.getframerate(), 48000)
            self.assertEqual(bed.getnchannels(), 2)
            self.assertEqual(bed.getnframes(), 48000)
            self.assertEqual(set(bed.readframes(48000)), {0})
        self.audio.write_bytes(b'explicitly replace this audio')
        self.assertEqual(self.chapter.main(['--force']), 0)
        self.assertAlmostEqual(self.chapter.audio_duration(self.audio), 1.0)

    def test_invalid_chapters_and_subtitle_windows_are_rejected_before_output(self):
        for changes in ({'seconds': float('nan')}, {'seconds': True}, {'seconds': 0},
                        {'lines': [{'zh': 'Test', 'at': -1, 'dur': 1}]},
                        {'lines': [{'zh': 'Test', 'at': 3, 'dur': 2}]},
                        {'lines': [{'zh': '', 'at': 1, 'dur': 1}]}):
            with self.subTest(changes=changes):
                self.save('script/chapters.json', [{**self.chapters[0], **changes}])
                with self.assertRaises(ValueError):
                    self.chapter.main([])
                self.assertFalse((self.root / 'script' / 'timeline.json').exists())
        self.save('script/chapters.json', [{**self.chapters[0], 'lines': [
            {'zh': 'First', 'at': 1, 'dur': 2}, {'zh': 'Second', 'at': 2, 'dur': 1}]}])
        with self.assertRaisesRegex(ValueError, 'overlap'):
            self.chapter.main([])

    def test_invalid_project_and_legacy_migration_require_explicit_fps(self):
        for changes in ({'slug': '../outside'}, {'fps': 0}, {'fps': True}):
            self.save('project.json', {**self.config, **changes})
            with self.assertRaises(ValueError):
                self.chapter.main([])
        (self.root / 'project.json').unlink()
        (self.root / 'src' / 'config.ts').write_text("export const VIDEO = {slug: 'legacy'};", encoding='utf-8')
        with self.assertRaises(ValueError):
            self.chapter.load_project()
        with self.assertRaises(ValueError):
            self.chapter.load_project(True)
        self.assertEqual(self.chapter.load_project(True, 25)['fps'], 25)
        with self.assertRaises(ValueError):
            self.chapter._guard(self.root / '..' / 'escape.txt')

    def test_native_portrait_spec_uses_project_slug_and_preserves_existing_spec(self):
        specs = self.create_prompts()
        self.assertEqual(specs[0]['aspectRatio'], '9:16')
        self.assertIn('Native 9:16 composition.', specs[0]['prompt'])
        self.assertNotIn('16:9', specs[0]['prompt'])
        self.assertTrue(specs[0]['targetFile'].startswith('assets/portrait/'))
        specs[0]['prompt'] = 'Manually revised composition'
        self.save('script/world_prompts.json', specs)
        with self.assertRaises(FileExistsError):
            self.world.generate_prompts(self.root)
        self.assertEqual(self.read('script/world_prompts.json')[0]['prompt'], 'Manually revised composition')

    def test_missing_and_unknown_materials_require_explicit_selection(self):
        for material in (None, 'not-a-material', ['cave_stone']):
            with self.subTest(material=material):
                with self.assertRaises(ValueError):
                    self.world.resolve_material({'material': material}, 0)
        self.chapter.main([])
        timeline = self.read('script/timeline.json')
        timeline['chapters'][0].pop('material')
        self.save('script/timeline.json', timeline)
        with self.assertRaises(ValueError):
            self.world.generate_prompts(self.root)
        self.assertFalse((self.root / 'script' / 'world_prompts.json').exists())

    def test_generated_full_hash_and_actual_edited_submitted_prompt_are_recorded(self):
        specs = self.create_prompts()
        specs[0]['prompt'] = 'Edited portrait composition with an exact product object.'
        specs[0]['negativePrompt'] = 'Readable words, unwanted logos, deformed mechanisms.'
        self.save('script/world_prompts.json', specs)
        with mock.patch.object(self.world, 'post_json', return_value=self.response) as request:
            self.world.generate_images(self.root, [], 't1')
        submitted = request.call_args.args[1]['prompt']
        self.assertIn(specs[0]['prompt'], submitted)
        self.assertIn(specs[0]['negativePrompt'], submitted)
        self.assertEqual(request.call_args.args[1]['size'], '1024x1536')
        self.assertNotIn('response_format', request.call_args.args[1])
        asset = self.generated_assets()[0]
        self.assertEqual(asset['prompt'], submitted)
        self.assertEqual(asset['promptSpec'], specs[0])
        self.assertEqual(asset['sha256'], self.world.sha256(self.png))
        self.assertEqual(len(asset['sha256']), 64)
        self.assertEqual(asset['seed'], 123)
        self.assertEqual(asset['actualSize'], {'width': 9, 'height': 16})
        self.assertEqual(set(asset['qc'].values()), {'not_performed'})
        self.assertTrue(asset['path'].endswith('_t1.png'))
        self.assertNotIn(self.env['A2V_IMAGE_API_KEY'], (self.root / 'MANIFEST.json').read_text())

    def test_existing_candidate_is_protected_before_provider_call(self):
        self.create_prompts()
        with mock.patch.object(self.world, 'post_json', return_value=self.response) as request:
            self.world.generate_images(self.root, [], 't1')
            request.reset_mock()
            with self.assertRaises(FileExistsError):
                self.world.generate_images(self.root, [], 't1')
            request.assert_not_called()
            self.world.generate_images(self.root, [], 't2')
            self.world.generate_images(self.root, [], 't1', overwrite=True)
        self.assertEqual(len(self.generated_assets()), 2)

    def test_target_path_traversal_and_invalid_take_are_rejected_before_network(self):
        specs = self.create_prompts()
        for target in ('../../outside.png', str(Path(self.temporary.name) / 'outside.png')):
            with self.subTest(target=target):
                specs[0]['targetFile'] = target
                self.save('script/world_prompts.json', specs)
                with mock.patch.object(self.world, 'post_json') as request:
                    with self.assertRaises(ValueError):
                        self.world.generate_images(self.root, [], 't1')
                    request.assert_not_called()
        with self.assertRaises(ValueError):
            self.world.generate_images(self.root, [], '../../escape')
        with self.assertRaises(ValueError):
            self.world.guard(self.root, self.root / '..' / 'outside.json')

    def test_registration_requires_real_provenance_and_contained_path(self):
        candidate = self.assets / 'manual.png'
        candidate.write_bytes(self.png)
        for changes in ({'source': None}, {'license_text': None}, {'model': 'unspecified'},
                        {'prompt': None}, {'seed': None}, {'disclosure': None}):
            with self.subTest(changes=changes):
                with self.assertRaises(ValueError):
                    self.register(candidate, **changes)
                self.assertFalse((self.root / 'MANIFEST.json').exists())
        outside = Path(self.temporary.name) / 'outside.png'
        outside.write_bytes(self.png)
        with self.assertRaises(ValueError):
            self.register(outside)
        self.register(candidate)
        asset = self.generated_assets()[0]
        self.assertEqual(asset['sha256'], self.world.sha256(self.png))
        self.assertEqual(asset['license'], 'User authorized')
        self.assertEqual(set(asset['qc'].values()), {'not_performed'})

    def test_wrong_orientation_unknown_provider_and_stale_spec_are_rejected(self):
        self.create_prompts()
        with mock.patch.dict(os.environ, {'A2V_IMAGE_SIZE': '1536x1024'}):
            with mock.patch.object(self.world, 'post_json') as request:
                with self.assertRaisesRegex(ValueError, 'orientation'):
                    self.world.generate_images(self.root, [], 't1')
                request.assert_not_called()
        with mock.patch.dict(os.environ, {'A2V_IMAGE_PROVIDER': 'invented-provider'}):
            with self.assertRaises(ValueError):
                self.world.generate_images(self.root, [], 't1')
        self.save('project.json', {**self.config, 'width': 1920, 'height': 1080})
        with self.assertRaisesRegex(ValueError, 'aspectRatio'):
            self.world.generate_images(self.root, [], 't1')

    def test_invalid_provider_response_and_duplicate_targets_do_not_write_assets(self):
        specs = self.create_prompts()
        for response in ([], {'data': [None]}, {'data': []}):
            with self.subTest(response=response):
                with mock.patch.object(self.world, 'post_json', return_value=response):
                    with self.assertRaises(ValueError):
                        self.world.generate_images(self.root, [], 't1')
                self.assertFalse((self.root / 'MANIFEST.json').exists())
        specs.append({**specs[0], 'chapterIndex': 1})
        self.save('script/world_prompts.json', specs)
        with mock.patch.object(self.world, 'post_json') as request:
            with self.assertRaisesRegex(ValueError, 'same candidate'):
                self.world.generate_images(self.root, [], 't1')
            request.assert_not_called()

    def test_existing_symlinks_cannot_redirect_writes_outside_project(self):
        outside = Path(self.temporary.name) / 'outside-assets'
        outside.mkdir()
        link = self.root / 'public' / 'escaping-link'
        try:
            link.symlink_to(outside, target_is_directory=True)
        except OSError as error:
            self.skipTest(f'Directory symlinks unavailable: {error}')
        with self.assertRaises(ValueError):
            self.chapter._guard(link / 'timeline.json')
        with self.assertRaises(ValueError):
            self.world.safe_write(self.root, link / 'candidate.png', self.png)
        self.assertEqual(list(outside.iterdir()), [])
        specs = self.create_prompts()
        specs[0]['targetFile'] = 'escaping-link/candidate.png'
        self.save('script/world_prompts.json', specs)
        with mock.patch.object(self.world, 'post_json') as request:
            with self.assertRaises(ValueError):
                self.world.generate_images(self.root, [], 't1')
            request.assert_not_called()

    def test_minimax_uses_native_aspect_and_explicit_seed_unavailability(self):
        self.create_prompts()
        with mock.patch.dict(os.environ, {'A2V_IMAGE_PROVIDER': 'minimax', 'A2V_IMAGE_MODEL': 'image-01'}):
            response = {'base_resp': {'status_code': 0}, 'data': {'image_urls': ['https://example.com/candidate.png']}}
            with mock.patch.object(self.world, 'post_json', return_value=response) as request:
                with mock.patch.object(self.world, 'fetch_bytes', return_value=self.png):
                    self.world.generate_images(self.root, [], 't1')
            self.assertEqual(request.call_args.args[1]['aspect_ratio'], '9:16')
        self.assertEqual(self.generated_assets()[0]['seed'], 'n/a')


if __name__ == '__main__':
    unittest.main()
