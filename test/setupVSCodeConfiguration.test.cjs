const fs = require('fs-extra');
const os = require('os');
const path = require('upath');

const setupVSCodeConfiguration = require('../src/setupVSCodeConfiguration.cjs');

describe('setupVSCodeConfiguration', () => {
  let tempRoot;
  let vscodeDir;
  let settingsPath;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'jest-vscode-'));

    vscodeDir = path.join(tempRoot, '.vscode');
    settingsPath = path.join(vscodeDir, 'settings.json');

    await fs.ensureDir(vscodeDir);
  });

  afterEach(async () => {
    await fs.remove(tempRoot);
  });

  test('should create settings.json when missing', async () => {
    await fs.remove(settingsPath);

    await setupVSCodeConfiguration(tempRoot);

    expect(await fs.pathExists(settingsPath)).toBe(true);

    const settings = await fs.readJson(settingsPath);

    expect(settings['terminal.integrated.env.windows']).toBeDefined();

    expect(settings['terminal.integrated.env.linux']).toBeDefined();

    expect(settings['eslint.validate']).toBeDefined();

    expect(settings['editor.codeActionsOnSave']).toBeDefined();

    expect(settings['terminal.integrated.defaultProfile.windows']).toBe('Oh My Posh');
  });

  test('should merge existing settings with package settings', async () => {
    const initialSettings = {
      'editor.tabSize': 2,
      'eslint.validate': ['javascript'],
      'editor.codeActionsOnSave': {
        'source.fixAll.stylelint': 'always'
      }
    };

    await fs.writeJson(settingsPath, initialSettings, {
      spaces: 2
    });

    await setupVSCodeConfiguration(tempRoot);

    const merged = await fs.readJson(settingsPath);

    // preserve existing values
    expect(merged['editor.tabSize']).toBe(2);

    // preserve nested custom values
    expect(merged['editor.codeActionsOnSave']['source.fixAll.stylelint']).toBe('always');

    // inject package settings
    expect(merged['terminal.integrated.env.windows']).toBeDefined();

    expect(merged['eslint.useFlatConfig']).toBe(true);

    // merged arrays
    expect(merged['eslint.validate']).toContain('javascript');

    expect(merged['eslint.validate']).toContain('typescript');
  });

  test('should deduplicate eslint.validate entries', async () => {
    const initialSettings = {
      'eslint.validate': ['javascript', 'typescript', 'javascript']
    };

    await fs.writeJson(settingsPath, initialSettings, {
      spaces: 2
    });

    await setupVSCodeConfiguration(tempRoot);

    const merged = await fs.readJson(settingsPath);

    const validateList = merged['eslint.validate'];

    const uniqueValues = [...new Set(validateList)];

    expect(validateList).toEqual(uniqueValues);
  });

  test('should deduplicate eslint.probe entries', async () => {
    const initialSettings = {
      'eslint.probe': ['javascript', 'typescript', 'javascript']
    };

    await fs.writeJson(settingsPath, initialSettings, {
      spaces: 2
    });

    await setupVSCodeConfiguration(tempRoot);

    const merged = await fs.readJson(settingsPath);

    const probeList = merged['eslint.probe'];

    const uniqueValues = [...new Set(probeList)];

    expect(probeList).toEqual(uniqueValues);
  });

  test('should preserve existing terminal environment variables', async () => {
    const initialSettings = {
      'terminal.integrated.env.windows': {
        CUSTOM_ENV: 'hello'
      }
    };

    await fs.writeJson(settingsPath, initialSettings, {
      spaces: 2
    });

    await setupVSCodeConfiguration(tempRoot);

    const merged = await fs.readJson(settingsPath);

    expect(merged['terminal.integrated.env.windows'].CUSTOM_ENV).toBe('hello');

    expect(merged['terminal.integrated.env.windows'].PUPPETEER_SKIP_DOWNLOAD).toBe('true');
  });

  test('should preserve existing vscode profiles', async () => {
    const initialSettings = {
      'terminal.integrated.profiles.windows': {
        MyCustomProfile: {
          path: 'custom.exe'
        }
      }
    };

    await fs.writeJson(settingsPath, initialSettings, {
      spaces: 2
    });

    await setupVSCodeConfiguration(tempRoot);

    const merged = await fs.readJson(settingsPath);

    expect(merged['terminal.integrated.profiles.windows'].MyCustomProfile).toEqual({
      path: 'custom.exe'
    });

    expect(merged['terminal.integrated.profiles.windows'].PowerShell).toBeDefined();

    expect(merged['terminal.integrated.profiles.windows']['Git Bash']).toBeDefined();
  });

  test('should replace package terminal profile args instead of merging them', async () => {
    const initialSettings = {
      'terminal.integrated.profiles.windows': {
        'Short PowerShell': {
          source: 'PowerShell',
          args: ['-NoExit', '-Command', 'Write-Host custom']
        },
        MyCustomProfile: {
          path: 'custom.exe'
        }
      }
    };

    await fs.writeJson(settingsPath, initialSettings, {
      spaces: 2
    });

    await setupVSCodeConfiguration(tempRoot);

    const merged = await fs.readJson(settingsPath);

    expect(merged['terminal.integrated.profiles.windows']['Short PowerShell'].args).toEqual([
      '-NoExit',
      '-Command',
      'function prompt { "[$((Get-Item .).Name)]> " }'
    ]);

    expect(merged['terminal.integrated.profiles.windows'].MyCustomProfile).toEqual({
      path: 'custom.exe'
    });
  });

  test('should merge editor.codeActionsOnSave with custom entries preserved', async () => {
    const initialSettings = {
      'editor.codeActionsOnSave': {
        'source.fixAll.stylelint': 'always'
      }
    };

    await fs.writeJson(settingsPath, initialSettings, {
      spaces: 2
    });

    await setupVSCodeConfiguration(tempRoot);

    const merged = await fs.readJson(settingsPath);

    expect(merged['editor.codeActionsOnSave']['source.fixAll.stylelint']).toBe('always');

    expect(merged['editor.codeActionsOnSave']['source.fixAll.eslint']).toBe('explicit');

    expect(merged['editor.codeActionsOnSave']['source.organizeImports']).toBe('never');
  });
});
