# Repo structure

This repo is a pnpm workspace that's already split into `/apps` (deployable units) and `/packages` (shared code):

| Path              | Package              | What it is                                                                                |
| ----------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| `apps/server`     | `@easy-mqtt/server`  | Hono API + serves the built SPA; holds the pooled MQTT connections                        |
| `apps/web`        | `@easy-mqtt/web`     | Vite + React SPA (TanStack, Tailwind, shadcn/ui)                                          |
| `packages/dynsec` | `@easy-mqtt/dynsec`  | Framework-agnostic dynsec-over-MQTT client + Zod schemas, shared by both apps             |
| `docker/`         | —                    | Not a workspace package: Dockerfile, s6 service tree, bootstrap script, `mosquitto.conf`  |

Both apps ship together in a single container image, but they're still separate deployable units, so each keeps its
own `/apps/<name>` folder.

## Where new code goes

- **New deployable unit** (another service, a CLI, a worker) → `/apps/<name>`.
- **Code more than one app needs** → `/packages/<name>`. Don't import across apps to share logic; extract it into a
  package instead. Shared request/response shapes belong in a package as Zod schemas so they can't drift.
- **Code only one app uses** → stays inside that app, even if it feels "library-like". Promote it to a package only
  once a second consumer exists.

## Conventions for workspace packages

- Name every package `@easy-mqtt/<folder-name>`, and depend on siblings with `"workspace:*"`.
- `tsconfig.json` extends `../../tsconfig.base.json`; keep shared compiler strictness there, not per package.
- Internal packages export their TypeScript source directly (`"exports"` → `./src/index.ts`) — no build step. The
  apps' bundlers (Vite, tsup) compile them.
- Dependencies flow one way: apps → packages. A package must never import from an app. (The one exception is
  `apps/web`'s **dev** dependency on `@easy-mqtt/server`, used only for the type of the Hono RPC client.)
- Every package exposes the same script names where they apply — `dev`, `build`, `test`, `typecheck` —
  so the root `pnpm -r …` scripts pick it up automatically.
- **Adding a package or app?** Also add its `package.json` to the dependency-install `COPY` lines in
  `docker/Dockerfile`, or the image build's `pnpm install --frozen-lockfile` will fail.

# Workspace security settings (`pnpm-workspace.yaml`)

This repo pins these supply-chain hardening settings:

- `strictDepBuilds: true` — dependency install scripts only run when explicitly allowed under `allowBuilds`
  (currently just `esbuild`)
- `minimumReleaseAge: 2880` — 48h cooldown before a newly published package version can be installed (Dependabot's
  `cooldown` mirrors this)
- `trustPolicy: no-downgrade`
- `trustPolicyIgnoreAfter: 129600` — 90 days; versions older than this skip trust checks (the 48h cooldown already
  covers the fresh end)

Don't loosen these, or add entries to `allowBuilds`, without discussing why first.

# Commits

Commits follow Conventional Commits (enforced by commitlint in the `commit-msg` hook). The `pre-commit` hook runs
Prettier on staged files only — there's no ESLint in the hook, on purpose. Put `[skip image]` in a commit merged to
`main` to land it without publishing a new Docker image.
