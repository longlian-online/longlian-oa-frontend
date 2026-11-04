const LIST_PATHS = new Set([
  "/dashboard/planning",
  "/dashboard/task-plaza",
  "/dashboard/updates",
  "/dashboard/workshop",
  "/dashboard/workshop/tasks",
  "/dashboard/workshop/workflows",
  "/dashboard/org-admin",
  "/dashboard/org-admin/projects",
  "/dashboard/org-admin/project-types",
  "/dashboard/org-admin/preset-tags",
  "/dashboard/org-admin/preset-fields",
  "/dashboard/org-admin/members",
  "/dashboard/org-admin/applications",
  "/dashboard/org-admin/deletion-requests",
  "/dashboard/org-admin/invites",
  "/dashboard/org-admin/tasks",
  "/dashboard/org-admin/workflows",
  "/admin/admins",
  "/admin/organizations",
  "/admin/scheduled-tasks",
  "/admin/storage-stats",
  "/admin/product-releases",
]);

function unsafePath(value: string): boolean {
  return (
    value.includes("\\") ||
    value.includes("#") ||
    Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 32 || code === 127;
    })
  );
}

function safeListPath(value: unknown): string | undefined {
  if (typeof value !== "string" || unsafePath(value)) return;
  const pathname = value.split("?")[0];
  if (LIST_PATHS.has(pathname) || /^\/dashboard\/planning\/[A-Za-z0-9_-]+\/items$/.test(pathname)) {
    return value;
  }
}

/** Read only allowlisted internal list destinations, including their query string. */
export function getListReturnTo(state: unknown, fallback?: string): string | undefined {
  const value =
    state && typeof state === "object" && "listReturnTo" in state ? state.listReturnTo : undefined;
  return safeListPath(value) ?? safeListPath(fallback);
}

/** A project detail also hosts an item list; keep this narrower than general list returns. */
export function getProjectItemsReturnTo(state: unknown, projectId: string): string | undefined {
  if (!state || typeof state !== "object" || !("projectItemsReturnTo" in state)) return;
  const value = state.projectItemsReturnTo;
  if (typeof value !== "string" || unsafePath(value)) return;
  if (!/^[A-Za-z0-9_-]+$/.test(projectId) || ["create", "item"].includes(projectId)) return;
  const pathname = value.split("?")[0];
  if (
    pathname === `/dashboard/planning/${projectId}` ||
    pathname === `/dashboard/planning/${projectId}/items`
  )
    return value;
}
