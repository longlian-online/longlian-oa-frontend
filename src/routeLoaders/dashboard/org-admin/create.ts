import type { LoaderFunctionArgs } from "react-router";

import { fetchApiQuery } from "@/lib/routeQuery";
import { isOrganizationAdmin } from "@/lib/session";
import {
  organizationTemplateBaseTasksQuery,
  organizationTemplateQuery,
} from "@/queries/organizationAdmin";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  if (!isOrganizationAdmin()) return null;
  const templateId = new URL(request.url).searchParams.get("templateId");
  await Promise.all([
    fetchApiQuery(organizationTemplateBaseTasksQuery()),
    fetchApiQuery(organizationTemplateQuery(templateId)),
  ]);
  return null;
}
