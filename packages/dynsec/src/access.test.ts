import { describe, expect, it } from "vitest";
import { resolveAccess, topicMatches } from "./access.js";
import type { Role } from "./schemas.js";

describe("topicMatches", () => {
  it("matches identical literal topics", () => {
    expect(topicMatches("a/b/c", "a/b/c")).toBe(true);
  });

  it("rejects differing literal topics", () => {
    expect(topicMatches("a/b/c", "a/b/d")).toBe(false);
  });

  it("matches a single-level wildcard", () => {
    expect(topicMatches("a/b/c", "a/+/c")).toBe(true);
    expect(topicMatches("a/b/c", "+/+/+")).toBe(true);
  });

  it("does not let + span multiple levels", () => {
    expect(topicMatches("a/b/c", "a/+")).toBe(false);
  });

  it("matches a multi-level wildcard", () => {
    expect(topicMatches("a/b/c", "a/#")).toBe(true);
    expect(topicMatches("a/b/c", "#")).toBe(true);
  });

  it("matches the parent level with a trailing #", () => {
    expect(topicMatches("a", "a/#")).toBe(true);
  });

  it("rejects when the filter is longer and not a trailing #", () => {
    expect(topicMatches("a/b", "a/b/c")).toBe(false);
    expect(topicMatches("a/b", "a/b/+")).toBe(false);
  });
});

describe("resolveAccess", () => {
  const roles: Role[] = [
    {
      rolename: "sensors",
      acls: [
        { acltype: "subscribePattern", topic: "sensor/#", priority: 1, allow: true },
        { acltype: "publishClientSend", topic: "sensor/temp", priority: 2, allow: true },
        { acltype: "publishClientSend", topic: "other/#", priority: 3, allow: true },
        { acltype: "subscribePattern", topic: "secret/#", priority: 0, allow: false },
      ],
    },
    {
      rolename: "empty",
      acls: [{ acltype: "publishClientSend", topic: "nope/#", priority: 1, allow: true }],
    },
  ];

  it("returns only roles granting access to the topic", () => {
    const result = resolveAccess("sensor/temp", roles);
    expect(result).toHaveLength(1);
    expect(result[0]!.rolename).toBe("sensors");
    expect(result[0]!.access).toEqual(["subscribePattern", "publishClientSend"]);
  });

  it("ignores deny ACLs", () => {
    const result = resolveAccess("secret/x", roles);
    expect(result).toHaveLength(0);
  });

  it("returns empty when nothing matches", () => {
    expect(resolveAccess("unmatched/topic", roles)).toEqual([]);
  });
});
