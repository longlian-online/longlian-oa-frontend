import type { LoaderFunctionArgs } from "react-router";

import { readPage } from "@/lib/pageQuery";
import { readListQuery } from "@/lib/listQueryState";
import { fetchApiQuery } from "@/lib/routeQuery";
import { storageStatsQuery } from "@/queries/admin";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  const params = new URL(request.url).searchParams;
  const { keyword } = readListQuery(params, { keyword: "" });
  await fetchApiQuery(storageStatsQuery(readPage(params), keyword));
  return null;
}
