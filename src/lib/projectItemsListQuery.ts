import { readListQuery } from "@/lib/listQueryState";
import type { ProjectItemListFilter } from "@/types/projectItem";

export const projectItemsDefaults = { status: "IN_PROGRESS" };
export const projectItemsChoices = { status: ["IN_PROGRESS", "COMPLETED", "ALL"] };

export function readProjectItemsStatus(params: URLSearchParams): ProjectItemListFilter | "" {
  const { status } = readListQuery(params, projectItemsDefaults, projectItemsChoices);
  return status === "ALL" ? "" : (status as ProjectItemListFilter);
}
