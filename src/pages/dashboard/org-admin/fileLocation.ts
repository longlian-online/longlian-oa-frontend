export interface OrgFileLocation {
  projectId?: string;
  itemId?: string;
}

export function orgFileLocation(params: URLSearchParams): OrgFileLocation {
  const projectId = params.get("projectId")?.trim() ?? "";
  const itemId = params.get("itemId")?.trim() ?? "";
  if (!projectId) return {};
  if (!itemId) return { projectId };
  return { projectId, itemId };
}

export function orgFileSearch(location: OrgFileLocation): string {
  const params = new URLSearchParams();
  if (location.projectId) params.set("projectId", location.projectId);
  if (location.projectId && location.itemId) params.set("itemId", location.itemId);
  return params.toString();
}

export function parentOrgFileLocation(location: OrgFileLocation): OrgFileLocation | null {
  if (location.projectId && location.itemId) return { projectId: location.projectId };
  if (location.projectId) return {};
  return null;
}
