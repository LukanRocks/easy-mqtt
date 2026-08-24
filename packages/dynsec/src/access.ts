import type { AclType, Role } from "./schemas.js";

/**
 * Test whether a concrete topic is covered by an MQTT topic filter that may
 * contain `+` (single level) and `#` (multi level) wildcards.
 *
 * Ported from the reference implementation's Access page matcher.
 */
export function topicMatches(topic: string, filter: string): boolean {
  const topicParts = topic.split("/");
  const filterParts = filter.split("/");

  for (let i = 0; i < topicParts.length; i++) {
    const filterSegment = filterParts[i];
    if (filterSegment === undefined) return false;
    if (filterSegment === "#") return true;
    if (filterSegment === "+") continue;
    if (topicParts[i] !== filterSegment) return false;
  }

  // A filter longer than the topic only matches when the extra tail is `#`
  // at exactly the next level (e.g. "a/#" matches "a"); otherwise no match.
  if (filterParts.length > topicParts.length) {
    return filterParts.length === topicParts.length + 1 && filterParts[topicParts.length] === "#";
  }
  return true;
}

export interface RoleAccess {
  rolename: string;
  textname?: string;
  textdescription?: string;
  access: AclType[];
}

/**
 * Given a topic and the verbose role list, compute which roles grant access to
 * that topic and which ACL types they allow. Mirrors the reference Access page
 * (allow-only, ordered by priority).
 */
export function resolveAccess(topic: string, roles: Role[]): RoleAccess[] {
  const result: RoleAccess[] = [];
  for (const role of roles) {
    const access: AclType[] = [];
    const acls = (role.acls ?? [])
      .filter((acl) => acl.allow)
      .sort((a, b) => (a.priority ?? -1) - (b.priority ?? -1));
    for (const acl of acls) {
      if (topicMatches(topic, acl.topic)) {
        access.push(acl.acltype);
      }
    }
    if (access.length > 0) {
      result.push({
        rolename: role.rolename,
        textname: role.textname,
        textdescription: role.textdescription,
        access,
      });
    }
  }
  return result;
}
