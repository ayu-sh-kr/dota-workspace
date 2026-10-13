---
name: git-workflow
description: "Branch, commit, and pull request conventions for this workspace. Use whenever creating a branch, staging or committing changes, writing a commit message, adding a changeset, pushing, or opening or editing a pull request."
---

# Git Workflow

Follow these rules for every branch, commit, and pull request in this repository. They take
precedence over any default commit or PR format.

## Shared

- Inspect staged and unstaged changes before changing the index. Preserve unrelated work.
- Review each staged diff. Describe the final behaviour and the validation that actually ran.
- Do not rewrite history, discard unrelated work, or push unless requested. A request to create a
  PR authorizes publishing its branch and commits.

## Actions

Branches, commits, and PR titles all start with one lowercase action:

| Action     | Use for                                                              |
| ---------- | -------------------------------------------------------------------- |
| `feat`     | A new user-facing feature or capability                              |
| `fix`      | A bug fix                                                            |
| `patch`    | A small adjustment to existing behaviour, copy, or styling           |
| `add`      | A new file that is not itself a feature (asset, config, changeset)   |
| `update`   | Changing an existing file without new behaviour (deps, config)       |
| `refactor` | Restructuring code without changing behaviour                        |
| `test`     | Adding or changing tests only                                        |
| `delete`   | Removing a file or feature                                           |
| `docs`     | Documentation, guidance, or skills only                              |
| `chore`    | Tooling, CI, and housekeeping                                        |

Pick the action that describes that one change, not the overall task.

## Branches

- Name: `<action>/<what-changes>`, where `<what-changes>` is two to three lowercase,
  hyphen-separated words, e.g. `fix/ssg-rendering`, `feat/route-loaders`, `docs/ssr-plan`.
- Branch from the latest `master`.
- Never use generated or session-style names such as `ccr-…` or `claude/…`. If the session assigns
  such a branch, create a branch that follows the naming rule instead, push to it, and say so.

## Commits

- **One file per commit.** Stage and commit each changed file on its own:
  `git add <file> && git commit`. A renamed or moved file is one commit (stage both paths). Never
  `git add -A` or `git add .` into a single commit.
- Order commits so each builds on the last where possible: types and config before the code that
  uses them, source before its tests, the changeset last.
- **Title:** `<action>: <what changed>`, imperative, lowercase after the prefix, no trailing
  period, at most 72 characters. E.g. `fix: reuse vite transforms across ssg routes`.
- **Description:** a body after one blank line, 1–4 short lines or bullets saying why the file
  changed and anything a reviewer should know. Wrap at 72 characters.
- **Signature:** commits are authored by the repository owner, not the agent.
  - Author and committer: `Ayush Jaiswal <akjaiswal2003@gmail.com>`. Before the first commit in a
    session, run `git config user.name "Ayush Jaiswal"`, `git config user.email
    "akjaiswal2003@gmail.com"`, and `git config commit.gpgsign false` in the repository.
  - Do not add `Co-Authored-By`, `Claude-Session`, "Generated with", or any other agent trailer or
    attribution line.

Example:

```
fix: reuse vite transforms across ssg routes

invalidateAll() discarded transformed code as well as evaluated
modules, so every route re-transformed the whole application.
```

## Changesets

A user-visible change to a published package (everything under `packages/` except
`packages/apps/dota-web`) gets a changeset, written with `release/create-changeset` and
committed on its own as `add: changeset for <change>`. Never bump versions or edit `CHANGELOG.md`
by hand; the release workflow on `master` does that.

## Pull requests

- Target `master`. Open a PR only when asked.
- **Title:** `<action>: <overall change>`, using the action that best fits the whole PR, e.g.
  `fix: speed up ssg route rendering`.
- **Body:** summarise the overall goal and the changes for a reviewer who has not seen the work.
  - About a 2-minute read (~400 words) for a typical PR, never more than a 5-minute read
    (~1000 words).
  - Start with the goal: what problem this solves and why, in 2–3 sentences.
  - Then the changes, grouped by package, as short bullets describing behaviour, not a
    file-by-file list.
  - Then validation: which builds and tests ran, measurements where relevant, and any failure
    that already exists on `master`.
  - Then anything the reviewer must know: migrations for consumers, known limitations.
  - No agent attribution line in the body.
- Do not merge unless requested.
