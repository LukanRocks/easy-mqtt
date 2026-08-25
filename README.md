# easy-mqtt

A single Docker container that bundles a **Mosquitto MQTT broker** and a **modern web admin UI** for managing clients,
groups, roles, and ACLs.

- **All persistent data lives in one host folder** (a single bind mount at `/data`).
- **Zero-config first run:** `docker compose up` initializes the broker, creates a dynsec admin account, and prints the generated password to the logs.
- **Modern UI** with a dashboard and automatic dark/light theming.

This is a ground-up TypeScript implementation inspired by ([zivillian/dynamic-security-admin](https://github.com/zivillian/dynamic-security-admin)). Licensed **MIT** (see [LICENSE](LICENSE)).

## Architecture

```
┌──────────────── single container (eclipse-mosquitto:2 + s6-overlay) ─────────────┐
│  s6: init-bootstrap (oneshot) → mosquitto (:1883)   node app (:80)               │
│                                     ▲                     │                       │
│                                     └── mqtt.js (localhost:1883, session creds) ──┘
│  node app = Hono: serves the built SPA + typed RPC API + holds the MQTT link      │
│  /data (single bind mount): dynamic-security.json, mosquitto.db, config/, log/,   │
│                             session-secret                                        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Auth model (important):** the UI has no user database. Logging in _is_
authenticating to Mosquitto — the credentials you enter are those of a dynsec
client holding the `admin` role. The server seals those credentials in an
encrypted cookie (iron-webcrypto) and runs every dynsec call as that user, so
Mosquitto's own permission checks apply. There is no separate "app password."

### Monorepo layout (pnpm workspace)

| Path              | Purpose                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `packages/dynsec` | Framework-agnostic dynsec-over-MQTT protocol client + Zod schemas. Concurrency-safe via the protocol's `correlationData` field. |
| `apps/server`     | Hono API (typed RPC via `hc`) + serves the built SPA. Holds the pooled MQTT connections.                                        |
| `apps/web`        | Vite + React + TanStack (Router/Query/Table/Form) + Tailwind + shadcn/ui.                                                       |
| `docker/`         | Dockerfile, s6 service tree, `bootstrap.sh`, `mosquitto.conf`.                                                                  |

## Quick start (Docker)

```bash
docker compose up -d
docker compose logs -f # read the generated admin password (first run only)
```

Then open the admin UI at **http://localhost:8080** and sign in with the
`admin` user and the password from the logs.

- MQTT for real devices: **`localhost:1883`**
- All data persists under `./data` on the host or the specified path.

**First-run seeding.** On first start the broker is initialized with:

- an **`admin`** client (holds the `admin` role) — this is the account you log into the UI with;
- a **`devices`** role granting publish + subscribe on all application topics to easily get started.

Create a client for each device and assign it the **`devices`** role and it can publish/subscribe immediately. Tighten or replace that role at any time from the Roles screen.

Add TLS or websocket listeners by dropping a `.conf` file into `data/config/`
(see `data/config/tls.conf.example`, created on first run) — no rebuild needed.

## Local development

Requires Node ≥ 22, pnpm, and a Mosquitto broker with the dynsec plugin.

```bash
pnpm install

# Start a local dynsec broker (example, using a Homebrew mosquitto):
#   mosquitto_ctrl dynsec init ./data/dynamic-security.json admin
#   mosquitto -c <conf pointing plugin_opt_config_file at that file>

pnpm dev          # web on :5173 (proxying /api → server on :3001), server on :3001
```

Environment variables (server): `MQTT_HOST` (default `localhost`), `MQTT_PORT`
(1883), `PORT` (80), `SESSION_SECRET` / `SESSION_SECRET_FILE`, `COOKIE_SECURE`,
`WEB_DIR`, `SESSION_TTL_SECONDS`, `CONNECTION_IDLE_MS`, `COMMAND_TIMEOUT_MS`.

## Tests

```bash
pnpm test:run                 # unit tests (protocol correlation, ACL matching)

# Integration tests against a live broker (admin/password by default):
DYNSEC_IT=1 pnpm --filter @easy-mqtt/dynsec test:run
```

## Scripts

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Run web + server in watch mode.      |
| `pnpm build`     | Build the SPA and the server bundle. |
| `pnpm typecheck` | Type-check every package.            |
| `pnpm test:run`  | Run all unit tests.                  |
