import {
  getAdminList,
  getAdminOrganizations,
  getScheduledTasks,
  getStorageStats,
} from "@/api/admin";
import { getSystemInfo } from "@/api/system";
import type { ApiQueryOptions } from "@/lib/apiQuery";
import type {
  AdminPageResult,
  AdminVO,
  AdminOrganizationVO,
  ScheduledTaskVO,
  StorageStatsVO,
} from "@/types/admin";
import type { SystemInfoVO } from "@/types/system";

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

export function systemInfoQuery(): ApiQueryOptions<SystemInfoVO> {
  return { key: ["systemInfo"], queryFn: getSystemInfo, scope: "public" };
}

export function storageStatsQuery(
  page = 1,
  keyword = "",
): ApiQueryOptions<AdminPageResult<StorageStatsVO>> {
  return {
    key: ["storageStats", "management", page, keyword],
    queryFn: () =>
      getStorageStats({
        orgName: keyword.trim(),
        pageNum: page,
        pageSize: ADMIN_PAGE_SIZE,
      }),
    scope: "admin",
  };
}
