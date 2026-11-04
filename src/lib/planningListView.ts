import { readPage, withPage } from "@/lib/pageQuery";
import { DEFAULT_PROJECT_TIME_SORT } from "@/queries/planning";
import type { ProjectListDTO } from "@/types/planning";

export interface PlanningListView {
  pageNum: number;
  keyword: string;
  selectedType: string;
  timeSort: Required<Pick<ProjectListDTO, "sortByTime" | "orderDir">>;
}

type PlanningListFilters = Partial<Omit<PlanningListView, "pageNum">>;

export function readPlanningListView(params: URLSearchParams): PlanningListView {
  const sortByTime = params.get("sortByTime");
  const orderDir = params.get("orderDir");
  return {
    pageNum: readPage(params),
    keyword: params.get("keyword")?.trim() ?? "",
    selectedType: params.get("projectType")?.trim() || "all",
    timeSort: {
      sortByTime:
        sortByTime === "CREATE" || sortByTime === "UPDATE"
          ? sortByTime
          : DEFAULT_PROJECT_TIME_SORT.sortByTime,
      orderDir:
        orderDir === "ASC" || orderDir === "DESC" ? orderDir : DEFAULT_PROJECT_TIME_SORT.orderDir,
    },
  };
}

// 筛选与页码一次性更新，避免新筛选条件搭配旧页码发起请求。
export function withPlanningListFilters(
  params: URLSearchParams,
  filters: PlanningListFilters,
): URLSearchParams {
  const current = readPlanningListView(params);
  const view = { ...current, ...filters };
  const next = withPage(params, 1);
  const values = {
    keyword: view.keyword.trim(),
    projectType: view.selectedType === "all" ? "" : view.selectedType,
    sortByTime:
      view.timeSort.sortByTime === DEFAULT_PROJECT_TIME_SORT.sortByTime
        ? ""
        : view.timeSort.sortByTime,
    orderDir:
      view.timeSort.orderDir === DEFAULT_PROJECT_TIME_SORT.orderDir ? "" : view.timeSort.orderDir,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return next;
}
