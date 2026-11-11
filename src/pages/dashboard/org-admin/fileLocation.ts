export type OrgFileLeafView = "item" | "task";

export interface OrgFileLocation {
  typeId?: string;
  projectId?: string;
  view: OrgFileLeafView;
  itemId?: string;
  taskId?: string;
}

function text(value: string | null): string {
  return value?.trim() ?? "";
}

export function orgFileLocation(params: URLSearchParams): OrgFileLocation {
  const typeId = text(params.get("typeId"));
  const projectId = text(params.get("projectId"));
  const itemId = text(params.get("itemId"));
  const taskId = text(params.get("taskId"));
  const taskView = params.get("view") === "task";
  if (!typeId) return { view: "item" };
  if (!projectId) return { view: "item", typeId };
  if (taskView) {
    return taskId
      ? { view: "task", typeId, projectId, taskId }
      : { view: "task", typeId, projectId };
  }
  return itemId ? { view: "item", typeId, projectId, itemId } : { view: "item", typeId, projectId };
}

export function orgFileSearch(location: OrgFileLocation): string {
  const params = new URLSearchParams();
  if (!location.typeId) return params.toString();
  params.set("typeId", location.typeId);
  if (!location.projectId) return params.toString();
  params.set("projectId", location.projectId);
  if (location.view === "task") {
    params.set("view", "task");
    if (location.taskId) params.set("taskId", location.taskId);
    return params.toString();
  }
  if (location.itemId) params.set("itemId", location.itemId);
  return params.toString();
}

export function parentOrgFileLocation(location: OrgFileLocation): OrgFileLocation | null {
  if (!location.typeId) return null;
  if (!location.projectId) return { view: "item" };
  if (location.view === "task" && location.taskId) {
    return { view: "task", typeId: location.typeId, projectId: location.projectId };
  }
  if (location.view === "item" && location.itemId) {
    return { view: "item", typeId: location.typeId, projectId: location.projectId };
  }
  return { view: "item", typeId: location.typeId };
}
