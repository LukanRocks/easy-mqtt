import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import type { MqttClient } from 'mqtt'
import { DynsecClient } from './client.js'

const RESPONSE_TOPIC = '$CONTROL/dynamic-security/v1/response'

/**
 * A fake mqtt.js client that captures published commands and lets a test emit
 * responses back. Only the surface DynsecClient touches is implemented.
 */
class FakeMqtt extends EventEmitter {
  published: Array<{ command: string; correlationData: string }> = []

  async subscribeAsync(): Promise<void> {}

  async publishAsync(_topic: string, payload: string): Promise<void> {
    const { commands } = JSON.parse(payload)
    for (const c of commands) {
      this.published.push({ command: c.command, correlationData: c.correlationData })
    }
  }

  respond(responses: unknown[]): void {
    this.emit('message', RESPONSE_TOPIC, Buffer.from(JSON.stringify({ responses })))
  }
}

function makeClient() {
  const fake = new FakeMqtt()
  const client = new DynsecClient(fake as unknown as MqttClient, { timeoutMs: 500 })
  return { fake, client }
}

/** Wait until at least `count` commands have been published (past the async subscribe). */
async function waitForPublished(fake: FakeMqtt, count: number): Promise<void> {
  for (let i = 0; i < 100 && fake.published.length < count; i++) {
    await new Promise((r) => setTimeout(r, 0))
  }
}

describe('DynsecClient correlation', () => {
  it('matches responses to requests by correlationData', async () => {
    const { fake, client } = makeClient()
    const p = client.getAnonymousGroup()
    await waitForPublished(fake, 1)
    const { correlationData } = fake.published[0]!
    fake.respond([{ command: 'getAnonymousGroup', correlationData, data: { group: { groupname: 'anon' } } }])
    await expect(p).resolves.toBe('anon')
  })

  it('handles two in-flight calls of the SAME command concurrently', async () => {
    // This is the scenario the reference client could not handle: it keyed
    // pending calls by command name and threw on the second one.
    const { fake, client } = makeClient()
    const p1 = client.listClients(true)
    const p2 = client.listClients(true)
    await waitForPublished(fake, 2)

    expect(fake.published).toHaveLength(2)
    const [c1, c2] = fake.published
    expect(c1!.correlationData).not.toBe(c2!.correlationData)

    // Respond out of order.
    fake.respond([
      {
        command: 'listClients',
        correlationData: c2!.correlationData,
        data: { clients: [{ username: 'second' }], totalCount: 1 },
      },
    ])
    fake.respond([
      {
        command: 'listClients',
        correlationData: c1!.correlationData,
        data: { clients: [{ username: 'first' }], totalCount: 1 },
      },
    ])

    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1.items).toEqual([{ username: 'first' }])
    expect(r2.items).toEqual([{ username: 'second' }])
  })

  it('throws DynsecError when the response carries an error', async () => {
    const { fake, client } = makeClient()
    const p = client.deleteClient('ghost')
    await waitForPublished(fake, 1)
    const { correlationData } = fake.published[0]!
    fake.respond([{ command: 'deleteClient', correlationData, error: 'Client not found' }])
    await expect(p).rejects.toThrow('Client not found')
  })

  it('times out when no response arrives', async () => {
    const { client } = makeClient()
    await expect(client.getAnonymousGroup()).rejects.toThrow(/timed out/)
  })

  it('falls back to command-name matching when correlationData is absent', async () => {
    const { fake, client } = makeClient()
    const p = client.getAnonymousGroup()
    await waitForPublished(fake, 1)
    // Broker echoes no correlationData.
    fake.respond([{ command: 'getAnonymousGroup', data: { group: { groupname: 'anon' } } }])
    await expect(p).resolves.toBe('anon')
  })
})
