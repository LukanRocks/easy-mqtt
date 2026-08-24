import { queryOptions } from "@tanstack/react-query";
import { api } from "./api";

export const queryKeys = {
  me: ["me"] as const,
  clients: ["clients"] as const,
  client: (username: string) => ["clients", username] as const,
  groups: ["groups"] as const,
  group: (groupname: string) => ["groups", groupname] as const,
  roles: ["roles"] as const,
  role: (rolename: string) => ["roles", rolename] as const,
  anonymous: ["anonymous"] as const,
  defaultAcl: ["default-acl"] as const,
  access: (topic: string) => ["access", topic] as const,
};

export const clientsQuery = queryOptions({
  queryKey: queryKeys.clients,
  queryFn: api.clients.list,
});

export const clientQuery = (username: string) =>
  queryOptions({
    queryKey: queryKeys.client(username),
    queryFn: () => api.clients.get(username),
  });

export const groupsQuery = queryOptions({
  queryKey: queryKeys.groups,
  queryFn: api.groups.list,
});

export const groupQuery = (groupname: string) =>
  queryOptions({
    queryKey: queryKeys.group(groupname),
    queryFn: () => api.groups.get(groupname),
  });

export const rolesQuery = queryOptions({
  queryKey: queryKeys.roles,
  queryFn: api.roles.list,
});

export const roleQuery = (rolename: string) =>
  queryOptions({
    queryKey: queryKeys.role(rolename),
    queryFn: () => api.roles.get(rolename),
  });

export const anonymousQuery = queryOptions({
  queryKey: queryKeys.anonymous,
  queryFn: api.anonymous.get,
});

export const defaultAclQuery = queryOptions({
  queryKey: queryKeys.defaultAcl,
  queryFn: api.defaultAcl.get,
});
