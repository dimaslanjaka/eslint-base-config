const fs = require('fs-extra');
const path = require('upath');
const createDeduplicatingArrayMerger = require('./createDeduplicatingArrayMerger.cjs');

async function importRuntimeDependencies() {
  const deepmerge = (await import('deepmerge')).default;
  const jsonc = (await import('jsonc-parser')).default;

  return { deepmerge, jsonc };
}

function mergeTerminalProfilesWindows(existingProfiles, incomingProfiles, deepmerge) {
  if (
    existingProfiles == null ||
    typeof existingProfiles !== 'object' ||
    Array.isArray(existingProfiles) ||
    incomingProfiles == null ||
    typeof incomingProfiles !== 'object' ||
    Array.isArray(incomingProfiles)
  ) {
    return incomingProfiles;
  }

  const mergedProfiles = { ...existingProfiles };

  for (const [profileName, incomingProfile] of Object.entries(incomingProfiles)) {
    const existingProfile = existingProfiles[profileName];

    if (
      existingProfile != null &&
      typeof existingProfile === 'object' &&
      !Array.isArray(existingProfile) &&
      incomingProfile != null &&
      typeof incomingProfile === 'object' &&
      !Array.isArray(incomingProfile)
    ) {
      mergedProfiles[profileName] = deepmerge(existingProfile, incomingProfile, {
        arrayMerge: (_, source) => source
      });
    } else {
      mergedProfiles[profileName] = incomingProfile;
    }
  }

  return mergedProfiles;
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
    'eslint.useFlatConfig',
    'editor.codeActionsOnSave'
  ];

  const mergedSettings = { ...projectSettings };

  for (const key of keysToMerge) {
    if (key in packageSettings) {
      const existing = projectSettings[key];
      const incoming = packageSettings[key];

      if (key === 'terminal.integrated.profiles.windows') {
        mergedSettings[key] = mergeTerminalProfilesWindows(existing, incoming, deepmerge);
      } else if (existing == null || typeof existing !== 'object' || typeof incoming !== 'object') {
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
