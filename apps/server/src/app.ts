import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import {
  DynsecClient,
  DynsecError,
  DynsecProtocolError,
  DynsecTimeoutError,
  resolveAccess,
  type Client,
  type Group,
  type Role,
} from "@easy-mqtt/dynsec";
import type { Config } from "./config.js";
import { MqttPool } from "./mqtt-pool.js";
import { SESSION_COOKIE, sealSession, unsealSession } from "./session.js";
import {
  accessQuerySchema,
  addGroupClientSchema,
  addRoleSchema,
  anonymousGroupSchema,
  aclSchema,
  createClientSchema,
  createGroupSchema,
  createRoleSchema,
  defaultAclSchema,
  loginSchema,
  modifyClientSchema,
  modifyGroupSchema,
  modifyRoleSchema,
  passwordSchema,
  removeAclSchema,
} from "./validators.js";

type Env = {
  Variables: {
    dynsec: DynsecClient;
    username: string;
  };
};

// Module-level state, wired up by configureApp() before the server starts.
let config: Config;
let pool: MqttPool;

export function configureApp(cfg: Config): MqttPool {
  config = cfg;
  pool = new MqttPool(cfg);
  return pool;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: config.cookieSecure,
    path: "/",
    maxAge: config.sessionTtlSeconds,
  };
}

/** Require a valid session; attach the pooled DynsecClient to the context. */
const auth = createMiddleware<Env>(async (c, next) => {
  const cookie = getCookie(c, SESSION_COOKIE);
  const session = cookie ? await unsealSession(cookie, config.sessionSecret) : null;
  if (!session) return c.json({ error: "unauthenticated" }, 401);

  if (Date.now() / 1000 - session.iat > config.sessionTtlSeconds) {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ error: "session expired" }, 401);
  }

  try {
    const dynsec = await pool.getClient({
      username: session.username,
      password: session.password,
    });
    c.set("dynsec", dynsec);
    c.set("username", session.username);
  } catch {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ error: "broker connection failed" }, 502);
  }
  await next();
});

const auth_routes = new Hono<Env>()
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const { username, password } = c.req.valid("json");
    try {
      const dynsec = await pool.getClient({ username, password });
      // Cheap admin-capability probe, mirroring the reference login flow.
      await dynsec.listClients(false, 0, 0);
    } catch {
      return c.json(
        { error: "invalid username, password, or no access to $CONTROL" },
        401,
      );
    }
    const sealed = await sealSession(
      { username, password, iat: Math.floor(Date.now() / 1000) },
      config.sessionSecret,
    );
    setCookie(c, SESSION_COOKIE, sealed, cookieOptions());
    return c.json({ username });
  })
  .post("/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  })
  .get("/me", auth, (c) => c.json({ username: c.get("username") }));

const client_routes = new Hono<Env>()
  .use("*", auth)
  .get("/", async (c) => c.json(await c.get("dynsec").listClients(true)))
  .post("/", zValidator("json", createClientSchema), async (c) => {
    await c.get("dynsec").createClient(c.req.valid("json") as Client);
    return c.json({ ok: true }, 201);
  })
  .get("/:username", async (c) => c.json(await c.get("dynsec").getClient(c.req.param("username"))))
  .put("/:username", zValidator("json", modifyClientSchema), async (c) => {
    const body = c.req.valid("json");
    await c.get("dynsec").modifyClient({ ...body, username: c.req.param("username") } as Client);
    return c.json({ ok: true });
  })
  .delete("/:username", async (c) => {
    await c.get("dynsec").deleteClient(c.req.param("username"));
    return c.json({ ok: true });
  })
  .post("/:username/enable", async (c) => {
    await c.get("dynsec").enableClient(c.req.param("username"));
    return c.json({ ok: true });
  })
  .post("/:username/disable", async (c) => {
    await c.get("dynsec").disableClient(c.req.param("username"));
    return c.json({ ok: true });
  })
  .post("/:username/password", zValidator("json", passwordSchema), async (c) => {
    await c.get("dynsec").setClientPassword(c.req.param("username"), c.req.valid("json").password);
    return c.json({ ok: true });
  })
  .post("/:username/roles", zValidator("json", addRoleSchema), async (c) => {
    const { rolename, priority } = c.req.valid("json");
    await c.get("dynsec").addClientRole(c.req.param("username"), rolename, priority ?? -1);
    return c.json({ ok: true });
  })
  .delete("/:username/roles/:rolename", async (c) => {
    await c.get("dynsec").removeClientRole(c.req.param("username"), c.req.param("rolename"));
    return c.json({ ok: true });
  });

const group_routes = new Hono<Env>()
  .use("*", auth)
  .get("/", async (c) => c.json(await c.get("dynsec").listGroups(true)))
  .post("/", zValidator("json", createGroupSchema), async (c) => {
    await c.get("dynsec").createGroup(c.req.valid("json") as Group);
    return c.json({ ok: true }, 201);
  })
  .get("/:groupname", async (c) => c.json(await c.get("dynsec").getGroup(c.req.param("groupname"))))
  .put("/:groupname", zValidator("json", modifyGroupSchema), async (c) => {
    const body = c.req.valid("json");
    await c.get("dynsec").modifyGroup({ ...body, groupname: c.req.param("groupname") } as Group);
    return c.json({ ok: true });
  })
  .delete("/:groupname", async (c) => {
    await c.get("dynsec").deleteGroup(c.req.param("groupname"));
    return c.json({ ok: true });
  })
  .post("/:groupname/clients", zValidator("json", addGroupClientSchema), async (c) => {
    const { username, priority } = c.req.valid("json");
    await c.get("dynsec").addGroupClient(c.req.param("groupname"), username, priority ?? -1);
    return c.json({ ok: true });
  })
  .delete("/:groupname/clients/:username", async (c) => {
    await c.get("dynsec").removeGroupClient(c.req.param("groupname"), c.req.param("username"));
    return c.json({ ok: true });
  })
  .post("/:groupname/roles", zValidator("json", addRoleSchema), async (c) => {
    const { rolename, priority } = c.req.valid("json");
    await c.get("dynsec").addGroupRole(c.req.param("groupname"), rolename, priority ?? -1);
    return c.json({ ok: true });
  })
  .delete("/:groupname/roles/:rolename", async (c) => {
    await c.get("dynsec").removeGroupRole(c.req.param("groupname"), c.req.param("rolename"));
    return c.json({ ok: true });
  });

const role_routes = new Hono<Env>()
  .use("*", auth)
  .get("/", async (c) => c.json(await c.get("dynsec").listRoles(true)))
  .post("/", zValidator("json", createRoleSchema), async (c) => {
    await c.get("dynsec").createRole(c.req.valid("json") as Role);
    return c.json({ ok: true }, 201);
  })
  .get("/:rolename", async (c) => c.json(await c.get("dynsec").getRole(c.req.param("rolename"))))
  .put("/:rolename", zValidator("json", modifyRoleSchema), async (c) => {
    const body = c.req.valid("json");
    await c.get("dynsec").modifyRole({ ...body, rolename: c.req.param("rolename") } as Role);
    return c.json({ ok: true });
  })
  .delete("/:rolename", async (c) => {
    await c.get("dynsec").deleteRole(c.req.param("rolename"));
    return c.json({ ok: true });
  })
  .post("/:rolename/acls", zValidator("json", aclSchema), async (c) => {
    await c.get("dynsec").addRoleAcl(c.req.param("rolename"), c.req.valid("json"));
    return c.json({ ok: true });
  })
  .delete("/:rolename/acls", zValidator("query", removeAclSchema), async (c) => {
    const { acltype, topic } = c.req.valid("query");
    await c.get("dynsec").removeRoleAcl(c.req.param("rolename"), acltype, topic);
    return c.json({ ok: true });
  });

const anonymous_routes = new Hono<Env>()
  .use("*", auth)
  .get("/", async (c) => c.json({ groupname: await c.get("dynsec").getAnonymousGroup() }))
  .put("/", zValidator("json", anonymousGroupSchema), async (c) => {
    await c.get("dynsec").setAnonymousGroup(c.req.valid("json").groupname);
    return c.json({ ok: true });
  });

const default_acl_routes = new Hono<Env>()
  .use("*", auth)
  .get("/", async (c) => c.json(await c.get("dynsec").getDefaultAclAccess()))
  .put("/", zValidator("json", defaultAclSchema), async (c) => {
    await c.get("dynsec").setDefaultAclAccess(c.req.valid("json").acls);
    return c.json({ ok: true });
  });

const access_routes = new Hono<Env>().use("*", auth).get(
  "/",
  zValidator("query", accessQuerySchema),
  async (c) => {
    const { topic } = c.req.valid("query");
    const roles = await c.get("dynsec").listRoles(true);
    return c.json(resolveAccess(topic, roles.items));
  },
);

const api = new Hono<Env>()
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/auth", auth_routes)
  .route("/clients", client_routes)
  .route("/groups", group_routes)
  .route("/roles", role_routes)
  .route("/anonymous", anonymous_routes)
  .route("/default-acl", default_acl_routes)
  .route("/access", access_routes);

export const app = new Hono().route("/api", api);

app.onError((err, c) => {
  if (err instanceof DynsecTimeoutError) return c.json({ error: err.message }, 504);
  if (err instanceof DynsecProtocolError) return c.json({ error: err.message }, 502);
  if (err instanceof DynsecError) return c.json({ error: err.message }, 400);
  console.error(err);
  return c.json({ error: "internal server error" }, 500);
});

export type AppType = typeof app;
