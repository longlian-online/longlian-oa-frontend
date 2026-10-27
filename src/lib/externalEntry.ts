const ID = /^[1-9]\d*$/;

export interface ExternalEntry {
  type: "TASK_READY" | "TASK_ASSIGNED" | "ITEM_COMPLETED";
  orgId: string;
  projectId: string;
  itemId: string;
  taskInstanceId?: string;
}

export function parseExternalEntry(search: string): ExternalEntry | null {
  const params = new URLSearchParams(search);
  const type = params.get("type");
  const orgId = params.get("orgId");
  const projectId = params.get("projectId");
  const itemId = params.get("itemId");
  if (!orgId || !projectId || !itemId) return null;
  if (![orgId, projectId, itemId].every((value) => ID.test(value))) return null;
  if (type === "ITEM_COMPLETED") return { type, orgId, projectId, itemId };
  const taskInstanceId = params.get("taskInstanceId");
  if (
    (type !== "TASK_READY" && type !== "TASK_ASSIGNED") ||
    !taskInstanceId ||
    !ID.test(taskInstanceId)
  )
    return null;
  return { type, orgId, projectId, itemId, taskInstanceId };
}

export function externalEntryPath(entry: ExternalEntry): string {
  const path = `/dashboard/planning/${entry.projectId}/items/${entry.itemId}`;
  return entry.type === "ITEM_COMPLETED" ? path : `${path}?taskInstanceId=${entry.taskInstanceId}`;
}

/** 登录后只回到校验通过的 /go，避免把 next 当成任意站内地址。 */
export function loginResumePath(next: string | null): string | null {
  if (!next || !next.startsWith("/go?") || /[\\\s]|:\/\//.test(next)) return null;
  try {
    const url = new URL(next, "http://local.invalid");
    if (url.origin !== "http://local.invalid" || url.pathname !== "/go" || url.hash !== "")
      return null;
    if (!parseExternalEntry(url.search)) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
