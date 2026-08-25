import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** Resolve the session secret from env, a secret file, or generate + persist one. */
function resolveSessionSecret(): string {
  const inline = process.env.SESSION_SECRET
  if (inline && inline.length >= 32) return inline

  const file = process.env.SESSION_SECRET_FILE ?? '/data/session-secret'
  try {
    if (existsSync(file)) {
      const value = readFileSync(file, 'utf8').trim()
      if (value.length >= 32) return value
    }
    // Generate a stable secret so sessions survive restarts.
    const generated = randomBytes(32).toString('base64')
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, generated, { mode: 0o600 })
    return generated
  } catch {
    // Filesystem not writable (e.g. local dev without /data): fall back to a
    // process-lifetime secret. Sessions won't survive a restart, which is fine
    // for development.
    return randomBytes(32).toString('base64')
  }
}

export interface Config {
  mqttHost: string
  mqttPort: number
  port: number
  sessionSecret: string
  cookieSecure: boolean
  /** Session lifetime in seconds. */
  sessionTtlSeconds: number
  /** Idle time before a pooled broker connection is closed, in ms. */
  connectionIdleMs: number
  /** Per-command dynsec timeout in ms. */
  commandTimeoutMs: number
  /** Directory of the built web SPA, or null to disable static serving (dev). */
  webDir: string | null
}

export function loadConfig(): Config {
  return {
    mqttHost: process.env.MQTT_HOST ?? 'localhost',
    mqttPort: Number(process.env.MQTT_PORT ?? '1883'),
    port: Number(process.env.PORT ?? '80'),
    sessionSecret: resolveSessionSecret(),
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? String(60 * 60 * 8)),
    connectionIdleMs: Number(process.env.CONNECTION_IDLE_MS ?? String(5 * 60 * 1000)),
    commandTimeoutMs: Number(process.env.COMMAND_TIMEOUT_MS ?? '5000'),
    webDir: process.env.WEB_DIR ?? null,
  }
}
