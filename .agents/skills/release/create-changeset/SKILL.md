---
name: create-changeset
description: Generate and validate Changesets release entries for packages in this pnpm workspace. Use when a user asks to add a changeset, choose a semantic-version bump, prepare package release notes, or document completed package changes under `.changeset/`.
---

# Create Changeset

Create release metadata through the repository CLI, then turn its placeholder summary into a useful consumer-facing changelog.

## Workflow

1. Read `.changeset/config.json`, the workspace package manifest, and the affected package's `package.json` before choosing packages or commands.
2. Inspect the relevant diff and identify observable package changes. Preserve unrelated work and existing changeset files.
3. Choose the release level from compatibility impact:
   - `patch` for compatible fixes, internal restructuring, documentation, or tests.
   - `minor` for backward-compatible public capabilities.
   - `major` for breaking public API or behavior changes.
   Follow an explicit user-selected level even when another level might normally apply.
4. Run `pnpm changeset` interactively. Select only the affected packages and the intended bump; do not manually invent the generated filename or frontmatter.
5. Enter a short temporary summary so the CLI completes, then identify the newly generated Markdown file with `git status --short .changeset`.
6. Edit only the generated file's changelog body. Preserve its YAML frontmatter exactly.
7. Validate with `pnpm changeset status` and `git diff --check`. Report the generated filename, selected packages, and bump levels.

## Changelog standard

- Lead with the outcome package consumers receive.
- Describe public behavior, compatibility, migration implications, and meaningful defaults.
- Use a short paragraph followed by bullets when several related capabilities changed.
- Mention deprecations and their supported replacement.
- Exclude implementation archaeology, raw commit lists, test counts, and internal file movement unless consumers must act on it.
- Keep claims supported by the current diff; do not describe planned work as released behavior.

## Safety

- Do not run `changeset version`, publish packages, or modify package versions unless explicitly requested.
- Do not combine unrelated packages into one entry merely because they are dirty.
- Do not replace or delete an existing changeset unless the user identifies it as the target.
- If the CLI reveals an unexpected package or release level, stop before confirmation and correct the selection.
