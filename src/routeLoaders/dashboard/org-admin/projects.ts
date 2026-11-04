import type { LoaderFunctionArgs } from "react-router";

import { readListQuery } from "@/lib/listQueryState";
import { readPage } from "@/lib/pageQuery";
import { fetchApiQuery } from "@/lib/routeQuery";
import { isOrganizationAdmin } from "@/lib/session";
import { organizationProjectsQuery } from "@/queries/organizationAdmin";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  if (!isOrganizationAdmin()) return null;
  const params = new URL(request.url).searchParams;
  const { keyword } = readListQuery(params, { keyword: "" });
  await fetchApiQuery(organizationProjectsQuery(keyword, readPage(params)));
  return null;
}
