import { fetchApiQuery } from "@/lib/routeQuery";
import { projectTypesQuery } from "@/queries/planning";
import { myTasksQuery, workshopListQuery } from "@/queries/workshop";
import { readWorkshopView } from "@/lib/workshopNavigation";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  const view = readWorkshopView(new URL(request.url).searchParams);
  await Promise.all([
    fetchApiQuery(projectTypesQuery()),
    fetchApiQuery(
      workshopListQuery(view.page, view.keyword, view.selectedType, view.isMyCreated, view.sortBy),
    ),
    fetchApiQuery(myTasksQuery("SUBMITTABLE", view.submitPage, view.taskSort)),
    fetchApiQuery(myTasksQuery("WAITING", view.waitingPage, view.taskSort)),
  ]);
  return null;
}
