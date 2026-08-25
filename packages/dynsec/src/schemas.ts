import { z } from 'zod'

/**
 * Dynamic Security data shapes, transcribed from the reference C# DTOs.
 *
 * Wire-format notes preserved from the original protocol:
 *  - `textname` / `textdescription` are the display name / description fields
 *    (NOT "name" / "description").
 *  - `password` is only ever sent on create/setPassword; the broker never
 *    returns it.
 *  - null/undefined fields are omitted when serializing (the broker treats a
 *    missing field as "leave unchanged" on modify commands).
 */

/** ACL types — exact wire values accepted by the dynsec plugin. */
export const aclTypeSchema = z.enum([
  'publishClientSend',
  'publishClientReceive',
  'subscribeLiteral',
  'subscribePattern',
  'unsubscribeLiteral',
  'unsubscribePattern',
  'subscribe',
  'unsubscribe',
])
export type AclType = z.infer<typeof aclTypeSchema>

/** The four ACL types that make up the default ACL access. */
export const DEFAULT_ACL_TYPES = ['publishClientSend', 'publishClientReceive', 'subscribe', 'unsubscribe'] as const satisfies readonly AclType[]

export const aclSchema = z.object({
  acltype: aclTypeSchema,
  topic: z.string(),
  priority: z.number().int().default(-1),
  allow: z.boolean(),
})
export type Acl = z.infer<typeof aclSchema>

export const rolePrioritySchema = z.object({
  rolename: z.string(),
  priority: z.number().int().default(-1),
})
export type RolePriority = z.infer<typeof rolePrioritySchema>

export const groupPrioritySchema = z.object({
  groupname: z.string(),
  priority: z.number().int().default(-1),
})
export type GroupPriority = z.infer<typeof groupPrioritySchema>

export const clientReferenceSchema = z.object({
  username: z.string(),
  priority: z.number().int().optional(),
})
export type ClientReference = z.infer<typeof clientReferenceSchema>

export const clientSchema = z.object({
  username: z.string(),
  clientid: z.string().optional(),
  /** Only sent on create/setPassword — never present in responses. */
  password: z.string().optional(),
  textname: z.string().optional(),
  textdescription: z.string().optional(),
  disabled: z.boolean().optional(),
  roles: z.array(rolePrioritySchema).optional(),
  groups: z.array(groupPrioritySchema).optional(),
})
export type Client = z.infer<typeof clientSchema>

export const groupSchema = z.object({
  groupname: z.string(),
  textname: z.string().optional(),
  textdescription: z.string().optional(),
  roles: z.array(rolePrioritySchema).optional(),
  clients: z.array(clientReferenceSchema).optional(),
})
export type Group = z.infer<typeof groupSchema>

export const roleSchema = z.object({
  rolename: z.string(),
  textname: z.string().optional(),
  textdescription: z.string().optional(),
  acls: z.array(aclSchema).optional(),
})
export type Role = z.infer<typeof roleSchema>

export interface ListResponse<T> {
  items: T[]
  total: number
}
