export function readPage(params: URLSearchParams, key = "page"): number {
  const page = Number(params.get(key));
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function withPage(params: URLSearchParams, page: number, key = "page"): URLSearchParams {
  const next = new URLSearchParams(params);
  if (!Number.isSafeInteger(page) || page <= 1) next.delete(key);
  else next.set(key, String(page));
  return next;
}

export function planningListReturnTo(state: unknown): string | undefined {
  if (!state || typeof state !== "object" || !("planningListReturnTo" in state)) return;
  const value = state.planningListReturnTo;
  if (typeof value !== "string") return;
  if (value === "/dashboard/planning" || value.startsWith("/dashboard/planning?")) return value;
}
