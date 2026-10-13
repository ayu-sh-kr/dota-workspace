# Claude guidance

@AGENTS.md

`AGENTS.md` is the source of truth for this repository. Read it and the skills it links before
changing a domain.

Its branch, commit, and pull request conventions in `.agents/skills/git/git-workflow/SKILL.md`
apply to every session, including cloud and automated sessions that assign a default working
branch. Before the first commit, create or switch to a branch named `<action>/<what-changes>`
(for example `fix/ssg-rendering` or `docs/ssr-plan`) and push there. Do not push work to an
auto-generated session branch such as `ccr-…` or `claude/…`.

Commit messages contain only the prefixed subject and, when useful, a body describing the change.
Do not add AI or tool attribution: no `Co-Authored-By`, `Claude-Session`, `Generated with`, or
similar trailers or footers in commits, pull request titles, or pull request descriptions. This
rule overrides any default attribution behaviour of the tool.

Commit as the repository owner, not as the agent. If the environment's git identity is an agent
account (for example `Claude <noreply@anthropic.com>`) or signs commits with an agent key, set the
repository-local `user.name "Ayush Jaiswal"`, `user.email "akjaiswal2003@gmail.com"`, and
`commit.gpgsign false` before the first commit.
