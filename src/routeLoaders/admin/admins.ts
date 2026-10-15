import type { LoaderFunctionArgs } from "react-router";

import { fetchApiQuery } from "@/lib/routeQuery";
import { adminListQuery } from "@/queries/admin";

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  await fetchApiQuery(adminListQuery());
  return null;
}
