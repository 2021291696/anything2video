#!/usr/bin/env node
/**
 * still_batch.mjs —— 批量出 still（still.sh 的执行体）。
 *
 * 单进程复用渲染器：bundle 一次 + 浏览器一次 + renderStill 循环出帧（复用 probe_lib 的 withRenderer），
 * 替代旧实现「一帧一次 npx remotion still」的每帧冷启动（Node + Chrome ≈5–10s/帧，6 张 still 白烧半分钟）。
 *
 * bundle 目录 build_dev_<tag>：tag 固定本组，并行建组互不踩；src 任一文件改动自动重打（.src_ok 戳对账），
 * 不再需要手动 rm -rf。禁止裸 `npx remotion still`（临时目录堆 bundle 写满磁盘）的纪律不变。
 *
 * 用法：node scripts/still_batch.mjs --comp Video --frames 12,48,90 --out <abs_dir> [--tag g3]
 * 输出文件名与旧实现一致：f_%04d.png（1 起帧号）。
 * 退出码：0=成功｜1=渲染失败｜2=用法/环境错误。
 */
import fs from 'node:fs';
import path from 'node:path';
import {withRenderer, argValue, die, TEMPLATE_ROOT} from './probe_lib.mjs';

const comp = argValue('--comp');
const framesArg = argValue('--frames');
const out = argValue('--out');
const tag = argValue('--tag') ?? comp;
if (!comp || !framesArg || !out) die('用法: still_batch.mjs --comp <Comp> --frames <1,2,3> --out <abs_dir> [--tag g3]');
if (!path.isAbsolute(out)) die(`--out 必须是绝对路径: ${out}`);
const frames = framesArg.split(',').map((s) => parseInt(s.trim(), 10));
const bad = frames.filter((n) => !Number.isFinite(n) || n < 1);
if (bad.length || !frames.length) die(`--frames 必须是 1 起的帧号列表: ${framesArg}`);

const bundleDir = path.join(TEMPLATE_ROOT, `build_dev_${tag}`);
fs.mkdirSync(out, {recursive: true});

try {
  await withRenderer({compId: comp, warmup: false, bundleDir}, async ({still}) => {
    for (const n of frames) {
      const {ms, buffer} = await still(n - 1);
      const name = `f_${String(n).padStart(4, '0')}.png`;
      fs.writeFileSync(path.join(out, name), buffer);
      console.log(`${name} ${ms.toFixed(0)}ms`);
    }
  });
  process.exit(0);
} catch (e) {
  console.error(`[still_batch] 渲染失败: ${e?.message ?? e}`);
  process.exit(1);
}
