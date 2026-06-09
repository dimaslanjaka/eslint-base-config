/**
 * normalize-resolutions.mjs
 *
 * Normalizes pinned commit hashes in package.json resolutions to
 * branch/tag names, so the packed tarball contains friendly references.
 *
 * Usage:
 *   node scripts/normalize-resolutions.mjs            # apply normalization
 *   node scripts/normalize-resolutions.mjs --restore  # restore from backup
 * Designed to run before `npm pack` / `yarn pack`.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PACKAGE_JSON = join(ROOT, 'package.json');
const BACKUP_PATH = join(ROOT, 'package.json.resolutions.bak');

/**
 * Hash pattern: any 40-character hex string between `/raw/` and the next `/`.
 * This avoids hardcoding commit hashes that change on every update.
 */
const HASH_PATTERN = /(?<=\/raw\/)[a-f0-9]{40}(?=\/)/;

const RESOLUTIONS_NORMALIZE = [
  { pkg: 'cross-spawn', to: 'private' },
  { pkg: 'binary-collections', to: 'master' },
  { pkg: 'git-command-helper', to: 'pre-release' },
  { pkg: 'sbg-utility', to: 'sbg-utility' }
];

function restore() {
  if (!existsSync(BACKUP_PATH)) {
    console.error('[normalize-resolutions] no backup found at', BACKUP_PATH);
    process.exit(1);
  }
  const original = readFileSync(BACKUP_PATH, 'utf-8');
  if (!original.trim()) {
    console.log('[normalize-resolutions] backup is empty, nothing to restore');
    return;
  }
  writeFileSync(PACKAGE_JSON, original);
  // remove backup after restore
  try {
    writeFileSync(BACKUP_PATH, '');
  } catch {}
  console.log('[normalize-resolutions] restored original package.json');
}

function normalize() {
  const raw = readFileSync(PACKAGE_JSON, 'utf-8');
  const pkg = JSON.parse(raw);
  if (!pkg.resolutions || Object.keys(pkg.resolutions).length === 0) {
    console.log('[normalize-resolutions] no resolutions to normalize');
    return;
  }

  // save backup
  copyFileSync(PACKAGE_JSON, BACKUP_PATH);

  let changed = false;
  for (const entry of RESOLUTIONS_NORMALIZE) {
    const url = pkg.resolutions[entry.pkg];
    if (url && HASH_PATTERN.test(url)) {
      pkg.resolutions[entry.pkg] = url.replace(HASH_PATTERN, entry.to);
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n');
    console.log('[normalize-resolutions] normalized resolutions for packing');
    console.log('[normalize-resolutions] backup saved to', BACKUP_PATH);
    console.log('[normalize-resolutions] restore with: node scripts/normalize-resolutions.mjs --restore');
  } else {
    // no changes — clean up the pointless backup
    try {
      unlinkSync(BACKUP_PATH);
    } catch {}
    console.log('[normalize-resolutions] no changes needed');
  }
}

const args = process.argv.slice(2);
if (args.includes('--restore')) {
  restore();
} else {
  normalize();
}
