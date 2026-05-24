const fs = require('fs-extra');
const path = require('upath');
const createDeduplicatingArrayMerger = require('./createDeduplicatingArrayMerger.cjs');

async function importRuntimeDependencies() {
  const deepmerge = (await import('deepmerge')).default;
  const jsonc = (await import('jsonc-parser')).default;

  return { deepmerge, jsonc };
}

async function setupVSCodeConfiguration(projectRoot = process.cwd()) {
  const { deepmerge, jsonc } = await importRuntimeDependencies();

  const projectSettingsPath = path.join(projectRoot, '.vscode', 'settings.json');
  const packageSettingsPath = path.join(__dirname, '..', '.vscode', 'settings.json');

  fs.ensureDirSync(path.dirname(projectSettingsPath));
  fs.ensureDirSync(path.dirname(packageSettingsPath));

  if (!fs.existsSync(projectSettingsPath)) {
    fs.copyFileSync(packageSettingsPath, projectSettingsPath);

    console.log(`Copied .vscode/settings.json to the ${projectRoot} project.`);

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

  console.log(`Merged .vscode/settings.json with deduped arrays in the ${projectRoot} project.`);
}

module.exports = setupVSCodeConfiguration;
module.exports.default = setupVSCodeConfiguration;
