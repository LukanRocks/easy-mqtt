/** Raised when the broker returns an `error` field on a dynsec response. */
export class DynsecError extends Error {
  readonly response?: unknown
  constructor(message: string, response?: unknown) {
    super(message)
    this.name = 'DynsecError'
    this.response = response
  }
}

/** Raised when a response is malformed or a required field is missing. */
export class DynsecProtocolError extends Error {
  readonly payload?: string
  constructor(message: string, payload?: string) {
    super(message)
    this.name = 'DynsecProtocolError'
    this.payload = payload
  }
}

/** Raised when no correlated response arrives within the timeout window. */
export class DynsecTimeoutError extends Error {
  readonly timeoutMs: number
  constructor(timeoutMs: number) {
    super(`dynsec command timed out after ${timeoutMs}ms`)
    this.name = 'DynsecTimeoutError'
    this.timeoutMs = timeoutMs
  }
}
