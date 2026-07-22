---
name: feature-documentation
description: Use when creating or updating developer-facing Markdown documentation for a project feature, domain, service, or concern. Covers documentation placement for workspace and standalone projects, coherent feature narratives, behavior and intent, source-backed claims, and links to related documentation.
---

# Feature Documentation

Create Markdown documents that explain a feature as a connected story: its context and intent, observable behavior, constraints, and relationships to the rest of the project. Base every technical claim on the current source, configuration, tests, or existing documentation.

## Choose the documentation root

Determine the project shape before creating files. Treat a repository as a workspace when it has a workspace manifest or contains multiple independently packaged projects. Otherwise, treat it as an individual project.

| Project shape | Documentation location |
| --- | --- |
| Workspace package | `<workspace-root>/documentation/packages/<package-scope>/<package-slug>/<domain>/<feature-or-concern>.md` |
| Workspace-wide standard or convention | `<workspace-root>/documentation/standards/<domain>/<feature-or-concern>.md` |
| Individual project | `<project-root>/documentation/<domain>/<feature-or-concern>.md` |

For a workspace package, mirror its source ownership beneath `documentation/packages`: use the package scope from `packages/` (`apps`, `libs`, `plugins`, `ui`, or `utils`) and a stable lowercase kebab-case package slug. Group related documents by domain first, then feature, service, or concern. Place workspace-wide conventions, such as diagram grammar, under `documentation/standards` rather than under a package. For a feature requiring several documents, use a feature directory with an `overview.md` entry point, for example `documentation/packages/plugins/web-type-json/scanning/component-discovery/overview.md`.

Do not create feature documentation beside source files, inside generated directories, or under a different root merely because a package has its own `src` directory.

## Build the document from small to complete

Inspect the feature implementation, configuration, public API, and relevant tests before writing. Start with the smallest useful explanation and expand only where the reader needs more context to understand behavior or make a change.

Use this progression when it applies:

1. `# <Feature name>` — one short statement of purpose and the problem it solves.
2. `## Context and intent` — why the feature exists, who or what relies on it, and its boundaries.
3. `## Behavior` — the normal flow in execution order, including inputs, outputs, and observable side effects.
4. `## Configuration or usage` — options, integration points, or examples needed to use it correctly.
5. `## Constraints and edge cases` — important limitations, unsupported cases, ordering rules, failures, and recovery behavior.
6. `## Related documentation` — relative links to prerequisites, adjacent features, APIs, or architectural decisions.

Use only headings that add information. Omit sections that do not apply instead of filling them with placeholders. Keep the document focused on its named feature; move unrelated detail to the document that owns that concern and link to it.

## Describe the right things

- Explain intention as well as mechanics: why the behavior, ordering, filtering, caching, or side effect is necessary.
- Describe behavior from the developer's perspective, including what changes when an input, configuration value, or lifecycle event changes.
- Name source locations or public symbols when that helps maintainers verify the documentation, but do not copy implementation line by line.
- Distinguish current behavior from proposals. Label future work explicitly; never document it as implemented.
- Keep examples minimal, valid, and aligned with the codebase's current APIs.
- Update related documents when a change alters their assumptions, and use relative Markdown links with descriptive link text.

## Quality checks

Before finishing, verify that the file is under the correct documentation root; its path reflects package scope, package, domain, and feature ownership; its claims match the source; the narrative progresses from context to behavior to detail; and every link resolves to a relevant document. Remove stale, duplicate, speculative, and implementation-only content.
