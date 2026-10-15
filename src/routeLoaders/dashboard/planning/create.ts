import { fetchApiQuery } from "@/lib/routeQuery";
import { projectTypesQuery } from "@/queries/planning";
import type { LoaderFunctionArgs } from "react-router";

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  await fetchApiQuery(projectTypesQuery());
  return null;
}
