#!/usr/bin/env node
/**
 * probe_av_sync.mjs —— 音画对位终检探针（lessons 09-28：整片旁白晚 41 帧事故的防回归门）。
 *
 * 原理：对成片音频跑 ffmpeg silencedetect，取首个静音段结束点 = 首个语音 onset 实测值；
 * 与 timeline 首句 from/fps（标称开口帧）比对：
 *  - |偏差| > 6 帧 → 「音画错位」，退出码 1；
 *  - 顺带核对音频总时长 vs total_frames/fps（差 >15 帧 → 警告，不挡门）。
 *
 * 用法：node scripts/probe_av_sync.mjs [--audio public/assets/<slug>/audio.wav] [--timeline script/timeline.json]
 *   默认从 src/config.ts 读 slug 推导两路径。退出码：0=通过｜1=音画错位｜2=用法/环境错误。
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
const AUDIO = path.resolve(argValue('--audio') ? argValue('--audio') : `public/assets/${SLUG}/audio.wav`);
const TIMELINE = path.resolve(ROOT, argValue('--timeline') ?? 'script/timeline.json');

function die(msg, code = 2) {
  console.error(`[av_sync] ${msg}`);
  process.exit(code);
}

if (!fs.existsSync(AUDIO)) die(`音频不存在：${AUDIO}`);
if (!fs.existsSync(TIMELINE)) die(`时间轴不存在：${TIMELINE}`);
const tl = JSON.parse(fs.readFileSync(TIMELINE, 'utf-8'));
const FPS = tl.fps ?? 30;
const first = (tl.sentences ?? []).slice().sort((a, b) => a.from - b.from)[0];
if (!first) die('timeline.json 里没有 sentences，无从对位');
const expectS = first.from / FPS;

// silencedetect：噪声门 -30dB、最短 0.25s——旁白前的静音段足够长，句间停顿不会被误当语音。
// ⚠ ffmpeg 把 silencedetect 结果写 stderr：execFileSync 只回 stdout 会把它丢掉（val-sand 首轮实测恒判失败），
// 必须用 spawnSync 读合并输出（09-30 val-sand QC 轮实锤，修法见 qc/qc_v2_final.md）。
let merged = '';
try {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', AUDIO, '-af', 'silencedetect=noise=-30dB:d=0.25', '-f', 'null', '-'],
    { encoding: 'utf-8' });
  merged = `${r.stderr ?? ''}\n${r.stdout ?? ''}`;
  if (r.error) die(`ffmpeg 失败：${String(r.error).slice(0, 200)}`);
} catch (e) {
  die(`ffmpeg 失败：${String(e.message).slice(0, 200)}`);
}
const ends = [...merged.matchAll(/silence_end:\s*([\d.]+)/g)].map((x) => +x[1]);
const starts = [...merged.matchAll(/silence_start:\s*([\d.]+)/g)].map((x) => +x[1]);
if (!ends.length) {
  // 全程无静音：音频从 0 帧就有声——若标称开口在帧 30 之前算通过，否则算提前开口
  if (expectS <= 0.5) {
    console.log(`[av_sync] PASS：音频无前导静音，标称开口 ${expectS.toFixed(2)}s（帧 ${first.from}）在容差内`);
    process.exit(0);
  }
  console.error(`[av_sync] 音画错位（高）：音频无前导静音（开口≈0s），标称开口应在 ${expectS.toFixed(2)}s（帧 ${first.from}），偏差 ${(0 - first.from)} 帧`);
  process.exit(1);
}
const onsetS = ends[0];
const leadSilence = starts[0] > 0.05 ? `（前导静音 ${starts[0].toFixed(2)}s 已被修剪/保留）` : '';
const devFrames = Math.round((onsetS - expectS) * FPS);

// 时长核对（警告级）
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
process.exit(0);

function audioDuration(f) {
  try {
    const o = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], {encoding: 'utf-8'});
    const v = parseFloat(o.trim());
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
