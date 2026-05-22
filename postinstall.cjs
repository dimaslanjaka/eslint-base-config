const fs = require('fs-extra');
const path = require('upath');
const pkg = require('./package.json');

async function loadModules() {
  const deepmerge = (await import('deepmerge')).default;
  const jsonc = (await import('jsonc-parser')).default;
  return { deepmerge, jsonc };
}

function createArrayMerge() {
  return (destinationArray, sourceArray) => {
    // merge + dedupe (string-safe + object-safe)
    const seen = new Set();
    const result = [];

    for (const item of [...destinationArray, ...sourceArray]) {
      const key = item && typeof item === 'object' ? JSON.stringify(item) : item;

      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }

    return result;
  };
}

async function main() {
  const { deepmerge, jsonc } = await loadModules();

  const localVSCodeSettingsPath = path.join(process.cwd(), '.vscode', 'settings.json');
  const moduleVSCodeSettingsPath = path.join(__dirname, '.vscode', 'settings.json');

  if (!fs.existsSync(localVSCodeSettingsPath)) {
    fs.copyFileSync(moduleVSCodeSettingsPath, localVSCodeSettingsPath);
    console.log('Copied .vscode/settings.json to the project root.');
    return;
  }

  const localSettingsContent = fs.readFileSync(localVSCodeSettingsPath, 'utf-8');
  const moduleSettingsContent = fs.readFileSync(moduleVSCodeSettingsPath, 'utf-8');

  const localSettings = jsonc.parse(localSettingsContent);
  const moduleSettings = jsonc.parse(moduleSettingsContent);

  const mergedSettings = deepmerge(localSettings, moduleSettings, {
    arrayMerge: createArrayMerge()
  });

  fs.writeFileSync(localVSCodeSettingsPath, JSON.stringify(mergedSettings, null, 2));

  console.log('Merged .vscode/settings.json with deduped arrays.');
}

const isJest = !!process.env.JEST_WORKER_ID;
const indicatorFile = path.join(__dirname, 'node_modules', pkg.name, '.postinstall-run');
if (fs.existsSync(indicatorFile) && !isJest) {
  console.log('Postinstall script has already been run. Skipping...');
  process.exit(0);
}

main()
  .then(() => {
    // Create indicator file to mark postinstall as run
    fs.ensureFileSync(indicatorFile);
  })
  .catch((error) => {
    console.error('Error during postinstall:', error);
    process.exit(1);
  });
