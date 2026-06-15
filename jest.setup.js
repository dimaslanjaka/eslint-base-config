import crypto from 'crypto';
import fs from 'fs-extra';
import * as glob from 'glob';
import path from 'upath';
import moment from 'moment';
import { fileURLToPath } from 'url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🪵 logger
function log(message) {
  const ts = moment().format('DD/MM/YYYY HH:mm:ss');
  console.log(`🧾 [${ts}] ${message}`);
}

function hashFiles(files) {
  const hash = crypto.createHash('sha256');

  for (const file of files) {
    hash.update(fs.readFileSync(file));
  }

  return hash.digest('hex');
}

function hasGlobChars(p) {
  return /[*?[{\\]!]/.test(p);
}

async function resolvePattern(pattern) {
  if (path.isAbsolute(pattern) && !hasGlobChars(pattern)) {
    return (await fs.pathExists(pattern)) ? [pattern] : [];
  }

  return glob.glob(pattern, {
    dot: true,
    nodir: true,
    ignore: ['**/tmp/**', '**/dist/**', '**/node_modules/**', '**/.cache/**']
  });
}

async function collectFiles(patterns) {
  const results = await Promise.all(patterns.map(resolvePattern));

  return [...new Set(results.flat())];
}

function execAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: isWin,
      cwd: __dirname,
      ...options
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed: ${command} ${args.join(' ')} (exit code ${code})`));
      } else {
        resolve();
      }
    });
  });
}

async function setup() {
  log('🧹 Cleaning dist/...');
  await execAsync('npx', ['-y', 'rimraf', 'dist']);

  log('📦 Building package...');
  await execAsync('yarn', ['build']);

  log('📦 Packing package...');
  await execAsync('yarn', ['pack']);
}

const patterns = [path.resolve(__dirname, 'eslint.config.js'), path.resolve(__dirname, 'package.json')];

export default async function main() {
  const files = await collectFiles(patterns);

  const cacheFile = path.join(__dirname, 'tmp', 'setup-cache.json');

  await fs.ensureDir(path.dirname(cacheFile));

  const currentHash = hashFiles(files);

  let prevHash = null;

  if (await fs.pathExists(cacheFile)) {
    prevHash = (await fs.readJson(cacheFile)).hash;
  }

  if (currentHash === prevHash) {
    log('✔ setup skipped (no changes)');
    return;
  }

  log('▶ running setup...');

  await setup();

  await fs.writeJson(cacheFile, {
    hash: currentHash,
    updatedAt: new Date().toISOString()
  });

  log('✅ setup completed');
}
