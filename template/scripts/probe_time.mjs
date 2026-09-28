#!/usr/bin/env node
/**
 * probe_time.mjs —— 时间坐标审计（静态，不渲染）。
 *
 * 扫描 template/src/shots/ 下全部 tsx，对每个镜头（ShotDef{from,to} / promo 拍结构）：
 *  1) 识别该镜头内 N = useCurrentFrame()+K 的坐标基准 K（K==from → 全片帧坐标；K==1 且 from>1 → 镜头内相对坐标）；
 *  2) 提取所有时间窗口 [a,b]：
 *     - keyframes / kf / stepHold 的关键帧数组 → 相邻关键帧两两成窗；
 *     - 入场组件（SoftIn/GlitchIn/HookTitle/BenefitCard/ProofCard/CtaEnd）的 f0（+可选 len）→ [f0, f0+len]，
 *       未带 len 且组件默认长未考证的 → 点窗 [f0, f0+1]（仅校验起点，避免拿估算长度误报越界）；
 *     - LightBar 式守卫 `const n = N - <基>; if (n < 0 || n > D)` → [基+off, 基+off+D]（off 取自 .map 数字数组）；
 *     - countTo(N - <基>, …) → 计数窗 [基, 基+20]（fx.countTo 默认 len=20）。
 *  3) 判据：每个窗口必须满足 K <= a < b <= K + (to-from+1) - 1（即窗口落在镜头可用帧区间内），
 *     不满足即「把镜头内相对值传给收全片值的函数 / 全片值传给镜头内相对函数」类坐标错配，报错退出 1。
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

/** 校验单个镜头：返回 {k, coordNote, violations} */
function auditShot(shot, body, baseLine) {
  const len = shot.to - shot.from + 1;
  const km = /useCurrentFrame\s*\(\s*\)\s*\+\s*(\d+)/.exec(body);
  const k = km ? +km[1] : 1;
  const coord = k === shot.from
    ? `全片帧坐标（N = useCurrentFrame()+${k} = from）`
    : `镜头内相对坐标（N = useCurrentFrame()+${k}，有效区间 [${k},${k + len - 1}]）`;
  const violations = [];
  const windows = extractWindows(body.text ?? body, baseLine ?? 0);
  for (const w of windows) {
    const ok = k <= w.a && w.a < w.b && w.b <= k + len - 1;
    if (!ok) violations.push(w);
  }
  return {k, coord, windows, violations};
}

// ---------------- 主流程 ----------------
function main() {
  if (process.argv.includes('--selftest')) return selftest();
  const all = listShots();
  if (!all.length) die('src/shots/** 下没有解析到任何镜头');
  let totalWindows = 0, totalViolations = 0;
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
    const {k, coord, windows, violations} = auditShot(shot, body, baseLine);
    totalWindows += windows.length;
    totalViolations += violations.length;
    lines.push(`镜头 ${shot.id} (${shot.file}:${shot.line}) 帧区间 ${shot.from}..${shot.to} —— ${coord}`);
    if (!windows.length) lines.push('  （未发现时间窗口调用）');
    for (const w of windows) {
      const ok = !violations.includes(w);
      lines.push(`  ${ok ? '✓' : '✗'} 窗口 [${w.a},${w.b}]  ${w.kind}：${w.note}  ${shot.file}:${w.line}${ok ? '' : '  ← 越出镜头可用帧区间'}`);
    }
  }
  console.log('== probe_time：时间坐标审计（静态扫描 src/shots/**）==');
  console.log(`坐标约定（模板 lib.tsx:5 / Main.tsx:18）：镜头内 N = useCurrentFrame()+K；窗口须落在 N 的有效区间内。`);
  console.log(`注：模板源码无 raw/pulse/local 时间函数（已 grep 验证），窗口提取覆盖 keyframes/kf/stepHold、入场组件 f0/len、守卫窗、countTo。`);
  console.log('');
  console.log(lines.join('\n'));
  console.log('');
  if (totalViolations) {
    console.log(`结论：${all.length} 镜头 / ${totalWindows} 窗口，${totalViolations} 处坐标错配 → 不通过`);
    process.exit(1);
  }
  console.log(`结论：${all.length} 镜头 / ${totalWindows} 窗口，0 处坐标错配 → 通过`);
}

// ---------------- 自检：内嵌违规样例，验证提取器抓得到 ----------------
function selftest() {
  const fixture = `import React from 'react';
import {useCurrentFrame} from 'remotion';
import {keyframes, SoftIn} from '../../ui';
import {countTo} from '../../fx';
const SC_Test: React.FC = () => {
  const N = useCurrentFrame() + 200;
  return (
    <>
      <div style={{left: keyframes(N, [[1, 0], [8, 1]])}} />
      <SoftIn N={N} f0={295} len={10} />
      <div>{countTo(N - 295, 0, 100)}</div>
    </>
  );
};
export const SHOTS_TEST: ShotDef[] = [{id: 'T1', from: 200, to: 300, Comp: SC_Test}];
`;
  const shot = {id: 'T1', compName: 'SC_Test', file: '(selftest)', from: 200, to: 300, line: 7};
  const blk = sliceBlock(fixture, 'SC_Test');
  const {k, coord, windows, violations} = auditShot(shot, blk.text, blk.startLine);
  console.log('== probe_time --selftest：合成镜头 from=200,to=300（K=200 全片坐标）==');
  console.log(`坐标判定：${coord}`);
  for (const w of [...windows, ...violations].filter((v, i, a) => a.indexOf(v) === i)) {
    const ok = !violations.includes(w);
    console.log(`  ${ok ? '✓' : '✗'} 窗口 [${w.a},${w.b}]  ${w.kind}：${w.note}`);
  }
  const caught = violations.length >= 3;
  console.log(`自检结果：提取 ${windows.length + violations.length} 窗，抓到 ${violations.length} 处违规（预期 ≥3）→ ${caught ? '提取器有效' : '提取器失效'}`);
  if (!caught) { console.error('自检失败：提取器未能抓到合成违规'); process.exit(2); }
}

main();
