const fs = require('fs-extra');
const path = require('upath');
const pkg = require('../package.json');
const { hash } = require('./_auto_gen/checksum.cjs');
const setupVSCodeConfiguration = require('./setupVSCodeConfiguration.cjs');

const isJest = process.env.JEST_WORKER_ID !== undefined;
const cwd = process.env.INIT_CWD || process.cwd();

// Derive the consumer project root from this script's own location.
// When installed as a dependency, __dirname will be inside node_modules.
// Walk up from node_modules to find the consumer's project root.
const nmIndex = __dirname.replace(/\\/g, '/').lastIndexOf('/node_modules/');
const consumerRoot = nmIndex !== -1 ? __dirname.slice(0, Math.max(0, nmIndex)) : cwd;

const consumerPkgJsonPath = path.join(consumerRoot, 'package.json');

try {
  if (fs.existsSync(consumerPkgJsonPath)) {
    const consumerPkg = fs.readJsonSync(consumerPkgJsonPath);

    if (consumerPkg?.name && consumerPkg.name === pkg.name) {
      console.warn(
        `Warning: consumer package.json name (${pkg.name}) matches this package at ${consumerRoot}. ` +
          `Skipping postinstall to avoid conflicts.`
      );
      process.exit(0);
    }
  }
} catch (err) {
  console.warn('Failed to validate consumer package.json:', err);
}

const basePath = path.join(consumerRoot, 'tmp', pkg.name, '.postinstall-run');

const postinstallMarkerPath = path.join(basePath, `${hash}.txt`);

// skip if already done
if (!isJest && fs.existsSync(postinstallMarkerPath)) {
  console.log('Postinstall script has already been run. Skipping...');
  process.exit(0);
}

async function run() {
  try {
    await setupVSCodeConfiguration(consumerRoot);

    fs.ensureDirSync(basePath);

    fs.writeFileSync(postinstallMarkerPath, `Postinstall script run on ${new Date().toISOString()}`);
  } catch (err) {
    console.error('Error during postinstall:', err);
    process.exit(1);
  }
}

run();
