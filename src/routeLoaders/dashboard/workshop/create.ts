import { fetchApiQuery } from "@/lib/routeQuery";
import { baseTaskOptionsQuery } from "@/queries/workshop";
import type { LoaderFunctionArgs } from "react-router";

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  await fetchApiQuery(baseTaskOptionsQuery());
  return null;
}
