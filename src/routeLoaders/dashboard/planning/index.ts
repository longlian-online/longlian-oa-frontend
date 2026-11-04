import { fetchApiQuery } from "@/lib/routeQuery";
import { readPlanningListView } from "@/lib/planningListView";
import { projectListQuery, projectTypesQuery } from "@/queries/planning";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  const { pageNum, keyword, selectedType, timeSort } = readPlanningListView(
    new URL(request.url).searchParams,
  );
  await Promise.all([
    fetchApiQuery(projectListQuery(pageNum, keyword, selectedType, timeSort)),
    fetchApiQuery(projectTypesQuery()),
  ]);
  return null;
}
