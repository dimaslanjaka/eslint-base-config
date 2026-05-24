const fs = require('fs-extra');
const path = require('upath');
const pkg = require('./package.json');

async function importRuntimeDependencies() {
  const deepmerge = (await import('deepmerge')).default;
  const jsonc = (await import('jsonc-parser')).default;

  return { deepmerge, jsonc };
}

function createDeduplicatingArrayMerger() {
  return (existingItems, incomingItems) => {
    const seenKeys = new Set();
    const mergedItems = [];

    for (const item of [...existingItems, ...incomingItems]) {
      const uniqueKey = item && typeof item === 'object' ? JSON.stringify(item) : item;

      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        mergedItems.push(item);
      }
    }

    return mergedItems;
  };
}

async function setupVSCodeConfiguration(projectRoot = process.cwd()) {
  const { deepmerge, jsonc } = await importRuntimeDependencies();

  const projectSettingsPath = path.join(projectRoot, '.vscode', 'settings.json');
  const packageSettingsPath = path.join(__dirname, '.vscode', 'settings.json');

  if (!fs.existsSync(projectSettingsPath)) {
    fs.copyFileSync(packageSettingsPath, projectSettingsPath);

    console.log('Copied .vscode/settings.json to the project root.');

    return;
  }

  const projectSettingsContent = fs.readFileSync(projectSettingsPath, 'utf-8');
  const packageSettingsContent = fs.readFileSync(packageSettingsPath, 'utf-8');

  const projectSettings = jsonc.parse(projectSettingsContent);
  const packageSettings = jsonc.parse(packageSettingsContent);

  const mergedSettings = deepmerge(projectSettings, packageSettings, {
    arrayMerge: createDeduplicatingArrayMerger()
  });

  fs.writeFileSync(projectSettingsPath, JSON.stringify(mergedSettings, null, 2));

  console.log('Merged .vscode/settings.json with deduped arrays.');
}

const isRunningInJest = Boolean(process.env.JEST_WORKER_ID);
const postinstallMarkerPath = path.join(__dirname, 'node_modules', pkg.name, '.postinstall-run');

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
