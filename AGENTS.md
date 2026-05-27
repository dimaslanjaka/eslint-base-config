# Agent Instructions

This repository publishes a reusable ESLint base config. Treat the root `eslint.config.js` as the source of truth for lint behavior, and treat `rollup.config.js` as the bundling layer that produces the published `dist/` outputs.

## What to edit

- Edit source files under `src/` and the root config files when changing behavior.
- Avoid editing generated artifacts in `dist/`, `coverage/`, `tmp/`, or other build output directories unless the task is explicitly about packaging or release assets.
- If you change postinstall or bundle behavior, update the source under `src/` first and regenerate the published output as needed.

## Project workflow

- Package manager: Yarn Berry.
- Build: `yarn build`.
- Test: `yarn test`.
- Targeted test example: `yarn test -- test-jsx.test`.
- Lint: `yarn lint`.

## Behavior to preserve

- The main config is dynamic: it detects whether the consumer project is ESM or CommonJS and adjusts parsing and rule behavior accordingly.
- The config also reads local `.prettierrc.json` when present, so changes to formatting behavior should be checked against that runtime lookup.
- Keep both ESM and CJS consumption working, including the Rollup-generated package entry points.

## Testing expectations

- Jest tests live in `test/` and cover direct execution, ESM/CJS compatibility, JSX/TS/TSX behavior, and postinstall behavior.
- Prefer focused test runs for the area you changed, then expand only if the first pass indicates a broader regression.
- Fixture-driven tests often generate temporary configs or files inside `test/`; keep those cases deterministic and clean up any new temporary artifacts.

## Helpful references

- [README.md](README.md) for package usage and supported config shapes.
- [eslint.config.js](eslint.config.js) for the runtime lint rules and environment detection.
- [rollup.config.js](rollup.config.js) for bundling and output layout.
- [jest.config.js](jest.config.js) and `test/` for the test matrix and fixture patterns.

## Practical notes

- When validating a change, prefer the smallest meaningful Jest target before running the full suite.
- If `npx` behaves poorly in PowerShell on Windows, use `cmd /c npx ...` as a fallback.
