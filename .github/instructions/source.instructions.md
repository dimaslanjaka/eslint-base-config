---
description: "Use when editing the root ESLint config, Rollup bundling, or source files under src/. Covers source-of-truth boundaries, generated output avoidance, and dual ESM/CJS packaging."
applyTo: "eslint.config.js,rollup.config.js,src/**"
---
# Source Guidelines

- Treat `eslint.config.js` as the runtime source of truth for lint behavior.
- Treat `rollup.config.js` as the source of truth for published bundle layout and generated entry points.
- Make behavioral changes in `src/` first, then regenerate the root published files when needed.

## What not to edit directly

- Do not edit generated files under `dist/` when the real change belongs in `src/` or the root config.
- Do not use published root artifacts as the starting point for source changes unless the task is specifically about release packaging.

## Packaging rules

- Keep the package working for both ESM and CommonJS consumers.
- Preserve the published `eslint.config.*` outputs produced from the root config and the generated `postinstall.cjs` bundle.
- When source changes affect packaging, verify the bundle still reflects the root config and the `src/` inputs.

## Editing priority

- Prefer the smallest source edit that changes behavior at the root config or in `src/`.
- If a change spans lint behavior and bundle output, update the source file first, then adjust the bundler only as needed to keep the output aligned.