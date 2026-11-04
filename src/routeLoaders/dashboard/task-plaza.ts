import type { LoaderFunctionArgs } from "react-router";
import { readListQuery } from "@/lib/listQueryState";
import { readPage } from "@/lib/pageQuery";
import { plazaListDefaults, plazaListChoices } from "@/lib/plazaListQueryState";
import { fetchApiQuery } from "@/lib/routeQuery";
import { plazaListQuery, plazaTaskTypesQuery, projectTypesQuery } from "@/queries/planning";
import type { PlazaSortBy } from "@/types/plaza";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  const params = new URL(request.url).searchParams;
  const filters = readListQuery(params, plazaListDefaults, plazaListChoices);
  await Promise.all([
    fetchApiQuery(
      plazaListQuery(
        filters.stageScope as "ALL" | "CURRENT",
        readPage(params),
        filters.keyword,
        filters.projectType,
        filters.sortBy as PlazaSortBy,
        filters.taskType,
      ),
    ),
    fetchApiQuery(projectTypesQuery()),
    fetchApiQuery(plazaTaskTypesQuery()),
  ]);
  return null;
}
