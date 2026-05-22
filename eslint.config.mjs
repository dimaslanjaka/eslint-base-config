import babelParser from '@babel/eslint-parser';
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { parse as parseJSONC } from 'jsonc-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prettierrc = parseJSONC(
  fs.readFileSync(path.resolve(__dirname, '.prettierrc.json'), 'utf8')
);

export default tseslint.config(

  // 🌍 GLOBAL CONFIG

  js.configs.recommended,
  tseslint.configs.recommended,

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
        ...globals.browser,
        ...globals.node,
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

    rules: {
      'prettier/prettier': ['error', prettierrc],

      'arrow-body-style': 'off',
      'prefer-arrow-callback': 'off',

      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },


  // 📜 JS / JSX (Babel)

  {
    files: ['**/*.{js,mjs,jsx}'],

    languageOptions: {
      parser: babelParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-react'],
          plugins: ['@babel/plugin-syntax-import-assertions']
        },
        ecmaFeatures: {
          jsx: true
        }
      }
    },

    rules: {
      '@typescript-eslint/no-unused-vars': 'off',

      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },


  // 📦 CJS
  {
    files: ['**/*.cjs'],

    languageOptions: {
      sourceType: 'commonjs',
      parser: babelParser,
      globals: {
        ...globals.node
      },
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-env']
        }
      }
    },

    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-var-requires': 'off',

      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },


  // 🟦 TypeScript

  {
    files: ['**/*.{ts,tsx,mts,cts}'],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json'
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },

    rules: {
      'no-unused-vars': 'off',

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',

      '@typescript-eslint/no-this-alias': [
        'error',
        {
          allowDestructuring: false,
          allowedNames: ['self', 'hexo']
        }
      ],

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },


  // ⚛️ React

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

      'prettier/prettier': ['error', prettierrc],

      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off'
    },

    settings: {
      react: {
        version: 'detect'
      }
    }
  }
);
