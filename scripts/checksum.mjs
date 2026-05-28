#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { globSync } from 'glob';
import * as cp from 'cross-spawn';

const OUTPUT_FILE = 'src/_auto_gen/checksum.cjs';

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

function collectFiles() {
  const files = new Set();

  // ---- release folders ----
  for (const dir of ['release', 'releases']) {
    if (fs.existsSync(dir)) {
      for (const file of globSync(`${dir}/**/*`, { nodir: true })) {
        files.add(file);
      }
    }
  }

  // ---- package.json "files" field ----
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (Array.isArray(pkg.files)) {
      for (const pattern of pkg.files) {
        for (const match of globSync(pattern, { nodir: false })) {
          const stat = fs.existsSync(match) && fs.statSync(match);
          if (!stat) continue;

          if (stat.isFile()) files.add(match);
          else if (stat.isDirectory()) {
            for (const f of globSync(`${match}/**/*`, { nodir: true })) {
              files.add(f);
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return [...files];
}

function main() {
  const files = collectFiles();

  if (files.length === 0) {
    console.log('No files found for checksum');
    process.exit(0);
  }

  // hash each file entry (like sha256sum output)
  const lines = files.map((f) => `${sha256(f)}  ${f}`).sort();

  // final hash over combined list
  const finalHash = crypto.createHash('sha256').update(lines.join('\n')).digest('hex');

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  fs.writeFileSync(
    OUTPUT_FILE,
    `const hash = "${finalHash}";

module.exports = hash;
module.exports = { hash };
module.exports.default = module.exports;
`
  );

  cp.spawnSync('npx', ['-y', 'eslint', '--fix', OUTPUT_FILE], { stdio: 'inherit' });

  console.log('[checksum] written:', OUTPUT_FILE);
  console.log('[checksum] hash:', finalHash);
}

main();
