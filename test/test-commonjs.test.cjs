const fs = require('fs-extra');
const path = require('upath');
const setupModule = require('./setup.cjs');

describe('eslint base config integration', () => {
  jest.setTimeout(120000);

  /** @type {string} */
  let eslintConfigPath;
  /** @type {string} */
  let uglyJsPath;

  beforeAll(async () => {
    await setupModule.setup();
    eslintConfigPath = setupModule.generateCjsConfig();
  });

  afterAll(() => {
    // Cleanup generated files
    fs.removeSync(eslintConfigPath);
  });

  beforeEach(() => {
    // Ensure the ugly.js file is reset before each test
    uglyJsPath = setupModule.writeUglyCodes();
  });

  test('eslint runs on ugly code without crashing', () => {
    const result = setupModule.runEslint(uglyJsPath, { stdio: 'pipe' });

    expect(result.status).not.toBe(2); // 2 = fatal error
  });

  test('eslint --fix fixes ugly code and revalidate', () => {
    const original = fs.readFileSync(uglyJsPath, 'utf8');

    const result = setupModule.runEslint(uglyJsPath, ['--fix'], { stdio: 'pipe' });

    expect(result.status).not.toBe(2); // 2 = fatal error

    const fixed = fs.readFileSync(uglyJsPath, 'utf8');
    expect(fixed).not.toBe(original);

    const recheck = setupModule.runEslint(uglyJsPath, { stdio: 'pipe' });
    expect(recheck.status).not.toBe(2);
  });

  test('eslint reports errors on ugly code', () => {
    const result = setupModule.runEslint(uglyJsPath, { stdio: 'pipe' });

    expect(result.status).toBe(1); // 1 = linting errors found
  });

  test('eslint does not report errors on clean code', () => {
    // Create a clean JavaScript file
    const cleanJsPath = path.join(path.dirname(uglyJsPath), 'clean.js');
    fs.writeFileSync(cleanJsPath, 'const x = 1;\nconsole.log(x);\n');

    const result = setupModule.runEslint(cleanJsPath, { stdio: 'pipe' });

    expect(result.status).toBe(0); // 0 = no errors

    // Cleanup the clean.js file
    fs.removeSync(cleanJsPath);
  });
});
