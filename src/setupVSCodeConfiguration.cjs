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
  const packageSettingsPath = [
    path.join(__dirname, '.vscode', 'settings.json'),
    path.join(__dirname, '..', '.vscode', 'settings.json')
  ].filter(fs.existsSync)[0];

  if (!packageSettingsPath) {
    console.warn('No .vscode/settings.json found in the package. Skipping VSCode configuration setup.');
    return;
  }

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

  const keysToMerge = [
    'terminal.integrated.env.linux',
    'terminal.integrated.env.windows',
    'terminal.integrated.profiles.windows',
    'eslint.probe',
    'eslint.validate',
    'eslint.useFlatConfig'
  ];

  const mergedSettings = { ...projectSettings };

  for (const key of keysToMerge) {
    if (key in packageSettings) {
      const existing = projectSettings[key];
      const incoming = packageSettings[key];

      if (existing == null || typeof existing !== 'object' || typeof incoming !== 'object') {
        mergedSettings[key] = incoming;
      } else {
        mergedSettings[key] = deepmerge(existing, incoming, { arrayMerge: createDeduplicatingArrayMerger() });
      }
    }
  }

  fs.writeFileSync(projectSettingsPath, JSON.stringify(mergedSettings, null, 2));

  console.log(`Merged .vscode/settings.json with selective deepmerge in the ${projectRoot} project.`);
}

module.exports = setupVSCodeConfiguration;
module.exports.default = setupVSCodeConfiguration;
