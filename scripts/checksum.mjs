#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as glob from 'glob';
import * as cp from 'cross-spawn';
import pkg from '../package.json' with { type: 'json' };

const OUTPUT_FILE = 'src/_auto_gen/checksum.cjs';

function isGitHook() {
  const env = process.env;

  return Boolean(env.GIT_DIR || env.GIT_INDEX_FILE || env.GIT_PREFIX || env.HUSKY === '1');
}

function sha256(filePath) {
  const hash = crypto.createHash('sha256');

  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let bytesRead = 0;

    while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(fd);
  }

  return hash.digest('hex');
}

function collectFiles() {
  const files = new Set();

  // ---- release folders ----
  // for (const dir of ['release', 'releases']) {
  //   if (fs.existsSync(dir)) {
  //     for (const file of glob.globSync(`${dir}/**/*`, { nodir: true })) {
  //       files.add(file);
  //     }
  //   }
  // }

  // ---- package.json "files" field ----
  try {
    if (Array.isArray(pkg.files)) {
      for (const pattern of pkg.files) {
        for (const match of glob.globSync(pattern, { nodir: false })) {
          const stat = fs.existsSync(match) && fs.statSync(match);
          if (!stat) continue;

          if (stat.isFile()) files.add(match);
          else if (stat.isDirectory()) {
            for (const f of glob.globSync(`${match}/**/*`, { nodir: true })) {
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

  if (isGitHook()) {
    cp.spawnSync('git', ['add', OUTPUT_FILE], { stdio: 'inherit' });
  }

  console.log('[checksum] written:', OUTPUT_FILE);
  console.log('[checksum] hash:', finalHash);
}

main();
