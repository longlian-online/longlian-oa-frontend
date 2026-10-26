import type { LoaderFunctionArgs } from "react-router";

import { fetchApiQuery } from "@/lib/routeQuery";
import { storageStatsQuery } from "@/queries/admin";

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  await fetchApiQuery(storageStatsQuery());
  return null;
}
