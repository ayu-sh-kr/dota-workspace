# Package manager guide (npm / pnpm)

This repo is a **monorepo** with multiple packages under `libs/*` and an app under `apps/*`.

- Workspace root: `D:\dota\dota-workspace`
- Package manager: **pnpm workspace** (recommended)
- Root scripts (see root `package.json`):
  - `build`: builds all workspace projects
  - `test`: runs unit tests for all workspace projects
  - `test:coverage`: runs tests with coverage for all workspace projects

> Note: The root `npm run build/test/...` scripts **call pnpm internally** (they run `pnpm -r ...`).
> If you want to use npm-only, use the per-project `--prefix` commands shown below.

---

## Prerequisites

- Node.js installed
- pnpm installed (recommended): https://pnpm.io/installation

---

## Install dependencies

### Using pnpm (recommended)

```powershell
pnpm install
```

### Using npm

```powershell
npm install
```

> If you use `workspace:*` dependencies, pnpm is the most reliable choice for local linking across `libs/*`.

---

## Build

### Build everything (whole workspace)

**pnpm**
```powershell
pnpm run build
```

**npm** (runs the root script, which uses pnpm under the hood)
```powershell
npm run build
```

### Build a selected module/package

#### pnpm (best)
Use `--filter` with the package name.

```powershell
pnpm --filter @ayu-sh-kr/dota-core run build
pnpm --filter @ayu-sh-kr/dota-rest run build
pnpm --filter @ayu-sh-kr/dota-router run build
pnpm --filter @ayu-sh-kr/dota-wrap run build
```

Build the web app (note the package name is `doto-web`):

```powershell
pnpm --filter doto-web run build
```

#### npm (per-folder)
Run the script in just one package folder.

```powershell
npm --prefix libs/dota-core run build
npm --prefix libs/dota-rest run build
npm --prefix libs/dota-router run build
npm --prefix libs/dota-wrap run build
npm --prefix apps/dota-web run build
```

---

## Test

### Test everything (whole workspace)

**pnpm**
```powershell
pnpm run test
```

**npm** (runs the root script, which uses pnpm under the hood)
```powershell
npm run test
```

### Test a selected module/package

#### pnpm
```powershell
pnpm --filter @ayu-sh-kr/dota-core run test
pnpm --filter @ayu-sh-kr/dota-rest run test
pnpm --filter @ayu-sh-kr/dota-router run test
pnpm --filter @ayu-sh-kr/dota-wrap run test
```

#### npm
```powershell
npm --prefix libs/dota-core run test
npm --prefix libs/dota-rest run test
npm --prefix libs/dota-router run test
npm --prefix libs/dota-wrap run test
```

### Watch mode (where available)
Some packages expose `test:watch`.

```powershell
pnpm --filter @ayu-sh-kr/dota-router run test:watch
pnpm --filter @ayu-sh-kr/dota-wrap run test:watch
```

---

## Test coverage

### Coverage for everything

**pnpm**
```powershell
pnpm run test:coverage
```

**npm** (runs the root script, which uses pnpm under the hood)
```powershell
npm run test:coverage
```

### Coverage for a selected module/package

```powershell
pnpm --filter @ayu-sh-kr/dota-core run test:coverage
pnpm --filter @ayu-sh-kr/dota-rest run test:coverage
pnpm --filter @ayu-sh-kr/dota-router run test:coverage
pnpm --filter @ayu-sh-kr/dota-wrap run test:coverage
```

---

## Troubleshooting

### `ERR_PNPM_OUTDATED_LOCKFILE` in CI

If CI uses frozen lockfiles, make sure you commit `pnpm-lock.yaml` whenever `package.json` files change.

If you intentionally want to re-generate the lockfile in CI (less strict), install with:

```powershell
pnpm install --no-frozen-lockfile
```

