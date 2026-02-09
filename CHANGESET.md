# Changesets workflow (versioning + publishing)

This repo uses **Changesets** to version and publish packages in `libs/*` (and optionally apps) as a pnpm workspace.

> Quick context:
> - Changesets config lives in `.changeset/config.json`
> - Each release note lives in `.changeset/*.md`
> - Packages publish settings live in each package's `package.json` (`name`, `version`, `publishConfig.access`, etc.)

---

## 1) One-time setup

### Install dependencies

With pnpm (recommended):

```powershell
pnpm install
```

### Initialize Changesets

Already initialized in this repo (the `.changeset/` folder exists). If you ever need to re-init:

```powershell
pnpm changeset init
```

---

## 2) Day-to-day workflow

### A) Create a changeset (patch/minor/major)

After making code changes, create a changeset:

```powershell
pnpm changeset
```

You’ll be prompted to:
- select which packages changed
- choose the bump type:
  - **patch**: bugfix / small change
  - **minor**: new backwards-compatible feature
  - **major**: breaking change
- write a summary that becomes the changelog entry

This generates a file in `.changeset/` like:

```md
---
"@ayu-sh-kr/dota-core": patch
---

Fix: something...
```

### B) Apply changesets to bump versions + update changelogs

When you’re ready to cut a release (usually as part of a PR or right before publish):

```powershell
pnpm changeset version
```

This will:
- bump versions in package `package.json` files
- update package `CHANGELOG.md` files
- remove/consume the changeset markdown files

Commit the result:
- updated package versions
- updated changelogs
- updated lockfile (if changed)

### C) Publish to npm

Publish all packages that have unpublished version bumps:

```powershell
pnpm changeset publish
```

Notes:
- You need to be logged in (`npm login`) or set `NPM_TOKEN` in CI.
- Packages with `"private": true` are not published.

---

## 3) Build + publish (how this repo is wired)

Several packages already have a `release` script similar to:

- `pnpm run build && changeset publish`

At the workspace root you also have:

```powershell
pnpm -r run release
```

That runs `release` in each workspace package.

If you use this approach, keep in mind:
- you should run `pnpm changeset version` **before** calling `changeset publish`
- each package should build its `dist/` output before publishing

---

## 4) Configure publishing access (public vs restricted)

### A) Recommended: per-package `publishConfig.access`

Your packages already use:

```json
"publishConfig": { "access": "public" }
```

That’s the safest way for scoped packages.

### B) `.changeset/config.json` access

Your repo currently has:

- `"access": "restricted"`

That can conflict with packages meant to be public. Recommendation:
- set Changesets `access` to `public`
- keep per-package `publishConfig.access` too

If you want, I can update `.changeset/config.json` accordingly.

---

## 5) Base branch configuration

Your repo currently has:

- `"baseBranch": "master"`

If your default branch is `main`, update it:

```json
"baseBranch": "main"
```

This matters mostly for automation (like the Changesets GitHub Action).

---

## 6) Patch releases (how to ensure patch bumps)

### A) The normal way: pick `patch` when running `pnpm changeset`

That’s the standard Changesets flow.

### B) Internal dependency bumps

`.changeset/config.json` contains:

- `"updateInternalDependencies": "patch"`

Meaning: if package A depends on package B in the workspace, and B changes, then A will get at least a **patch** bump to keep versions consistent.

### C) “Force all changes in a PR to be patch” (team convention)

There’s no built-in “force patch always” switch for the interactive CLI.
If you want to enforce policy, use:
- PR review convention, or
- a CI check that validates changeset bump types

(If you want this, I can add a small script to fail CI when a changeset declares `minor`/`major`.)

---

## 7) Publish only selected modules

Changesets publishes only packages that:
- have version changes applied, and
- are not yet published at that version

If you want to publish *only one package* from the workspace, you have a couple options:

### Option A (recommended): version only that package, then publish
- Create changeset selecting just that package
- Run:

```powershell
pnpm changeset version
pnpm changeset publish
```

Only packages with bumped versions will publish.

### Option B: filter builds/tests, but keep publish via changesets

For example, run build/test for a single package:

```powershell
pnpm --filter @ayu-sh-kr/dota-router run build
pnpm --filter @ayu-sh-kr/dota-router run test
```

Then run `pnpm changeset publish` (publishes only bumped packages).

---

## 8) Prereleases (alpha/beta/rc)

Changesets supports prerelease mode.

### Enter prerelease mode

```powershell
pnpm changeset pre enter beta
```

### Version in prerelease mode

```powershell
pnpm changeset version
```

You’ll get versions like `0.0.16-beta.0`.

### Publish prerelease

```powershell
pnpm changeset publish --tag beta
```

### Exit prerelease mode

```powershell
pnpm changeset pre exit
```

---

## 9) CI-friendly notes

- CI commonly runs installs with `--frozen-lockfile`.
- Always commit `pnpm-lock.yaml` when package manifests change.

---

## Useful commands (cheat sheet)

```powershell
# Create a changeset
pnpm changeset

# Apply version bumps + update changelogs
pnpm changeset version

# Publish bumped packages
pnpm changeset publish

# Prerelease flow
pnpm changeset pre enter alpha
pnpm changeset version
pnpm changeset publish --tag alpha
pnpm changeset pre exit
```

