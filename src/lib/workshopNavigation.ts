import { readPage } from "@/lib/pageQuery";
import type { MyTaskSortDirection } from "@/types/myTask";
import type { WorkshopSortBy } from "@/types/workshop";

export interface WorkshopView {
  keyword: string;
  selectedType: string;
  isMyCreated: boolean;
  taskSort: MyTaskSortDirection;
  sortBy: WorkshopSortBy;
  page: number;
  submitPage: number;
  waitingPage: number;
}

export function readWorkshopView(params: URLSearchParams): WorkshopView {
  const sort = params.get("sort");
  return {
    keyword: params.get("keyword")?.trim() ?? "",
    selectedType: params.get("type")?.trim() || "all",
    isMyCreated: params.get("mine") === "1",
    taskSort: params.get("taskSort") === "DESC" ? "DESC" : "ASC",
    sortBy: sort === "CREATED_ASC" || sort === "CREATED_DESC" ? sort : "RECENT_SUBMISSION",
    page: readPage(params),
    submitPage: readPage(params, "submitPage"),
    waitingPage: readPage(params, "waitingPage"),
  };
}

export function workshopReturnTo(state: unknown): string | undefined {
  if (!state || typeof state !== "object" || !("workshopReturnTo" in state)) return;
  const value = state.workshopReturnTo;
  if (typeof value !== "string") return;
  if (value === "/dashboard/workshop" || value.startsWith("/dashboard/workshop?")) return value;
}
