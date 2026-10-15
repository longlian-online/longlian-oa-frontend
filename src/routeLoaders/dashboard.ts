import { fetchApiQuery } from "@/lib/routeQuery";
import { currentUserQuery, organizationsQuery } from "@/queries/session";

export async function loader(): Promise<null> {
  await Promise.all([fetchApiQuery(currentUserQuery), fetchApiQuery(organizationsQuery)]);
  return null;
}
