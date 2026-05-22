const { spawnSync } = require('node:child_process');
const fs = require('fs-extra');
const path = require('upath');
const { getChecksum } = require('sbg-utility');

const isWin = process.platform === 'win32';

const fixturesDir = path.join(__dirname, 'fixtures');
const ESLINT_PACKAGE = '@dimaslanjaka/eslint-base-config';
const PROJECT_ROOT = path.join(__dirname, '..');

const PATHS = {
  tgz: path.join(__dirname, '..', 'release', 'dimaslanjaka-eslint-base-config.tgz'),
  checksum: path.join(__dirname, 'node_modules', '.tgz-checksum'),
  yarnLock: path.join(__dirname, 'yarn.lock')
};

/**
 * Run command synchronously
 * @param {string} command
 * @param {string[]|import('node:child_process').SpawnSyncOptions} [argsOrOptions=[]]
 * @param {import('node:child_process').SpawnSyncOptions & {throws?: boolean}} [options]
 */
function run(command, argsOrOptions = [], options = {}) {
  const isArgsArray = Array.isArray(argsOrOptions);
  const args = isArgsArray ? argsOrOptions : [];
  const opts = isArgsArray ? options : argsOrOptions;
  const { throws = true, ...spawnOpts } = opts;
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: isWin,
    cwd: __dirname,
    ...spawnOpts
  });

  if (throws && result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }

  return result;
}

/**
 * Write file with normalized trailing newline
 * @param {string} file
 * @param {string} content
 */
function writeFile(file, content) {
  fs.writeFileSync(file, `${content.trim()}\n`);
}

/**
 * Generate ESLint config file
 * @param {'mjs' | 'cjs'} type
 */
function generateConfig(type) {
  const file = path.join(__dirname, `eslint.config.${type}`);

  const content =
    type === 'mjs'
      ? `
import base from "${ESLINT_PACKAGE}";

export default [...base];
`
      : `
const base = require("${ESLINT_PACKAGE}");

module.exports = [...base];
`;

  writeFile(file, content);

  return file;
}

const generateEsmConfig = () => generateConfig('mjs');
const generateCjsConfig = () => generateConfig('cjs');

/**
 * Run ESLint on file
 * @param {string} file
 * @param {string[]|import('node:child_process').SpawnSyncOptions} [argsOrOptions=[]]
 * @param {import('node:child_process').SpawnSyncOptions} [options]
 */
function runEslint(file, argsOrOptions = [], options = {}) {
  const isArgsArray = Array.isArray(argsOrOptions);
  const args = isArgsArray ? argsOrOptions : [];
  const opts = isArgsArray ? options : argsOrOptions;
  return run('npx', ['-y', 'eslint', ...args, file], { cwd: __dirname, ...opts, throws: false });
}

function writeUglyCodes(srcFilename = 'ugly', destExt = 'js') {
  const dest = path.join(fixturesDir, `${srcFilename}.${destExt.replace(/^\./, '')}`);
  const uglySource = path.join(__dirname, 'fixtures', `${srcFilename}.txt`);

  writeFile(dest, fs.readFileSync(uglySource, 'utf8'));

  return dest;
}

/**
 * @param {boolean} [cache=true]
 * @param {boolean} [debug=false]
 */
async function setup(cache = true, debug = false) {
  const log = (...args) => debug && console.log(...args);

  log('setup: Starting setup');

  if (!(await fs.pathExists(PATHS.tgz))) {
    throw new Error(`TGZ file not found: ${PATHS.tgz}`);
  }

  let shouldInstall = true;
  let currentChecksum = '';

  if (cache) {
    const nodeModulesPath = path.join(__dirname, 'node_modules');

    const [hasYarnLock, hasNodeModules] = await Promise.all([
      fs.pathExists(PATHS.yarnLock),
      fs.pathExists(nodeModulesPath)
    ]);

    const yarnLockContent = hasYarnLock ? (await fs.readFile(PATHS.yarnLock, 'utf8')).trim() : '';

    currentChecksum = await getChecksum(PATHS.tgz);

    const previousChecksum = (await fs.pathExists(PATHS.checksum))
      ? (await fs.readFile(PATHS.checksum, 'utf8')).trim()
      : '';

    shouldInstall = !hasYarnLock || !yarnLockContent || !hasNodeModules || currentChecksum !== previousChecksum;

    log({
      hasYarnLock,
      hasNodeModules,
      currentChecksum,
      previousChecksum,
      shouldInstall
    });

    if (!shouldInstall) {
      log('Dependencies already up to date, skipping yarn install');

      return false;
    }
  }

  log(cache ? 'Installing package...' : 'Cache disabled, forcing yarn install...');

  run('yarn', ['set', 'version', '4.13.0']);

  run('yarn', ['add', `${ESLINT_PACKAGE}@file:${path.relative(__dirname, PATHS.tgz)}`]);

  if (cache) {
    await fs.writeFile(PATHS.checksum, currentChecksum);
  }

  log('setup: Completed');

  return true;
}

function buildPackage() {
  run('yarn', ['run', 'build'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: isWin,
    throws: true
  });

  run('yarn', ['run', 'pack'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: isWin,
    throws: true
  });
}

module.exports = {
  fixturesDir,
  generateEsmConfig,
  generateCjsConfig,
  runEslint,
  writeUglyCodes,
  setup,
  buildPackage
};
