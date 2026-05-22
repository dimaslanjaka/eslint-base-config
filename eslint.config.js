import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import babelParser from '@babel/eslint-parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseJSONC } from 'jsonc-parser';
import { defineConfig } from 'eslint/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prettierrc = parseJSONC(fs.readFileSync(path.resolve(__dirname, '.prettierrc.json'), 'utf8'));

// =========================
// SHARED
// =========================

const baseGlobals = {
  ...globals.browser,
  ...globals.node
};

const commonRules = {
  'prettier/prettier': ['error', prettierrc],
  'no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }
  ]
};

// =========================
// CONFIG
// =========================

export default defineConfig([
  js.configs.recommended,
  prettierConfig,

  {
    ignores: [
      '**/*.md',
      '**/*.html',
      '**/*.py',
      '**/*.txt',
      '**/tmp/**',
      '**/app/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/logs/**',
      '**/vendor/**',
      '**/min.*',
      '**/*.lock',
      '**/public/**',
      '**/.yarn/**'
    ],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...baseGlobals,
        ...globals.jest,
        grecaptcha: 'readonly',
        $: 'readonly',
        jQuery: 'readonly',
        adsbygoogle: 'writable',
        hexo: 'readonly'
      }
    },

    plugins: {
      prettier: prettierPlugin
    },

    rules: commonRules
  },

  // =========================
  // JS / JSX
  // =========================
  {
    files: ['**/*.{js,mjs,jsx}'],

    languageOptions: {
      parser: babelParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: baseGlobals,
      parserOptions: {
        requireConfigFile: false,
        ecmaFeatures: { jsx: true },
        babelOptions: {
          presets: ['@babel/preset-react'],
          plugins: ['@babel/plugin-syntax-import-assertions']
        }
      }
    },

    rules: {
      ...commonRules,

      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="require"]',
          message: 'require() is not allowed in ESM. Use import instead.'
        }
      ],

      '@typescript-eslint/no-unused-vars': 'off'
    }
  },

  // =========================
  // COMMONJS
  // =========================
  {
    files: ['**/*.cjs'],

    languageOptions: {
      sourceType: 'commonjs',
      parser: babelParser,
      globals: globals.node,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-env']
        }
      }
    },

    rules: {
      'no-var-requires': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration',
          message: 'ESM import is not allowed in .cjs files. Use require() instead.'
        }
      ]
    }
  },

  // =========================
  // TYPESCRIPT RULES EXTENSION
  // =========================
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    // extends: [tseslint.configs.recommended],
    languageOptions: {
      globals: baseGlobals
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin
    },
    rules: {
      'no-unused-vars': 'off',
      ...commonRules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-this-alias': [
        'error',
        {
          allowedNames: ['self', 'hexo']
        }
      ]
    }
  },

  // =========================
  // REACT
  // =========================
  {
    files: ['**/*.{jsx,tsx}'],

    plugins: {
      react,
      'react-hooks': reactHooks,
      prettier: prettierPlugin
    },

    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...commonRules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off'
    },

    settings: {
      react: {
        version: 'detect'
      }
    }
  }
]);
