const ID = /^[1-9]\d*$/;

export type ExternalEntry =
  | {
      type: "TASK_READY" | "TASK_ASSIGNED" | "ITEM_COMPLETED";
      orgId: string;
      projectId: string;
      itemId: string;
      taskInstanceId?: string;
    }
  | { type: "JOIN_APPLICATION"; orgId: string; applicationId: string }
  | { type: "DELETION_REQUEST"; orgId: string; requestId: string };

export function parseExternalEntry(search: string): ExternalEntry | null {
  const params = new URLSearchParams(search);
  const type = params.get("type");
  const orgId = params.get("orgId");
  if (!orgId || !ID.test(orgId)) return null;
  if (type === "JOIN_APPLICATION") {
    const applicationId = params.get("applicationId");
    if (!applicationId || !ID.test(applicationId)) return null;
    return { type, orgId, applicationId };
  }
  if (type === "DELETION_REQUEST") {
    const requestId = params.get("requestId");
    if (!requestId || !ID.test(requestId)) return null;
    return { type, orgId, requestId };
  }
  const projectId = params.get("projectId");
  const itemId = params.get("itemId");
  if (!projectId || !itemId || !ID.test(projectId) || !ID.test(itemId)) return null;
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
  if (entry.type === "JOIN_APPLICATION") return "/dashboard/org-admin/applications";
  if (entry.type === "DELETION_REQUEST") return "/dashboard/org-admin/deletion-requests";
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
