import type { LoaderFunctionArgs } from "react-router";

import { readPage } from "@/lib/pageQuery";
import { fetchApiQuery } from "@/lib/routeQuery";
import { adminListQuery } from "@/queries/admin";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  await fetchApiQuery(adminListQuery(readPage(new URL(request.url).searchParams)));
  return null;
}
