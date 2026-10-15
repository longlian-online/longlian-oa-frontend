import type { LoaderFunctionArgs } from "react-router";

import { fetchApiQuery } from "@/lib/routeQuery";
import { getSessionSnapshot } from "@/lib/session";
import { organizationBaseTasksQuery } from "@/queries/workshop";

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  if (getSessionSnapshot().role !== "ORG_ADMIN") return null;
  await fetchApiQuery(organizationBaseTasksQuery());
  return null;
}
