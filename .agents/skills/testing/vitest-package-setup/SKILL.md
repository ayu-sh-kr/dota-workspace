---
name: vitest-package-setup
description: Use when adding, migrating, or repairing Vitest tests in a package in the Dota workspace. Covers the local per-package Vitest configuration, TypeScript aliases, happy-dom environment, coverage, package scripts, and focused pnpm validation for libraries, utilities, and Vite plugins.
---

# Vitest Package Setup

Set up Vitest per package. Follow the existing `dota-router`, `dota-ast-utils`, and `web-type-json` conventions; treat `dota-rest` as a Jest migration case, not a Vitest template.

## Inspect before editing

1. Read the target package's `package.json`, `tsconfig.json`, existing tests, and any `vitest.config.ts`.
2. Match the package's test file naming. Prefer `test/**/*.ts`; use `test/**/*.test.ts` only when the package already uses that convention.
3. Keep explicit imports from `vitest` when a test already has them. `globals: true` permits the existing global-style `describe`, `it`, `expect`, and `vi` usage.

## Add the package configuration

Create `vitest.config.ts` at the package root. This is the workspace baseline:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@dota': path.resolve(__dirname, 'src'),
      '@test': path.resolve(__dirname, 'test')
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['test/**/*.ts'],
    exclude: ['test/setup/**', 'node_modules/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts']
    }
  }
});
```

Adapt only what the package needs:

- Add `test/fixtures/**` to `exclude` when fixtures must not execute.
- Add `**/*.d.ts` to `exclude` when declaration files are under the test glob.
- Use a narrower test glob when that package consistently names test files, as `web-type-json` does with `test/**/*.test.ts`.
- Keep `happy-dom` for the current workspace baseline, including non-DOM packages, unless the package demonstrably needs another environment.
- Mirror `@dota/*` and `@test/*` aliases in `tsconfig.json` when tests or source use them. Do not add unused aliases.

## Add scripts

Use these scripts for packages with the standard test workflow:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

Keep useful, established package-specific scripts such as `test:verbose`. For a Jest migration, replace Jest test scripts only after confirming the tests work with Vitest and deleting or updating Jest-only setup and dependencies as part of the requested migration.

Vitest, `@vitest/coverage-v8`, and `happy-dom` are workspace root dev dependencies. Do not add duplicate package-level dependencies unless the workspace dependency model changes.

## Validate

Run focused checks from the workspace root using the package name:

```bash
pnpm --filter @ayu-sh-kr/<package-name> test
pnpm --filter @ayu-sh-kr/<package-name> test:coverage
```

Run the coverage command only when the package defines it or when coverage was added. Investigate alias resolution, environment APIs, fixture discovery, and test glob mismatches before changing the shared baseline.
