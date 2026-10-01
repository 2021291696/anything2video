#!/usr/bin/env node
/**
 * probe_time.mjs —— 时间坐标审计（静态，不渲染）。
 *
 * 扫描 template/src/shots/ 下全部 tsx，对每个镜头（ShotDef{from,to} / promo 拍结构）：
 *  1) 识别该镜头内 N = useCurrentFrame()+K 的坐标基准 K（三态解析，见 resolveK；
 *     K==from → 全片帧坐标；K==1 → 镜头内相对坐标；都解析不出 → 显式告警并跳过该镜头窗口判定）；
 *  2) 提取所有时间窗口 [a,b]：
 *     - keyframes / kf / stepHold 的关键帧数组 → 相邻关键帧两两成窗；
 *     - 入场组件（SoftIn/GlitchIn/HookTitle/BenefitCard/ProofCard/CtaEnd）的 f0（+可选 len）→ [f0, f0+len]，
 *       未带 len 且组件默认长未考证的 → 点窗 [f0, f0+1]（仅校验起点，避免拿估算长度误报越界）；
 *     - LightBar 式守卫 `const n = N - <基>; if (n < 0 || n > D)` → [基+off, 基+off+D]（off 取自 .map 数字数组）；
 *     - countTo(N - <基>, …) → 计数窗 [基, 基+20]（fx.countTo 默认 len=20）。
 *  3) 判据：每个窗口必须满足 K <= a < b <= K + (to-from+1) - 1（即窗口落在镜头可用帧区间内），
 *     不满足即「把镜头内相对值传给收全片值的函数 / 全片值传给镜头内相对函数」类坐标错配，报错退出 1；
 *     另 K 被显式解析（字面量或标识符代换）却既 ≠ from 也 ≠ 1 → medium 违规（N 推导与镜头声明错位），同样记入退出码。
 *
 * 用法：node probe_time.mjs [--selftest]
 *   --selftest  用内嵌的合成违规样例自检提取器能否抓到坐标错配（抓到=自检通过）。
 * 退出码：0=通过（或自检通过）｜1=发现坐标错配｜2=用法/环境错误。
 */
import fs from 'node:fs';
import path from 'node:path';
import {TEMPLATE_ROOT, listShots, die} from './probe_lib.mjs';

const REG_LEN = {SoftIn: 8, BenefitCard: 10, ProofCard: 10}; // 默认 len 已从源码考证（ui.tsx:75、overlay/promo/BenefitCard.tsx:24、ProofCard.tsx:17）
const ENTRANCE = ['SoftIn', 'GlitchIn', 'HookTitle', 'BenefitCard', 'ProofCard', 'CtaEnd', 'LightSweep'];

/** 截取 `const <name>` 到下一个顶层 const/export 之间的组件体 */
function sliceBlock(src, name) {
  const start = src.indexOf(`const ${name}`);
  if (start < 0) return null;
  let end = src.length;
  for (const re of [/\nconst\s/, /\nexport\s/]) {
    const i = src.slice(start + 10).search(re);
    if (i >= 0) end = Math.min(end, start + 10 + i);
  }
  return {text: src.slice(start, end), startLine: src.slice(0, start).split('\n').length};
}

function lineOf(text, idx, base) {
  return base + text.slice(0, idx).split('\n').length - 1;
}

/** 提取一个组件体内的全部时间窗口 [{a, b, kind, note, line}] */
function extractWindows(body, baseLine) {
  const wins = [];
  const push = (a, b, kind, note, idx) => wins.push({a, b, kind, note, line: lineOf(body, idx, baseLine)});
  // 1) keyframes / kf / stepHold 关键帧数组
  for (const m of body.matchAll(/\b(?:keyframes|kf|stepHold)\s*\(\s*[^,()]+(?:\([^()]*\))?[^,]*,\s*(\[[\s\S]*?\]\])/g)) {
    const keys = [...m[1].matchAll(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g)].map((k) => +k[1]).sort((x, y) => x - y);
    for (let i = 0; i + 1 < keys.length; i++) {
      push(keys[i], keys[i + 1], 'keyframes', `关键帧窗 ${keys[i]}→${keys[i + 1]}`, m.index);
    }
  }
  // 2) 入场组件 f0（+可选 len）
  for (const m of body.matchAll(new RegExp(`<(${ENTRANCE.join('|')})\\b([^>]*?)/?>`, 'g'))) {
    const attrs = m[2];
    const f0m = /\bf0=\{\s*([\d\s+]+?)\s*\}/.exec(attrs);
    if (!f0m) continue;
    const f0 = +f0m[1];
    const name = m[1];
    const lenm = /\blen=\{\s*(\d+)\s*\}/.exec(attrs);
    if (lenm) push(f0, f0 + +lenm[1], name, `入场窗 f0=${f0} len=${lenm[1]}`, m.index);
    else if (name === 'LightSweep') {
      const rm = /\brounds=\{\s*\[([^\]]+)\]\s*\}/.exec(attrs);
      const rounds = rm ? rm[1].split(',').map((s) => +s.trim()) : [0];
      for (const r of rounds) push(f0 + r, f0 + r + 16, name, `扫光轮窗 起点${f0 + r}（len 默认 16）`, m.index);
    } else if (REG_LEN[name] !== undefined) push(f0, f0 + REG_LEN[name], name, `入场窗 f0=${f0}（${name} 默认 len=${REG_LEN[name]}）`, m.index);
    else push(f0, f0 + 1, name, `入场点 f0=${f0}（未带 len，仅校验起点）`, m.index);
  }
  // 3) 守卫窗：const n = N - <基>; if (n < 0 || n > D)
  for (const m of body.matchAll(/(?:const|let)\s+(\w+)\s*=\s*N\s*-\s*([\d\s+\-*A-Za-z]+?);[\s\S]{0,300}?\1\s*<\s*0\s*\|\|\s*\1\s*>\s*(\d+)/g)) {
    const varName = m[1], expr = m[2], dur = +m[3];
    const base = +(/(\d+)/.exec(expr)?.[1] ?? NaN);
    if (!Number.isFinite(base)) continue;
    // 数字数组 .map((off => 的错峰偏移
    let offsets = [0];
    for (const om of body.matchAll(/\[\s*([\d\s,]+?)\s*\]\s*\.map\(\s*\(\s*(\w+)/g)) {
      if (expr.includes(om[2])) offsets = om[1].split(',').map((s) => +s.trim());
    }
    for (const off of offsets) {
      push(base + off, base + off + dur, 'guard', `守卫窗 n=N-${expr}（D=${dur}${off ? `，off=${off}` : ''}）`, m.index);
    }
  }
  // 4) countTo(N - <基>, …)（fx.tsx:140 默认 len=20）
  for (const m of body.matchAll(/\bcountTo\s*\(\s*N\s*-\s*(\d+)/g)) {
    push(+m[1], +m[1] + 20, 'countTo', `计数窗 起点${m[1]}（countTo 默认 len=20）`, m.index);
  }
  return wins;
}

/** 同文件内解析 const/let <id> = <数字字面量>（允许 `: 类型` 注解），找不到返回 null */
function constInSrc(src, id) {
  const m = new RegExp(`(?:const|let)\\s+${id}\\b[^=;\\n]*=\\s*(-?\\d+(?:\\.\\d+)?)\\b`).exec(src);
  return m ? +m[1] : null;
}

/** 解析 import 绑定的常量：从 fileSrc 找 `import {…<id>…} from '相对路径'`，再在被引文件里找 export const/let <id> = <数字>。
 *  找不到（或非相对路径/文件不可读）返回 null，由调用方归入「无法解析」三态。 */
function constInImport(fileSrc, filePath, id) {
  if (!filePath) return null;
  for (const m of fileSrc.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
    if (!new RegExp(`\\b${id}\\b`).test(m[1])) continue;
    const base = path.resolve(path.dirname(filePath), m[2]);
    for (const cand of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
      let modSrc;
      try { modSrc = fs.readFileSync(cand, 'utf8'); } catch { continue; }
      const em = new RegExp(`export\\s+(?:const|let)\\s+${id}\\b[^=;\\n]*=\\s*(-?\\d+(?:\\.\\d+)?)\\b`).exec(modSrc);
      if (em) return +em[1];
      const v = constInSrc(modSrc, id);
      if (v !== null) return v;
    }
  }
  return null;
}

/**
 * 三态解析 N = useCurrentFrame()+K 的坐标基准 K：
 *  1) +数字字面量 → 直接用（coordKind='literal'）；
 *  2) +标识符（或含标识符的简单算式）→ 同文件 const <id> = <数字>，或 import 绑定的常量，全部代换后求值
 *     （coordKind='identifier'）；有一个解析不到 → 归入第三态；
 *  3) 无法解析 → 返回 {unresolved:{token}}，调用方必须跳过该镜头窗口判定、输出显式警告并在汇总单独计数。
 * 组件体里根本没有 useCurrentFrame()+X 形态（如 promo 拍走 Sequence 相对帧）不算未解析 → 默认 K=1 相对坐标。
 */
function resolveK(bodyText, fileSrc, filePath) {
  const m = /useCurrentFrame\s*\(\s*\)\s*\+\s*([A-Za-z0-9_]+(?:\s*[+\-*/]\s*[A-Za-z0-9_]+)*)/.exec(bodyText);
  if (!m) return {k: 1, coordKind: 'relative'};
  const expr = m[1].trim();
  if (/^\d+$/.test(expr)) return {k: +expr, coordKind: 'literal'};
  const ids = [...new Set(expr.match(/[A-Za-z_]\w*/g) ?? [])];
  const vals = new Map();
  for (const id of ids) {
    const v = constInSrc(fileSrc, id) ?? constInImport(fileSrc, filePath, id);
    if (v === null) return {unresolved: {token: id}};
    vals.set(id, v);
  }
  const substituted = expr.replace(/[A-Za-z_]\w*/g, (id) => String(vals.get(id)));
  if (!/^[\d\s+\-*/().]+$/.test(substituted)) return {unresolved: {token: expr}};
  let k;
  try { k = Function('"use strict";return (' + substituted + ')')(); } catch { return {unresolved: {token: expr}}; }
  if (!Number.isFinite(k)) return {unresolved: {token: expr}};
  return {k: Math.round(k), coordKind: 'identifier', token: expr};
}

/** K 无法解析时的显式警告行（main 与 selftest 共用，保证措辞一致、可被 grep 到） */
function kUnresolvedLine(shot, token) {
  return `  ⚠ k 无法解析，请人工核对 N 推导（useCurrentFrame()+${token} 未能解析为数字常量）—— 本镜头窗口判定已跳过`;
}

/** 校验单个镜头：返回 {k, coord, windows, violations, coordViolation, unresolved}
 *  K 经显式解析（字面量/标识符）却既 ≠ from 也 ≠ 1（两套坐标约定都不沾）→ coordViolation（medium，记入退出码判定）。 */
function auditShot(shot, body, baseLine, fileSrc, filePath) {
  const len = shot.to - shot.from + 1;
  const kr = resolveK(body.text ?? body, fileSrc, filePath);
  if (kr.unresolved) {
    return {k: null, coord: `K 基准无法解析（useCurrentFrame()+${kr.unresolved.token}）`, windows: [], violations: [],
            coordViolation: null, unresolved: kr.unresolved};
  }
  const k = kr.k;
  const coord = k === shot.from
    ? `全片帧坐标（N = useCurrentFrame()+${k} = from）`
    : k === 1
      ? `镜头内相对坐标（N = useCurrentFrame()+1，有效区间 [1,${len}]）`
      : `坐标基准错位（N = useCurrentFrame()+${k}，既非 from=${shot.from} 也非相对约定 K=1，有效区间 [${k},${k + len - 1}]）`;
  const coordViolation = (k !== shot.from && k !== 1)
    ? `medium：N 基准 K=${k} ≠ shot.from=${shot.from}（也非相对约定 K=1），N 推导与镜头声明错位，请人工核对`
    : null;
  const violations = [];
  const windows = extractWindows(body.text ?? body, baseLine ?? 0);
  for (const w of windows) {
    const ok = k <= w.a && w.a < w.b && w.b <= k + len - 1;
    if (!ok) violations.push(w);
  }
  return {k, coord, windows, violations, coordViolation, unresolved: null};
}

// ---------------- 主流程 ----------------
function main() {
  if (process.argv.includes('--selftest')) return selftest();
  const all = listShots();
  if (!all.length) die('src/shots/** 下没有解析到任何镜头');
  let totalWindows = 0, totalViolations = 0, totalUnresolvedK = 0;
  const lines = [];
  for (const shot of all) {
    const file = path.join(TEMPLATE_ROOT, shot.file);
    const src = fs.readFileSync(file, 'utf8');
    // 组件体：拍 → sliceBlock(compName)；ShotDef 字面量 → Comp: <Name>
    let body, baseLine;
    if (shot.compName.startsWith('Beat')) {
      const b = sliceBlock(src, shot.compName);
      body = b?.text ?? '';
      baseLine = b?.startLine ?? shot.line;
    } else {
      const cm = new RegExp(`id:\\s*'${shot.id}'[\\s\\S]{0,200}?Comp:\\s*(\\w+)`).exec(src);
      const b = cm ? sliceBlock(src, cm[1]) : null;
      if (!b) {
        lines.push(`○ ${shot.id} (${shot.file}:${shot.line}) 帧 ${shot.from}..${shot.to}：组件体不可静态定位，跳过窗口校验`);
        continue;
      }
      body = b.text; baseLine = b.startLine;
    }
    const {coord, windows, violations, coordViolation, unresolved} = auditShot(shot, body, baseLine, src, file);
    if (unresolved) {
      // 三态之三：K 解析不到 → 显式警告 + 汇总单独计数，绝不静默假通过
      totalUnresolvedK++;
      lines.push(`⚠ 镜头 ${shot.id} (${shot.file}:${shot.line}) 帧区间 ${shot.from}..${shot.to} —— ${coord}`);
      lines.push(kUnresolvedLine(shot, unresolved.token));
      continue;
    }
    totalWindows += windows.length;
    totalViolations += violations.length + (coordViolation ? 1 : 0);
    lines.push(`镜头 ${shot.id} (${shot.file}:${shot.line}) 帧区间 ${shot.from}..${shot.to} —— ${coord}`);
    if (!windows.length) lines.push('  （未发现时间窗口调用）');
    for (const w of windows) {
      const ok = !violations.includes(w);
      lines.push(`  ${ok ? '✓' : '✗'} 窗口 [${w.a},${w.b}]  ${w.kind}：${w.note}  ${shot.file}:${w.line}${ok ? '' : '  ← 越出镜头可用帧区间'}`);
    }
    if (coordViolation) lines.push(`  ✗ ${coordViolation}`);
  }
  console.log('== probe_time：时间坐标审计（静态扫描 src/shots/**）==');
  console.log(`坐标约定（模板 lib.tsx:5 / Main.tsx:18）：镜头内 N = useCurrentFrame()+K；K==from → 全片坐标，K==1 → 镜头内相对；窗口须落在 N 的有效区间内。`);
  console.log(`注：模板源码无 raw/pulse/local 时间函数（已 grep 验证），窗口提取覆盖 keyframes/kf/stepHold、入场组件 f0/len、守卫窗、countTo。`);
  console.log('');
  console.log(lines.join('\n'));
  console.log('');
  const tailK = totalUnresolvedK ? `，另有 ${totalUnresolvedK} 个镜头 K 无法解析已跳过（见上方 ⚠ 行，须人工核对）` : '';
  if (totalViolations) {
    console.log(`结论：${all.length} 镜头 / ${totalWindows} 窗口，${totalViolations} 处坐标错配（含 K≠from 的 medium 违规）→ 不通过${tailK}`);
    process.exit(1);
  }
  console.log(`结论：${all.length} 镜头 / ${totalWindows} 窗口，0 处坐标错配 → 通过${tailK}`);
}

// ---------------- 自检：内嵌违规样例，验证提取器抓得到 ----------------
function selftest() {
  const mk = (decl, extra) => `import React from 'react';
import {useCurrentFrame} from 'remotion';
import {keyframes, SoftIn} from '../../ui';
import {countTo} from '../../fx';
${decl}
const SC_Test: React.FC = () => {
  const N = useCurrentFrame() + ${extra};
  return (
    <>
      <div style={{left: keyframes(N, [[1, 0], [8, 1]])}} />
      <SoftIn N={N} f0={295} len={10} />
      <div>{countTo(N - 295, 0, 100)}</div>
    </>
  );
};
`;
  const fixture1 = mk('', '200');          // 三态之一：数字字面量
  const fixture2 = mk('const F0 = 200;', 'F0'); // 三态之二：标识符 → 同文件 const 解析
  const fixture3 = mk('const OTHER = 7;', 'F9'); // 三态之三：标识符解析不到
  const fixture4 = mk('', '205');          // K 显合法字面量但 ≠ from（也 ≠ 1）→ medium 违规
  const shot = (id, from, to) => ({id, compName: 'SC_Test', file: '(selftest)', from, to, line: 7});
  const cases = [
    {name: 'T1 数字字面量 K=200', fix: fixture1, s: shot('T1', 200, 300), want: {k: 200, minViolations: 3, medium: false, unresolved: false}},
    {name: 'T2 变量形态 const F0=200 → K=200', fix: fixture2, s: shot('T2', 200, 300), want: {k: 200, minViolations: 3, medium: false, unresolved: false}},
    {name: 'T3 变量 F9 无法解析 → 跳过+警告', fix: fixture3, s: shot('T3', 200, 300), want: {unresolved: 'F9'}},
    {name: 'T4 K=205 ≠ from=200 → medium 违规', fix: fixture4, s: shot('T4', 200, 300), want: {k: 205, minViolations: 2, medium: true, unresolved: false}},
  ];
  console.log('== probe_time --selftest：K 三态解析 + 坐标错配提取器自检 ==');
  let allOk = true;
  for (const c of cases) {
    const blk = sliceBlock(c.fix, 'SC_Test');
    const r = auditShot(c.s, blk.text, blk.startLine, c.fix, null);
    let ok = true;
    const notes = [];
    if (c.want.unresolved) {
      ok = !!r.unresolved && r.unresolved.token === c.want.unresolved
        && kUnresolvedLine(c.s, r.unresolved?.token ?? '').includes('k 无法解析，请人工核对 N 推导');
      notes.push(`unresolved=${r.unresolved ? r.unresolved.token : '无'}`);
    } else {
      ok = !r.unresolved && r.k === c.want.k && r.violations.length >= c.want.minViolations
        && !!r.coordViolation === c.want.medium;
      notes.push(`k=${r.k}`, `violations=${r.violations.length}`, `medium=${!!r.coordViolation}`);
      if (r.unresolved) notes.push(`意外未解析: ${r.unresolved.token}`);
    }
    if (!ok) allOk = false;
    console.log(`  ${ok ? '✓' : '✗'} ${c.name}（${notes.join('，')}）`);
  }
  if (!allOk) { console.error('自检失败：K 三态解析或违规提取不符合预期'); process.exit(2); }
  console.log('自检结果：4 用例全过（字面量 / 变量代换 / 未解析显式告警 / K≠from medium 违规）→ 提取器有效');
}

main();
