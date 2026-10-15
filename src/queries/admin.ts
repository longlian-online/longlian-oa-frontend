import { getAdminList, getAdminOrganizations, getScheduledTasks } from "@/api/admin";
import type { ApiQueryOptions } from "@/lib/apiQuery";
import type { AdminPageResult, AdminVO, AdminOrganizationVO, ScheduledTaskVO } from "@/types/admin";

export const ADMIN_PAGE_SIZE = 10;

export function adminListQuery(page = 1): ApiQueryOptions<AdminPageResult<AdminVO>> {
  return {
    key: ["adminAdmins", "management", page],
    queryFn: () => getAdminList({ pageNum: page, pageSize: ADMIN_PAGE_SIZE }),
    scope: "admin",
  };
}

export function adminOrganizationsQuery(
  page = 1,
  keyword = "",
): ApiQueryOptions<AdminPageResult<AdminOrganizationVO>> {
  return {
    key: ["adminOrganizations", "management", page, keyword],
    queryFn: () =>
      getAdminOrganizations({
        orgName: keyword.trim(),
        pageNum: page,
        pageSize: ADMIN_PAGE_SIZE,
        orderDir: "DESC",
      }),
    scope: "admin",
  };
}

export function scheduledTasksQuery(): ApiQueryOptions<ScheduledTaskVO[]> {
  return { key: ["scheduledTasks"], queryFn: getScheduledTasks, scope: "admin" };
}
