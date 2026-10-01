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
 * 终裁协议（lessons：val-blueprint/val-sand 五批片中塌方镜头逐跑漂移、环境噪声支配，单跑不定罪）：
 * 塌方行不再单跑定罪——输出追加「终裁指引」，静置机器后 --shots <该镜头> 逐镜隔离复测 3 次取中位：
 *  - --isolate      每个镜头独立 bundle + 独立进程渲染（父进程逐镜 spawn 本探针子进程，消并行互跑与共享 browser 噪声；
 *                    建议与 --shots 搭配只测嫌疑镜头）；
 *  - --baseline-ms  扣除进程基线后再判阈值（基线可由空载机跑一次已知轻镜头估得；有效耗时 = 实测 − 基线，下限 0）。
 *
 * 用法：node probe_frame_cost.mjs [--comp Video] [--shots beat1,beat2] [--isolate] [--baseline-ms N] [--rebundle]
 * 默认 --comp Video（正片镜头）；模板冒烟显式传 --comp PromoDemo。
 * 退出码：0=通过（可有偏慢警告）｜1=性能塌方｜2=用法/环境错误。
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {withRenderer, listShots, argValue, hasFlag, die, TMP_DIR} from './probe_lib.mjs';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`用法：node probe_frame_cost.mjs [--comp Video] [--shots beat1,beat2] [--isolate] [--baseline-ms N] [--rebundle]
  --comp <id>        合成 id（默认 Video；模板冒烟传 PromoDemo）
  --shots <a,b,...>  只测这些镜头（逗号分隔；--isolate 建议搭配单镜头）
  --isolate          每个镜头独立 bundle+独立进程渲染（父进程逐镜 spawn 子进程，消并行互跑与共享 browser 噪声）
  --baseline-ms <N>  扣除进程基线后再判阈值（有效耗时=实测−基线，下限 0；表内仍展示原始耗时）
  --rebundle         强制重打 bundle`);
  process.exit(0);
}

const compId = argValue('--comp') ?? 'Video';
const shotsArg = argValue('--shots');
const isolate = hasFlag('--isolate');
const workerBundle = argValue('--isolate-worker'); // 内部参数：--isolate 子进程的专属 bundle 目录
const SLOW_MS = 200, COLLAPSE_MS = 500;
let baseline = 0;
const baselineRaw = argValue('--baseline-ms');
if (baselineRaw != null) {
  baseline = +baselineRaw;
  if (!Number.isFinite(baseline) || baseline < 0) die(`--baseline-ms 需为非负数字（毫秒，收到: ${baselineRaw}）`);
}

const all = listShots().filter((s) => s.comp === compId);
if (!all.length) die(`合成 ${compId} 下没有镜头`);
const shots = shotsArg ? shotsArg.split(',').map((s) => s.trim()) : all.map((s) => s.id);
const unknown = shots.filter((id) => !all.some((s) => s.id === id));
if (unknown.length) die(`未知镜头: ${unknown.join(',')}（可选: ${all.map((s) => s.id).join(', ')}）`);

// ---- --isolate 父进程：逐镜 spawn 独立子进程（独立 bundle + 独立 browser），本进程只汇总 ----
if (isolate && !workerBundle) {
  const {spawnSync} = await import('node:child_process');
  const self = fileURLToPath(import.meta.url);
  fs.mkdirSync(TMP_DIR, {recursive: true});
  console.log(`== probe_frame_cost --isolate：逐镜隔离复测（每镜独立 bundle+独立进程，共 ${shots.length} 镜）==`);
  const collapseIds = [];
  for (const id of shots) {
    const bdir = path.join(TMP_DIR, `bundle_iso_${id}`);
    fs.rmSync(bdir, {recursive: true, force: true});
    console.log(`\n--- ${id}：独立进程渲染（bundle ${path.basename(bdir)}，强制新打）---`);
    const r = spawnSync(process.execPath, [self, '--comp', compId, '--shots', id, '--baseline-ms', String(baseline), '--isolate-worker', bdir, '--rebundle'], {stdio: 'inherit'});
    fs.rmSync(bdir, {recursive: true, force: true});
    if (r.error) die(`隔离子进程启动失败（镜头 ${id}）: ${r.error.message}`);
    if (r.status === 1) collapseIds.push(id);
    else if (r.status !== 0) die(`隔离子进程异常退出（镜头 ${id}，退出码 ${r.status}）`);
  }
  console.log('');
  if (collapseIds.length) {
    console.log(`终裁指引：静置后 --shots ${collapseIds.join(',')} 逐镜隔离复测 3 次取中位（本次为第 1 次；--baseline-ms ${baseline || '<ms>'} 可扣进程基线）。`);
    console.log(`结论：${collapseIds.length}/${shots.length} 镜隔离复测仍 >${COLLAPSE_MS}ms → 性能塌方（退出码 1）`);
    process.exit(1);
  }
  console.log(`结论：${shots.length} 镜隔离复测无塌方 → 退出码 0`);
  process.exit(0);
}

await withRenderer({compId, warmup: true, bundleDir: workerBundle || undefined}, async ({composition, still}) => {
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
    const effMax = Math.max(0, max - baseline); // 扣进程基线后的有效耗时（--baseline-ms；缺省 0 = 原值，判据与旧版逐值一致）
    if (effMax > COLLAPSE_MS) collapse++;
    else if (effMax > SLOW_MS) slow++;
    rows.push({id, range: `${shot.from}..${shot.to}`, frames, times, avg, max, effMax});
  }
  rows.sort((a, b) => b.avg - a.avg);
  const blNote = baseline > 0 ? `已扣进程基线 ${baseline}ms（--baseline-ms）。` : '';
  console.log(`== probe_frame_cost：单帧成本（合成 ${compId}，画布 ${composition.width}×${composition.height}，预热帧已剔除）==`);
  console.log(`判据：单帧 >${COLLAPSE_MS}ms → 性能塌方(退1)；>${SLOW_MS}ms → 偏慢(警告，退0)。计时为 renderStill 墙钟。${blNote}`);
  console.log('');
  console.log('镜头            帧区间      采样帧(0起)        各帧耗时 ms            平均    最大');
  for (const r of rows) {
    const t = r.times.map((x) => x.toFixed(0).padStart(4)).join(' ');
    const mark = r.effMax > COLLAPSE_MS ? ' ✗塌方' : r.effMax > SLOW_MS ? ' ⚠偏慢' : ' ✓';
    const blSuffix = baseline > 0 ? `（扣基线后最大 ${r.effMax.toFixed(0)}ms）` : '';
    console.log(`${r.id.padEnd(14)} ${r.range.padEnd(11)} ${r.frames.join(',').padEnd(18)} ${t}   ${r.avg.toFixed(0).padStart(5)}  ${r.max.toFixed(0).padStart(5)}${mark}${blSuffix}`);
  }
  console.log('');
  const collapseIds = rows.filter((r) => r.effMax > COLLAPSE_MS).map((r) => r.id);
  if (collapse) {
    console.log(`结论：${collapse} 个镜头存在 >${COLLAPSE_MS}ms 的帧 → 性能塌方（退出码 1）`);
    // 塌方行不再单跑定罪：附终裁协议（塌方镜头在噪声机上逐跑漂移，需隔离+取中位终裁）
    console.log(`终裁指引：静置后 --shots ${collapseIds.join(',')} 逐镜隔离复测 3 次取中位（--isolate 每镜独立 bundle+独立进程；--baseline-ms 扣进程基线）。`);
    process.exit(1);
  }
  console.log(`结论：无塌方帧；${slow} 个镜头 >${SLOW_MS}ms（偏慢警告）→ 退出码 0`);
  process.exit(0);
});
