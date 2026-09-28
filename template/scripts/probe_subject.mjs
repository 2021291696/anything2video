#!/usr/bin/env node
/**
 * probe_subject.mjs —— 主体尺寸与位置探针（动态渲染）。
 *
 * 每个镜头按采样步长（默认每 5 帧，--step 可改，采样密度自定但判据按帧距换算）取帧渲染：
 *  - 背景色：取该镜头第一帧四角 8×8 色块的逐通道中位数；非背景像素 = RGB 欧氏距离 > 24；
 *  - 常驻层（品牌条/进度线/QC 角标等常驻 UI）不属于主体：像素级「全程在场」掩膜（1px 膨胀抗锯齿抖动，
 *    再 2px 膨胀吞光晕）+ BrandBar.tsx 导出常量划出的品牌条槽位带；若剔除后全片无主体则退回不做像素级剔除；
 *  - 非背景像素包围盒面积 < 6% 画布面积，且连续覆盖 > 45 帧（(连续命中采样数-1)×步长 > 45，与逐帧判据等价）→ 「主体过小」；
 *  - 包围盒质心偏离画布中心 > 0.35*W 或 > 0.35*H → 「主体偏心」；
 *  - 包围盒触到画布任何一边 → 「可能出画」；
 *  - 瞬态入场特效豁免：镜头开头 ENTRANCE_GRACE 帧内，词汇表入场动效（横扫光条/GlitchIn）瞬态出画/偏心
 *    属设计内过渡，只注记不计缺陷（「主体过小」照判不受豁免）。
 * 任一命中 → 退出码 1。每帧输出主体包围盒、占屏比（包围盒面积/画布面积）、质心坐标。
 * 面积/偏心阈值均按画布比例表达，不依赖具体分辨率。
 *
 * 用法：node probe_subject.mjs [--step 5] [--comp PromoDemo] [--shot beat2] [--rebundle]
 * 退出码：0=通过｜1=发现主体异常｜2=用法/环境错误。
 */
import fs from 'node:fs';
import path from 'node:path';
import {withRenderer, listShots, argValue, die, decodePng, TEMPLATE_ROOT} from './probe_lib.mjs';

const compId = argValue('--comp') ?? 'PromoDemo';
const step = Math.max(1, +(argValue('--step') ?? 5));
const shotFilter = argValue('--shot');
const COLOR_DIST = 24;      // 非背景判定：RGB 欧氏距离阈值（颜色量纲，与画布尺寸无关）
const AREA_MIN = 0.06;      // 包围盒面积下限（画布比例）
const EDGE_DEV = 0.35;      // 质心偏离中心上限（画布比例）
const PERSIST_FRAMES = 45;  // 「过小」需连续覆盖的帧数（按采样步长换算）
const MIN_PIXEL_RATIO = 100 / (1280 * 720); // 无主体帧判据：非背景像素 < 此画布占比视为无主体帧（≈0.011%，按 720p 基准画布 100px 标定，随画布分辨率等比缩放；计入「过小」连续段）
const GLOW_OVERFLOW = 8 / 720;              // 进度线辉光向上溢出品牌条带的高度（≈8px，720p 基准画布标定，按画布高度比例换算）
const ENTRANCE_GRACE = 20;  // 瞬态入场特效豁免窗口（帧）：镜头开头此窗口内的采样帧不判「偏心/触边」——词汇表入场动效瞬态出画属设计内过渡（横扫光条 16 帧+错峰 2 帧，fx.tsx LightSweep；GlitchIn 12 帧模板）；「主体过小」照判不受豁免

const all = listShots().filter((s) => s.comp === compId);
if (!all.length) die(`合成 ${compId} 下没有镜头`);
const shots = shotFilter ? all.filter((s) => s.id === shotFilter) : all;
if (shotFilter && !shots.length) die(`找不到镜头 ${shotFilter}（可选: ${all.map((s) => s.id).join(', ')}）`);
const persistSamples = Math.floor(PERSIST_FRAMES / step) + 1; // 连续命中采样数阈值：(n-1)*step > 45 ⇒ n ≥ floor(45/step)+1

function sampleFrames(shot) {
  const out = [];
  for (let n = shot.from; n <= shot.to; n += step) out.push(n - 1);
  const last = shot.to - 1;
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/** 掩膜 3×3 膨胀（可迭代多次）：像素自身或任一 4/8 邻域命中即命中 */
function dilate(mask, w, h, times = 1) {
  let cur = mask;
  for (let t = 0; t < times; t++) {
    const out = new Uint8Array(cur.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (cur[i]) { out[i] = 1; continue; }
        if ((x > 0 && cur[i - 1]) || (x < w - 1 && cur[i + 1]) || (y > 0 && cur[i - w]) || (y < h - 1 && cur[i + w])) out[i] = 1;
      }
    }
    cur = out;
  }
  return cur;
}

/** 从 BrandBar.tsx 导出读常驻品牌条槽位（模板契约，非写死像素）；读不到则不剔除 */
function brandBarBand() {
  try {
    const src = fs.readFileSync(path.join(TEMPLATE_ROOT, 'src', 'overlay', 'promo', 'BrandBar.tsx'), 'utf8');
    const top = +/BRAND_BAR_TOP\s*=\s*(\d+)/.exec(src)?.[1];
    const h = +/BRAND_BAR_H\s*=\s*(\d+)/.exec(src)?.[1];
    if (Number.isFinite(top) && Number.isFinite(h)) return {top, h};
  } catch { /* 忽略 */ }
  return null;
}

await withRenderer({compId, warmup: true}, async ({composition, still}) => {
  const W = composition.width, H = composition.height;
  const minPixels = Math.max(1, Math.round(MIN_PIXEL_RATIO * W * H)); // 无主体帧像素数下限（按本画布换算）
  console.log(`== probe_subject：主体尺寸与位置（合成 ${compId}，画布 ${W}×${H}，步长 ${step} 帧）==`);
  console.log(`判据：背景=首帧四角中位色；非背景=RGB 距离>${COLOR_DIST}。包围盒面积<${AREA_MIN * 100}% 且连续覆盖>${PERSIST_FRAMES} 帧 → 主体过小（连续采样≥${persistSamples} 个）；质心偏离中心>${EDGE_DEV}*W/H → 主体偏心；包围盒触边 → 可能出画（镜头开头 ${ENTRANCE_GRACE} 帧入场过渡窗口内的瞬态出画/偏心豁免，仅注记）。`);
  console.log('');
  let flaggedShots = 0;
  for (const shot of shots) {
    const frames = sampleFrames(shot);
    const results = [];
    let bg = null;
    // 第一遍：逐帧非背景掩膜（非背景判定按 RGB 距离）；背景色取本镜头第一帧四角中位色
    const masks = [];
    for (const f of frames) {
      const {buffer} = await still(f);
      const {rgba} = decodePng(buffer);
      if (!bg) {
        const patches = [[0, 0], [W - 8, 0], [0, H - 8], [W - 8, H - 8]].map(([x, y]) => {
          const acc = [0, 0, 0];
          for (let dy = 0; dy < 8; dy++) for (let dx = 0; dx < 8; dx++) {
            const p = ((y + dy) * W + (x + dx)) * 4;
            acc[0] += rgba[p]; acc[1] += rgba[p + 1]; acc[2] += rgba[p + 2];
          }
          return acc.map((v) => v / 64);
        });
        bg = [0, 1, 2].map((c) => patches.map((p) => p[c]).sort((a, b) => a - b)[1]);
      }
      const mask = new Uint8Array(W * H);
      for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
        const dr = rgba[p] - bg[0], dg = rgba[p + 1] - bg[1], db = rgba[p + 2] - bg[2];
        if (dr * dr + dg * dg + db * db > COLOR_DIST * COLOR_DIST) mask[i] = 1;
      }
      masks.push(mask);
    }
    // 常驻层剔除：品牌条/进度线/QC 角标等常驻 UI 不属于本镜头主体。
    // 抗锯齿抖动会让辉光边缘像素逐帧在阈值两侧翻转 → 掩膜先膨胀 1px 再判「全程在场」；
    // 常驻掩膜再膨胀 2px 吞掉自身光晕；另按 BrandBar.tsx 导出的槽位常量剔除品牌条带（模板契约，非写死像素）。
    // 若剔除后所有帧都无主体（说明主体本身就是常驻静止的），退回不剔除的全图统计并在输出中注记。
    const NFR = masks.length;
    const dilatedMasks = masks.map((m) => dilate(m, W, H, 1));
    const seen = new Uint32Array(W * H);
    for (const m of dilatedMasks) for (let i = 0; i < m.length; i++) seen[i] += m[i];
    let persistentCount = 0;
    let persistent = new Uint8Array(W * H);
    for (let i = 0; i < seen.length; i++) if (seen[i] === NFR) { persistent[i] = 1; persistentCount++; }
    persistent = dilate(persistent, W, H, 2);
    const band = brandBarBand();
    const bandTop = band ? Math.max(0, band.top - Math.round(GLOW_OVERFLOW * H)) : H; // 辉光溢出高度按画布高度比例换算（GLOW_OVERFLOW，720p 基准标定）
    const inBand = (i) => Math.floor(i / W) >= bandTop;
    let usePix = persistentCount > 0;      // 像素级常驻层（QC 角标/条体文字等静态 UI）
    const useBand = !!band;                // 品牌条槽位带（含进度线与其辉光，常驻且会移动，像素级判不出）
    for (;;) {
      results.length = 0;
      for (let k = 0; k < frames.length; k++) {
        const f = frames[k], mask = masks[k];
        let cnt = 0, sx = 0, sy = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
        for (let i = 0, y = 0; y < H; y++) {
          for (let x = 0; x < W; x++, i++) {
            if (!mask[i] || (usePix && persistent[i]) || (useBand && inBand(i))) continue;
            cnt++; sx += x; sy += y;
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
        if (cnt < minPixels) { results.push({f, empty: true}); continue; }
        const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
        const cx = sx / cnt, cy = sy / cnt;
        const area = (bw * bh) / (W * H);
        // 瞬态入场特效豁免：镜头开头 ENTRANCE_GRACE 帧内，入场动效（横扫光条/GlitchIn）瞬态出画/偏心属设计内过渡，
        // 只注记不计缺陷；「主体过小」的连续段判据不受豁免影响（见下方 tooSmall 逻辑照常累计）。
        const inGrace = f < shot.from - 1 + ENTRANCE_GRACE; // shot.from 为 1 起帧号，f 为 0 起合成帧
        const rawOffX = Math.abs(cx - W / 2) > EDGE_DEV * W;
        const rawOffY = Math.abs(cy - H / 2) > EDGE_DEV * H;
        const rawTouch = x0 <= 0 || y0 <= 0 || x1 >= W - 1 || y1 >= H - 1;
        const offX = rawOffX && !inGrace;
        const offY = rawOffY && !inGrace;
        const touch = rawTouch && !inGrace;
        results.push({f, empty: false, x0, y0, x1, y1, bw, bh, area, cx, cy, offX, offY, touch, transient: inGrace && (rawOffX || rawOffY || rawTouch)});
      }
      if (!usePix || results.some((r) => !r.empty)) break;
      usePix = false; // 全部帧无主体 → 主体可能是常驻静止的，退回不做像素级常驻剔除（条带仍剔除）
    }
    // 「主体过小」：连续命中段（空帧视为面积 0 命中）
    let run = 0, maxRunFrames = 0, tooSmall = false;
    for (const r of results) {
      const hit = r.empty || r.area < AREA_MIN;
      run = hit ? run + 1 : 0;
      maxRunFrames = Math.max(maxRunFrames, (run - 1) * step);
      if (run >= persistSamples) tooSmall = true;
    }
    const offFrames = results.filter((r) => !r.empty && (r.offX || r.offY));
    const touchFrames = results.filter((r) => !r.empty && r.touch);
    const shotFlag = tooSmall || offFrames.length || touchFrames.length;
    if (shotFlag) flaggedShots++;
    console.log(`镜头 ${shot.id} 帧 ${shot.from}..${shot.to}（采样 ${results.length} 帧，背景色 rgb(${bg.map((v) => v.toFixed(0)).join(',')})，常驻层剔除 ${(100 * persistentCount / (W * H)).toFixed(1)}%${band ? ` + 品牌条带 y≥${bandTop}` : ''}${usePix ? '' : '，像素级常驻剔除已退回（主体疑似常驻静止）'}）`);
    for (const r of results) {
      if (r.empty) { console.log(`  帧 ${r.f}: 无主体（非背景像素 <${minPixels}）`); continue; }
      const marks = [r.area < AREA_MIN ? '面积<6%' : '', r.offX || r.offY ? '偏心' : '', r.touch ? '触边' : ''].filter(Boolean).join(',');
      const graceNote = r.transient ? '  ←入场过渡窗口内瞬态出画/偏心（设计内动效，豁免不计缺陷）' : '';
      console.log(`  帧 ${r.f}: bbox[${r.x0},${r.y0}..${r.x1},${r.y1}] ${r.bw}×${r.bh} 占屏 ${(r.area * 100).toFixed(1)}% 质心(${r.cx.toFixed(0)},${r.cy.toFixed(0)})${marks ? '  ←' + marks : ''}${graceNote}`);
    }
    const msgs = [];
    if (tooSmall) msgs.push(`主体过小：面积<${AREA_MIN * 100}% 连续覆盖 ${maxRunFrames} 帧（>${PERSIST_FRAMES} 触发）`);
    if (offFrames.length) msgs.push(`主体偏心：帧 ${offFrames.map((r) => r.f).join(',')}`);
    if (touchFrames.length) msgs.push(`可能出画：帧 ${touchFrames.map((r) => r.f).join(',')}`);
    console.log(`  ${shotFlag ? '✗ ' + msgs.join('；') : '✓ 主体尺寸与位置正常（最长过小覆盖 ' + maxRunFrames + ' 帧）'}`);
    console.log('');
  }
  if (flaggedShots) {
    console.log(`结论：${shots.length} 镜头中 ${flaggedShots} 个主体异常 → 不通过（退出码 1）`);
    process.exit(1);
  }
  console.log(`结论：${shots.length} 镜头主体尺寸与位置全部正常 → 通过`);
  process.exit(0);
});
