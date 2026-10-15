import { redirect } from "react-router";
import { fetchApiQuery } from "@/lib/routeQuery";
import { isOrganizationAdmin } from "@/lib/session";
import { organizationBaseTasksQuery } from "@/queries/workshop";
import type { LoaderFunctionArgs } from "react-router";

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  if (!isOrganizationAdmin()) throw redirect("/dashboard/workshop");
  await fetchApiQuery(organizationBaseTasksQuery());
  return null;
}
