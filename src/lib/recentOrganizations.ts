const MAX_RECENT_ORGANIZATIONS = 3;

function normalizedIds(ids: readonly unknown[]): string[] {
  return [
    ...new Set(ids.filter((id): id is string => typeof id === "string" && /^[1-9]\d*$/.test(id))),
  ].slice(0, MAX_RECENT_ORGANIZATIONS);
}

export function prependRecentOrganization(ids: readonly string[], orgId: string): string[] {
  return normalizedIds([orgId, ...ids]);
}

export function readRecentOrganizationIds(userId: string): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(`recent-organizations:${userId}`) ?? "null",
    );
    return Array.isArray(value) ? normalizedIds(value) : [];
  } catch {
    return [];
  }
}

export function writeRecentOrganizationIds(userId: string, ids: readonly string[]): void {
  try {
    localStorage.setItem(`recent-organizations:${userId}`, JSON.stringify(normalizedIds(ids)));
  } catch {
    // 历史存储不可用时不阻断组织切换。
  }
}
