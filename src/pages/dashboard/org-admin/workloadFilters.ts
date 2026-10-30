export const WORKLOAD_SEARCH_DEBOUNCE_MS = 300;

export type WorkloadFilters = {
  keyword: string;
  orderDir: "DESC" | "ASC";
};

/** 草稿与已提交条件一致时返回 null，避免空白键入重置页码并重复请求。 */
export function commitWorkloadFilters(
  applied: WorkloadFilters,
  draft: WorkloadFilters,
): WorkloadFilters | null {
  const next: WorkloadFilters = { ...draft, keyword: draft.keyword.trim() };
  if (applied.keyword === next.keyword && applied.orderDir === next.orderDir) return null;
  return next;
}
