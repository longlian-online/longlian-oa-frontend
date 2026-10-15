import type { LoaderFunctionArgs } from "react-router";

import { fetchApiQuery } from "@/lib/routeQuery";
import { scheduledTasksQuery } from "@/queries/admin";

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  await fetchApiQuery(scheduledTasksQuery());
  return null;
}
