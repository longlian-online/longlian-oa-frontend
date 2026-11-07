export type OrgFileTree = "planning" | "type" | "item";

export interface OrgFileLocation {
  tree: OrgFileTree;
  typeId?: string;
  projectId?: string;
  itemId?: string;
}

export function orgFileLocation(params: URLSearchParams): OrgFileLocation {
  const view = params.get("view");
  const tree: OrgFileTree = view === "type" || view === "item" ? view : "planning";
  const typeId = params.get("typeId")?.trim() ?? "";
  const projectId = params.get("projectId")?.trim() ?? "";
  const itemId = params.get("itemId")?.trim() ?? "";
  if (tree === "item") return itemId ? { tree, itemId } : { tree };
  if (tree === "type") return typeId ? { tree, typeId } : { tree };
  if (!projectId) return { tree };
  if (!itemId) return { tree, projectId };
  return { tree, projectId, itemId };
}

export function orgFileSearch(location: OrgFileLocation): string {
  const params = new URLSearchParams();
  if (location.tree !== "planning") params.set("view", location.tree);
  if (location.tree === "type" && location.typeId) params.set("typeId", location.typeId);
  if (location.tree !== "item" && location.projectId) params.set("projectId", location.projectId);
  if (location.itemId && (location.tree === "item" || location.projectId)) {
    params.set("itemId", location.itemId);
  }
  return params.toString();
}

export function parentOrgFileLocation(location: OrgFileLocation): OrgFileLocation | null {
  if (location.tree === "item") return location.itemId ? { tree: "item" } : null;
  if (location.tree === "type") return location.typeId ? { tree: "type" } : null;
  if (location.projectId && location.itemId)
    return { tree: "planning", projectId: location.projectId };
  if (location.projectId) return { tree: "planning" };
  return null;
}
