#!/usr/bin/env node
/**
 * probe_liveness.mjs —— 动画活性探针（动态渲染）。
 *
 * 对给定镜头 [from,to] 在区间内等距取 8 帧渲染（单进程复用渲染器），相邻采样帧两两计算
 * 平均绝对像素差（亮度 0–255 量纲）：
 *  - 连续 ≥4 对 MAD < 0.5        → 报「动画可能已死」；
 *  - 8 帧完全一致（所有 MAD = 0）→ 报「静态帧」。
 * 任一命中 → 退出码 1；否则 0。
 *
 * 用法：node probe_liveness.mjs [--shot beat3] [--comp Video] [--rebundle]
 *   无 --comp 默认 Video（正片镜头）；模板冒烟显式传 --comp PromoDemo。
 *   无 --shot = 遍历该合成全部镜头（一条命令跑全片）。
 * 退出码：0=通过｜1=发现疑似死动画｜2=用法/环境错误。
 */
import {withRenderer, listShots, argValue, die, decodePng, toLuma, madLuma} from './probe_lib.mjs';

const compId = argValue('--comp') ?? 'Video';
const shotFilter = argValue('--shot');

const all = listShots().filter((s) => s.comp === compId);
if (!all.length) die(`合成 ${compId} 下没有镜头（可用: PromoDemo / Video 内 SHOTS_*）`);
const shots = shotFilter ? all.filter((s) => s.id === shotFilter) : all;
if (shotFilter && !shots.length) die(`找不到镜头 ${shotFilter}（可选: ${all.map((s) => s.id).join(', ')}）`);

const N_SAMPLES = 8;
const MAD_DEAD = 0.5;   // 0–255 量纲，低于此视为像素级无变化
const MIN_PAIRS = 4;    // 连续「无变化」对数阈值

function sampleFrames(shot) {
  const {from, to} = shot;
  const frames = new Set();
  for (let i = 0; i < N_SAMPLES; i++) {
    frames.add(Math.min(to - 1, Math.max(from - 1, Math.round(from - 1 + (i * (to - from)) / (N_SAMPLES - 1)))));
  }
  return [...frames].sort((a, b) => a - b);
}

await withRenderer({compId, warmup: true}, async ({composition, still}) => {
  console.log(`== probe_liveness：动画活性（合成 ${compId}，画布 ${composition.width}×${composition.height}@${composition.fps}）==`);
  console.log(`判据：等距 ${N_SAMPLES} 帧相邻 MAD<${MAD_DEAD} 且连续 ≥${MIN_PAIRS} 对 →「动画可能已死」；8 帧全等 →「静态帧」。`);
  console.log('');
  let flagged = 0;
  for (const shot of shots) {
    const frames = sampleFrames(shot);
    const lumas = [];
    for (const f of frames) {
      const {buffer} = await still(f);
      const {width, height, rgba} = decodePng(buffer);
      lumas.push(toLuma(rgba, width, height));
    }
    const mads = [];
    for (let i = 0; i + 1 < lumas.length; i++) mads.push(madLuma(lumas[i], lumas[i + 1]));
    let run = 0, maxRun = 0;
    for (const m of mads) { run = m < MAD_DEAD ? run + 1 : 0; maxRun = Math.max(maxRun, run); }
    const allZero = mads.length > 0 && mads.every((m) => m === 0);
    const dead = maxRun >= MIN_PAIRS;
    const staticFrame = allZero;
    if (dead || staticFrame) flagged++;
    const madStr = mads.map((m) => m.toFixed(3)).join(' ');
    console.log(`镜头 ${shot.id} 帧 ${shot.from}..${shot.to}（采样 0 起帧 ${frames.join(',')}）`);
    console.log(`  相邻 MAD: ${madStr}`);
    if (staticFrame) console.log(`  ✗ 静态帧：8 帧完全一致（MAD 全为 0）`);
    else if (dead) console.log(`  ✗ 动画可能已死：连续 ${maxRun} 对 MAD<${MAD_DEAD}（≥${MIN_PAIRS} 触发）`);
    else console.log(`  ✓ 有动画（最长连续静止 ${maxRun} 对）`);
  }
  console.log('');
  if (flagged) {
    console.log(`结论：${shots.length} 镜头中 ${flagged} 个疑似死动画/静态帧 → 不通过（退出码 1）`);
    process.exit(1);
  }
  console.log(`结论：${shots.length} 镜头全部有动画 → 通过`);
  process.exit(0);
});
