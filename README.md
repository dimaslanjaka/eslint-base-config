# `eslint-base-config`

Base ESLint configuration for JavaScript projects.

## Installation

Install the package along with ESLint:

```bash
npm install --save-dev eslint@9 @dimaslanjaka/eslint-base-config
```

or using Yarn:

```bash
yarn add -D eslint@9 @dimaslanjaka/eslint-base-config
```

or using PNPM:

```bash
pnpm add -D eslint @dimaslanjaka/eslint-base-config
```

---

## Usage

### ESM (`eslint.config.js`)

```js
import base from '@dimaslanjaka/eslint-base-config';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,
  {
    ignores: [
      'node_modules/',
      'dist/',
      'public/'
    ]
  },
  {
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    }
  }
];
```

---

### CommonJS (`eslint.config.cjs`)

```js
const base = require('@dimaslanjaka/eslint-base-config');
const globals = require('globals');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  ...base,
  {
    ignores: [
      'node_modules/',
      'dist/',
      'public/'
    ]
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      }
    }
  }
];
```

---

## Notes

* Supports ESLint v9 flat config format.
* Works with ESM and CommonJS projects.
* Includes sensible defaults for Node.js environments.
* Extend or override rules as needed in your local configuration.
