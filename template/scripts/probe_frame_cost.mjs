#!/usr/bin/env node
/**
 * probe_frame_cost.mjs —— 单帧成本探针（动态渲染）。
 *
 * 每个镜头各渲 3 帧（首/中/尾）并逐帧单独计时（单进程复用渲染器，浏览器与 bundle 只冷启动一次，
 * 且先渲 1 帧预热、预热帧不计入统计，避免冷启动吞掉计时）：
 *  - 任一帧 > 500ms → 「性能塌方」，退出码 1；
 *  - 任一帧 > 200ms → 「偏慢」警告，退出码仍 0。
 * 输出按平均耗时降序的镜头表。时长为墙钟毫秒（含 renderStill 往返，不含进程启动）。
 *
 * 用法：node probe_frame_cost.mjs [--comp PromoDemo] [--shots beat1,beat2] [--rebundle]
 * 退出码：0=通过（可有偏慢警告）｜1=性能塌方｜2=用法/环境错误。
 */
import {withRenderer, listShots, argValue, die} from './probe_lib.mjs';

const compId = argValue('--comp') ?? 'PromoDemo';
const shotsArg = argValue('--shots');
const SLOW_MS = 200, COLLAPSE_MS = 500;

const all = listShots().filter((s) => s.comp === compId);
if (!all.length) die(`合成 ${compId} 下没有镜头`);
const shots = shotsArg ? shotsArg.split(',').map((s) => s.trim()) : all.map((s) => s.id);
const unknown = shots.filter((id) => !all.some((s) => s.id === id));
if (unknown.length) die(`未知镜头: ${unknown.join(',')}（可选: ${all.map((s) => s.id).join(', ')}）`);

await withRenderer({compId, warmup: true}, async ({composition, still}) => {
  const rows = [];
  let collapse = 0, slow = 0;
  for (const id of shots) {
    const shot = all.find((s) => s.id === id);
    const mid = Math.round((shot.from + shot.to) / 2) - 1;
    const frames = [shot.from - 1, mid, shot.to - 1];
    const times = [];
    for (const f of frames) times.push((await still(f)).ms);
    const max = Math.max(...times);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    if (max > COLLAPSE_MS) collapse++;
    else if (max > SLOW_MS) slow++;
    rows.push({id, range: `${shot.from}..${shot.to}`, frames, times, avg, max});
  }
  rows.sort((a, b) => b.avg - a.avg);
  console.log(`== probe_frame_cost：单帧成本（合成 ${compId}，画布 ${composition.width}×${composition.height}，预热帧已剔除）==`);
  console.log(`判据：单帧 >${COLLAPSE_MS}ms → 性能塌方(退1)；>${SLOW_MS}ms → 偏慢(警告，退0)。计时为 renderStill 墙钟。`);
  console.log('');
  console.log('镜头            帧区间      采样帧(0起)        各帧耗时 ms            平均    最大');
  for (const r of rows) {
    const t = r.times.map((x) => x.toFixed(0).padStart(4)).join(' ');
    const mark = r.max > COLLAPSE_MS ? ' ✗塌方' : r.max > SLOW_MS ? ' ⚠偏慢' : ' ✓';
    console.log(`${r.id.padEnd(14)} ${r.range.padEnd(11)} ${r.frames.join(',').padEnd(18)} ${t}   ${r.avg.toFixed(0).padStart(5)}  ${r.max.toFixed(0).padStart(5)}${mark}`);
  }
  console.log('');
  if (collapse) {
    console.log(`结论：${collapse} 个镜头存在 >${COLLAPSE_MS}ms 的帧 → 性能塌方（退出码 1）`);
    process.exit(1);
  }
  console.log(`结论：无塌方帧；${slow} 个镜头 >${SLOW_MS}ms（偏慢警告）→ 退出码 0`);
  process.exit(0);
});
