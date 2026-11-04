import { fetchApiQuery } from "@/lib/routeQuery";
import { readPage } from "@/lib/pageQuery";
import { readProjectItemsStatus } from "@/lib/projectItemsListQuery";
import { projectDetailQuery, projectItemsQuery } from "@/queries/planning";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ params, request }: LoaderFunctionArgs): Promise<null> {
  const search = new URL(request.url).searchParams;
  await Promise.all([
    fetchApiQuery(projectDetailQuery(params.projectId)),
    fetchApiQuery(
      projectItemsQuery(params.projectId ?? "", readPage(search), readProjectItemsStatus(search)),
    ),
  ]);
  return null;
}
