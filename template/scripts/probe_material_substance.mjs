#!/usr/bin/env node
/**
 * probe_material_substance.mjs v2 —— 材质丰满度与素材合规硬核验（epic 配方）
 *
 * v2 重写（2026-10-04）：v1 是字符串 grep 橡皮图章（含 Img/Canvas 字样即过、
 * 有一个 PNG 即免疫 FAIL），防不住它要拦的东西。v2 的两道真门：
 *
 * 门一（硬 FAIL）MANIFEST 绑定：
 *   - public/assets 下的图片/视频素材（png/jpg/jpeg/webp/mp4）必须逐文件在项目根
 *     MANIFEST.md 有登记行；MANIFEST 缺失且素材非零 = FAIL。
 *   - 登记行含「参考片/抽帧/现有视频/成片截取」字样 = FAIL（硬性原则 1：不得使用
 *     任何现有视频的帧或片段——AI 世界帧例外只认 AI 生成 + 逐条登记）。
 *   - footage/ 下素材的登记行既无 http 也无 AI 字样 = 来源未声明（记缺陷，FAIL）。
 *
 * 门二（防空心）章节实质审计：
 *   - 逐 shot 源码找材质信号（Footage/TreeGrow/ParticleText/Canvas/backgroundImage/
 *     DotFieldBg/ShaderPost/GRAIN_URL/TempGrade/OffthreadVideo）；零素材且空心章
 *     （有 border 无任何材质信号）过半 = FAIL；其余空心章逐条列警告。
 *
 * 非 epic 配方：SKIP 退出 0（promo 的反空心门在 recipes/promo.md §2.6，由 QC agent 执行）。
 * 退出码：0 = 过（允许有警告）；1 = FAIL（缺陷清单见输出）。
 */

import fs from 'fs';
import path from 'path';

const FAIL_KEYWORDS = ['参考片', '抽帧', '现有视频', '成片截取'];
const SUBSTANCE_TOKENS = [
  'Footage', 'TreeGrow', 'ParticleText', 'Canvas', 'backgroundImage',
  'DotFieldBg', 'ShaderPost', 'GRAIN_URL', 'TempGrade', 'OffthreadVideo', 'Img'
];
const ASSET_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.mp4'];

const projectDir = process.cwd();
const issues = [];
const warns = [];

const configPath = path.join(projectDir, 'src', 'config.ts');
if (!fs.existsSync(configPath)) {
  console.log('[material_substance] SKIP: src/config.ts 未找到');
  process.exit(0);
}
if (!fs.readFileSync(configPath, 'utf8').includes("recipe: 'epic'")) {
  console.log('[material_substance] SKIP: 非 epic 配方项目，本探针豁免（promo 反空心门见 recipes/promo.md §2.6）');
  process.exit(0);
}

console.log('== [probe_material_substance v2] 材质丰满度与素材合规审计 ==');

// ---- 门一：素材清点与 MANIFEST 绑定 ----
const assetsDir = path.join(projectDir, 'public', 'assets');
const assetFiles = [];
if (fs.existsSync(assetsDir)) {
  for (const f of fs.readdirSync(assetsDir, {withFileTypes: true, recursive: true})) {
    if (!f.isFile()) continue;
    if (ASSET_EXT.includes(path.extname(f.name).toLowerCase())) {
      // Node 24 起 Dirent.path 改名 parentPath（旧名 undefined）
      const rel = path.join(f.parentPath ?? f.path ?? assetsDir, f.name);
      assetFiles.push(path.relative(projectDir, rel).replaceAll('\\', '/'));
    }
  }
}
console.log(`  - 图片/视频素材: ${assetFiles.length} 个（public/assets 下）`);

const manifestPath = path.join(projectDir, 'MANIFEST.md');
const manifestRows = [];
if (fs.existsSync(manifestPath)) {
  for (const line of fs.readFileSync(manifestPath, 'utf8').split('\n')) {
    if (line.trim().startsWith('|')) manifestRows.push(line);
  }
}

if (assetFiles.length > 0) {
  if (manifestRows.length === 0) {
    issues.push(`存在 ${assetFiles.length} 个素材但 MANIFEST.md 无登记行（AI 帧用 scripts/gen_world_frames.py --generate/--register 登记；B-roll 手工登记 URL+许可）`);
  } else {
    for (const a of assetFiles) {
      const row = manifestRows.find(r => r.includes(a));
      if (!row) {
        issues.push(`素材未登记 MANIFEST：${a}`);
        continue;
      }
      for (const kw of FAIL_KEYWORDS) {
        if (row.includes(kw)) {
          issues.push(`来源违规（硬性原则 1）：${a} 的登记行含「${kw}」——不得使用任何现有视频的帧或片段`);
        }
      }
      if (/footage\//.test(a) && !/http|AI|Mixkit|Pixabay/i.test(row)) {
        issues.push(`来源未声明：${a} 的登记行既无 URL 也无 AI 生成标记`);
      }
    }
  }
}

// ---- 门二：章节实质审计 ----
const shotsDir = path.join(projectDir, 'src', 'shots');
let hollow = [];
let substantial = 0;
if (fs.existsSync(shotsDir)) {
  const files = fs.readdirSync(shotsDir, {recursive: true})
    .filter(f => typeof f === 'string' && (f.endsWith('.tsx') || f.endsWith('.ts')));
  for (const f of files) {
    const code = fs.readFileSync(path.join(shotsDir, f), 'utf8');
    const hasSubstance = SUBSTANCE_TOKENS.some(t => code.includes(t));
    if (hasSubstance) substantial++;
    else if (code.includes('border')) hollow.push(f);
  }
  const total = files.length;
  console.log(`  - 章节实质: ${substantial}/${total} 个 shot 文件含材质信号；空心 ${hollow.length} 个`);
  if (assetFiles.length === 0 && hollow.length > total / 2) {
    issues.push(`零素材且空心章过半（${hollow.length}/${total}）：全片只有单层线框，无材质底——先跑 gen_world_frames.py 或逐章补程序化纹理（DotFieldBg/ShaderPost/Canvas）`);
  } else if (hollow.length > 0) {
    for (const h of hollow) warns.push(`疑似空心章节（仅线框无材质信号）：${h}`);
  }
}

// ---- 汇总 ----
for (const w of warns) console.warn(`  ⚠ ${w}`);
if (issues.length > 0) {
  console.error('\n❌ FAIL:');
  for (const i of issues) console.error(`   - ${i}`);
  process.exit(1);
}
console.log(`\n✓ PASS（素材 ${assetFiles.length} 个均登记且来源合规；实质章 ${substantial} 个；警告 ${warns.length} 条不计罪）`);
process.exit(0);
