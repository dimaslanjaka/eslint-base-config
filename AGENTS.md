# Agent Instructions

This repository publishes a reusable ESLint base configuration.

Treat the root `eslint.config.js` as the source of truth for lint behavior. Treat `rollup.config.js` as the bundling layer that produces the published `dist/` outputs.

## Repository Scope

Work on source code, configuration, tests, and documentation that affect the ESLint base config package.

The main responsibilities are:

* Maintain the reusable ESLint configuration.
* Preserve ESM and CommonJS compatibility.
* Keep bundled package entry points working.
* Keep runtime behavior consistent with tests and documented usage.

## Files to Edit

Edit these files when changing behavior:

* `src/`
* `eslint.config.js`
* `rollup.config.js`
* `jest.config.js`
* `test/`
* `README.md`

Avoid editing generated or temporary output unless the task explicitly concerns packaging, release assets, or generated files.

Do not edit these directories by default:

* `dist/`
* `coverage/`
* `tmp/`
* other build output directories

If postinstall or bundle behavior changes, update the source first. Regenerate published output only when needed.

## Project Workflow

Package manager:

```bash
yarn
```

Build:

```bash
yarn build
```

Test:

```bash
yarn test
```

Targeted test example:

```bash
yarn test -- test-jsx.test
```

Lint:

```bash
yarn lint
```

## Behavior to Preserve

The main ESLint config is dynamic.

It must detect whether the consumer project uses ESM or CommonJS and adjust parsing and rule behavior accordingly.

The config also reads local `.prettierrc.json` when present. Any formatting-related change must account for this runtime lookup.

Keep these consumption paths working:

* ESM usage
* CommonJS usage
* Rollup-generated package entry points
* Postinstall behavior

## Testing Expectations

Jest tests live in `test/`.

The test suite covers:

* Direct execution
* ESM compatibility
* CommonJS compatibility
* JSX behavior
* TypeScript behavior
* TSX behavior
* Postinstall behavior

Prefer the smallest meaningful Jest target first. Run broader tests only when the focused test indicates a wider risk.

Fixture-driven tests often generate temporary configs or files inside `test/`. Keep new fixtures deterministic. Clean up any temporary artifacts created by new tests.

## Helpful References

Use these files as primary references:

* `README.md` for package usage and supported config shapes
* `eslint.config.js` for runtime lint rules and environment detection
* `rollup.config.js` for bundling and output layout
* `jest.config.js` for Jest configuration
* `test/` for compatibility coverage and fixture patterns

## Practical Notes

When validating a change, run the smallest useful test first.

If `npx` behaves poorly in PowerShell on Windows, use this fallback:

```bash
cmd /c npx ...
```

# File Editing Instructions

You are an expert file editor.

When reading, modifying, or managing files, use safe editing practices. Always provide a non-destructive revert path without relying on Git commands.

## Core Editing Workflow

### 1. Read Before Editing

Always read the target file before changing it.

Understand:

* File structure
* Syntax
* Imports
* Dependencies
* Surrounding context
* Existing conventions
* Related tests or fixtures

For large files, read only the relevant sections first.

### 2. Create a Backup

Before modifying any file, create a timestamped backup.

Example backup format:

```bash
cp AGENTS.md AGENTS.md.bak-YYYYMMDD-HHMMSS
```

Backups are mandatory.

### 3. Apply the Smallest Safe Change

Use the least invasive editing method.

Preferred approaches:

* Use `sed` for small line-specific or string replacements.
* Use heredoc or `printf` for controlled multi-line edits.
* Use a full file rewrite only when explicitly requested or when the file is being fully replaced.

Prefer targeted edits over broad rewrites.

### 4. Verify the Result

After editing, verify the change.

Use one of:

```bash
diff -u original-file backup-or-current-file
```

```bash
cat target-file
```

Check that:

* The file syntax remains valid.
* Only intended content changed.
* No accidental deletion occurred.
* No generated or unrelated files changed.

### 5. Revert Safely When Needed

If the user asks to undo the edit, restore from the backup copy.

Do not use:

```bash
git checkout
git reset
```

Use the backup file instead.

Example:

```bash
cp AGENTS.md.bak-YYYYMMDD-HHMMSS AGENTS.md
```

### 6. Clean Up Backups Only After Confirmation

Keep backups until the user confirms the changes are correct.

Delete backups only when the user asks or clearly approves cleanup.

## Editing Patterns

### Append Content

Append new content to the end of the file.

### Insert Content

Insert new lines at a specific line number only after checking nearby context.

### Delete Content

Remove only the requested line range or clearly identified block.

Ask before deleting large sections.

### Replace Content Between Markers

Use explicit start and end markers when available.

Verify that the markers matched exactly one intended block.

## Multi-File Editing Rules

When editing multiple files:

1. Read every target file first.
2. Create backups for all target files before modifying any of them.
3. Apply changes one file at a time.
4. Verify each file after editing.
5. Report every modified file.
6. Keep backups available for revert.

## Safety Rules

Follow these rules at all times:

1. Always read before writing.
2. Always create a backup before editing.
3. Always verify after editing.
4. Never use Git commands to revert file edits.
5. Prefer targeted edits over full rewrites.
6. Preserve file syntax.
7. Avoid destructive operations unless explicitly requested.
8. Ask before deleting files or large content blocks.
9. Do not edit generated output unless the task requires it.
10. Report what changed and how to revert it.

## Reporting Format

After editing, summarize:

* Files changed
* Backup files created
* Validation performed
* Tests run, if any
* Any files intentionally left unchanged

Include the backup path so the user can restore the file without Git.

## Key Principles

Be non-destructive by default.

Make minimal, correct changes.

Keep the repository behavior stable.

Preserve ESM, CommonJS, bundling, and postinstall compatibility.

Make every edit reversible without Git.
