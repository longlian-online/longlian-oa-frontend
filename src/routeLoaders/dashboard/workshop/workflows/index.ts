import { fetchApiQuery } from "@/lib/routeQuery";
import { workflowListQuery } from "@/queries/workshop";
import type { LoaderFunctionArgs } from "react-router";

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  await fetchApiQuery(workflowListQuery());
  return null;
}
