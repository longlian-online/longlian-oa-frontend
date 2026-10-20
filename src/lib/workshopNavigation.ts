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

function pageNumber(value: string | null): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function readWorkshopView(params: URLSearchParams): WorkshopView {
  const sort = params.get("sort");
  return {
    keyword: params.get("keyword") ?? "",
    selectedType: params.get("type") || "all",
    isMyCreated: params.get("mine") === "1",
    taskSort: params.get("taskSort") === "DESC" ? "DESC" : "ASC",
    sortBy: sort === "CREATED_ASC" || sort === "CREATED_DESC" ? sort : "RECENT_SUBMISSION",
    page: pageNumber(params.get("page")),
    submitPage: pageNumber(params.get("submitPage")),
    waitingPage: pageNumber(params.get("waitingPage")),
  };
}

export function workshopReturnTo(state: unknown): string | undefined {
  if (!state || typeof state !== "object" || !("workshopReturnTo" in state)) return;
  const value = state.workshopReturnTo;
  if (typeof value !== "string") return;
  if (value === "/dashboard/workshop" || value.startsWith("/dashboard/workshop?")) return value;
}
