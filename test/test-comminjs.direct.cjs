const setupModule = require('./setup.cjs');
const path = require('upath');
const fs = require('fs-extra');

function generateDebugJs() {
  const debugJsPath = path.join(__dirname, 'debug-resolve.js');
  const jsContent = `
console.log('resolving @dimaslanjaka/eslint-base-config location:');
try {
  const resolvedPath = require.resolve('@dimaslanjaka/eslint-base-config');
  console.log('Resolved Path:', resolvedPath);
} catch (error) {
  console.error('Error resolving package:', error);
}
const baseConfig = require('@dimaslanjaka/eslint-base-config');
console.log('Base ESLint Config:', baseConfig);
  `;
  fs.writeFileSync(debugJsPath, jsContent);
  return debugJsPath;
}

async function main() {
  setupModule.buildPackage();
  await setupModule.setup();
  const eslintConfigPath = setupModule.generateCjsConfig();
  console.log(`Generated ESLint config at: ${eslintConfigPath}`);
  const uglyJsPath = setupModule.writeUglyCodes();
  console.log(`Generated ugly JavaScript file at: ${uglyJsPath}`);
  console.log('Running the debug script to check package resolution...');
  const debugJsPath = generateDebugJs();
  setupModule.run('node', [debugJsPath], { stdio: 'inherit' });
  fs.removeSync(debugJsPath); // Clean up the debug script after running
  console.log('Running ESLint on the ugly code...');
  setupModule.runEslint(uglyJsPath, { stdio: 'inherit' });
}

main().catch((error) => {
  console.error('Error during setup:', error);
  process.exit(1);
});
