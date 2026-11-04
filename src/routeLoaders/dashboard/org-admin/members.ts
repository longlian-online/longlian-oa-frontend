import type { LoaderFunctionArgs } from "react-router";

import { readMemberListFilters } from "@/pages/dashboard/org-admin/orgAdminListView";
import { readPage } from "@/lib/pageQuery";
import { fetchApiQuery } from "@/lib/routeQuery";
import { isOrganizationAdmin } from "@/lib/session";
import { organizationMembersQuery } from "@/queries/organizationAdmin";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  if (!isOrganizationAdmin()) return null;
  const params = new URL(request.url).searchParams;
  await fetchApiQuery(organizationMembersQuery(readMemberListFilters(params), readPage(params)));
  return null;
}
