import type { LoaderFunctionArgs } from "react-router";

import { fetchApiQuery } from "@/lib/routeQuery";
import { readListQuery } from "@/lib/listQueryState";
import { readPage } from "@/lib/pageQuery";
import { isOrganizationAdmin } from "@/lib/session";
import { organizationBaseTasksQuery } from "@/queries/workshop";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  if (!isOrganizationAdmin()) return null;
  const params = new URL(request.url).searchParams;
  const { keyword } = readListQuery(params, { keyword: "" });
  await fetchApiQuery(organizationBaseTasksQuery(readPage(params), keyword));
  return null;
}
