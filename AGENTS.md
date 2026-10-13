# Dota workspace

pnpm monorepo for the Dota web-component framework, its Vite plugins, UI libraries, and the Dota Web
documentation site. Read the relevant skill before changing its domain, work from the current
repository state, and preserve unrelated changes.

## Scope

| Path | Contents |
| --- | --- |
| `packages/libs/*` | Published framework libraries: `dota-core`, `dota-rendering`, `dota-router`, `dota-runtime`, `dota-ssr`, `dota-event`, `dota-rest`, and the consumer-facing `dota-wrap` |
| `packages/plugins/*` | Published Vite plugins: component/route preloader, event-map generator, Web Types JSON |
| `packages/ui/*` | Published component libraries: `dota-ui`, `dota-md` |
| `packages/utils/*` | Published helpers: `dota-ast-utils`, `dota-common-utils` |
| `packages/apps/dota-web` | Private documentation and blog site; the main consumer and SSG pilot |
| `documentation/` | Workspace documentation root: plans, audits, standards, and package docs |

Skills live at `.agents/skills/<domain>/<skill>/SKILL.md`, with UI metadata beside each skill in
`agents/openai.yaml`. Read every skill whose scope matches the task; these project rules take
precedence over default habits.

## Skill routing

| Task | Skill paths under `.agents/skills/` |
| --- | --- |
| Branches, staging, commits, pushes, or PRs | `git/git-workflow` |
| Added or changed TypeScript | `code/clean-code`, `code/code-quality` |
| TSDoc for methods, types, or components | `code/code-documentation`, `code/type-documentation`, `code/web-component-documentation` |
| `dota-wrap` exports, dependencies, or packaging | `code/packaging/dota-wrap` |
| Release notes for a published package | `release/create-changeset` |
| Placing or designing components | `components/component-design` and the sub-skill it routes to |
| `dota-ui` exports and registration in Dota Web | `components/component-design/library/dota-ui-component-registration` |
| Application events and `@OnEvent` | `application/dota-application-events` |
| Dark mode | `application/dark-mode` |
| Vite plugins in `packages/plugins` | `plugin` and its sub-skills |
| Tests, fixtures, mocks, or per-package Vitest setup | `testing/test-quality`, `testing/mock-test-verification`, `testing/vitest-package-setup` |
| Where a document belongs; feature docs | `documentation/documents-placement`, `documentation/feature-documentation` |
| SVG flow diagrams | `documentation/svg-api-flow-diagrams` |
| Blog posts in Dota Web | `blog/blog-formating`, `blog/blog-wiring` |
| Repository utility scripts | `scripting-tooling` |

## Commands

Packages consume built workspace dependencies, so build before testing a package that depends on
a changed one. CI (`.github/workflows/test.yaml`) runs on Node 24:

```sh
pnpm install
pnpm -r run build
pnpm -r run test
```

For one package, run `pnpm --filter <package-name> run test`; package `test` scripts run
`tsc --noEmit` before Vitest. To exercise static generation end to end, build the libraries, then
run `pnpm run build:ssg` from `packages/apps/dota-web`.

Before every push, run the build and tests of each changed package, plus each package that
depends on it. Report exactly which checks ran and any failure that already exists on `master`.

## Releases

Every user-visible change to a published package needs a changeset in `.changeset/`; follow
`release/create-changeset`. `dota-web` is private and needs none. The Changesets base branch is
`master`; the release workflow versions and publishes, so never edit package versions or
`CHANGELOG.md` files by hand.
