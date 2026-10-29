import { fetchApiQuery } from "@/lib/routeQuery";
import { itemFlowQuery, projectDetailQuery } from "@/queries/planning";
import { baseTaskOptionsQuery } from "@/queries/workshop";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ params }: LoaderFunctionArgs): Promise<null> {
  if (!params.projectId || !params.itemId) return null;
  await Promise.all([
    fetchApiQuery(projectDetailQuery(params.projectId)),
    fetchApiQuery(itemFlowQuery(params.itemId)),
    fetchApiQuery(baseTaskOptionsQuery()),
  ]);
  return null;
}
