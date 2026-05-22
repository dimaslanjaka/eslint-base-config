const fs = require('fs-extra');
const path = require('upath');

async function loadModules() {
  const deepmerge = (await import('deepmerge')).default;
  const jsonc = (await import('jsonc-parser')).default;
  return { deepmerge, jsonc };
}

async function main() {
  const { deepmerge, jsonc } = await loadModules();
  const localVSCodeSettingsPath = path.join(process.cwd(), '.vscode', 'settings.json');
  const moduleVSCodeSettingsPath = path.join(__dirname, '.vscode', 'settings.json');
  if (!fs.existsSync(localVSCodeSettingsPath)) {
    fs.copyFileSync(moduleVSCodeSettingsPath, localVSCodeSettingsPath);
    console.log('Copied .vscode/settings.json to the project root.');
  } else {
    const localSettingsContent = fs.readFileSync(localVSCodeSettingsPath, 'utf-8');
    const moduleSettingsContent = fs.readFileSync(moduleVSCodeSettingsPath, 'utf-8');
    const localSettings = jsonc.parse(localSettingsContent);
    const moduleSettings = jsonc.parse(moduleSettingsContent);
    const mergedSettings = deepmerge(localSettings, moduleSettings);
    fs.writeFileSync(localVSCodeSettingsPath, JSON.stringify(mergedSettings, null, 2));
    console.log('Merged .vscode/settings.json with the existing settings in the project root.');
  }
}

main().catch((error) => {
  console.error('Error during post-installation:', error);
  process.exit(1);
});
