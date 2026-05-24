const fs = require('fs-extra');
const path = require('upath');
const pkg = require('../package.json');
const setupVSCodeConfiguration = require('./setupVSCodeConfiguration.cjs');

const isRunningInJest = Boolean(process.env.JEST_WORKER_ID);
const postinstallMarkerPath = path.join(process.cwd(), 'node_modules', pkg.name, '.postinstall-run');

if (fs.existsSync(postinstallMarkerPath) && !isRunningInJest) {
  console.log('Postinstall script has already been run. Skipping...');

  process.exit(0);
}

setupVSCodeConfiguration()
  .then(() => {
    fs.ensureFileSync(postinstallMarkerPath);
  })
  .catch((error) => {
    console.error('Error during postinstall:', error);

    process.exit(1);
  });
