import { beforeAll, describe, expect, test } from '@jest/globals';
import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import { parse } from 'jsonc-parser';
import https from 'node:https';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import path from 'upath';
import setupModule, { buildPackage } from './setup.cjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function downloadFile(url, destination) {
  await fs.ensureDir(path.dirname(destination));

  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        // Handle redirect
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return downloadFile(response.headers.location, destination).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: ${response.statusCode}`));
          return;
        }

        const fileStream = fs.createWriteStream(destination);

        pipeline(response, fileStream).then(resolve).catch(reject);
      })
      .on('error', reject);
  });
}

describe('eslint base config integration', () => {
  beforeAll(async () => {
    buildPackage();

    // Download the .vscode/settings.json to test project
    const url =
      'https://raw.githubusercontent.com/dimaslanjaka/php-proxy-hunter/refs/heads/master/.vscode/settings.json';
    const localPath = path.join(__dirname, '.vscode', 'settings.json');
    await downloadFile(url, localPath);

    // Run the setup to generate the project structure and files
    await setupModule.setup(false, false);
  }, 30000);

  test('sample test to verify setup', () => {
    expect(true).toBe(true);
  });

  test('postinstall should merge vscode settings', () => {
    const postinstallPath = path.join(
      __dirname,
      'node_modules',
      '@dimaslanjaka',
      'eslint-base-config',
      'postinstall.cjs'
    );
    execSync(`node "${postinstallPath}"`, { cwd: __dirname, stdio: 'inherit' });

    const vscodeSettingsPath = path.join(__dirname, '.vscode', 'settings.json');
    expect(fs.existsSync(vscodeSettingsPath)).toBe(true);

    const settings = parse(fs.readFileSync(vscodeSettingsPath, 'utf8'));
    expect(settings['eslint.debug']).toBe(true);
    expect(settings['eslint.enable']).toBe(true);
    expect(settings['eslint.useFlatConfig']).toBe(true);
  });

  test('test project vscode settings should be merged with module settings', async () => {
    const projectSettingsPath = path.join(__dirname, '..', '.vscode', 'settings.json');
    const projectSettings = await fs.readFile(projectSettingsPath, 'utf8');
    const parsedProjectSettings = parse(projectSettings);

    const testProjectSettingsPath = path.join(__dirname, '.vscode', 'settings.json');
    const testProjectSettings = await fs.readFile(testProjectSettingsPath, 'utf8');
    const parsedTestSettings = parse(testProjectSettings);

    expect(parsedTestSettings['terminal.integrated.env.linux']).toEqual(
      expect.objectContaining(parsedProjectSettings['terminal.integrated.env.linux'] || {})
    );

    expect(parsedTestSettings['terminal.integrated.env.windows']).toEqual(
      expect.objectContaining(parsedProjectSettings['terminal.integrated.env.windows'] || {})
    );

    expect(parsedTestSettings['terminal.integrated.defaultProfile.windows']).toBe(
      parsedProjectSettings['terminal.integrated.defaultProfile.windows']
    );

    expect(parsedTestSettings['eslint.debug']).toBe(true);

    expect(parsedTestSettings['eslint.enable']).toBe(true);

    expect(parsedTestSettings['eslint.useFlatConfig']).toBe(true);

    expect(parsedTestSettings['code-runner.executorMapByGlob']).toEqual(
      expect.objectContaining(parsedProjectSettings['code-runner.executorMapByGlob'] || {})
    );
  }, 10000);
});
