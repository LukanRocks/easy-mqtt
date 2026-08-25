import * as Iron from 'iron-webcrypto'

// The global WebCrypto object. Pinned to the exact type iron-webcrypto expects
// so this module type-checks identically under Node-only and DOM lib configs
// (the web package imports this file transitively via the server's AppType).
const webcrypto = globalThis.crypto as unknown as Parameters<typeof Iron.seal>[0]

/** The sensitive payload stored (sealed/encrypted) in the session cookie. */
export interface SessionData {
  username: string
  password: string
  /** Issued-at, epoch seconds. */
  iat: number
}

export const SESSION_COOKIE = 'emqtt_session'

/**
 * Seal (authenticated-encrypt) the session payload into an opaque cookie value.
 * Uses iron-webcrypto — the same scheme as iron-session — so the broker
 * credentials are never readable from the cookie.
 */
export function sealSession(data: SessionData, secret: string): Promise<string> {
  return Iron.seal(webcrypto, data, secret, Iron.defaults)
}

export async function unsealSession(sealed: string, secret: string): Promise<SessionData | null> {
  try {
    const data = (await Iron.unseal(webcrypto, sealed, secret, Iron.defaults)) as SessionData
    if (typeof data?.username === 'string' && typeof data?.password === 'string') {
      return data
    }
    return null
  } catch {
    return null
  }
}
