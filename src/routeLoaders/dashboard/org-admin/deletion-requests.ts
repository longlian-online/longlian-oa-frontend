import type { LoaderFunctionArgs } from "react-router";

import { readPage } from "@/lib/pageQuery";
import { fetchApiQuery } from "@/lib/routeQuery";
import { isOrganizationAdmin } from "@/lib/session";
import { organizationDeletionRequestsQuery } from "@/queries/organizationAdmin";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  if (!isOrganizationAdmin()) return null;
  const params = new URL(request.url).searchParams;
  await fetchApiQuery(organizationDeletionRequestsQuery(readPage(params)));
  return null;
}
