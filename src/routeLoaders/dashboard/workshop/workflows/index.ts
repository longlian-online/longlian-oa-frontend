import { fetchApiQuery } from "@/lib/routeQuery";
import { readListQuery } from "@/lib/listQueryState";
import { readPage } from "@/lib/pageQuery";
import { workflowListQuery } from "@/queries/workshop";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs): Promise<null> {
  const params = new URL(request.url).searchParams;
  const { keyword } = readListQuery(params, { keyword: "" });
  await fetchApiQuery(workflowListQuery(readPage(params), keyword));
  return null;
}
