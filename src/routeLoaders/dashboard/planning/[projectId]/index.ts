import { fetchApiQuery } from "@/lib/routeQuery";
import { projectDetailQuery, projectItemsQuery } from "@/queries/planning";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ params }: LoaderFunctionArgs): Promise<null> {
  await Promise.all([
    fetchApiQuery(projectDetailQuery(params.projectId)),
    fetchApiQuery(projectItemsQuery(params.projectId ?? "")),
  ]);
  return null;
}
