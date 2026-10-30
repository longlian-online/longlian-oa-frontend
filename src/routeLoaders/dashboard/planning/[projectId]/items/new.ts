import { fetchApiQuery } from "@/lib/routeQuery";
import { projectDetailQuery, taskTemplateOptionsQuery } from "@/queries/planning";
import { baseTaskOptionsQuery } from "@/queries/workshop";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ params }: LoaderFunctionArgs): Promise<null> {
  if (!params.projectId) return null;
  await Promise.all([
    fetchApiQuery(projectDetailQuery(params.projectId)),
    fetchApiQuery(taskTemplateOptionsQuery()),
    fetchApiQuery(baseTaskOptionsQuery()),
  ]);
  return null;
}
