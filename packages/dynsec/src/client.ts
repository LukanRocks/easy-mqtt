import type { MqttClient } from 'mqtt'
import { DynsecError, DynsecProtocolError, DynsecTimeoutError } from './errors.js'
import type { Acl, AclType, Client, Group, ListResponse, Role } from './schemas.js'

const CONTROL_TOPIC = '$CONTROL/dynamic-security/v1'
const RESPONSE_TOPIC = '$CONTROL/dynamic-security/v1/response'

/** A single dynsec response entry (one per command in the request). */
interface DynsecResponse {
  command: string
  correlationData?: string
  error?: string
  data?: Record<string, unknown>
}

interface Pending {
  command: string
  resolve: (value: DynsecResponse) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export interface DynsecClientOptions {
  /** Per-command timeout in milliseconds. Defaults to 5000. */
  timeoutMs?: number
}

/**
 * Typed client for the Mosquitto Dynamic Security plugin control protocol.
 *
 * Commands are published to `$CONTROL/dynamic-security/v1` wrapped in
 * `{ commands: [...] }`; responses arrive on `.../response` as
 * `{ responses: [...] }`, each echoing its `command`.
 *
 * Unlike the reference implementation (which keyed in-flight calls by command
 * name and therefore could not run two of the same command concurrently), this
 * client attaches a unique `correlationData` id to every command and matches
 * responses on that id — making it concurrency-safe. If a broker does not echo
 * `correlationData`, it falls back to first-in-flight-by-command-name matching.
 */
export class DynsecClient {
  private readonly mqtt: MqttClient
  private readonly timeoutMs: number
  private readonly pending = new Map<string, Pending>()
  private subscribed = false
  private subscribing?: Promise<void>
  private readonly onMessage: (topic: string, payload: Buffer) => void

  constructor(mqtt: MqttClient, options: DynsecClientOptions = {}) {
    this.mqtt = mqtt
    this.timeoutMs = options.timeoutMs ?? 5000
    this.onMessage = (topic, payload) => this.handleMessage(topic, payload)
    this.mqtt.on('message', this.onMessage)
  }

  /** Detach listeners and reject any outstanding calls. */
  dispose(): void {
    this.mqtt.removeListener('message', this.onMessage)
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer)
      entry.reject(new DynsecError('client disposed'))
    }
    this.pending.clear()
  }

  private async ensureSubscribed(): Promise<void> {
    if (this.subscribed) return
    if (!this.subscribing) {
      this.subscribing = this.mqtt
        .subscribeAsync(RESPONSE_TOPIC)
        .then(() => {
          this.subscribed = true
        })
        .finally(() => {
          this.subscribing = undefined
        })
    }
    await this.subscribing
  }

  private async execute(command: Record<string, unknown>): Promise<DynsecResponse> {
    await this.ensureSubscribed()
    const id = crypto.randomUUID()
    const commandName = String(command.command)
    const payload = JSON.stringify({
      commands: [{ ...command, correlationData: id }],
    })

    const response = new Promise<DynsecResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) {
          reject(new DynsecTimeoutError(this.timeoutMs))
        }
      }, this.timeoutMs)
      this.pending.set(id, { command: commandName, resolve, reject, timer })
    })

    try {
      await this.mqtt.publishAsync(CONTROL_TOPIC, payload)
    } catch (err) {
      const entry = this.pending.get(id)
      if (entry) {
        clearTimeout(entry.timer)
        this.pending.delete(id)
      }
      throw err
    }

    const result = await response
    if (result.error != null) {
      throw new DynsecError(result.error, result)
    }
    return result
  }

  private handleMessage(topic: string, payload: Buffer): void {
    if (topic !== RESPONSE_TOPIC) return

    let parsed: { responses?: DynsecResponse[] }
    try {
      parsed = JSON.parse(payload.toString())
    } catch {
      this.rejectAll(new DynsecProtocolError('invalid JSON response', payload.toString()))
      return
    }

    const responses = parsed.responses
    if (!Array.isArray(responses)) {
      this.rejectAll(new DynsecProtocolError("response missing 'responses' array", payload.toString()))
      return
    }

    for (const response of responses) {
      const entry = this.match(response)
      if (!entry) continue
      clearTimeout(entry.timer)
      entry.resolve(response)
    }
  }

  /** Match a response to a pending call by correlationData, else by command name. */
  private match(response: DynsecResponse): Pending | undefined {
    const id = response.correlationData
    if (id && this.pending.has(id)) {
      const entry = this.pending.get(id)!
      this.pending.delete(id)
      return entry
    }
    // Fallback for brokers that don't echo correlationData: first in-flight
    // call with the same command name.
    for (const [key, entry] of this.pending) {
      if (entry.command === response.command) {
        this.pending.delete(key)
        return entry
      }
    }
    return undefined
  }

  private rejectAll(error: Error): void {
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer)
      this.pending.delete(id)
      entry.reject(error)
    }
  }

  private requireData<T>(response: DynsecResponse, key: string): T {
    const value = response.data?.[key]
    if (value === undefined || value === null) {
      throw new DynsecProtocolError(`'${key}' property missing`, JSON.stringify(response))
    }
    return value as T
  }

  // ---------------------------------------------------------------------------
  // Default ACL
  // ---------------------------------------------------------------------------

  async getDefaultAclAccess(): Promise<Acl[]> {
    const r = await this.execute({ command: 'getDefaultACLAccess' })
    return this.requireData<Acl[]>(r, 'acls')
  }

  async setDefaultAclAccess(acls: Acl[]): Promise<void> {
    await this.execute({ command: 'setDefaultACLAccess', acls })
  }

  // ---------------------------------------------------------------------------
  // Clients
  // ---------------------------------------------------------------------------

  async createClient(client: Client): Promise<void> {
    await this.execute({ command: 'createClient', ...client })
  }

  async deleteClient(username: string): Promise<void> {
    await this.execute({ command: 'deleteClient', username })
  }

  async enableClient(username: string): Promise<void> {
    await this.execute({ command: 'enableClient', username })
  }

  async disableClient(username: string): Promise<void> {
    await this.execute({ command: 'disableClient', username })
  }

  async getClient(username: string): Promise<Client> {
    const r = await this.execute({ command: 'getClient', username })
    return this.requireData<Client>(r, 'client')
  }

  async listClients(verbose: false, count?: number, offset?: number): Promise<ListResponse<string>>
  async listClients(verbose: true, count?: number, offset?: number): Promise<ListResponse<Client>>
  async listClients(verbose = false, count = -1, offset = 0): Promise<ListResponse<string> | ListResponse<Client>> {
    const r = await this.execute({ command: 'listClients', verbose, count, offset })
    return {
      items: this.requireData<string[] | Client[]>(r, 'clients'),
      total: this.requireData<number>(r, 'totalCount'),
    } as ListResponse<string> | ListResponse<Client>
  }

  async modifyClient(client: Client): Promise<void> {
    await this.execute({ command: 'modifyClient', ...client })
  }

  async setClientId(username: string, clientid: string): Promise<void> {
    await this.execute({ command: 'setClientId', username, clientid })
  }

  async setClientPassword(username: string, password: string): Promise<void> {
    await this.execute({ command: 'setClientPassword', username, password })
  }

  async addClientRole(username: string, rolename: string, priority = -1): Promise<void> {
    await this.execute({ command: 'addClientRole', username, rolename, priority })
  }

  async removeClientRole(username: string, rolename: string): Promise<void> {
    await this.execute({ command: 'removeClientRole', username, rolename })
  }

  // ---------------------------------------------------------------------------
  // Groups
  // ---------------------------------------------------------------------------

  async createGroup(group: Group): Promise<void> {
    await this.execute({ command: 'createGroup', ...group })
  }

  async deleteGroup(groupname: string): Promise<void> {
    await this.execute({ command: 'deleteGroup', groupname })
  }

  async getGroup(groupname: string): Promise<Group> {
    const r = await this.execute({ command: 'getGroup', groupname })
    return this.requireData<Group>(r, 'group')
  }

  async listGroups(verbose: false, count?: number, offset?: number): Promise<ListResponse<string>>
  async listGroups(verbose: true, count?: number, offset?: number): Promise<ListResponse<Group>>
  async listGroups(verbose = false, count = -1, offset = 0): Promise<ListResponse<string> | ListResponse<Group>> {
    const r = await this.execute({ command: 'listGroups', verbose, count, offset })
    return {
      items: this.requireData<string[] | Group[]>(r, 'groups'),
      total: this.requireData<number>(r, 'totalCount'),
    } as ListResponse<string> | ListResponse<Group>
  }

  async modifyGroup(group: Group): Promise<void> {
    await this.execute({ command: 'modifyGroup', ...group })
  }

  async addGroupClient(groupname: string, username: string, priority = -1): Promise<void> {
    await this.execute({ command: 'addGroupClient', groupname, username, priority })
  }

  async removeGroupClient(groupname: string, username: string): Promise<void> {
    await this.execute({ command: 'removeGroupClient', groupname, username })
  }

  async addGroupRole(groupname: string, rolename: string, priority = -1): Promise<void> {
    await this.execute({ command: 'addGroupRole', groupname, rolename, priority })
  }

  async removeGroupRole(groupname: string, rolename: string): Promise<void> {
    await this.execute({ command: 'removeGroupRole', groupname, rolename })
  }

  async setAnonymousGroup(groupname: string): Promise<void> {
    await this.execute({ command: 'setAnonymousGroup', groupname })
  }

  async getAnonymousGroup(): Promise<string> {
    const r = await this.execute({ command: 'getAnonymousGroup' })
    const group = this.requireData<{ groupname?: string }>(r, 'group')
    if (typeof group.groupname !== 'string') {
      throw new DynsecProtocolError("'group.groupname' missing", JSON.stringify(r))
    }
    return group.groupname
  }

  // ---------------------------------------------------------------------------
  // Roles
  // ---------------------------------------------------------------------------

  async createRole(role: Role): Promise<void> {
    await this.execute({ command: 'createRole', ...role })
  }

  async deleteRole(rolename: string): Promise<void> {
    await this.execute({ command: 'deleteRole', rolename })
  }

  async getRole(rolename: string): Promise<Role> {
    const r = await this.execute({ command: 'getRole', rolename })
    return this.requireData<Role>(r, 'role')
  }

  async listRoles(verbose: false, count?: number, offset?: number): Promise<ListResponse<string>>
  async listRoles(verbose: true, count?: number, offset?: number): Promise<ListResponse<Role>>
  async listRoles(verbose = false, count = -1, offset = 0): Promise<ListResponse<string> | ListResponse<Role>> {
    const r = await this.execute({ command: 'listRoles', verbose, count, offset })
    return {
      items: this.requireData<string[] | Role[]>(r, 'roles'),
      total: this.requireData<number>(r, 'totalCount'),
    } as ListResponse<string> | ListResponse<Role>
  }

  async modifyRole(role: Role): Promise<void> {
    await this.execute({ command: 'modifyRole', ...role })
  }

  async addRoleAcl(rolename: string, acl: Acl): Promise<void> {
    await this.execute({ command: 'addRoleACL', rolename, ...acl })
  }

  async removeRoleAcl(rolename: string, acltype: AclType, topic: string): Promise<void> {
    await this.execute({ command: 'removeRoleACL', rolename, acltype, topic })
  }
}
