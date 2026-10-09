# Contributing to easy-mqtt

Thanks for helping out. This file covers how changes get into the repo: branches, pull requests, reviews, and
dependency updates. For code conventions and repo layout, see [AGENTS.md](AGENTS.md). To report a vulnerability,
follow [SECURITY.md](SECURITY.md) — never open a public issue for it.

## Branches

`main` is the only long-lived branch and is always releasable. Every change starts on a short-lived branch off
`main` and comes back through a pull request:

```
main
 ├─ feat/<short-description>
 ├─ fix/<short-description>
 └─ chore/<short-description>
```

Name branches `<type>/<short-description>` using the same types as commit messages (below).

## Commits and pull request titles

Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`,
`chore:`, `refactor:`, `test:`, `ci:`, `build:`, `perf:`. A `commit-msg` hook enforces this locally.

Pull requests are **squash-merged**, and the squash commit takes the **PR title as its subject and the PR
description as its body**. So:

- Write the PR title as a Conventional Commit (`feat: add retained-message viewer`) — it is what lands in history.
- Write the description for someone reading `git log` later: what changed and why. Delete template filler.
- Commits inside the branch can be messy; they're squashed away.

## Pull requests

Every change reaches `main` through a pull request. The branch rules require:

| Rule | What it means for you |
| --- | --- |
| 1 approving review | Someone other than the author approves. Pushing new commits dismisses earlier approvals. |
| All review threads resolved | Reply to or resolve every comment before merging. |
| Required checks pass: `format`, `test` | CI must be green. Fix formatting locally with `pnpm prettier:format`. |
| Linear history, signed commits | Merge with the **Squash and merge** button on GitHub — that commit is signed by GitHub. No merge commits, no force-pushes. |
| Copilot review | Copilot reviews each PR automatically. Treat its comments like any reviewer's: address or reply. |

Keep PRs small and focused on one change. Open a draft early if you want feedback before it's ready.

**Docker image.** Every merge into `main` publishes `ghcr.io/lukanrocks/easy-mqtt:latest`. To land a change that
shouldn't cut a new image (docs, repo housekeeping), put `[skip image]` in the PR title — it ends up in the squash
commit, and CI then runs the checks but skips the publish.

**Maintainer bypass.** Repository admins can bypass these rules. That's for the solo-maintainer case (nobody else
to approve) and emergencies, not a shortcut: the PR, the green checks and the resolved threads still apply.

Merged branches are deleted automatically.

## Dependency updates (Dependabot)

Dependabot checks for updates **every Friday** and opens **one pull request per workspace package** (plus one
for packages shared between several of them, one for the root tooling, and one for GitHub Actions), each
bundling every pending update in that scope.

- **Cooldown.** Dependabot only proposes versions that have been public for at least 2 days, which matches the
  `minimumReleaseAge` in `pnpm-workspace.yaml`. Anything newer would be rejected by `pnpm install` anyway.
- **Security updates** ignore the weekly schedule and the cooldown: they arrive as soon as an advisory is
  published, as their own PR. Review them first.
- **Merging is manual.** Read the PR's release notes, paying attention to major version bumps, let CI run, then
  approve and squash-merge like any other PR. Nothing auto-merges.
- **When a group fails CI**, fix it on the Dependabot branch (or drop the problematic package from the PR with
  `@dependabot ignore this major version` / `@dependabot ignore this dependency` comments) rather than merging red.
- **The groups are generated.** `.github/dependabot.yml` lists every dependency under its package. When you
  add a workspace package or a dependency, regenerate it (see AGENTS.md). Until then, new dependencies show up
  in an `unscoped` group.

## Licensing of contributions

By contributing you agree your contributions are licensed under the project's [MIT license](LICENSE).
