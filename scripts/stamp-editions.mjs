#!/usr/bin/env node
// 重新打已安装 edition 的入口与身份清单（共享文件改动同步进 edition 后跑一次）：
//   node scripts/stamp-editions.mjs <edition-dir> [<edition-dir> ...]
// 动作：SKILL.md = hosts/<host>.md frontmatter + 共享 SKILL.md 正文（composeEntry）；
//       edition.json = 当前版本 + 按当前包内容重算的 coreHashes + 入口 sha；随后 verifyEdition 把关。
// 纪律：不要手编 edition.json，也不要把通用 SKILL.md 原样拷进 edition（入口 frontmatter 必须是宿主身份）。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {collectCoreFiles, composeEntry, HOSTS, SOURCE_ROOT, verifyEdition} from './build-editions.mjs';

const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const versionOf = text => {
  const block = text.match(/^metadata:\s*\r?\n((?:[ \t]+[^\r\n]*(?:\r?\n|$))*)/m)?.[1] ?? '';
  const nested = block.match(/^  version:\s*["']?([0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?)["']?\s*$/m)?.[1];
  return nested ?? text.match(/^version:\s*["']?([0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?)["']?\s*$/m)?.[1];
};

const targets = process.argv.slice(2);
if (!targets.length) throw new Error('Usage: node scripts/stamp-editions.mjs <edition-dir> [<edition-dir> ...]');
for (const target of targets) {
  const metadata = JSON.parse(fs.readFileSync(path.join(target, 'edition.json'), 'utf8'));
  if (!HOSTS.includes(metadata.host) || metadata.name !== `anything2video-${metadata.host}`) {
    throw new Error(`Unrecognized edition identity: ${target}`);
  }
  const hostEntry = fs.readFileSync(path.join(SOURCE_ROOT, 'hosts', `${metadata.host}.md`), 'utf8');
  const coreText = fs.readFileSync(path.join(SOURCE_ROOT, 'SKILL.md'), 'utf8');
  const sharedVersion = versionOf(coreText);
  if (sharedVersion && versionOf(hostEntry) !== sharedVersion) {
    throw new Error(`Version mismatch: SKILL.md ${sharedVersion} vs hosts/${metadata.host}.md ${versionOf(hostEntry)}`);
  }
  fs.writeFileSync(path.join(target, 'SKILL.md'), composeEntry(hostEntry, coreText));
  const coreHashes = Object.fromEntries(collectCoreFiles(target).map(relative => [relative, sha256(path.join(target, ...relative.split('/')))]));
  fs.writeFileSync(path.join(target, 'edition.json'), JSON.stringify({
    schemaVersion: 1, version: sharedVersion, host: metadata.host, name: metadata.name,
    entrypointSha256: sha256(path.join(target, 'SKILL.md')), coreHashes,
  }, null, 2) + '\n');
  verifyEdition(target);
  console.log(`Stamped ${metadata.name} at ${target} (v${sharedVersion}, ${Object.keys(coreHashes).length} core files)`);
}
