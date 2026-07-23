---
name: documents-placement
description: Use when deciding where a repository document, diagram, plan, guide, or package note belongs. Routes content to the correct workspace documentation root, package scope, package slug, and logical domain while preserving the repository's documentation grouping conventions.
---

# Documents Placement

Choose a document's location from ownership first, then content, then the smallest useful grouping. Inspect the repository before creating a directory; existing paths and package metadata are the source of truth.

## Placement workflow

### 1. Identify the documentation root

Use this precedence order:

1. A document about a workspace-wide rule, standard, or convention goes under `documentation/standards/<domain>/`.
2. A document owned by one workspace package goes under `documentation/packages/<scope>/<package-slug>/<domain>/`.
3. A standalone project with no workspace package ownership goes under `<project-root>/documentation/<domain>/`.

Do not use `docs/`, a package's `src/`, generated output, or a package-local documentation directory for workspace documentation unless the repository explicitly establishes that convention.

### 2. Resolve package ownership

For package-owned documents, find the nearest owning package in `packages/` and read its `package.json`. Use the directory scope, not the npm organization, as the first path segment:

| Source package path | Documentation path segment |
| --- | --- |
| `packages/apps/dota-web` | `documentation/packages/apps/dota-web/` |
| `packages/libs/dota-router` | `documentation/packages/libs/dota-router/` |
| `packages/plugins/web-type-json` | `documentation/packages/plugins/web-type-json/` |
| `packages/ui/dota-ui` | `documentation/packages/ui/dota-ui/` |
| `packages/utils/dota-ast-utils` | `documentation/packages/utils/dota-ast-utils/` |

Use a stable lowercase kebab-case directory name matching the package directory. Do not derive it from the scoped npm name or a display name. If several packages jointly own the behavior, place it under the workspace standard root when it describes a shared contract; otherwise choose the package that owns the public entry point and link to the other packages.

### 3. Classify the content

Choose one primary domain. Prefer an existing domain directory when its meaning fits:

| Content purpose | Domain |
| --- | --- |
| High-level structure, responsibilities, component relationships, or system design | `architecture` |
| How values or behavior are configured | `configuration` |
| Runtime or build-time matching, lookup, or resolution behavior | `matching` |
| Upgrade steps, compatibility work, or adoption sequence | `migration` |
| Proposed work, investigation, roadmap, or implementation plan | `planning` |
| Tooling workflow or author/developer usability | `developer-experience` |
| Failure modes, debugging, or generated diagnostic behavior | `diagnostics` |
| Custom Elements Manifest or custom-element metadata integration | `custom-elements` |
| An API or event flow represented as SVG | the domain owning that flow, usually `architecture`, `configuration`, or `matching` |

If no existing domain fits, create a short singular noun or noun phrase that names the concern. Do not create a new domain for every file. Group documents by the concern a reader would search for, not by the source file or class that happened to be inspected.

### 4. Choose the final grouping

Use a direct file when the document stands alone:

```text
documentation/packages/<scope>/<package>/<domain>/<topic>.md
```

Use a feature directory only when multiple related documents need a shared entry point:

```text
documentation/packages/<scope>/<package>/<domain>/<feature>/overview.md
documentation/packages/<scope>/<package>/<domain>/<feature>/<detail>.md
```

Keep filenames lowercase kebab-case and descriptive. Use `overview.md` only for a real multi-document topic, not as a generic replacement for a topic name. Place SVGs beside the Markdown that explains the same concern when that keeps links and discovery local.

## Important boundaries

- Package `README.md` is for the package's public introduction, installation, and quick-start usage; detailed internal architecture or plans belong in `documentation/`.
- `CHANGELOG.md` records released changes and follows the package's existing release convention; it is not a substitute for design or migration documentation.
- `documentation/standards` is for rules adopted across packages, such as diagram grammar. A package-specific implementation of that rule belongs under the package.
- Public website content such as `packages/apps/dota-web/public/documents/`, `public/materials/`, and `public/blogs/` is product content, not maintainer documentation. Use it only when the requested document is intended to be rendered as website content.
- Never duplicate one document in multiple domains. Put it at the narrowest owner and add relative links from related documents.

## Examples from this workspace

- Router high-level designs are grouped under `documentation/packages/libs/dota-router/architecture/`.
- Router route matching and resolution flows are grouped under `.../matching/`.
- Router compatibility and upgrade work is grouped under `.../migration/`.
- Web Type JSON troubleshooting is grouped under `documentation/packages/plugins/web-type-json/diagnostics/`.
- The SVG flow grammar is workspace-wide and belongs under `documentation/standards/svg-flow-diagram-grammar.md`.

## Verification checklist

Before creating or moving a document, verify:

- the owning package or workspace-wide concern is identified from source, configuration, and package metadata;
- the path uses the correct scope and package directory name;
- the domain describes the document's primary purpose, not its file format;
- an existing related directory was reused when appropriate;
- the filename is stable, lowercase kebab-case, and specific;
- related links use correct relative paths and no duplicate document was introduced;
- the document is not accidentally being placed in source, generated output, website content, or a package README/CHANGELOG slot.
