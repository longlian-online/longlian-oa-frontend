import { fetchApiQuery } from "@/lib/routeQuery";
import { plazaListQuery, plazaStageScope, projectTypesQuery } from "@/queries/planning";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  const stageScope = plazaStageScope(new URL(request.url).searchParams);
  await Promise.all([
    fetchApiQuery(plazaListQuery(stageScope)),
    fetchApiQuery(projectTypesQuery()),
  ]);
  return null;
}
