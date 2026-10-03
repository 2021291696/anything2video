#!/usr/bin/env node
/**
 * probe_av_sync.mjs —— 音画对位终检探针（lessons 09-28：整片旁白晚 41 帧事故的防回归门）。
 *
 * 对纯旁白 audio_narration.wav 跑 silencedetect；BGM 不参与开口判定。
 * 与 timeline 首句 (from-1)/fps（帧号一基含端点）比对：
 *  - |偏差| > 6 帧 → 「音画错位」，退出码 1；
 *  - 原旁白及可选 --media 成片时长 vs total_frames/fps（差 >2 帧失败）。
 *
 * 用法：node scripts/probe_av_sync.mjs [--audio <纯旁白>] [--timeline <JSON>] [--media <成片>] [--no-narration]
 *   默认从 src/config.ts 读 slug 推导两路径。退出码：0=通过｜1=音画错位｜2=用法/环境错误。
 *   --no-narration（epic 无旁白口径，recipes/epic.md §7 判据 7）：跳过首句开口对位（sentences 恒空），
 *   改为音频总时长 vs 画面总长硬校验（差 >±6 帧 = 错位）——静音床/BGM 轨同样适用。
 */
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const argValue = (k) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const cfg = fs.readFileSync(path.join(ROOT, 'src', 'config.ts'), 'utf-8');
const m = cfg.match(/slug:\s*'([^']+)'/);
if (!m) die('config.ts 里找不到 slug（config 格式漂移？）');
const SLUG = argValue('--audio') ? undefined : m[1];
const defaultAudio = process.argv.includes('--no-narration') ? 'audio.wav' : 'audio_narration.wav';
const AUDIO = path.resolve(ROOT, argValue('--audio') ?? `public/assets/${SLUG}/${defaultAudio}`);
const MEDIA = argValue('--media') ? path.resolve(ROOT, argValue('--media')) : null;
const TIMELINE = path.resolve(ROOT, argValue('--timeline') ?? 'script/timeline.json');

function die(msg, code = 2) {
  console.error(`[av_sync] ${msg}`);
  process.exit(code);
}

if (!fs.existsSync(AUDIO)) die(`音频不存在：${AUDIO}`);
if (!fs.existsSync(TIMELINE)) die(`时间轴不存在：${TIMELINE}`);
const NO_NARR = process.argv.includes('--no-narration');
const tl = JSON.parse(fs.readFileSync(TIMELINE, 'utf-8'));
const FPS = tl.fps ?? 30;
const first = (tl.sentences ?? []).slice().sort((a, b) => a.from - b.from)[0];
if (!NO_NARR && !first) die('timeline.json 里没有 sentences，无从对位');
if (!Number.isFinite(FPS) || FPS <= 0 || !Number.isInteger(tl.total_frames) || tl.total_frames < 1) die('Invalid timeline fps / duration');
if (first && (!Number.isInteger(first.from) || first.from < 1)) die('Invalid sentence frame');
const expectS = ((first?.from ?? 1) - 1) / FPS;

if (NO_NARR) {
  // epic 无旁白：检查音轨与成片时长，不假装检验语音。
  const durS = audioDuration(AUDIO);
  if (durS === null) die('ffprobe 读不到音频时长');
  if (!tl.total_frames) die('timeline.json 缺 total_frames');
  const expectDur = tl.total_frames / FPS;
  const dFrames = Math.round((durS - expectDur) * FPS);
  if (Math.abs(dFrames) > 6) {
    console.error(`[av_sync] 音画错位（高，--no-narration）：音频 ${durS.toFixed(2)}s vs 画面 ${expectDur.toFixed(2)}s，差 ${dFrames} 帧（>±6）`);
    process.exit(1);
  }
  console.log(`[av_sync] PASS（--no-narration）：音频 ${durS.toFixed(2)}s vs 画面 ${expectDur.toFixed(2)}s，差 ${dFrames} 帧（≤±6）`);
  checkDurations();
  process.exit(0);
}

// silencedetect：噪声门 -30dB、最短 0.25s——旁白前的静音段足够长，句间停顿不会被误当语音。
// ⚠ ffmpeg 把 silencedetect 结果写 stderr：execFileSync 只回 stdout 会把它丢掉（val-sand 首轮实测恒判失败），
// 必须用 spawnSync 读合并输出（09-30 val-sand QC 轮实锤，修法见 qc/qc_v2_final.md）。
let merged = '';
try {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', AUDIO, '-af', 'silencedetect=noise=-30dB:d=0.25', '-f', 'null', '-'],
    { encoding: 'utf-8' });
  merged = `${r.stderr ?? ''}\n${r.stdout ?? ''}`;
  if (r.error) die(`ffmpeg 失败：${String(r.error).slice(0, 200)}`);
  if (r.status !== 0) die(`ffmpeg 退出码 ${r.status}：${String(r.stderr).slice(-400)}`);
} catch (e) {
  die(`ffmpeg 失败：${String(e.message).slice(0, 200)}`);
}
const ends = [...merged.matchAll(/silence_end:\s*([\d.]+)/g)].map((x) => +x[1]);
const starts = [...merged.matchAll(/silence_start:\s*([\d.]+)/g)].map((x) => +x[1]);
if (starts.length && starts[0] <= 0.05 && (!ends.length || ends[0] >= audioDuration(AUDIO) - 0.02)) die('旁白全程静音，无法验证开口', 1);
if (!starts.length || starts[0] > 0.05) {
  // 首个静音如果在句中，则真正开口在零秒。
  if (expectS * FPS <= 6) {
    console.log(`[av_sync] PASS：音频无前导静音，标称开口 ${expectS.toFixed(2)}s（帧 ${first.from}）在容差内`);
    checkDurations();
    process.exit(0);
  }
  console.error(`[av_sync] 音画错位（高）：音频无前导静音（开口≈0s），标称开口应在 ${expectS.toFixed(2)}s（帧 ${first.from}），偏差 ${(0 - first.from)} 帧`);
  process.exit(1);
}
const onsetS = ends[0];
if (!Number.isFinite(onsetS)) die('没有可测的首句开口', 1);
const leadSilence = starts[0] > 0.05 ? `（前导静音 ${starts[0].toFixed(2)}s 已被修剪/保留）` : '';
const devFrames = Math.round((onsetS - expectS) * FPS);

// 时长进入独立硬校验；此处只组装读数。
let durNote = '';
const durS = audioDuration(AUDIO);
if (durS !== null && tl.total_frames) {
  const expectDur = tl.total_frames / FPS;
  const dFrames = Math.round((durS - expectDur) * FPS);
  durNote = `｜音频时长 ${durS.toFixed(2)}s vs 画面 ${expectDur.toFixed(2)}s（差 ${dFrames} 帧${Math.abs(dFrames) > 15 ? '，⚠ 超 15 帧' : ''}）`;
}

if (Math.abs(devFrames) > 6) {
  console.error(`[av_sync] 音画错位（高）：实测首句开口 ${onsetS.toFixed(2)}s${leadSilence}，标称帧 ${first.from}=${expectS.toFixed(2)}s，偏差 ${devFrames} 帧（>±6）${durNote}`);
  process.exit(1);
}
console.log(`[av_sync] PASS：首句开口实测 ${onsetS.toFixed(2)}s vs 标称 ${expectS.toFixed(2)}s，偏差 ${devFrames} 帧（≤±6）${leadSilence}${durNote}`);
checkDurations();
process.exit(0);

function checkDurations() {
  for (const file of [AUDIO, MEDIA].filter(Boolean)) {
    const duration = audioDuration(file);
    if (duration === null) die(`不能读取媒体时长：${file}`);
    if (Math.abs(duration * FPS - tl.total_frames) > 2) die(`媒体时长偏离时间轴超过 2 帧：${file}`, 1);
  }
}

function audioDuration(f) {
  try {
    const o = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], {encoding: 'utf-8'});
    const v = parseFloat(o.trim());
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
