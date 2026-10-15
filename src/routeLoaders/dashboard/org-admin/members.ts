import type { LoaderFunctionArgs } from "react-router";

import { fetchApiQuery } from "@/lib/routeQuery";
import { getSessionSnapshot } from "@/lib/session";
import { organizationMembersQuery } from "@/queries/organizationAdmin";

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  if (getSessionSnapshot().role !== "ORG_ADMIN") return null;
  await fetchApiQuery(organizationMembersQuery());
  return null;
}
