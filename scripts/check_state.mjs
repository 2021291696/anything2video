#!/usr/bin/env node
/**
 * check_state.mjs — 证据驱动的生产状态机（v3.10.0）。
 * 机制借鉴 lanshu-create-ai-presenter-video 的 check_state.py（MIT，cclank）——按 a2v 0-8 工作流重造，
 * 许可登记 LICENSE-THIRDPARTY/MIT-lanshu-create-ai-presenter-video.txt。
 *
 * 解决什么：跨会话续作时"做到哪了"靠模型自己读工程目录推断——现在一条命令从磁盘证据**计算**状态，
 * 输出精确的 missing_for_next 待办；记录的状态超前于证据（overclaim）即退出非零。
 *
 * 证据阶梯（每态只验自己的证据，顺序停在前一个未满足态）：
 *   intake     project.json 可解析且带 slug（init 产物）
 *   scripted   script/narration.txt 存在且非空
 *   voiced     public/assets/<slug>/audio_narration.wav 可解码（含音频流）且 script/timeline.json 可解析
 *   planned    script/storyboard.json 存在且 check-plan 门禁全过（含素材哈希/覆盖/claims）
 *   rendered   renders/<slug>_v*.mp4（最新一个）可解码且同时含视频+音频流
 *   reviewed   qc/final.json 存在且含 checks 记录（存在性证据；深度验证归 check-qc.mjs）
 *   delivered  delivery/*-delivery-report.json 存在且 status=verified 且 loudness_passed=true（深核，finalize_delivery 产物）
 *
 * 记录态：project.json 可选 `state` 字符串字段（勿手改语义——用 --write 同步）。
 *   记录态超前于证据 = overclaim，退出 1；记录态落后于证据属正常（--write 会追平）。
 * 与 `status`（draft/production）无关：那是渲染纪律开关，不是进度。
 *
 * 用法：node scripts/check_state.mjs <工程> [--write]
 *   无 --write 只报告；带 --write 把 project.json.state 同步为证据态（证据丢失会把状态回拨）。
 * 退出码：overclaim=1，其余 0。
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {isRecord, nonempty} from './runtime-lib.mjs';
import {checkPlan} from './check-plan.mjs';

const execFileP = promisify(execFile);
export const STATES = ['intake', 'scripted', 'voiced', 'planned', 'rendered', 'reviewed', 'delivered'];

/** ffprobe 流类型核验：返回 null=通过，字符串=缺失原因（ffprobe 缺失也算证据不满足，不炸）。 */
export async function probeMedia(abs, needVideo, needAudio) {
  try {
    const {stdout} = await execFileP('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', abs]);
    const parsed = JSON.parse(stdout);
    const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
    const has = type => streams.some(s => s.codec_type === type);
    if (needVideo && !has('video')) return '缺视频流';
    if (needAudio && !has('audio')) return '缺音频流';
    return null;
  } catch (error) {
    return error.code === 'ENOENT' ? 'ffprobe 不可用' : `ffprobe 失败: ${String(error.message).slice(0, 80)}`;
  }
}

const exists = (root, rel) => { try { return fs.statSync(path.join(root, rel)).size > 0; } catch { return false; } };
const readTextFailSoft = (root, rel) => { try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return null; } };
const readJsonFailSoft = (root, rel) => { try { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); } catch { return null; } };

/** 每态证据函数：返回 {ok, missing}。missing 是给人看的待办清单（下一态的补齐指引）。 */
export function stateChecks(root, io = {}) {
  const fileExists = io.exists ?? ((rel) => exists(root, rel));
  const readText = io.readText ?? ((rel) => readTextFailSoft(root, rel));
  const readJson = io.readJson ?? ((rel) => readJsonFailSoft(root, rel));
  const probe = io.probeMedia ?? probeMedia;
  const planFn = io.checkPlan ?? checkPlan;
  const listDir = io.listDir ?? ((rel) => { try { return fs.readdirSync(path.join(root, rel)); } catch { return []; } });
  return {
    intake: async () => {
      const project = readJson('project.json');
      return isRecord(project) && nonempty(project.slug) ? {ok: true, missing: []} : {ok: false, missing: ['project.json 缺失或不可解析（先跑 scripts/init.mjs 建工程）']};
    },
    scripted: async () => (nonempty(readText('script/narration.txt')) ? {ok: true, missing: []} : {ok: false, missing: ['script/narration.txt 缺失或为空（一句话一行，| 切字幕块）']}),
    voiced: async () => {
      const project = readJson('project.json');
      const slug = isRecord(project) ? project.slug : null;
      if (!nonempty(slug)) return {ok: false, missing: ['project.json 无 slug，无法定位配音正本']};
      const narration = path.join('public', 'assets', slug, 'audio_narration.wav');
      if (!fileExists(narration)) return {ok: false, missing: [`${narration} 缺失（TTS 跑 scripts/tts_build.py；自带配音跑 scripts/align_narration.py）`]};
      const mediaFail = await probe(path.join(root, narration), false, true);
      if (mediaFail) return {ok: false, missing: [`${narration} 不可解码：${mediaFail}`]};
      if (!isRecord(readJson('script/timeline.json'))) return {ok: false, missing: ['script/timeline.json 缺失或不可解析（配音脚本产物，缺失即时间轴不存在）']};
      return {ok: true, missing: []};
    },
    planned: async () => {
      if (!fileExists('script/storyboard.json')) return {ok: false, missing: ['script/storyboard.json 缺失（结构化分镜，格式见统一合同）']};
      const result = planFn(root);
      return result.pass ? {ok: true, missing: []} : {ok: false, missing: [`check-plan 未过（${result.errors.length} 条，跑 node scripts/check-plan.mjs <工程> 看明细）`]};
    },
    rendered: async () => {
      const project = readJson('project.json');
      const slug = isRecord(project) ? project.slug : null;
      if (!nonempty(slug)) return {ok: false, missing: ['project.json 无 slug，无法定位渲染产物']};
      const pattern = new RegExp(`^${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_v\\d+\\.mp4$`);
      const renders = listDir('renders').filter(name => pattern.test(name));
      if (!renders.length) return {ok: false, missing: [`renders/${slug}_v*.mp4 缺失（跑 node scripts/render.mjs <工程> video）`]};
      try {
        renders.sort((a, b) => fs.statSync(path.join(root, 'renders', b)).mtimeMs - fs.statSync(path.join(root, 'renders', a)).mtimeMs);
      } catch { renders.sort(); }
      const latest = renders[0];
      const mediaFail = await probe(path.join(root, 'renders', latest), true, true);
      return mediaFail ? {ok: false, missing: [`${latest} 不可解码：${mediaFail}`]} : {ok: true, missing: []};
    },
    reviewed: async () => {
      const qc = readJson('qc/final.json');
      if (!isRecord(qc) || !isRecord(qc.checks)) return {ok: false, missing: ['qc/final.json 缺失或无 checks 记录（真实看片听音后按统一契约写，再跑 check-qc 门禁）']};
      return {ok: true, missing: []};
    },
    delivered: async () => {
      const reports = listDir('delivery').filter(name => name.endsWith('-delivery-report.json'));
      for (const name of reports) {
        const report = readJson(path.join('delivery', name));
        if (isRecord(report) && report.status === 'verified' && report.loudness_passed === true) return {ok: true, missing: []};
      }
      return {ok: false, missing: ['delivery/ 无通过终检的交付报告（跑 node scripts/finalize_delivery.mjs <工程> <渲染文件>）']};
    },
  };
}

/** 纯函数：按阶梯计算证据态 + overclaim 判定。deps 全部可注入（测试用假 io）。 */
export async function computeState(root, deps = {}) {
  const checks = stateChecks(root, deps.io ?? {});
  const project = deps.readProject ? await deps.readProject() : readJsonFailSoft(root, 'project.json');
  const recordedRaw = isRecord(project) ? project.state : undefined;
  const recorded = STATES.includes(recordedRaw) ? recordedRaw : (recordedRaw !== undefined ? `无效:${String(recordedRaw)}` : undefined);
  const evidencedFails = [];
  let evidencedIndex = -1;
  let missingForNext = [];
  for (let i = 0; i < STATES.length; i++) {
    const result = await checks[STATES[i]]();
    if (result.ok) { evidencedIndex = i; continue; }
    evidencedIndex = i - 1;
    missingForNext = result.missing;
    break;
  }
  const evidenced = evidencedIndex >= 0 ? STATES[evidencedIndex] : null;
  const recordedIndex = STATES.indexOf(recorded);
  const overclaim = recordedIndex >= 0 && recordedIndex > evidencedIndex;
  const consistent = !overclaim;
  const next = evidencedIndex < STATES.length - 1 ? STATES[evidencedIndex + 1] : null;
  const notes = [];
  if (recordedRaw !== undefined && recordedIndex < 0) notes.push(`project.json.state="${recordedRaw}" 不是合法状态名（合法：${STATES.join('/')}）`);
  if (isRecord(project) && evidencedIndex >= 4 && project.status === 'draft') notes.push('证据已达 rendered 但 status 仍是 draft——正式交付前改 production 并重渲（统一合同）');
  return {recorded: recorded ?? null, evidenced, consistent, overclaim, next, missing_for_next: missingForNext, notes};
}

/** --write 的纯部分：把 project.json.state 设为证据态（可回拨），其余字段原样。 */
export function syncState(project, evidenced) {
  if (!isRecord(project)) throw new Error('project.json 缺失，无法写入 state');
  return {...project, state: evidenced};
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const positional = args.filter(a => !a.startsWith('--'));
  const root = path.resolve(positional[0] ?? '.');
  if (!fs.existsSync(path.join(root, 'project.json'))) {
    console.error(`不是 a2v 工程（找不到 ${path.join(root, 'project.json')}）`);
    process.exitCode = 1;
    return;
  }
  const result = await computeState(root);
  if (write) {
    const project = readJsonFailSoft(root, 'project.json');
    const updated = syncState(project, result.evidenced);
    fs.writeFileSync(path.join(root, 'project.json'), JSON.stringify(updated, null, 2) + '\n');
    result.written = result.evidenced;
  }
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.overclaim ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
