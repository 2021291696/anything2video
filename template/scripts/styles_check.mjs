#!/usr/bin/env node
/**
 * styles_check.mjs —— 8 个风格 SKU 的资产对拍门（只读，零依赖）。
 *
 * 三件事：
 *  1) 资产存在性：styles/<sku>/sample.jpg ×8 为硬性；另 pixel-arcade 需 PressStart2P-Regular.ttf、
 *     chalk 需 dust.png（清单以 styles/ 实际盘面为准）；
 *  2) icons path 串对拍：两侧文件各提取引号内 [Mm] 开头、长度>20 的 path 串做集合差，
 *     任一侧独有即 FAIL（打印缺段前 60 字符）。正本定位规则：
 *       - sand / blueprint 按固定正本工程（usa250-sand、blueprint-bridge 的 src/icons.ts）；
 *       - 其余 SKU 动态找：styles/<sku>/ 有 icons.ts 时，取「src/ 下存在同名风格组件文件的唯一正本工程」
 *         的 icons.ts；没有 icons.ts 时，直接拿同名风格组件文件对拍；正本不唯一或不存在 → SKIP；
 *       - 两侧都提取不到任何 path 串 → SKIP（无可对拍内容，不算假通过）；
 *  3) 汇总：全 PASS 退出 0；任一 FAIL 退出 1；SKIP 不影响退出码但逐条列出。
 *
 * 用法：node scripts/styles_check.mjs（cwd 任意，路径从脚本自身解析）。
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = path.resolve(SCRIPTS_DIR, '..');
const SKILL_ROOT = path.resolve(TEMPLATE_ROOT, '..');
const STYLES_DIR = path.join(SKILL_ROOT, 'styles');
// 正本工程对照根：可用 A2V_REF_ROOT 环境变量覆写（公开仓/换机场景），缺省为本机数据根
const REF_ROOT = process.env.A2V_REF_ROOT ?? 'D:/MyAIWorkspace/科普视频';

const SKUS = ['sand', 'chalk', 'blueprint', 'neon', 'pixel-arcade', 'paper-collage', 'swiss-print', 'crt-terminal'];
const EXTRA_ASSETS = {
  'pixel-arcade': ['PressStart2P-Regular.ttf'],
  'chalk': ['dust.png'],
};
// 审计修复过的两个 icons.ts 对拍源，正本固定
const FIXED_ICON_REF = {
  sand: 'usa250-sand/src/icons.ts',
  blueprint: 'blueprint-bridge/src/icons.ts',
};
// 引号内 [Mm] 开头、长度>20 的 path 串（SVG path d 值）
const PATH_RE = /['"]([Mm][^'"]{20,})['"]/g;

const results = []; // {status: 'PASS'|'FAIL'|'SKIP', sku, note}
const firstFail = [];

function extractPaths(file) {
  try {
    return [...fs.readFileSync(file, 'utf8').matchAll(PATH_RE)].map((m) => m[1]);
  } catch {
    return null; // 文件不可读
  }
}

/** 列出正本根下拥有 src/<compName> 的工程目录（唯一时才有资格当正本） */
function findRefProjects(compName) {
  let dirs;
  try { dirs = fs.readdirSync(REF_ROOT, {withFileTypes: true}); } catch { return null; }
  return dirs.filter((d) => d.isDirectory() && fs.existsSync(path.join(REF_ROOT, d.name, 'src', compName))).map((d) => d.name);
}

function record(status, sku, note) {
  results.push({status, sku, note});
  if (status === 'FAIL') firstFail.push(`${sku}: ${note}`);
}

// ---------------- ① 资产存在性 ----------------
for (const sku of SKUS) {
  const dir = path.join(STYLES_DIR, sku);
  if (!fs.existsSync(dir)) { record('FAIL', sku, `SKU 目录缺失 ${dir}`); continue; }
  const missing = [];
  if (!fs.existsSync(path.join(dir, 'sample.jpg'))) missing.push('sample.jpg');
  for (const f of EXTRA_ASSETS[sku] ?? []) {
    if (!fs.existsSync(path.join(dir, f))) missing.push(f);
  }
  if (missing.length) record('FAIL', sku, `缺资产: ${missing.join(', ')}`);
  else record('PASS', sku, `资产齐${(EXTRA_ASSETS[sku] ?? []).length ? `（含 ${ (EXTRA_ASSETS[sku] ?? []).join(' / ')}）` : ''}`);
}

// ---------------- ② icons path 串对拍 ----------------
function comparePair(tag, fileA, fileB) {
  const A = extractPaths(fileA), B = extractPaths(fileB);
  if (A === null || B === null) { record('SKIP', tag, `对拍文件不可读（A=${path.basename(fileA)} B=${fileB}）`); return; }
  if (A.length === 0 && B.length === 0) { record('SKIP', tag, `两侧都无可对拍的 path 串（0 段）`); return; }
  const setB = new Set(B), setA = new Set(A);
  const onlyA = A.filter((x) => !setB.has(x));
  const onlyB = B.filter((x) => !setA.has(x));
  if (!onlyA.length && !onlyB.length) {
    record('PASS', tag, `path 串 ${A.length} 段全等`);
    return;
  }
  const parts = [];
  for (const [side, list] of [['模板侧独有', onlyA], ['正本侧独有', onlyB]]) {
    if (list.length) parts.push(`${side} ${list.length} 段，如「${list[0].slice(0, 60)}…」`);
  }
  record('FAIL', tag, parts.join('；'));
}

for (const sku of SKUS) {
  const dir = path.join(STYLES_DIR, sku);
  const compFiles = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.tsx')) : [];
  if (!compFiles.length) { record('SKIP', sku, '无风格组件文件，无从定位正本'); continue; }
  const comp = compFiles[0];
  const localIcons = path.join(dir, 'icons.ts');

  if (fs.existsSync(localIcons)) {
    const fixed = FIXED_ICON_REF[sku];
    if (fixed) { comparePair(`${sku}/icons.ts`, localIcons, path.join(REF_ROOT, fixed)); continue; }
    // 动态：找「src/ 下存在同名风格组件」的唯一正本工程，取它的 icons.ts
    const refs = findRefProjects(comp);
    if (!refs) { record('SKIP', sku, `正本根不可访问（${REF_ROOT}）`); continue; }
    if (refs.length !== 1) { record('SKIP', sku, `正本不唯一（${refs.join(', ') || '无'}，按 src/${comp} 锚定），不猜`); continue; }
    const refIcons = path.join(REF_ROOT, refs[0], 'src', 'icons.ts');
    if (!fs.existsSync(refIcons)) { record('SKIP', sku, `${refs[0]} 无 src/icons.ts`); continue; }
    comparePair(`${sku}/icons.ts`, localIcons, refIcons);
    continue;
  }

  // 无 icons.ts：直接拿同名风格组件文件对拍
  const refs = findRefProjects(comp);
  if (!refs) { record('SKIP', sku, `正本根不可访问（${REF_ROOT}）`); continue; }
  if (refs.length !== 1) { record('SKIP', sku, `src/${comp} 正本不唯一或不存在（${refs.join(', ') || '无'}），SKIP`); continue; }
  comparePair(`${sku}/${comp}`, path.join(dir, comp), path.join(REF_ROOT, refs[0], 'src', comp));
}

// ---------------- ③ 汇总 ----------------
console.log('== styles_check：8 风格 SKU 资产对拍（只读）==');
for (const r of results) {
  const mark = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '○';
  console.log(`  ${mark} [${r.status}] ${r.sku} —— ${r.note}`);
}
const nPass = results.filter((r) => r.status === 'PASS').length;
const nFail = results.filter((r) => r.status === 'FAIL').length;
const nSkip = results.filter((r) => r.status === 'SKIP').length;
console.log(`结论：${nPass} PASS / ${nFail} FAIL / ${nSkip} SKIP`);
if (nSkip) console.log(`SKIP 明细（不影响退出码）：${results.filter((r) => r.status === 'SKIP').map((r) => r.sku).join(', ')}`);
if (nFail) {
  console.error(`FAIL 明细：\n  - ${firstFail.join('\n  - ')}`);
  process.exit(1);
}
process.exit(0);
