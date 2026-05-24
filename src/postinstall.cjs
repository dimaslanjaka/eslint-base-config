const fs = require('fs-extra');
const path = require('upath');
const pkg = require('../package.json');
const { hash } = require('./.checksum.cjs');
const setupVSCodeConfiguration = require('./setupVSCodeConfiguration.cjs');

const isJest = process.env.JEST_WORKER_ID !== undefined;
const cwd = process.cwd();

const basePath =
  pkg.name === '@dimaslanjaka/eslint-base-config'
    ? path.join(cwd, 'tmp', '.postinstall-run')
    : path.join(cwd, 'node_modules', pkg.name, '.postinstall-run');

const marker = pkg.name === '@dimaslanjaka/eslint-base-config' ? hash : `${hash}.txt`;

const postinstallMarkerPath = path.join(basePath, marker);

function ensureDirSafe(dir) {
  if (fs.existsSync(dir) && !fs.lstatSync(dir).isDirectory()) {
    fs.removeSync(dir); // remove file blocking directory creation
  }
  fs.mkdirSync(dir, { recursive: true });
}

// skip if already done
if (!isJest && fs.existsSync(postinstallMarkerPath)) {
  console.log('Postinstall script has already been run. Skipping...');
  process.exit(0);
}

async function run() {
  try {
    await setupVSCodeConfiguration();

    ensureDirSafe(basePath);

    fs.writeFileSync(postinstallMarkerPath, `Postinstall script run on ${new Date().toISOString()}`);
  } catch (err) {
    console.error('Error during postinstall:', err);
    process.exit(1);
  }
}

run();
