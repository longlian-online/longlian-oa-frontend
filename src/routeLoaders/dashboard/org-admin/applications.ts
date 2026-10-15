import type { LoaderFunctionArgs } from "react-router";

import { fetchApiQuery } from "@/lib/routeQuery";
import { isOrganizationAdmin } from "@/lib/session";
import { organizationApplicationsQuery } from "@/queries/organizationAdmin";

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  if (!isOrganizationAdmin()) return null;
  await fetchApiQuery(organizationApplicationsQuery());
  return null;
}
