import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mqtt, { type MqttClient } from "mqtt";
import { DynsecClient } from "./client.js";

/**
 * Integration tests ported from the reference Dynsec.Test suite. They require a
 * live Mosquitto with the dynamic-security plugin and an `admin` client.
 *
 * Enable with DYNSEC_IT=1. Configure via env:
 *   MQTT_TEST_HOST (default localhost), MQTT_TEST_PORT (1883),
 *   MQTT_TEST_USER (admin), MQTT_TEST_PASS (password).
 */
const enabled = process.env.DYNSEC_IT === "1";
const host = process.env.MQTT_TEST_HOST ?? "localhost";
const port = Number(process.env.MQTT_TEST_PORT ?? "1883");
const username = process.env.MQTT_TEST_USER ?? "admin";
const password = process.env.MQTT_TEST_PASS ?? "password";

describe.skipIf(!enabled)("DynsecClient (integration)", () => {
  let mqttClient: MqttClient;
  let client: DynsecClient;

  beforeAll(async () => {
    mqttClient = await mqtt.connectAsync(`mqtt://${host}:${port}`, {
      username,
      password,
      connectTimeout: 5000,
      reconnectPeriod: 0,
    });
    client = new DynsecClient(mqttClient);
  });

  afterAll(async () => {
    client?.dispose();
    await mqttClient?.endAsync();
  });

  it("gets the default ACL access (4 entries)", async () => {
    const acls = await client.getDefaultAclAccess();
    expect(acls).not.toBeNull();
    expect(acls).toHaveLength(4);
  });

  it("gets the anonymous group", async () => {
    await expect(client.getAnonymousGroup()).resolves.toBeDefined();
  });

  it("lists clients", async () => {
    const res = await client.listClients(false);
    expect(res.items).toBeDefined();
    expect(res.items).toContain(username);
  });

  it("lists clients verbose", async () => {
    const res = await client.listClients(true);
    expect(res.items).toBeDefined();
    expect(res.items.some((c) => c.username === username)).toBe(true);
  });

  it("gets a client", async () => {
    const c = await client.getClient(username);
    expect(c.username).toBe(username);
  });

  it("lists groups", async () => {
    await expect(client.listGroups(false)).resolves.toBeDefined();
  });

  it("lists groups verbose", async () => {
    await expect(client.listGroups(true)).resolves.toBeDefined();
  });

  it("lists roles", async () => {
    const res = await client.listRoles(false);
    expect(res.items).toBeDefined();
  });

  it("lists roles verbose", async () => {
    await expect(client.listRoles(true)).resolves.toBeDefined();
  });

  it("performs a full client lifecycle", async () => {
    const name = `test-${Date.now()}`;
    await client.createClient({ username: name, password: "secret", textname: "Test" });
    try {
      const created = await client.getClient(name);
      expect(created.username).toBe(name);
      expect(created.textname).toBe("Test");

      await client.disableClient(name);
      expect((await client.getClient(name)).disabled).toBe(true);
      await client.enableClient(name);
      expect((await client.getClient(name)).disabled).toBeFalsy();
    } finally {
      await client.deleteClient(name);
    }
    const after = await client.listClients(false);
    expect(after.items).not.toContain(name);
  });

  it("runs two identical commands concurrently against the broker", async () => {
    const [a, b] = await Promise.all([client.listClients(false), client.listClients(false)]);
    expect(a.total).toBe(b.total);
  });
});
