---
description: "Use when editing Jest tests, fixtures, or test setup in this repository. Covers fixture-driven patterns, single-file test runs, and the fastest targeted validation commands."
applyTo: "test/**"
---
# Testing Guidelines

- Keep tests in `test/` focused on the smallest behavior slice that can fail independently.
- Use the existing fixture pattern in `test/fixtures/` when validating formatting, parsing, or config output changes.
- Prefer the helper workflow in `test/setup.cjs` for tests that need to build the package, generate temporary configs, or run ESLint against generated files.

## Fixture patterns

- Treat `ugly.txt` files in `test/fixtures/` as source fixtures and generate the matching file extension inside the test.
- Keep paired fixture names aligned when possible, for example `ugly-jsx.jsx` with `ugly-jsx.txt`.
- When a test creates temporary files or configs, write them under `test/` or `test/tmp/` so they stay isolated from the package source.

## Fastest useful commands

- Run one focused Jest file from the repo root with `yarn test -- test-jsx.test.mjs`.
- Use the exact test filename when narrowing scope, because the Jest config already matches files under `test/*.test.{js,ts,cjs,mjs}`.
- Keep targeted runs small first, then widen only if the failure suggests a broader regression.

## What to watch for

- Jest runs with `--runInBand`, `--forceExit`, and `--bail=1`, so the first failure stops the suite.
- The test cache lives under `tmp/jest/`; stale cache issues are usually local and should be considered before changing test logic.
- Direct and compatibility tests cover both ESM and CommonJS entry points, so a test change should not assume only one module system.
