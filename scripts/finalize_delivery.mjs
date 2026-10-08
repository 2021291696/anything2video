#!/usr/bin/env node
/**
 * finalize_delivery.mjs — 交付终检与原子发布（v3.10.0）。
 * 机制借鉴 lanshu-create-ai-presenter-video 的 finalize_delivery.sh（MIT，cclank）——Node/ffmpeg 重写，
 * 许可登记 LICENSE-THIRDPARTY/MIT-lanshu-create-ai-presenter-video.txt。
 *
 * 干什么：把 renders/ 里的成片加工成可交付的 master + share 双编码，全部检查通过才发布：
 *   1. 两遍 loudnorm（先测后线性应用）到目标响度（默认 -16 LUFS，--lufs 可按平台覆盖）
 *   2. master（CRF16/slow/256k）与 share（CRF24/medium/160k）均 H.264 + faststart + bt709
 *   3. 两个编码各做全解码（-xerror）——验证"交付物"而非源
 *   4. 对**最终编码**重测响度：|实测−目标| ≤ 0.5 LU 且真峰值 ≤ −1.0 dBTP
 *      （mono 旁白被合成复制成 stereo 会实测高约 3 LU——响度必须在渲染后的文件上验收，不能信混音母带）
 *   5. blackdetect（d=0.10）/ freezedetect（n=-60dB d=0.40）事件计数进报告（每个冻帧事件须对应有意静止，beat sheet 豁免登记对账）
 *   6. 3×3 九帧接触表
 *   7. 原子发布：全部在临时目录构建，逐项通过才 mv 进 delivery/，**交付报告最后一个落位当完成标记**；
 *      任一检查失败 → 什么都不发布、临时目录清掉、退出 1。拒绝覆盖已有交付物（重跑前手动清理，有意设计）。
 * 报告可移植：只写文件名不写绝对路径。
 *
 * 用法：node scripts/finalize_delivery.mjs <工程> <renders/xxx_vN.mp4> [--stem 名称] [--lufs -16]
 * 产物：delivery/<stem>-master.mp4 / -share.mp4 / -contact-sheet.png / -delivery-report.json
 * 退出码：任一检查失败或拒绝覆盖 = 1。check_state.mjs 的 delivered 态以本报告为证据。
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';

const execFileP = promisify(execFile);
const run = async (cmd, args) => {
  try {
    const {stdout, stderr} = await execFileP(cmd, args, {maxBuffer: 64 * 1024 * 1024});
    return {pass: true, stdout, stderr};
  } catch (error) {
    return {pass: false, stdout: error.stdout ?? '', stderr: error.stderr ?? String(error.message)};
  }
};

/** 从 ffmpeg stderr 提取最后一个 loudnorm JSON 报告（pass1 测量 / 复测共用）。 */
export function parseLoudnormReport(output) {
  const match = output.match(/\{\s*"input_i"[\s\S]*?\}/g);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[match.length - 1]);
    const num = v => (Number.isFinite(Number(v)) ? Number(v) : null);
    return {input_i: num(parsed.input_i), input_tp: num(parsed.input_tp), input_lra: num(parsed.input_lra), input_thresh: num(parsed.input_thresh), offset: num(parsed.offset) ?? 0};
  } catch {
    return null;
  }
}

/** 交付响度验收：|实测 − 目标| ≤ 0.5 LU 且真峰值 ≤ −1.0 dBTP。 */
export function loudnessPassed(inputI, inputTp, target) {
  return Number.isFinite(inputI) && Number.isFinite(inputTp) && Math.abs(inputI - target) <= 0.5 && inputTp <= -1.0;
}

/** 黑帧/冻帧事件计数（按 ffmpeg 检测器的输出行标记）。 */
export function countEvents(stderr, marker) {
  return stderr.split(/\r?\n/).filter(line => line.includes(marker)).length;
}

async function die(root, tmp, message) {
  console.error(`finalize_delivery: ${message}`);
  try { fs.rmSync(tmp, {recursive: true, force: true}); } catch {}
  try { if (root && fs.readdirSync(path.join(root, 'delivery')).length === 0) fs.rmdirSync(path.join(root, 'delivery')); } catch {}
  process.exitCode = 1;
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name, fallback) => {
    const i = args.indexOf(name);
    if (i < 0) return fallback;
    const v = args[i + 1];
    args.splice(i, 2);
    return v === undefined ? fallback : v;
  };
  const target = Number(flag('--lufs', '-16'));
  const stem = flag('--stem', null);
  const positional = args.filter(a => !a.startsWith('--'));
  const [rootArg, renderArg] = positional;
  if (!rootArg || !renderArg || !Number.isFinite(target) || target > -5 || target < -40) {
    console.error('用法：node scripts/finalize_delivery.mjs <工程> <renders/xxx_vN.mp4> [--stem 名称] [--lufs -16]');
    process.exitCode = 1;
    return;
  }
  const root = path.resolve(rootArg);
  const render = path.resolve(root, renderArg);
  const project = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'project.json'), 'utf8')); } catch { return null; } })();
  if (!project || !fs.existsSync(render)) {
    await die(null, null, `工程或渲染文件不存在（${render}）`);
    return;
  }
  const name = stem ?? path.basename(render, '.mp4');
  const outDir = path.join(root, 'delivery');
  const targets = [`${name}-master.mp4`, `${name}-share.mp4`, `${name}-contact-sheet.png`, `${name}-delivery-report.json`];
  const clashes = targets.filter(t => fs.existsSync(path.join(outDir, t)));
  if (clashes.length) {
    await die(root, '', `拒绝覆盖已有交付物：${clashes.join(', ')}（重跑前手动清理 delivery/，原子性设计如此）`);
    return;
  }
  const tmp = fs.mkdtempSync(path.join(root, '.finalize-'));
  try {
    const probe = await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', render]);
    const media = probe.pass ? JSON.parse(probe.stdout) : null;
    const streams = media && Array.isArray(media.streams) ? media.streams : [];
    const duration = Number(media?.format?.duration);
    if (!streams.some(s => s.codec_type === 'video') || !streams.some(s => s.codec_type === 'audio') || !Number.isFinite(duration) || duration <= 0) {
      await die(root, tmp, '渲染文件必须同时含视频与音频流且可测时长');
      return;
    }
    // pass1：测源响度
    const measure = ['-hide_banner', '-i', render, '-af', `loudnorm=I=${target}:TP=-1.5:LRA=9:print_format=json`, '-f', 'null', '-'];
    const pass1 = await run('ffmpeg', measure);
    const measured = parseLoudnormReport(pass1.stderr);
    if (!measured || !Number.isFinite(measured.input_i)) {
      await die(root, tmp, `无法测量源响度（静音/无声轨都会走到这里）：${pass1.stderr.slice(-200)}`);
      return;
    }
    // pass2：线性归一并出 master
    const ln = `loudnorm=I=${target}:TP=-1.5:LRA=9:linear=true:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.offset}`;
    const master = path.join(tmp, targets[0]);
    const enc1 = await run('ffmpeg', ['-y', '-i', render, '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1', '-af', ln,
      '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', master]);
    if (!enc1.pass || !fs.existsSync(master)) { await die(root, tmp, `master 编码失败：${enc1.stderr.slice(-200)}`); return; }
    // share：master 重编码（继承响度）
    const share = path.join(tmp, targets[1]);
    const enc2 = await run('ffmpeg', ['-y', '-i', master, '-c:v', 'libx264', '-crf', '24', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', share]);
    if (!enc2.pass || !fs.existsSync(share)) { await die(root, tmp, `share 编码失败：${enc2.stderr.slice(-200)}`); return; }
    // 全解码两个交付物
    for (const file of [master, share]) {
      const decode = await run('ffmpeg', ['-v', 'error', '-xerror', '-err_detect', 'explode', '-i', file, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-']);
      if (!decode.pass) { await die(root, tmp, `${path.basename(file)} 全解码失败：${decode.stderr.slice(-200)}`); return; }
    }
    // 对最终编码重测响度（mono→stereo 复制会高约 3 LU，必须验交付物）
    const loud = {};
    for (const [label, file] of [['master', master], ['share', share]]) {
      const remeasure = await run('ffmpeg', ['-hide_banner', '-i', file, '-af', `loudnorm=I=${target}:TP=-1.5:LRA=9:print_format=json`, '-f', 'null', '-']);
      const report = parseLoudnormReport(remeasure.stderr);
      loud[label] = {file: path.basename(file), input_i: report?.input_i ?? null, input_tp: report?.input_tp ?? null};
      if (!loudnessPassed(loud[label].input_i, loud[label].input_tp, target)) {
        await die(root, tmp, `${label} 交付响度未过验收：实测 ${loud[label].input_i} LUFS / TP ${loud[label].input_tp}（目标 ${target}±0.5 / TP≤-1.0）——未发布任何文件`);
        return;
      }
    }
    // 黑帧/冻帧计数（master）
    const black = await run('ffmpeg', ['-hide_banner', '-i', master, '-vf', 'blackdetect=d=0.10:pix_th=0.02', '-an', '-f', 'null', '-']);
    const freeze = await run('ffmpeg', ['-hide_banner', '-i', master, '-vf', 'freezedetect=n=-60dB:d=0.40', '-an', '-f', 'null', '-']);
    const black_events = countEvents(black.stderr, 'black_start:');
    const freeze_events = countEvents(freeze.stderr, 'freeze_start:');
    // 3×3 接触表
    const sheet = path.join(tmp, targets[2]);
    const sheetRun = await run('ffmpeg', ['-y', '-i', master, '-vf', `fps=9/${duration.toFixed(3)},scale=320:-2,tile=3x3`, '-frames:v', '1', sheet]);
    if (!sheetRun.pass || !fs.existsSync(sheet)) { await die(root, tmp, `接触表生成失败：${sheetRun.stderr.slice(-200)}`); return; }
    // 报告（可移植：只写文件名）——发布时最后一个落位
    const report = {
      status: 'verified',
      loudness_passed: true,
      target_lufs: target,
      loudness: loud,
      decode: 'passed',
      black_events,
      freeze_events,
      freeze_note: '每个冻帧事件须对应有意静止镜头（beat sheet/QC 豁免档对账），否则先修再交付',
      source: path.basename(render),
      renderedAt: new Date().toISOString(),
    };
    const reportFile = path.join(tmp, targets[3]);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
    // 原子发布：逐项 mv，报告最后
    fs.mkdirSync(outDir, {recursive: true});
    for (const t of [targets[0], targets[1], targets[2]]) fs.renameSync(path.join(tmp, t), path.join(outDir, t));
    fs.renameSync(reportFile, path.join(outDir, targets[3]));
    fs.rmSync(tmp, {recursive: true, force: true});
    console.log(JSON.stringify({published: targets, black_events, freeze_events, loudness: loud}, null, 2));
  } catch (error) {
    await die(root, tmp, `意外失败：${error.message}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
