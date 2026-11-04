import type { LoaderFunctionArgs } from "react-router";

import { readListQuery } from "@/lib/listQueryState";
import { readPage } from "@/lib/pageQuery";
import { fetchApiQuery } from "@/lib/routeQuery";
import { isOrganizationAdmin } from "@/lib/session";
import { organizationInviteCodesQuery } from "@/queries/organizationAdmin";
import type { JoinInviteCodeStatus } from "@/types/organizationAdmin";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  if (!isOrganizationAdmin()) return null;
  const params = new URL(request.url).searchParams;
  const { status } = readListQuery<{ status: JoinInviteCodeStatus | "" }>(
    params,
    { status: "" },
    { status: ["", "PENDING", "USED"] },
  );
  await fetchApiQuery(organizationInviteCodesQuery(status, readPage(params)));
  return null;
}
