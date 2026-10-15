import type { LoaderFunctionArgs } from "react-router";

import { fetchApiQuery } from "@/lib/routeQuery";
import { getSessionSnapshot } from "@/lib/session";
import {
  organizationTemplateBaseTasksQuery,
  organizationTemplateQuery,
} from "@/queries/organizationAdmin";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  if (getSessionSnapshot().role !== "ORG_ADMIN") return null;
  const templateId = new URL(request.url).searchParams.get("templateId");
  await Promise.all([
    fetchApiQuery(organizationTemplateBaseTasksQuery()),
    fetchApiQuery(organizationTemplateQuery(templateId)),
  ]);
  return null;
}
