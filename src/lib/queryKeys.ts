import type { QueryKey } from "@tanstack/react-query";

import { getSessionSnapshot, type SessionSnapshot } from "@/lib/session";

export type ApiScope = "org" | "account" | "admin" | "public";

export function scopePrefix(
  scope: ApiScope,
  session: SessionSnapshot = getSessionSnapshot(),
): QueryKey {
  if (scope === "public") return ["public", session.appScope, session.adminScope];
  if (scope === "admin") return ["admin", session.adminScope];
  return scope === "account"
    ? ["app", session.appScope, "account", session.orgId]
    : ["app", session.appScope, "org", session.orgId];
}

export function scopedKey(
  key: QueryKey,
  scope: ApiScope,
  session: SessionSnapshot = getSessionSnapshot(),
): QueryKey {
  return [...scopePrefix(scope, session), ...key];
}

export function isScopeCurrent(scope: ApiScope, captured: SessionSnapshot): boolean {
  const current = getSessionSnapshot();
  if (scope === "admin") return current.adminScope === captured.adminScope;
  if (scope === "public")
    return current.appScope === captured.appScope && current.adminScope === captured.adminScope;
  return current.appScope === captured.appScope && current.orgId === captured.orgId;
}
