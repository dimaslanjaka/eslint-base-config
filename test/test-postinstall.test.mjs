import { beforeAll, describe, expect, jest, test } from '@jest/globals';
import fs from 'fs-extra';
import { parse } from 'jsonc-parser';
import https from 'node:https';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import path from 'upath';
import setupModule, { buildPackage, run } from './setup.cjs';

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

function findDuplicatesDeep(value, path = 'root', seen = new Map(), duplicates = []) {
  if (Array.isArray(value)) {
    const local = new Set();

    for (let i = 0; i < value.length; i++) {
      const item = value[i];

      if (item && typeof item === 'object') {
        findDuplicatesDeep(item, `${path}[${i}]`, seen, duplicates);
      } else {
        if (local.has(item)) {
          duplicates.push({ path: `${path}[${i}]`, value: item });
        }
        local.add(item);
      }
    }

    return duplicates;
  }

  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      findDuplicatesDeep(v, `${path}.${k}`, seen, duplicates);
    }
  }

  return duplicates;
}

expect.extend({
  toHaveNoDeepArrayDuplicates(received) {
    const duplicates = findDuplicatesDeep(received);

    if (duplicates.length > 0) {
      return {
        pass: false,
        message: () =>
          `Found duplicate values in nested arrays:\n` + duplicates.map((d) => `- at ${d.path}: ${d.value}`).join('\n')
      };
    }

    return {
      pass: true,
      message: () => 'No duplicates found in nested arrays'
    };
  }
});

describe('eslint base config integration', () => {
  jest.setTimeout(120000);

  beforeAll(async () => {
    buildPackage();

    // Download the .vscode/settings.json to test project
    const url =
      'https://raw.githubusercontent.com/dimaslanjaka/php-proxy-hunter/refs/heads/master/.vscode/settings.json';
    const localPath = path.join(__dirname, '.vscode', 'settings.json');
    await downloadFile(url, localPath);

    // Run the setup to generate the project structure and files
    await setupModule.setup(false);
  });

  test('test project vscode settings should be merged with module settings', async () => {
    const postInstallIndicator = path.join(
      __dirname,
      'node_modules',
      '@dimaslanjaka',
      'eslint-base-config',
      '.postinstall-run'
    );
    if (fs.existsSync(postInstallIndicator)) {
      fs.rmSync(postInstallIndicator, { recursive: true, force: true });
    }
    expect(fs.existsSync(postInstallIndicator)).toBe(false);

    const postinstallPath = path.join(
      __dirname,
      'node_modules',
      '@dimaslanjaka',
      'eslint-base-config',
      'postinstall.cjs'
    );
    run('node', [postinstallPath], { stdio: 'inherit' });

    const projectSettingsPath = path.join(__dirname, '..', '.vscode', 'settings.json');
    const projectSettings = await fs.readFile(projectSettingsPath, 'utf8');
    const parsedProjectSettings = parse(projectSettings);

    const testProjectSettingsPath = path.join(__dirname, '.vscode', 'settings.json');
    const testProjectSettings = await fs.readFile(testProjectSettingsPath, 'utf8');
    const parsedTestSettings = parse(testProjectSettings);

    expect(parsedTestSettings).toHaveNoDeepArrayDuplicates();
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
  });
});
