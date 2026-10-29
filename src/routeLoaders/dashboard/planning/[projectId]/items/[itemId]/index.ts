import { fetchApiQuery } from "@/lib/routeQuery";
import { itemFlowQuery, itemInstancesQuery } from "@/queries/planning";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ params }: LoaderFunctionArgs): Promise<null> {
  if (!params.projectId || !params.itemId) return null;
  await Promise.all([
    fetchApiQuery(itemFlowQuery(params.itemId)),
    fetchApiQuery(itemInstancesQuery(params.itemId)),
  ]);
  return null;
}
