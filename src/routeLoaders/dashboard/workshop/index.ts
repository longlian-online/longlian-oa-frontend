import { fetchApiQuery } from "@/lib/routeQuery";
import { projectTypesQuery } from "@/queries/planning";
import { myTasksQuery, workshopListQuery } from "@/queries/workshop";
import type { LoaderFunctionArgs } from "react-router";

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  await Promise.all([
    fetchApiQuery(projectTypesQuery()),
    fetchApiQuery(workshopListQuery()),
    fetchApiQuery(myTasksQuery("SUBMITTABLE")),
    fetchApiQuery(myTasksQuery("WAITING")),
  ]);
  return null;
}
