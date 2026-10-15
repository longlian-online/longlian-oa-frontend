import { apiQueryOptions, type ApiQueryOptions } from "@/lib/apiQuery";
import { queryClient } from "@/lib/queryClient";

export async function fetchApiQuery<T>(options: ApiQueryOptions<T>): Promise<T | undefined> {
  const query = apiQueryOptions(options);
  if (!query.enabled) return undefined;
  return queryClient.fetchQuery(query);
}
