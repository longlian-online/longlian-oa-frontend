import type { LoaderFunctionArgs } from "react-router";

import type { ApiQueryOptions } from "@/lib/apiQuery";
import { readListQuery } from "@/lib/listQueryState";
import { readPage } from "@/lib/pageQuery";
import { fetchApiQuery } from "@/lib/routeQuery";
import { isOrganizationAdmin } from "@/lib/session";

export function organizationKeywordListLoader<T>(
  query: (keyword: string, page: number) => ApiQueryOptions<T>,
): (args: LoaderFunctionArgs) => Promise<null> {
  return async ({ request }) => {
    if (!isOrganizationAdmin()) return null;
    const params = new URL(request.url).searchParams;
    const { keyword } = readListQuery(params, { keyword: "" });
    await fetchApiQuery(query(keyword, readPage(params)));
    return null;
  };
}
