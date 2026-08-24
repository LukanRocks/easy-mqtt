import { hc } from "hono/client";
import type { AppType } from "@easy-mqtt/server";
import type {
  Acl,
  Client,
  Group,
  ListResponse,
  Role,
  RoleAccess,
} from "@easy-mqtt/dynsec";

export const rpc = hc<AppType>("/");

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function unwrap<T>(promise: Promise<Response>): Promise<T> {
  const res = await promise;
  if (!res.ok) {
    let message = res.statusText || `request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      unwrap<{ username: string }>(rpc.api.auth.login.$post({ json: { username, password } })),
    logout: () => unwrap<{ ok: true }>(rpc.api.auth.logout.$post()),
    me: () => unwrap<{ username: string }>(rpc.api.auth.me.$get()),
  },
  clients: {
    list: () => unwrap<ListResponse<Client>>(rpc.api.clients.$get()),
    get: (username: string) =>
      unwrap<Client>(rpc.api.clients[":username"].$get({ param: { username } })),
    create: (client: Client) => unwrap(rpc.api.clients.$post({ json: client })),
    update: (username: string, client: Partial<Client>) =>
      unwrap(rpc.api.clients[":username"].$put({ param: { username }, json: client })),
    remove: (username: string) =>
      unwrap(rpc.api.clients[":username"].$delete({ param: { username } })),
    enable: (username: string) =>
      unwrap(rpc.api.clients[":username"].enable.$post({ param: { username } })),
    disable: (username: string) =>
      unwrap(rpc.api.clients[":username"].disable.$post({ param: { username } })),
    setPassword: (username: string, password: string) =>
      unwrap(rpc.api.clients[":username"].password.$post({ param: { username }, json: { password } })),
    addRole: (username: string, rolename: string, priority?: number) =>
      unwrap(rpc.api.clients[":username"].roles.$post({ param: { username }, json: { rolename, priority } })),
    removeRole: (username: string, rolename: string) =>
      unwrap(rpc.api.clients[":username"].roles[":rolename"].$delete({ param: { username, rolename } })),
  },
  groups: {
    list: () => unwrap<ListResponse<Group>>(rpc.api.groups.$get()),
    get: (groupname: string) =>
      unwrap<Group>(rpc.api.groups[":groupname"].$get({ param: { groupname } })),
    create: (group: Group) => unwrap(rpc.api.groups.$post({ json: group })),
    update: (groupname: string, group: Partial<Group>) =>
      unwrap(rpc.api.groups[":groupname"].$put({ param: { groupname }, json: group })),
    remove: (groupname: string) =>
      unwrap(rpc.api.groups[":groupname"].$delete({ param: { groupname } })),
    addClient: (groupname: string, username: string, priority?: number) =>
      unwrap(rpc.api.groups[":groupname"].clients.$post({ param: { groupname }, json: { username, priority } })),
    removeClient: (groupname: string, username: string) =>
      unwrap(rpc.api.groups[":groupname"].clients[":username"].$delete({ param: { groupname, username } })),
    addRole: (groupname: string, rolename: string, priority?: number) =>
      unwrap(rpc.api.groups[":groupname"].roles.$post({ param: { groupname }, json: { rolename, priority } })),
    removeRole: (groupname: string, rolename: string) =>
      unwrap(rpc.api.groups[":groupname"].roles[":rolename"].$delete({ param: { groupname, rolename } })),
  },
  roles: {
    list: () => unwrap<ListResponse<Role>>(rpc.api.roles.$get()),
    get: (rolename: string) =>
      unwrap<Role>(rpc.api.roles[":rolename"].$get({ param: { rolename } })),
    create: (role: Role) => unwrap(rpc.api.roles.$post({ json: role })),
    update: (rolename: string, role: Partial<Role>) =>
      unwrap(rpc.api.roles[":rolename"].$put({ param: { rolename }, json: role })),
    remove: (rolename: string) =>
      unwrap(rpc.api.roles[":rolename"].$delete({ param: { rolename } })),
    addAcl: (rolename: string, acl: Acl) =>
      unwrap(rpc.api.roles[":rolename"].acls.$post({ param: { rolename }, json: acl })),
    removeAcl: (rolename: string, acltype: Acl["acltype"], topic: string) =>
      unwrap(rpc.api.roles[":rolename"].acls.$delete({ param: { rolename }, query: { acltype, topic } })),
  },
  defaultAcl: {
    get: () => unwrap<Acl[]>(rpc.api["default-acl"].$get()),
    set: (acls: Acl[]) => unwrap(rpc.api["default-acl"].$put({ json: { acls } })),
  },
  access: {
    check: (topic: string) => unwrap<RoleAccess[]>(rpc.api.access.$get({ query: { topic } })),
  },
};
