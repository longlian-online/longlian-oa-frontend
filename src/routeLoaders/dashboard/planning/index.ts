import { fetchApiQuery } from "@/lib/routeQuery";
import { projectListQuery, projectTypesQuery } from "@/queries/planning";
import type { LoaderFunctionArgs } from "react-router";

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  await Promise.all([fetchApiQuery(projectListQuery()), fetchApiQuery(projectTypesQuery())]);
  return null;
}
