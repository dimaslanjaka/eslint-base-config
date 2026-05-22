import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import fs from 'fs-extra';
import { fileURLToPath } from 'node:url';
import path from 'upath';
import setupModule from './setup.cjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('eslint base config integration', () => {
  /** @type {string} */
  let eslintConfigPath;
  /** @type {string} */
  let uglySourcePath;

  beforeAll(async () => {
    await setupModule.setup();
    eslintConfigPath = setupModule.generateEsmConfig();
    console.log(`Generated ESLint config at: ${eslintConfigPath}`);
  });

  afterAll(() => {
    // Cleanup generated files
    fs.removeSync(eslintConfigPath);
  });

  test('eslint runs on ugly code without crashing', () => {
    uglySourcePath = setupModule.writeUglyCodes('ugly-ts', 'ts');
    const result = setupModule.runEslint(uglySourcePath, { stdio: 'pipe' });
    expect(result.status).toBe(1); // 1 = linting errors found
  });

  test('eslint --fix fixes ugly code and revalidate', () => {
    uglySourcePath = setupModule.writeUglyCodes('ugly-ts', 'ts');
    const original = fs.readFileSync(uglySourcePath, 'utf8');

    const result = setupModule.runEslint(uglySourcePath, ['--fix'], { stdio: 'pipe' });

    expect(result.status).not.toBe(2); // 2 = fatal error

    const fixed = fs.readFileSync(uglySourcePath, 'utf8');
    expect(fixed).not.toBe(original);

    const recheck = setupModule.runEslint(uglySourcePath, { stdio: 'pipe' });
    expect(recheck.status).not.toBe(2);
  });

  // test('eslint reports errors on ugly code', () => {
  //   uglySourcePath = setupModule.writeUglyCodes('ugly-ts', 'ts');
  //   const result = setupModule.runEslint(uglySourcePath, { stdio: 'pipe' });

  //   expect(result.status).toBe(1); // 1 = linting errors found
  // });
});
