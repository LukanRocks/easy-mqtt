import { z } from "zod";
import { aclTypeSchema, rolePrioritySchema } from "@easy-mqtt/dynsec";

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const priority = z.number().int().optional();

export const createClientSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1).optional(),
  clientid: z.string().optional(),
  // Clients intentionally have no display name (textname) — the username is the
  // identity and the description explains what the client is.
  textdescription: z.string().optional(),
  disabled: z.boolean().optional(),
  roles: z.array(rolePrioritySchema).optional(),
  groups: z
    .array(z.object({ groupname: z.string(), priority: z.number().int().default(-1) }))
    .optional(),
});

export const modifyClientSchema = createClientSchema.partial().extend({
  password: z.string().min(1).optional(),
});

export const passwordSchema = z.object({ password: z.string().min(1) });

export const addRoleSchema = z.object({ rolename: z.string().min(1), priority });

export const createGroupSchema = z.object({
  groupname: z.string().min(1),
  // Groups have no display name (textname) — the group name is the identity and
  // the description explains its purpose. Mirrors the clients decision.
  textdescription: z.string().optional(),
  roles: z.array(rolePrioritySchema).optional(),
  clients: z
    .array(z.object({ username: z.string(), priority: z.number().int().optional() }))
    .optional(),
});

export const modifyGroupSchema = createGroupSchema.partial();

export const addGroupClientSchema = z.object({ username: z.string().min(1), priority });

export const createRoleSchema = z.object({
  rolename: z.string().min(1),
  textname: z.string().optional(),
  textdescription: z.string().optional(),
  acls: z
    .array(
      z.object({
        acltype: aclTypeSchema,
        topic: z.string(),
        priority: z.number().int().default(-1),
        allow: z.boolean(),
      }),
    )
    .optional(),
});

export const modifyRoleSchema = createRoleSchema.partial();

export const aclSchema = z.object({
  acltype: aclTypeSchema,
  topic: z.string().min(1),
  priority: z.number().int().default(-1),
  allow: z.boolean(),
});

export const removeAclSchema = z.object({
  acltype: aclTypeSchema,
  topic: z.string().min(1),
});


export const defaultAclSchema = z.object({
  acls: z.array(
    z.object({
      acltype: aclTypeSchema,
      topic: z.string(),
      priority: z.number().int().default(-1),
      allow: z.boolean(),
    }),
  ),
});

export const accessQuerySchema = z.object({ topic: z.string().min(1) });
