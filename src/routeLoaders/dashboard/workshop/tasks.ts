import { redirect } from "react-router";
import { fetchApiQuery } from "@/lib/routeQuery";
import { readListQuery } from "@/lib/listQueryState";
import { readPage } from "@/lib/pageQuery";
import { isOrganizationAdmin } from "@/lib/session";
import { organizationBaseTasksQuery } from "@/queries/workshop";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  if (!isOrganizationAdmin()) throw redirect("/dashboard/workshop");
  const params = new URL(request.url).searchParams;
  const { keyword } = readListQuery(params, { keyword: "" });
  await fetchApiQuery(organizationBaseTasksQuery(readPage(params), keyword));
  return null;
}
